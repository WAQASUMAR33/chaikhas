@extends('layouts.app')

@section('content')
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Delivery Rider & Dispatch Tracking</h1>
            <p class="text-slate-500 text-sm font-medium">Manage delivery personnel, assign riders to orders, and monitor dispatch status</p>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Add Rider Form & Riders List -->
        <div class="lg:col-span-1 space-y-6">
            <div class="bg-white p-5 border border-slate-200 shadow-sm">
                <h3 class="text-base font-bold text-slate-900 mb-3">Add Delivery Rider</h3>
                <form method="POST" action="{{ route('riders.store') }}" class="space-y-4">
                    @csrf
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Rider Full Name</label>
                        <input type="text" name="name" required placeholder="Ali Ahmed" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Phone Number</label>
                        <input type="text" name="phone" required placeholder="0300-9876543" class="w-full px-3 py-2 border border-slate-300 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Vehicle / Bike #</label>
                        <input type="text" name="vehicle_no" placeholder="LEB-4921" class="w-full px-3 py-2 border border-slate-300 text-sm">
                    </div>

                    <button type="submit" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition">
                        + Register Rider
                    </button>
                </form>
            </div>

            <!-- Active Riders Roster -->
            <div class="bg-white p-5 border border-slate-200 shadow-sm">
                <h3 class="text-base font-bold text-slate-900 mb-3">Registered Riders Roster</h3>
                <div class="space-y-3">
                    @forelse($riders as $r)
                    <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200">
                        <div>
                            <span class="font-extrabold text-slate-900 block text-sm">{{ $r->name }}</span>
                            <span class="text-xs text-slate-400 font-bold">{{ $r->phone }} &bull; {{ $r->vehicle_no ?? 'No Bike #' }}</span>
                        </div>
                        <span class="px-2 py-0.5 text-xs font-black uppercase {{ $r->status === 'On Delivery' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800' }}">
                            {{ $r->status }} ({{ $r->orders_count }} active)
                        </span>
                    </div>
                    @empty
                    <p class="text-xs text-slate-400 text-center py-4">No delivery riders registered yet.</p>
                    @endforelse
                </div>
            </div>
        </div>

        <!-- Active Delivery Orders Dispatch Table -->
        <div class="lg:col-span-2 bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 class="font-extrabold text-slate-900 text-base">Active Delivery Orders Dispatch Queue</h3>
                <span class="text-xs font-bold uppercase text-slate-500">{{ $activeDeliveries->count() }} Deliveries</span>
            </div>
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-400 bg-slate-100/50">
                        <th class="py-3 px-4">Order #</th>
                        <th class="py-3 px-4">Customer</th>
                        <th class="py-3 px-4">Net Amount</th>
                        <th class="py-3 px-4">Assigned Rider</th>
                        <th class="py-3 px-4 text-right">Assign / Update</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($activeDeliveries as $ord)
                    <tr>
                        <td class="py-3 px-4 font-black text-slate-900">{{ $ord->order_number }}</td>
                        <td class="py-3 px-4">
                            <span class="font-extrabold text-slate-900 block">{{ $ord->customer_name ?? 'Guest' }}</span>
                            <span class="text-xs text-slate-400 font-bold">{{ $ord->customer_phone ?? 'No Phone' }}</span>
                        </td>
                        <td class="py-3 px-4 font-black text-emerald-600">${{ number_format($ord->net_total, 2) }}</td>
                        <td class="py-3 px-4 font-bold text-slate-800">
                            {{ $ord->rider ? $ord->rider->name : 'Unassigned' }}
                            <span class="block text-xs font-semibold text-slate-400">({{ $ord->delivery_status ?? 'Pending' }})</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                            <form method="POST" action="{{ route('orders.assignRider', $ord->id) }}" class="flex items-center gap-1 justify-end">
                                @csrf
                                <select name="rider_id" class="px-2 py-1 text-xs border border-slate-300 font-bold">
                                    <option value="">-- Rider --</option>
                                    @foreach($riders as $r)
                                        <option value="{{ $r->id }}" {{ $ord->rider_id == $r->id ? 'selected' : '' }}>{{ $r->name }}</option>
                                    @endforeach
                                </select>
                                <select name="delivery_status" class="px-2 py-1 text-xs border border-slate-300">
                                    <option value="Assigned" {{ $ord->delivery_status === 'Assigned' ? 'selected' : '' }}>Assigned</option>
                                    <option value="Out for Delivery" {{ $ord->delivery_status === 'Out for Delivery' ? 'selected' : '' }}>Out for Delivery</option>
                                    <option value="Delivered" {{ $ord->delivery_status === 'Delivered' ? 'selected' : '' }}>Delivered</option>
                                </select>
                                <button type="submit" class="px-2 py-1 bg-slate-900 text-white text-xs font-bold shadow-sm">Save</button>
                            </form>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="5" class="py-8 text-center text-slate-400 font-medium">No active delivery orders pending dispatch.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
