<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Order;
use App\Models\Rider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RiderController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $branchId = $user->branch_id ?? Branch::first()->id ?? 1;

        $riders = Rider::withCount(['orders' => function ($q) {
            $q->whereIn('delivery_status', ['Assigned', 'Out for Delivery']);
        }])->where('branch_id', $branchId)->get();

        $activeDeliveries = Order::with('rider')
            ->where('branch_id', $branchId)
            ->where('order_type', 'Delivery')
            ->whereIn('order_status', ['Running', 'Bill Generated', 'Complete', 'Completed'])
            ->whereIn('delivery_status', ['Pending', 'Assigned', 'Out for Delivery'])
            ->latest()
            ->get();

        return view('riders.index', compact('riders', 'activeDeliveries', 'branchId'));
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $branchId = $user->branch_id ?? Branch::first()->id ?? 1;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'vehicle_no' => 'nullable|string|max:50',
        ]);

        Rider::create([
            'branch_id' => $branchId,
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'vehicle_no' => $validated['vehicle_no'] ?? null,
            'status' => 'Active',
        ]);

        return redirect()->route('riders.index')->with('success', 'Delivery Rider added successfully!');
    }

    public function assignOrder(Request $request, $orderId)
    {
        $order = Order::findOrFail($orderId);
        $oldRiderId = $order->rider_id;
        $riderId = $request->input('rider_id');
        $deliveryStatus = $request->input('delivery_status', 'Assigned');

        $order->update([
            'rider_id' => $riderId ?: null,
            'delivery_status' => $deliveryStatus,
        ]);

        if ($riderId) {
            if ($deliveryStatus === 'Delivered') {
                $hasOther = Order::where('rider_id', $riderId)
                    ->where('id', '!=', $order->id)
                    ->whereIn('delivery_status', ['Assigned', 'Out for Delivery'])
                    ->exists();
                Rider::where('id', $riderId)->update(['status' => $hasOther ? 'On Delivery' : 'Active']);
            } else {
                Rider::where('id', $riderId)->update(['status' => 'On Delivery']);
            }
        }

        if ($oldRiderId && $oldRiderId != $riderId) {
            $oldHasOther = Order::where('rider_id', $oldRiderId)
                ->where('id', '!=', $order->id)
                ->whereIn('delivery_status', ['Assigned', 'Out for Delivery'])
                ->exists();
            if (!$oldHasOther) {
                Rider::where('id', $oldRiderId)->update(['status' => 'Active']);
            }
        }

        \App\Models\AuditLog::log('Assigned Rider to Delivery Order', 'Rider', null, ['order_id' => $orderId, 'rider_id' => $riderId, 'status' => $deliveryStatus]);

        return redirect()->back()->with('success', 'Rider dispatch status updated successfully!');
    }
}
