<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Category;
use App\Models\DayEnd;
use App\Models\Expense;
use App\Models\Hall;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class LegacyApiController extends Controller
{
    /**
     * User Login API Endpoint (/api/login.php or /api/login)
     */
    public function login(Request $request)
    {
        $login = $request->input('login') ?? $request->input('username');
        $password = $request->input('password');

        if (!$login || !$password) {
            return response()->json([
                'success' => false,
                'message' => 'Username/email and password are required.'
            ], 400);
        }

        $user = User::where('username', $login)->orWhere('email', $login)->first();

        if ($user && Hash::check($password, $user->password)) {
            if ($user->status !== 'Active') {
                return response()->json(['success' => false, 'message' => 'User account is inactive.']);
            }

            $token = Str::random(40);

            return response()->json([
                'success' => true,
                'message' => 'Login successful.',
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                    'branch_id' => $user->branch_id,
                ]
            ]);
        }

        return response()->json(['success' => false, 'message' => 'Invalid credentials.'], 401);
    }

    /**
     * Get Halls (/api/get_halls.php)
     */
    public function getHalls(Request $request)
    {
        $branchId = $request->input('branch_id');
        $query = Hall::where('status', 'Active');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $halls = $query->get()->map(function ($hall) {
            return [
                'hall_id' => $hall->id,
                'id' => $hall->id,
                'name' => $hall->name,
                'capacity' => $hall->capacity,
                'branch_id' => $hall->branch_id,
                'status' => $hall->status,
            ];
        });

        return response()->json($halls);
    }

    /**
     * Get Tables (/api/get_tables.php)
     */
    public function getTables(Request $request)
    {
        $branchId = $request->input('branch_id');
        $hallId = $request->input('hall_id');

        $query = Table::query();

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        if ($hallId) {
            $query->where('hall_id', $hallId);
        }

        $tables = $query->get()->map(function ($table) {
            return [
                'table_id' => $table->id,
                'id' => $table->id,
                'table_number' => $table->table_number,
                'hall_id' => $table->hall_id,
                'capacity' => $table->capacity,
                'status' => $table->status,
                'branch_id' => $table->branch_id,
            ];
        });

        return response()->json($tables);
    }

    /**
     * Get Categories (/api/get_categories.php)
     */
    public function getCategories(Request $request)
    {
        $branchId = $request->input('branch_id');
        $query = Category::where('status', 'Active');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $categories = $query->get()->map(function ($cat) {
            return [
                'category_id' => $cat->id,
                'id' => $cat->id,
                'name' => $cat->name,
                'description' => $cat->description,
                'status' => $cat->status,
            ];
        });

        return response()->json($categories);
    }

    /**
     * Get Products / Dishes (/api/get_products.php)
     */
    public function getProducts(Request $request)
    {
        $branchId = $request->input('branch_id');
        $categoryId = $request->input('category_id');

        $query = MenuItem::with('category')->where('is_available', true)->where('status', 'Active');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        $products = $query->get()->map(function ($item) {
            return [
                'dish_id' => $item->id,
                'id' => $item->id,
                'category_id' => $item->category_id,
                'name' => $item->name,
                'catname' => $item->category->name ?? 'Category',
                'price' => (float)$item->price,
                'description' => $item->description,
                'is_available' => $item->is_available ? 1 : 0,
            ];
        });

        return response()->json($products);
    }

    /**
     * Create Order with Kitchen Routing (/api/create_order_with_kitchen.php, /api/upload_order.php)
     */
    public function createOrder(Request $request)
    {
        $branchId = $request->input('branch_id') ?? Branch::first()->id ?? 1;
        $orderType = $request->input('order_type', 'Dine In');
        $hallId = $request->input('hall_id');
        $tableId = $request->input('table_id');
        $itemsData = $request->input('items', []);
        $comments = $request->input('comments');

        if (empty($itemsData)) {
            return response()->json(['success' => false, 'message' => 'No order items provided.'], 400);
        }

        $subtotal = 0;
        foreach ($itemsData as $i) {
            $subtotal += ($i['price'] ?? 0) * ($i['quantity'] ?? 1);
        }

        $order = DB::transaction(function () use ($request, $branchId, $orderType, $hallId, $tableId, $itemsData, $comments, $subtotal) {
            do {
                $orderNumber = 'ORD-' . strtoupper(Str::random(6));
            } while (Order::where('order_number', $orderNumber)->exists());

            $serviceCharge = (float) $request->input('service_charge', 0);
            $discountAmount = (float) $request->input('discount_amount', 0);
            $netTotal = max(0, round($subtotal + $serviceCharge - $discountAmount, 2));

            $order = Order::create([
                'order_number' => $orderNumber,
                'branch_id' => $branchId,
                'hall_id' => $hallId ?: null,
                'table_id' => $tableId ?: null,
                'user_id' => $request->input('order_taker_id') ?? 1,
                'order_taker_id' => $request->input('order_taker_id') ?: null,
                'customer_name' => $request->input('customer_name') ?: null,
                'customer_phone' => $request->input('customer_phone') ?: null,
                'order_type' => $orderType,
                'order_status' => 'Running',
                'subtotal' => $subtotal,
                'service_charge' => $serviceCharge,
                'discount_amount' => $discountAmount,
                'net_total' => $netTotal,
                'payment_status' => 'Unpaid',
                'comments' => $comments ?: null,
            ]);

            foreach ($itemsData as $item) {
                $dishId = $item['dish_id'] ?? $item['menu_item_id'] ?? null;
                $dish = $dishId ? MenuItem::find($dishId) : null;
                $menuItemId = $dish ? $dish->id : $dishId;

                OrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $menuItemId,
                    'dish_id' => $menuItemId,
                    'item_name' => $dish->name ?? ($item['name'] ?? 'Item'),
                    'price' => $item['price'] ?? 0,
                    'quantity' => $item['quantity'] ?? 1,
                    'total_amount' => ($item['price'] ?? 0) * ($item['quantity'] ?? 1),
                    'kitchen_status' => 'Pending',
                ]);
            }

            if ($orderType === 'Dine In' && $tableId) {
                Table::where('id', $tableId)->update(['status' => 'Running']);
            }

            return $order;
        });

        // Automatically dispatch KOT to kitchen station network printers
        $kotResults = \App\Services\KitchenPrinterService::printOrderKOT($order);

        return response()->json([
            'success' => true,
            'message' => 'Order created successfully.',
            'kot_dispatch' => $kotResults,
            'data' => [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'order_type' => $order->order_type,
                'order_status' => $order->order_status,
                'g_total_amount' => (float)$order->subtotal,
                'net_total_amount' => (float)$order->net_total,
                'items' => $order->items->map(function ($it) {
                    return [
                        'dish_name' => $it->item_name,
                        'price' => (float)$it->price,
                        'quantity' => $it->quantity,
                        'total_amount' => (float)$it->total_amount,
                    ];
                })
            ]
        ]);
    }

    /**
     * Table Management API (/api/table_management.php)
     */
    public function tableManagement(Request $request)
    {
        $tableId = $request->input('table_id');
        $status = $request->input('status');

        if ($tableId && $status) {
            Table::where('id', $tableId)->update(['status' => $status]);
            return response()->json(['success' => true, 'message' => 'Table status updated successfully.']);
        }

        return response()->json(['success' => false, 'message' => 'Missing table_id or status.'], 400);
    }

    /**
     * Branch Management API (/api/branch_management.php)
     */
    public function branchManagement(Request $request)
    {
        $branches = Branch::where('status', 'Active')->get()->map(function ($b) {
            return [
                'branch_id' => $b->id,
                'id' => $b->id,
                'branch_name' => $b->branch_name,
                'branch_code' => $b->branch_code,
                'address' => $b->address,
                'phone' => $b->phone,
                'status' => $b->status,
            ];
        });

        return response()->json(['success' => true, 'data' => $branches]);
    }

    /**
     * Expenses API (/pos/upload_expences.php, /pos/get_expences.php)
     */
    public function getExpenses(Request $request)
    {
        $branchId = $request->input('branch_id');
        $query = Expense::with('branch');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return response()->json($query->latest()->get());
    }

    public function saveExpense(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'title' => 'required|string',
            'amount' => 'required|numeric',
            'expense_date' => 'required|date',
        ]);

        $expense = Expense::create([
            'branch_id' => $validated['branch_id'],
            'title' => $validated['title'],
            'category' => $request->input('category', 'General'),
            'amount' => $validated['amount'],
            'expense_date' => $validated['expense_date'],
            'notes' => $request->input('notes'),
        ]);

        return response()->json(['success' => true, 'message' => 'Expense saved.', 'data' => $expense]);
    }

    /**
     * Day End API (/pos/save_dayend.php, /pos/get_dayend_data.php)
     */
    public function saveDayEnd(Request $request)
    {
        $branchId = $request->input('branch_id') ?? Branch::first()->id ?? 1;
        $openingCash = $request->input('opening_cash', 0);
        $date = now()->today();

        $sales = Order::where('branch_id', $branchId)->whereDate('created_at', $date)->sum('net_total');
        $expenses = Expense::where('branch_id', $branchId)->whereDate('expense_date', $date)->sum('amount');
        $closingCash = $openingCash + $sales - $expenses;

        $dayEnd = DayEnd::create([
            'branch_id' => $branchId,
            'user_id' => 1,
            'date' => $date,
            'opening_cash' => $openingCash,
            'total_sales' => $sales,
            'total_expenses' => $expenses,
            'closing_cash' => $closingCash,
            'closed_at' => now(),
            'notes' => $request->input('notes'),
        ]);

        return response()->json(['success' => true, 'message' => 'Day end closure saved.', 'data' => $dayEnd]);
    }

    /**
     * Get Menu Sales API (/api/get_menu_sales.php)
     */
    public function getMenuSales(Request $request)
    {
        $sts = $request->input('sts');
        $branchId = $request->input('branch_id');

        $query = OrderItem::select(
            'order_items.menu_item_id as dish_id',
            'order_items.item_name as name',
            'categories.name as category',
            DB::raw('SUM(CASE WHEN orders.order_status = "Cancelled" THEN 0 ELSE COALESCE(order_items.quantity, 0) END) as quantity_sold'),
            DB::raw('SUM(CASE WHEN orders.order_status = "Cancelled" AND (order_items.cancelled_quantity IS NULL OR order_items.cancelled_quantity = 0) THEN order_items.quantity ELSE COALESCE(order_items.cancelled_quantity, 0) END) as cancelled_quantity'),
            DB::raw('SUM(CASE WHEN orders.order_status = "Cancelled" THEN 0 ELSE COALESCE(order_items.total_amount, 0) END) as total_revenue')
        )
        ->join('orders', 'orders.id', '=', 'order_items.order_id')
        ->leftJoin('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
        ->leftJoin('categories', 'categories.id', '=', 'menu_items.category_id');

        if ($sts) {
            $query->where(function($q) use ($sts) {
                $q->where('orders.id', $sts)->orWhere('orders.order_number', $sts);
            });
        }

        if ($branchId) {
            $query->where('orders.branch_id', $branchId);
        }

        $data = $query->groupBy('order_items.menu_item_id', 'order_items.item_name', 'categories.name')
            ->orderByDesc('quantity_sold')
            ->get();

        return response()->json([
            'success' => true,
            'sts' => $sts,
            'count' => $data->count(),
            'data' => $data
        ]);
    }
}
