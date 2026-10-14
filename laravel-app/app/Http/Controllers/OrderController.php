<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Hall;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Setting;
use App\Models\Table;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        $status = $request->input('status');
        $search = $request->input('search');

        $query = Order::with(['table', 'user', 'orderTaker'])->withSum('items', 'quantity');

        if ($startDate && $endDate) {
            $query->whereBetween('created_at', ["{$startDate} 00:00:00", "{$endDate} 23:59:59"]);
        }

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        if (!empty($status)) {
            if ($status === 'Complete') {
                $query->whereIn('order_status', ['Complete', 'Completed']);
            } else {
                $query->where('order_status', $status);
            }
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        // Calculate Analytics Metrics directly in database using a single query
        $stats = (clone $query)->reorder()->setEagerLoads([])->select(DB::raw("
            COALESCE(SUM(net_total), 0) as total_revenue,
            COUNT(*) as total_orders_count,
            COUNT(CASE WHEN order_status = 'Running' THEN 1 END) as running_orders_count,
            COUNT(CASE WHEN order_status IN ('Complete', 'Completed') THEN 1 END) as completed_orders_count,
            COUNT(CASE WHEN order_status IN ('Bill Generated', 'Completed') THEN 1 END) as bill_generated_count
        "))->first();

        $totalRevenue = $stats->total_revenue ?? 0;
        $totalOrdersCount = $stats->total_orders_count ?? 0;
        $runningOrdersCount = $stats->running_orders_count ?? 0;
        $completedOrdersCount = $stats->completed_orders_count ?? 0;
        $billGeneratedCount = $stats->bill_generated_count ?? 0;

        $orders = $query->latest()->paginate(15)->withQueryString();

        return view('orders.index', compact(
            'orders', 'startDate', 'endDate', 'status', 'search',
            'totalRevenue', 'totalOrdersCount', 'runningOrdersCount', 'completedOrdersCount', 'billGeneratedCount'
        ));
    }

    public function create(Request $request)
    {
        $user = Auth::user();
        $branches = \App\Services\MasterDataCache::getActiveBranches();
        $branchId = $user->branch_id ?? ($branches->first() ? $branches->first()->id : 1);

        $halls = \App\Services\MasterDataCache::getHallsForBranch($branchId);
        $tables = \App\Services\MasterDataCache::getTablesForBranch($branchId);
        $categories = \App\Services\MasterDataCache::getActiveCategories();
        $menuItems = \App\Services\MasterDataCache::getAvailableMenuItems();
        $orderTakers = \App\Services\MasterDataCache::getOrderTakersForBranch($branchId);

        // Fetch all active running & bill generated orders for the branch
        $runningOrders = Order::with(['items', 'table', 'hall', 'orderTaker', 'user'])
            ->where('branch_id', $branchId)
            ->whereIn('order_status', ['Running', 'Bill Generated'])
            ->latest()
            ->get();

        $initialEditOrder = null;
        $editId = $request->input('edit') ?? $request->input('order_id');
        if ($editId) {
            $initialEditOrder = Order::with(['items', 'table', 'hall', 'orderTaker', 'user'])->find($editId);
        }

        return view('orders.create', compact(
            'branches', 'halls', 'tables', 'categories', 'menuItems', 'orderTakers', 'branchId', 'runningOrders', 'initialEditOrder'
        ));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'nullable|exists:orders,id',
            'branch_id' => 'required|exists:branches,id',
            'order_type' => 'required|in:Dine In,Take Away,Delivery',
            'hall_id' => 'nullable|required_if:order_type,Dine In|exists:halls,id',
            'table_id' => 'nullable|required_if:order_type,Dine In|exists:tables,id',
            'order_taker_id' => 'nullable|required_if:order_type,Dine In|exists:users,id',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'comments' => 'nullable|string',
            'discount_type' => 'nullable|in:fixed,percentage',
            'discount_value' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
        ]);

        $subtotal = 0;
        foreach ($validated['items'] as $item) {
            $subtotal += $item['price'] * $item['quantity'];
        }

        $serviceChargePct = (float) Setting::get('service_charge_percentage', 5);
        $serviceCharge = ($validated['order_type'] === 'Dine In') ? round(($subtotal * $serviceChargePct) / 100, 2) : 0;
        
        $discountType = $validated['discount_type'] ?? 'fixed';
        $discountValue = (float) ($validated['discount_value'] ?? $validated['discount_amount'] ?? 0);
        if ($discountType === 'percentage') {
            $discountAmount = round(($subtotal * $discountValue) / 100, 2);
        } else {
            $discountAmount = $discountValue;
        }

        $netTotal = max(0, round($subtotal + $serviceCharge - $discountAmount, 2));

        $isEditing = !empty($validated['order_id']);

        $order = DB::transaction(function () use ($validated, $subtotal, $serviceCharge, $discountType, $discountValue, $discountAmount, $netTotal, $isEditing) {
            if ($isEditing) {
                $order = Order::with('items')->findOrFail($validated['order_id']);
                
                // Free old table if changed
                if ($order->order_type === 'Dine In' && $order->table_id && $order->table_id != ($validated['table_id'] ?? null)) {
                    Table::where('id', $order->table_id)->update(['status' => 'Available']);
                }

                $existingItems = $order->items->keyBy('menu_item_id');
                $incomingMenuItemIds = collect($validated['items'])->pluck('menu_item_id')->toArray();

                // 1. Mark missing items as completely cancelled
                foreach ($existingItems as $menuItemId => $existingItem) {
                    if (!in_array($menuItemId, $incomingMenuItemIds)) {
                        $totalCancelled = (int)$existingItem->cancelled_quantity + (int)$existingItem->quantity;
                        $existingItem->update([
                            'quantity' => 0,
                            'cancelled_quantity' => $totalCancelled,
                            'is_cancel' => 1,
                            'total_amount' => 0,
                        ]);
                    }
                }

                // 2. Process incoming items (update qty/cancel_qty or create new)
                foreach ($validated['items'] as $item) {
                    $menuItem = MenuItem::find($item['menu_item_id']);
                    $menuItemId = $menuItem ? $menuItem->id : $item['menu_item_id'];
                    $itemName = $menuItem ? $menuItem->name : ($item['name'] ?? 'Item');
                    $newQty = (int)$item['quantity'];

                    if (isset($existingItems[$menuItemId])) {
                        $existingItem = $existingItems[$menuItemId];
                        $prevQty = (int)$existingItem->quantity;
                        $prevCancelled = (int)$existingItem->cancelled_quantity;

                        if ($newQty < $prevQty) {
                            $diffCancelled = $prevQty - $newQty;
                            $newCancelled = $prevCancelled + $diffCancelled;
                            $existingItem->update([
                                'quantity' => $newQty,
                                'cancelled_quantity' => $newCancelled,
                                'is_cancel' => 1,
                                'price' => $item['price'],
                                'total_amount' => $item['price'] * $newQty,
                            ]);
                        } else {
                            $existingItem->update([
                                'quantity' => $newQty,
                                'price' => $item['price'],
                                'total_amount' => $item['price'] * $newQty,
                            ]);
                        }
                    } else {
                        OrderItem::create([
                            'order_id' => $order->id,
                            'menu_item_id' => $menuItemId,
                            'dish_id' => $menuItemId,
                            'item_name' => $itemName,
                            'price' => $item['price'],
                            'quantity' => $newQty,
                            'cancelled_quantity' => 0,
                            'total_amount' => $item['price'] * $newQty,
                            'kitchen_status' => 'Pending',
                        ]);
                    }
                }

                // Recalculate subtotal from active items only
                $subtotal = (float) $order->items()->where('quantity', '>', 0)->sum('total_amount');
                $serviceChargePct = (float) Setting::get('service_charge_percentage', 5);
                $serviceCharge = ($validated['order_type'] === 'Dine In') ? round(($subtotal * $serviceChargePct) / 100, 2) : 0;
                
                // If discount was provided in request, use it. Otherwise keep existing order discount.
                if (isset($validated['discount_type']) || isset($validated['discount_value']) || isset($validated['discount_amount'])) {
                    $effDiscountType = $discountType;
                    $effDiscountValue = $discountValue;
                    $effDiscountAmount = $discountAmount;
                } else {
                    $effDiscountType = $order->discount_type ?? 'fixed';
                    $effDiscountValue = (float) ($order->discount_value ?? $order->discount_amount ?? 0);
                    if ($effDiscountType === 'percentage') {
                        $effDiscountAmount = round(($subtotal * $effDiscountValue) / 100, 2);
                    } else {
                        $effDiscountAmount = (float) $order->discount_amount;
                    }
                }

                $netTotal = max(0, round($subtotal + $serviceCharge - $effDiscountAmount, 2));

                $order->update([
                    'branch_id' => $validated['branch_id'],
                    'hall_id' => $validated['hall_id'] ?? null,
                    'table_id' => $validated['table_id'] ?? null,
                    'order_taker_id' => $validated['order_taker_id'] ?? null,
                    'customer_name' => $validated['customer_name'] ?? null,
                    'customer_phone' => $validated['customer_phone'] ?? null,
                    'order_type' => $validated['order_type'],
                    'subtotal' => $subtotal,
                    'service_charge' => $serviceCharge,
                    'discount_type' => $effDiscountType,
                    'discount_value' => $effDiscountValue,
                    'discount_amount' => $effDiscountAmount,
                    'net_total' => $netTotal,
                    'comments' => $validated['comments'] ?? null,
                ]);
            } else {
                do {
                    $orderNumber = 'ORD-' . strtoupper(Str::random(6));
                } while (Order::where('order_number', $orderNumber)->exists());

                $order = Order::create([
                    'order_number' => $orderNumber,
                    'branch_id' => $validated['branch_id'],
                    'hall_id' => $validated['hall_id'] ?? null,
                    'table_id' => $validated['table_id'] ?? null,
                    'user_id' => Auth::id(),
                    'order_taker_id' => $validated['order_taker_id'] ?? null,
                    'customer_name' => $validated['customer_name'] ?? null,
                    'customer_phone' => $validated['customer_phone'] ?? null,
                    'order_type' => $validated['order_type'],
                    'order_status' => 'Running',
                    'subtotal' => $subtotal,
                    'service_charge' => $serviceCharge,
                    'discount_type' => $discountType,
                    'discount_value' => $discountValue,
                    'discount_amount' => $discountAmount,
                    'net_total' => $netTotal,
                    'payment_status' => 'Unpaid',
                    'comments' => $validated['comments'] ?? null,
                ]);

                foreach ($validated['items'] as $item) {
                    $menuItem = MenuItem::find($item['menu_item_id']);
                    $menuItemId = $menuItem ? $menuItem->id : $item['menu_item_id'];
                    $itemName = $menuItem ? $menuItem->name : ($item['name'] ?? 'Item');

                    OrderItem::create([
                        'order_id' => $order->id,
                        'menu_item_id' => $menuItemId,
                        'dish_id' => $menuItemId,
                        'item_name' => $itemName,
                        'price' => $item['price'],
                        'quantity' => $item['quantity'],
                        'cancelled_quantity' => 0,
                        'total_amount' => $item['price'] * $item['quantity'],
                        'kitchen_status' => 'Pending',
                    ]);
                }
            }

            // Update table status if Dine In
            if ($order->order_type === 'Dine In' && $order->table_id) {
                Table::where('id', $order->table_id)->update(['status' => 'Running']);
            }

            return $order;
        });

        // Automatically send dishes to related kitchen printers
        $kotResults = \App\Services\KitchenPrinterService::printOrderKOT($order);

        $msg = $isEditing ? 'Running order updated successfully!' : 'Order placed successfully!';

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true, 
                'order_id' => $order->id, 
                'message' => $msg,
                'kot_results' => $kotResults
            ]);
        }

        return redirect()->route('orders.show', $order->id)->with('success', $msg);
    }

    public function reprintKOT(Request $request, Order $order)
    {
        $results = \App\Services\KitchenPrinterService::printOrderKOT($order);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'KOT sent to respective kitchen station printers.',
                'results' => $results,
            ]);
        }

        return back()->with('success', 'KOT dispatched to kitchen printers.');
    }

    public function show(Request $request, Order $order)
    {
        $order->load(['branch', 'hall', 'table', 'user', 'orderTaker', 'rider', 'items.menuItem']);
        $serviceChargePct = (float) Setting::get('service_charge_percentage', 5);
        $riders = \App\Models\Rider::where('branch_id', $order->branch_id)->where('status', 'Active')->orWhere('id', $order->rider_id)->get();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'order' => $order,
                'serviceChargePct' => $serviceChargePct,
            ]);
        }

        return view('orders.show', compact('order', 'serviceChargePct', 'riders'));
    }

    public function updateStatus(Request $request, Order $order)
    {
        $validated = $request->validate([
            'order_status' => 'required|in:Running,Bill Generated,Completed,Complete,Cancelled',
        ]);

        $newStatus = $validated['order_status'];

        if ($newStatus === 'Cancelled') {
            if ($order->is_stock_deducted) {
                $this->restoreRecipeStockForOrder($order);
            }
            if ($order->rider_id) {
                $this->releaseRiderForOrder($order, 'Cancelled');
            }
            $order->update([
                'order_status' => 'Cancelled',
                'subtotal' => 0,
                'service_charge' => 0,
                'discount_amount' => 0,
                'net_total' => 0,
            ]);
            foreach ($order->items as $item) {
                $totalCancelled = (int)$item->cancelled_quantity + (int)$item->quantity;
                $item->update([
                    'is_cancel' => 1,
                    'cancelled_quantity' => $totalCancelled,
                    'quantity' => 0,
                    'total_amount' => 0,
                ]);
            }
        } else {
            $order->update(['order_status' => $newStatus]);
            if (in_array($newStatus, ['Complete', 'Completed'])) {
                if (!$order->is_stock_deducted) {
                    $this->deductRecipeStockForOrder($order);
                }
                if ($order->rider_id) {
                    $this->releaseRiderForOrder($order, 'Delivered');
                }
            }
        }

        if ($order->table_id) {
            if (in_array($newStatus, ['Complete', 'Completed', 'Cancelled'])) {
                Table::where('id', $order->table_id)->update(['status' => 'Available']);
            } elseif (in_array($newStatus, ['Running', 'Bill Generated'])) {
                Table::where('id', $order->table_id)->update(['status' => 'Running']);
            }
        }

        $order->load(['branch', 'hall', 'table', 'user', 'orderTaker', 'items.menuItem']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Order status updated to ' . $newStatus,
                'order' => $order,
            ]);
        }

        return back()->with('success', 'Order status updated to ' . $newStatus);
    }

    public function updateBilling(Request $request, Order $order)
    {
        $validated = $request->validate([
            'discount_type' => 'nullable|in:fixed,percentage',
            'discount_value' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
        ]);

        $subtotal = (float) $order->items()->where('quantity', '>', 0)->sum('total_amount');
        if ($subtotal == 0 && (float)$order->subtotal > 0) {
            $subtotal = (float) $order->subtotal;
        }

        $serviceChargePct = (float) Setting::get('service_charge_percentage', 5);
        $serviceCharge = ($order->order_type === 'Dine In') ? round(($subtotal * $serviceChargePct) / 100, 2) : 0;

        $discountType = $validated['discount_type'] ?? $order->discount_type ?? 'fixed';
        
        if (array_key_exists('discount_value', $validated) && $validated['discount_value'] !== null) {
            $discountValue = (float) $validated['discount_value'];
        } else {
            $discountValue = (float) ($validated['discount_amount'] ?? $order->discount_value ?? 0);
        }

        if ($discountType === 'percentage') {
            $discountAmount = round(($subtotal * $discountValue) / 100, 2);
        } else {
            $discountAmount = $discountValue;
        }

        $netTotal = max(0, round($subtotal + $serviceCharge - $discountAmount, 2));

        $order->update([
            'subtotal' => $subtotal,
            'discount_type' => $discountType,
            'discount_value' => $discountValue,
            'discount_amount' => $discountAmount,
            'service_charge' => $serviceCharge,
            'net_total' => $netTotal,
        ]);

        $order->load(['branch', 'hall', 'table', 'user', 'orderTaker', 'items.menuItem']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Bill discount updated successfully!',
                'order' => $order,
            ]);
        }

        return back()->with('success', 'Bill discount updated successfully!');
    }

    public function processPayment(Request $request, Order $order)
    {
        $validated = $request->validate([
            'payment_mode' => 'required|string',
            'paid_amount' => 'nullable|numeric|min:0',
            'payments' => 'nullable|array',
            'payments.*.payment_method' => 'required|string',
            'payments.*.amount' => 'required|numeric|min:0',
        ]);

        $nextStatus = in_array($order->order_status, ['Running', 'Bill Generated']) ? 'Completed' : $order->order_status;

        $order->update([
            'payment_status' => 'Paid',
            'payment_mode' => $validated['payment_mode'],
            'order_status' => $nextStatus,
        ]);

        // Process Split Payments if provided
        if (!empty($validated['payments'])) {
            \App\Models\OrderPayment::where('order_id', $order->id)->delete();
            foreach ($validated['payments'] as $pLine) {
                \App\Models\OrderPayment::create([
                    'order_id' => $order->id,
                    'payment_method' => $pLine['payment_method'],
                    'amount' => $pLine['amount'],
                ]);
            }
        } else {
            \App\Models\OrderPayment::create([
                'order_id' => $order->id,
                'payment_method' => $validated['payment_mode'],
                'amount' => $order->net_total,
            ]);
        }

        if ($order->table_id && in_array($nextStatus, ['Complete', 'Completed', 'Cancelled'])) {
            Table::where('id', $order->table_id)->update(['status' => 'Available']);
        }

        if (in_array($nextStatus, ['Complete', 'Completed'])) {
            if (!$order->is_stock_deducted) {
                $this->deductRecipeStockForOrder($order);
            }
            if ($order->rider_id) {
                $this->releaseRiderForOrder($order, 'Delivered');
            }
            $redeemPoints = (int) $request->input('redeem_points', 0);
            $this->processCustomerKhataAndLoyalty($order, $validated['payment_mode'], $redeemPoints);

            // Auto-send invoice to PRA (Punjab Revenue Authority) if enabled
            if (\App\Services\PRAService::isEnabled() && (string) \App\Models\Setting::get('pra_auto_send_on_payment', '1') === '1') {
                \App\Services\PRAService::sendInvoice($order);
            }
        }

        \App\Models\AuditLog::log('Processed Payment', 'Orders', null, ['order_id' => $order->id, 'net_total' => $order->net_total, 'payment_mode' => $validated['payment_mode']]);

        $order->load(['branch', 'hall', 'table', 'user', 'rider', 'items.menuItem']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Payment processed successfully! Order marked as Paid.',
                'order' => $order,
            ]);
        }

        return back()->with('success', 'Payment processed successfully! Order marked as Paid.');
    }

    private function deductRecipeStockForOrder(Order $order)
    {
        if ($order->is_stock_deducted) {
            return;
        }

        foreach ($order->items as $item) {
            if (!$item->menu_item_id || $item->quantity <= 0) continue;

            $recipes = \App\Models\Recipe::where('menu_item_id', $item->menu_item_id)->get();
            foreach ($recipes as $recipe) {
                $deductQty = $recipe->quantity_required * $item->quantity;
                $stock = \App\Models\KitchenStoreStock::where('branch_id', $order->branch_id)
                    ->where('inventory_item_id', $recipe->inventory_item_id)
                    ->first();

                if ($stock) {
                    $stock->decrement('quantity', $deductQty);
                }
            }
        }

        $order->update(['is_stock_deducted' => true]);
    }

    private function restoreRecipeStockForOrder(Order $order)
    {
        if (!$order->is_stock_deducted) {
            return;
        }

        foreach ($order->items as $item) {
            $qty = $item->quantity > 0 ? $item->quantity : $item->cancelled_quantity;
            if (!$item->menu_item_id || $qty <= 0) continue;

            $recipes = \App\Models\Recipe::where('menu_item_id', $item->menu_item_id)->get();
            foreach ($recipes as $recipe) {
                $restoreQty = $recipe->quantity_required * $qty;
                $stock = \App\Models\KitchenStoreStock::where('branch_id', $order->branch_id)
                    ->where('inventory_item_id', $recipe->inventory_item_id)
                    ->first();

                if ($stock) {
                    $stock->increment('quantity', $restoreQty);
                }
            }
        }

        $order->update(['is_stock_deducted' => false]);
    }

    private function releaseRiderForOrder(Order $order, $deliveryStatus = 'Delivered')
    {
        if ($order->rider_id) {
            $order->update(['delivery_status' => $deliveryStatus]);
            $otherActive = Order::where('rider_id', $order->rider_id)
                ->where('id', '!=', $order->id)
                ->whereIn('delivery_status', ['Assigned', 'Out for Delivery'])
                ->exists();
            if (!$otherActive) {
                \App\Models\Rider::where('id', $order->rider_id)->update(['status' => 'Active']);
            }
        }
    }

    private function processCustomerKhataAndLoyalty(Order $order, $paymentMethod = 'Cash', $redeemPoints = 0)
    {
        if ($order->customer_name || $order->customer_phone) {
            $customer = \App\Models\Customer::where('phone', $order->customer_phone)->first();
            if (!$customer && $order->customer_name) {
                $customer = \App\Models\Customer::create([
                    'name' => $order->customer_name,
                    'phone' => $order->customer_phone ?? '0000000000',
                    'loyalty_points' => 0,
                ]);
            }

            if ($customer) {
                // Handle Loyalty Points Redemption
                if ($redeemPoints > 0 && $customer->loyalty_points >= $redeemPoints) {
                    $customer->decrement('loyalty_points', $redeemPoints);
                    $order->update(['points_redeemed' => $redeemPoints]);
                }

                // Award New Loyalty Points (1 pt per 10 currency units)
                $pointsEarned = (int) floor($order->net_total / 10);
                if ($pointsEarned > 0) {
                    $customer->increment('loyalty_points', $pointsEarned);
                    $order->update(['points_earned' => $pointsEarned]);
                }

                if ($paymentMethod === 'Khata Credit') {
                    $lastLedger = \App\Models\CustomerLedger::where('customer_id', $customer->id)->latest()->first();
                    $prevBal = $lastLedger ? $lastLedger->balance : 0;
                    $newBal = $prevBal + $order->net_total;

                    \App\Models\CustomerLedger::create([
                        'customer_id' => $customer->id,
                        'branch_id' => $order->branch_id,
                        'order_id' => $order->id,
                        'type' => 'debit',
                        'amount' => $order->net_total,
                        'balance' => $newBal,
                        'description' => "Order #{$order->order_number} Credit Purchase (Khata)",
                        'reference_no' => $order->order_number,
                    ]);
                }
            }
        }
    }

    public function printReceipt(Order $order)
    {
        $order->load(['branch', 'hall', 'table', 'user', 'items.menuItem']);

        $logo = Setting::get('restaurant_logo');
        $name = Setting::get('restaurant_name', 'Chai Khas Restaurant');
        $slogan = Setting::get('restaurant_slogan', 'Taste of Royalty & Tradition');
        $address = Setting::get('restaurant_address', 'Main Boulevard, Gulberg III, Lahore');
        $phone1 = Setting::get('restaurant_phone1', '+92-300-1234567');
        $phone2 = Setting::get('restaurant_phone2', '+92-321-9876543');
        $notes = Setting::get('branding_notes', 'STRN / NTN # 1234567-8 • Thank you for dining with us!');
        $serviceChargePct = (float) Setting::get('service_charge_percentage', 5);
        $praConfig = \App\Services\PRAService::getConfig();

        return view('orders.receipt', compact(
            'order', 'logo', 'name', 'slogan', 'address', 'phone1', 'phone2', 'notes', 'serviceChargePct', 'praConfig'
        ));
    }

    public function mergeOrders(Request $request)
    {
        $validated = $request->validate([
            'source_order_id' => 'required|exists:orders,id',
            'target_order_id' => 'required|exists:orders,id|different:source_order_id',
        ]);

        $sourceOrder = Order::with('items')->findOrFail($validated['source_order_id']);
        $targetOrder = Order::with('items')->findOrFail($validated['target_order_id']);

        if ($sourceOrder->order_status !== 'Running' || $targetOrder->order_status !== 'Running') {
            $msg = 'Only active running orders can be merged.';
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'message' => $msg], 400);
            }
            return back()->withErrors([$msg]);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($sourceOrder, $targetOrder) {
            // Transfer all items from source to target order
            foreach ($sourceOrder->items as $item) {
                $item->update(['order_id' => $targetOrder->id]);
            }

            // Recalculate target order total
            $newSubtotal = (float) $targetOrder->items()->where('quantity', '>', 0)->sum('total_amount');
            $serviceChargePct = (float) Setting::get('service_charge_percentage', 5);
            $newServiceCharge = ($targetOrder->order_type === 'Dine In') ? round(($newSubtotal * $serviceChargePct) / 100, 2) : 0;

            $discType = $targetOrder->discount_type ?? 'fixed';
            $discVal = (float) ($targetOrder->discount_value ?? 0);
            if ($discType === 'percentage') {
                $newDiscountAmount = round(($newSubtotal * $discVal) / 100, 2);
            } else {
                $newDiscountAmount = (float) $targetOrder->discount_amount;
            }

            $newNetTotal = max(0, round($newSubtotal + $newServiceCharge - $newDiscountAmount, 2));

            $targetOrder->update([
                'subtotal' => $newSubtotal,
                'service_charge' => $newServiceCharge,
                'discount_amount' => $newDiscountAmount,
                'net_total' => $newNetTotal,
                'comments' => trim(($targetOrder->comments ?? '') . "\n[Merged items from " . $sourceOrder->order_number . "]"),
            ]);

            // Cancel/Close source order and release its table
            $sourceOrder->update([
                'order_status' => 'Cancelled',
                'comments' => "[Merged into " . $targetOrder->order_number . "]",
                'subtotal' => 0,
                'service_charge' => 0,
                'discount_amount' => 0,
                'net_total' => 0,
            ]);

            if ($sourceOrder->table_id && $sourceOrder->table_id !== $targetOrder->table_id) {
                Table::where('id', $sourceOrder->table_id)->update(['status' => 'Available']);
            }
        });

        $msg = "Merged order {$sourceOrder->order_number} into {$targetOrder->order_number} successfully!";

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'target_order_id' => $targetOrder->id, 'message' => $msg]);
        }

        return redirect()->route('orders.show', $targetOrder->id)->with('success', $msg);
    }
}
