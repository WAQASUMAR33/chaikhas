<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\InventoryActivityLog;
use App\Models\InventoryItem;
use App\Models\MainStoreStock;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Purchase::with(['branch', 'vendor', 'addedBy', 'items.item']);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $purchases = $query->latest()->paginate(15);
        $branches = Branch::where('status', 'Active')->get();
        $vendors = Vendor::where('status', 'Active')->get();

        return view('purchases.index', compact('purchases', 'branches', 'vendors'));
    }

    public function create()
    {
        $user = Auth::user();
        $branchId = $user->branch_id ?? Branch::first()->id ?? 1;

        $vendors = Vendor::where('status', 'Active')->get();
        $inventoryItems = InventoryItem::all();

        return view('purchases.create', compact('vendors', 'inventoryItems', 'branchId'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'vendor_id' => 'required|exists:vendors,id',
            'purchase_date' => 'required|date',
            'invoice_number' => 'nullable|string',
            'payment_status' => 'required|in:Paid,Unpaid,Partial',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.inventory_item_id' => 'required|exists:inventory_items,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);

        $poNumber = 'PO-' . strtoupper(Str::random(6));

        DB::transaction(function () use ($validated, $poNumber, &$purchase) {
            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $totalAmount += $item['quantity'] * $item['unit_cost'];
            }

            $purchase = Purchase::create([
                'branch_id' => $validated['branch_id'],
                'vendor_id' => $validated['vendor_id'],
                'user_id' => Auth::id(), // Added By
                'po_number' => $poNumber,
                'invoice_number' => $validated['invoice_number'] ?? null,
                'purchase_date' => $validated['purchase_date'],
                'total_amount' => $totalAmount,
                'payment_status' => $validated['payment_status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $qty = $item['quantity'];
                $unitCost = $item['unit_cost'];
                $totalCost = $qty * $unitCost;

                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'inventory_item_id' => $item['inventory_item_id'],
                    'quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'total_cost' => $totalCost,
                ]);

                // Update Main Store Stock
                $mainStock = MainStoreStock::firstOrCreate(
                    [
                        'branch_id' => $validated['branch_id'],
                        'inventory_item_id' => $item['inventory_item_id'],
                    ],
                    ['quantity' => 0.00, 'avg_unit_cost' => 0.00]
                );

                $prevQty = $mainStock->quantity;
                $newQty = $prevQty + $qty;

                $mainStock->update([
                    'quantity' => $newQty,
                    'avg_unit_cost' => $unitCost,
                ]);

                // Log Activity Audit Trail
                InventoryActivityLog::create([
                    'branch_id' => $validated['branch_id'],
                    'user_id' => Auth::id(), // Added By
                    'action_type' => 'PURCHASE',
                    'inventory_item_id' => $item['inventory_item_id'],
                    'kitchen_name' => null,
                    'store_type' => 'MAIN_STORE',
                    'quantity_change' => $qty,
                    'previous_qty' => $prevQty,
                    'new_qty' => $newQty,
                    'notes' => "Purchased via " . $poNumber . " (Vendor #" . $validated['vendor_id'] . ")",
                ]);
            }
        });

        return redirect()->route('purchases.index')->with('success', 'Purchase order logged and Main Store stock updated.');
    }
}
