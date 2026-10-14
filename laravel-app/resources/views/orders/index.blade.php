@extends('layouts.app')

@section('content')
<div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Order Management & Analytics</h1>
            <p class="text-slate-500 text-sm font-medium">Track order analytics, filter date ranges, and manage order statuses</p>
        </div>
        <a href="{{ route('orders.create') }}" class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition">
            + New Order
        </a>
    </div>

    <!-- Analytics Summary Widgets -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="bg-white p-5 border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">{{ __('Total') }} Net Sales</span>
            <span class="text-2xl font-black text-emerald-600 mt-1 block">{{ currency_symbol() }} {{ number_format($totalRevenue, 2) }}</span>
        </div>
        <div class="bg-white p-5 border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
            <span class="text-2xl font-black text-slate-900 mt-1 block">{{ number_format($totalOrdersCount) }}</span>
        </div>
        <div class="bg-white p-5 border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Running Orders</span>
            <span class="text-2xl font-black text-amber-600 mt-1 block">{{ number_format($runningOrdersCount) }}</span>
        </div>
        <div class="bg-white p-5 border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Complete Orders</span>
            <span class="text-2xl font-black text-blue-600 mt-1 block">{{ number_format($completedOrdersCount) }}</span>
        </div>
        <div class="bg-white p-5 border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Bill Generated</span>
            <span class="text-2xl font-black text-purple-600 mt-1 block">{{ number_format($billGeneratedCount) }}</span>
        </div>
    </div>

    <!-- Datewise & Status Filter Form -->
    <div class="bg-white p-4 border border-slate-200/80 shadow-sm">
        <form method="GET" action="{{ route('orders.index') }}" class="flex flex-wrap items-end gap-4">
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Start Date</label>
                <input type="date" name="start_date" value="{{ $startDate }}" class="px-4 py-2 border border-slate-200 text-sm font-bold text-slate-800">
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">End Date</label>
                <input type="date" name="end_date" value="{{ $endDate }}" class="px-4 py-2 border border-slate-200 text-sm font-bold text-slate-800">
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Status Filter</label>
                <select name="status" class="px-4 py-2 border border-slate-200 text-sm font-bold text-slate-700">
                    <option value="">All Statuses</option>
                    <option value="Running" {{ $status === 'Running' ? 'selected' : '' }}>🔵 Running</option>
                    <option value="Bill Generated" {{ $status === 'Bill Generated' ? 'selected' : '' }}>🟡 Bill Generated</option>
                    <option value="Complete" {{ ($status === 'Complete' || $status === 'Completed') ? 'selected' : '' }}>🟢 Completed</option>
                    <option value="Cancelled" {{ $status === 'Cancelled' ? 'selected' : '' }}>🔴 Cancelled</option>
                </select>
            </div>

            <div class="flex-1 min-w-[200px]">
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Search Order # / Customer</label>
                <input type="text" name="search" value="{{ $search }}" placeholder="Search order # or customer..." class="w-full px-4 py-2 border border-slate-200 text-sm font-medium">
            </div>

            <div>
                <button type="submit" class="px-5 py-2 bg-slate-900 text-white font-bold text-sm shadow-md hover:bg-slate-800 transition">
                    Filter Orders
                </button>
            </div>
        </form>
    </div>

    <!-- Orders Table -->
    <div class="bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                        <th class="py-4 px-6">Order Number</th>
                        <th class="py-4 px-6">Date</th>
                        <th class="py-4 px-6">Type</th>
                        <th class="py-4 px-6">Table</th>
                        <th class="py-4 px-6">Order Taker</th>
                        <th class="py-4 px-6">Items</th>
                        <th class="py-4 px-6 text-right">Bill Total</th>
                        <th class="py-4 px-6 text-right">Discount</th>
                        <th class="py-4 px-6 text-right">Service Charges</th>
                        <th class="py-4 px-6 text-right">Net Total</th>
                        <th class="py-4 px-6">Status</th>
                        <th class="py-4 px-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($orders as $order)
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6 font-extrabold text-slate-900">{{ $order->order_number }}</td>
                        <td class="py-4 px-6 text-slate-500 text-xs font-semibold">{{ $order->created_at->format('M d, Y h:i A') }}</td>
                        <td class="py-4 px-6"><span class="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold">{{ $order->order_type }}</span></td>
                        <td class="py-4 px-6 font-semibold text-slate-800">{{ $order->table->table_number ?? '-' }}</td>
                        <td class="py-4 px-6 text-xs font-bold text-slate-700">{{ $order->orderTaker->name ?? '-' }}</td>
                        <td class="py-4 px-6 font-bold">{{ $order->items_sum_quantity ?? 0 }} Items</td>
                        <td class="py-4 px-6 font-extrabold text-slate-900 text-right">{{ currency_symbol() }} {{ number_format($order->subtotal, 2) }}</td>
                        <td class="py-4 px-6 font-bold text-rose-600 text-right">- {{ currency_symbol() }} {{ number_format($order->discount_amount, 2) }}</td>
                        <td class="py-4 px-6 font-bold text-amber-700 text-right">+ {{ currency_symbol() }} {{ number_format($order->service_charge, 2) }}</td>
                        <td class="py-4 px-6 font-black text-emerald-700 text-right text-base">{{ currency_symbol() }} {{ number_format($order->net_total, 2) }}</td>
                        <td class="py-4 px-6">
                            <form method="POST" action="{{ route('orders.updateStatus', $order->id) }}">
                                @csrf
                                @method('PATCH')
                                <select name="order_status" onchange="this.form.submit()" class="px-2.5 py-1 text-xs font-extrabold cursor-pointer border
                                    {{ $order->order_status === 'Running' ? 'bg-sky-100 text-sky-900 border-sky-300' : '' }}
                                    {{ $order->order_status === 'Bill Generated' ? 'bg-amber-100 text-amber-900 border-amber-300' : '' }}
                                    {{ in_array($order->order_status, ['Complete', 'Completed']) ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : '' }}
                                    {{ $order->order_status === 'Cancelled' ? 'bg-rose-100 text-rose-900 border-rose-300' : '' }}">
                                    <option value="Running" {{ $order->order_status === 'Running' ? 'selected' : '' }}>🔵 Running</option>
                                    <option value="Bill Generated" {{ $order->order_status === 'Bill Generated' ? 'selected' : '' }}>🟡 Bill Generated</option>
                                    <option value="Completed" {{ in_array($order->order_status, ['Complete', 'Completed']) ? 'selected' : '' }}>🟢 Completed</option>
                                    <option value="Cancelled" {{ $order->order_status === 'Cancelled' ? 'selected' : '' }}>🔴 Cancelled</option>
                                </select>
                            </form>
                        </td>
                        <td class="py-4 px-6 text-right whitespace-nowrap space-x-1.5">
                            <a href="{{ route('orders.show', $order->id) }}" class="inline-flex items-center text-xs font-extrabold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 border border-orange-200 shadow-2xs">
                                View
                            </a>
                            <a href="{{ route('orders.receipt', $order->id) }}" target="_blank" class="inline-flex items-center text-xs font-extrabold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 border border-slate-200 shadow-2xs">
                                Print
                            </a>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="11" class="py-12 text-center text-slate-400 font-medium">No orders found for the selected filter criteria.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-slate-100">
            {{ $orders->links() }}
        </div>
    </div>
</div>
@endsection
