<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\InventoryActivityLog;
use App\Models\InventoryItem;
use App\Models\KitchenStoreStock;
use App\Models\MainStoreStock;
use App\Models\StockTransfer;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $branchId = $request->input('branch_id', $user->branch_id ?? Branch::first()->id ?? 1);

        $inventoryItems = InventoryItem::where('branch_id', $branchId)->get();
        $mainStoreStocks = MainStoreStock::with('item')->where('branch_id', $branchId)->get();
        $kitchenStoreStocks = KitchenStoreStock::with('item')->where('branch_id', $branchId)->get();

        $kitchenNames = KitchenStoreStock::where('branch_id', $branchId)->pluck('kitchen_name')->unique();
        if ($kitchenNames->isEmpty()) {
            $kitchenNames = collect(['Main Kitchen']);
        }

        $branches = Branch::where('status', 'Active')->get();

        return view('inventory.index', compact(
            'inventoryItems', 'mainStoreStocks', 'kitchenStoreStocks', 'kitchenNames', 'branches', 'branchId'
        ));
    }

    public function products(Request $request)
    {
        $user = Auth::user();
        $branchId = $request->input('branch_id', $user->branch_id ?? Branch::first()->id ?? 1);

        $query = InventoryItem::with(['mainStoreStock', 'kitchenStoreStocks'])
                    ->where('branch_id', $branchId);

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $query->where('item_name', 'like', '%' . $request->search . '%');
        }

        $products = $query->latest()->paginate(15);
        $categories = InventoryItem::where('branch_id', $branchId)->pluck('category')->unique()->filter();
        if ($categories->isEmpty()) {
            $categories = collect(['General', 'Dairy', 'Meat & Poultry', 'Spices & Oils', 'Beverages', 'Packaging', 'Dry Ration']);
        }
        $branches = Branch::where('status', 'Active')->get();

        return view('inventory.products', compact('products', 'categories', 'branches', 'branchId'));
    }

    public function storeProduct(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'item_name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'unit' => 'required|string|max:50',
            'sku' => 'nullable|string|max:100',
            'default_purchase_price' => 'required|numeric|min:0',
            'min_stock_alert' => 'required|numeric|min:0',
        ]);

        $item = InventoryItem::create($validated);

        // Initialize Main Store Stock record
        MainStoreStock::create([
            'branch_id' => $validated['branch_id'],
            'inventory_item_id' => $item->id,
            'quantity' => 0,
            'avg_unit_cost' => $validated['default_purchase_price'],
        ]);

        return back()->with('success', 'Purchasable raw product created successfully.');
    }

    public function updateProduct(Request $request, InventoryItem $product)
    {
        $validated = $request->validate([
            'item_name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'unit' => 'required|string|max:50',
            'sku' => 'nullable|string|max:100',
            'default_purchase_price' => 'required|numeric|min:0',
            'min_stock_alert' => 'required|numeric|min:0',
        ]);

        $product->update($validated);

        return back()->with('success', 'Product details updated successfully.');
    }

    public function destroyProduct(InventoryItem $product)
    {
        $product->delete();
        return back()->with('success', 'Product deleted successfully.');
    }

    public function createItem(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'item_name' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100',
            'unit' => 'required|string|max:50',
            'min_stock_alert' => 'required|numeric|min:0',
        ]);

        $item = InventoryItem::create($validated);

        // Initialize 0 stocks
        MainStoreStock::create([
            'branch_id' => $validated['branch_id'],
            'inventory_item_id' => $item->id,
            'quantity' => 0,
            'avg_unit_cost' => 0,
        ]);

        return back()->with('success', 'New raw inventory item registered successfully.');
    }

    public function transferToKitchen(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'kitchen_name' => 'required|string',
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'quantity' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string',
        ]);

        $item = InventoryItem::findOrFail($validated['inventory_item_id']);
        $qty = $validated['quantity'];

        $mainStock = MainStoreStock::firstOrCreate(
            ['branch_id' => $validated['branch_id'], 'inventory_item_id' => $item->id],
            ['quantity' => 0, 'avg_unit_cost' => 0]
        );

        if ($mainStock->quantity < $qty) {
            return back()->withErrors(["Insufficient Main Store stock for {$item->item_name}. Available: {$mainStock->quantity} {$item->unit}"]);
        }

        DB::transaction(function () use ($validated, $item, $qty, $mainStock) {
            // 1. Decrement Main Store
            $prevMainQty = $mainStock->quantity;
            $newMainQty = $prevMainQty - $qty;
            $mainStock->update(['quantity' => $newMainQty]);

            // 2. Increment Kitchen Store
            $kitchenStock = KitchenStoreStock::firstOrCreate(
                [
                    'branch_id' => $validated['branch_id'],
                    'kitchen_name' => $validated['kitchen_name'],
                    'inventory_item_id' => $item->id,
                ],
                ['quantity' => 0]
            );

            $prevKitchenQty = $kitchenStock->quantity;
            $newKitchenQty = $prevKitchenQty + $qty;
            $kitchenStock->update(['quantity' => $newKitchenQty]);

            // 3. Save Stock Transfer Record
            StockTransfer::create([
                'branch_id' => $validated['branch_id'],
                'user_id' => Auth::id(), // Added By
                'type' => 'TRANSFER_TO_KITCHEN',
                'kitchen_name' => $validated['kitchen_name'],
                'inventory_item_id' => $item->id,
                'quantity' => $qty,
                'notes' => $validated['notes'] ?? null,
            ]);

            // 4. Audit Log Main Store
            InventoryActivityLog::create([
                'branch_id' => $validated['branch_id'],
                'user_id' => Auth::id(),
                'action_type' => 'TRANSFER_TO_KITCHEN',
                'inventory_item_id' => $item->id,
                'kitchen_name' => $validated['kitchen_name'],
                'store_type' => 'MAIN_STORE',
                'quantity_change' => -$qty,
                'previous_qty' => $prevMainQty,
                'new_qty' => $newMainQty,
                'notes' => "Transferred {$qty} {$item->unit} to {$validated['kitchen_name']}",
            ]);

            // 5. Audit Log Kitchen Store
            InventoryActivityLog::create([
                'branch_id' => $validated['branch_id'],
                'user_id' => Auth::id(),
                'action_type' => 'TRANSFER_TO_KITCHEN',
                'inventory_item_id' => $item->id,
                'kitchen_name' => $validated['kitchen_name'],
                'store_type' => 'KITCHEN_STORE',
                'quantity_change' => $qty,
                'previous_qty' => $prevKitchenQty,
                'new_qty' => $newKitchenQty,
                'notes' => "Received {$qty} {$item->unit} from Main Store",
            ]);
        });

        return back()->with('success', "Transferred {$qty} {$item->unit} of {$item->item_name} to {$validated['kitchen_name']}.");
    }

    public function returnToMainStore(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'kitchen_name' => 'required|string',
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'quantity' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string',
        ]);

        $item = InventoryItem::findOrFail($validated['inventory_item_id']);
        $qty = $validated['quantity'];

        $kitchenStock = KitchenStoreStock::firstOrCreate(
            [
                'branch_id' => $validated['branch_id'],
                'kitchen_name' => $validated['kitchen_name'],
                'inventory_item_id' => $item->id,
            ],
            ['quantity' => 0]
        );

        if ($kitchenStock->quantity < $qty) {
            return back()->withErrors(["Insufficient {$validated['kitchen_name']} stock for {$item->item_name}. Available: {$kitchenStock->quantity} {$item->unit}"]);
        }

        DB::transaction(function () use ($validated, $item, $qty, $kitchenStock) {
            // 1. Decrement Kitchen Store
            $prevKitchenQty = $kitchenStock->quantity;
            $newKitchenQty = $prevKitchenQty - $qty;
            $kitchenStock->update(['quantity' => $newKitchenQty]);

            // 2. Increment Main Store
            $mainStock = MainStoreStock::firstOrCreate(
                ['branch_id' => $validated['branch_id'], 'inventory_item_id' => $item->id],
                ['quantity' => 0, 'avg_unit_cost' => 0]
            );

            $prevMainQty = $mainStock->quantity;
            $newMainQty = $prevMainQty + $qty;
            $mainStock->update(['quantity' => $newMainQty]);

            // 3. Save Stock Transfer Record
            StockTransfer::create([
                'branch_id' => $validated['branch_id'],
                'user_id' => Auth::id(), // Added By
                'type' => 'RETURN_TO_MAIN',
                'kitchen_name' => $validated['kitchen_name'],
                'inventory_item_id' => $item->id,
                'quantity' => $qty,
                'notes' => $validated['notes'] ?? null,
            ]);

            // 4. Audit Log Kitchen Store
            InventoryActivityLog::create([
                'branch_id' => $validated['branch_id'],
                'user_id' => Auth::id(),
                'action_type' => 'RETURN_TO_MAIN',
                'inventory_item_id' => $item->id,
                'kitchen_name' => $validated['kitchen_name'],
                'store_type' => 'KITCHEN_STORE',
                'quantity_change' => -$qty,
                'previous_qty' => $prevKitchenQty,
                'new_qty' => $newKitchenQty,
                'notes' => "Returned {$qty} {$item->unit} back to Main Store",
            ]);

            // 5. Audit Log Main Store
            InventoryActivityLog::create([
                'branch_id' => $validated['branch_id'],
                'user_id' => Auth::id(),
                'action_type' => 'RETURN_TO_MAIN',
                'inventory_item_id' => $item->id,
                'kitchen_name' => $validated['kitchen_name'],
                'store_type' => 'MAIN_STORE',
                'quantity_change' => $qty,
                'previous_qty' => $prevMainQty,
                'new_qty' => $newMainQty,
                'notes' => "Restocked {$qty} {$item->unit} returned from {$validated['kitchen_name']}",
            ]);
        });

        return back()->with('success', "Returned {$qty} {$item->unit} of {$item->item_name} from {$validated['kitchen_name']} back to Main Store.");
    }

    public function activityLogs(Request $request)
    {
        $user = Auth::user();
        $query = InventoryActivityLog::with(['branch', 'addedBy', 'item']);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        if ($request->filled('action_type')) {
            $query->where('action_type', $request->action_type);
        }

        $logs = $query->orderByDesc('created_at')->paginate(20);

        return view('inventory.activity_logs', compact('logs'));
    }
}
