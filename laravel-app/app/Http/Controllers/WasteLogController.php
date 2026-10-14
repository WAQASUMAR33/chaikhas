<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\InventoryItem;
use App\Models\KitchenStoreStock;
use App\Models\MainStoreStock;
use App\Models\WasteLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WasteLogController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $branchId = $user->branch_id ?? Branch::first()->id ?? 1;

        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $wasteLogs = WasteLog::with(['inventoryItem', 'loggedBy'])
            ->where('branch_id', $branchId)
            ->whereBetween('created_at', ["{$startDate} 00:00:00", "{$endDate} 23:59:59"])
            ->latest()
            ->get();

        $totalLoss = $wasteLogs->sum('total_loss');
        $inventoryItems = InventoryItem::orderBy('item_name')->get();

        return view('waste_logs.index', compact('wasteLogs', 'totalLoss', 'inventoryItems', 'startDate', 'endDate', 'branchId'));
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $branchId = $user->branch_id ?? Branch::first()->id ?? 1;

        $validated = $request->validate([
            'store_type' => 'required|in:Main Store,Kitchen Store',
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'quantity' => 'required|numeric|min:0.0001',
            'reason' => 'required|string|max:255',
        ]);

        $item = InventoryItem::findOrFail($validated['inventory_item_id']);
        $costPrice = $item->default_purchase_price ?? 0;
        $totalLoss = round($validated['quantity'] * $costPrice, 2);

        // Deduct from corresponding store
        if ($validated['store_type'] === 'Main Store') {
            $stock = MainStoreStock::where('branch_id', $branchId)->where('inventory_item_id', $item->id)->first();
            if ($stock) {
                $stock->decrement('quantity', $validated['quantity']);
            }
        } else {
            $stock = KitchenStoreStock::where('branch_id', $branchId)->where('inventory_item_id', $item->id)->first();
            if ($stock) {
                $stock->decrement('quantity', $validated['quantity']);
            }
        }

        WasteLog::create([
            'branch_id' => $branchId,
            'store_type' => $validated['store_type'],
            'inventory_item_id' => $item->id,
            'quantity' => $validated['quantity'],
            'cost_price' => $costPrice,
            'total_loss' => $totalLoss,
            'reason' => $validated['reason'],
            'logged_by' => $user->id,
        ]);

        \App\Models\AuditLog::log('Recorded Inventory Waste Log', 'WasteLog', null, ['item_id' => $item->id, 'quantity' => $validated['quantity'], 'loss' => $totalLoss]);

        return redirect()->route('waste-logs.index')->with('success', 'Inventory waste/damage recorded successfully!');
    }
}
