<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class KitchenController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $branchId = $user->branch_id ?? Branch::first()->id ?? 1;

        $orders = Order::with(['table', 'items'])
            ->where('branch_id', $branchId)
            ->whereIn('order_status', ['Running', 'Preparing', 'Ready'])
            ->latest()
            ->get();

        return view('kitchen.index', compact('orders'));
    }

    public function updateItemStatus(Request $request, OrderItem $item)
    {
        $validated = $request->validate([
            'kitchen_status' => 'required|in:Pending,Cooking,Ready,Served',
        ]);

        $item->update(['kitchen_status' => $validated['kitchen_status']]);

        // Auto update parent order status if all items are cooking/ready
        $order = $item->order;
        $statuses = $order->items()->pluck('kitchen_status')->toArray();

        if (count(array_unique($statuses)) === 1 && $statuses[0] === 'Ready') {
            $order->update(['order_status' => 'Ready']);
        } elseif (in_array('Cooking', $statuses)) {
            $order->update(['order_status' => 'Preparing']);
        }

        return back()->with('success', 'Kitchen item status updated.');
    }
}
