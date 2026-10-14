@extends('layouts.app')

@section('content')
<div class="space-y-6">
    @include('reports.partials.header', ['reportTitle' => 'Sale Report'])

    <!-- Header (Screen Only) -->
    <div class="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Sales Analytics & Financial Report</h1>
            <p class="text-slate-500 text-sm font-medium">Complete breakdown of bill subtotals, service charges, discounts, and net total sales</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <a href="{{ route('reports.sales', array_merge(request()->query(), ['export' => 'stream_pdf'])) }}" target="_blank" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5">
                📄 View PDF Report
            </a>
            <a href="{{ route('reports.sales', array_merge(request()->query(), ['export' => 'pdf'])) }}" class="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5">
                ⬇️ Download PDF
            </a>
            <a href="{{ route('reports.sales', array_merge(request()->query(), ['export' => 'csv'])) }}" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5">
                📊 Export CSV (Excel)
            </a>
            <a href="{{ route('reports.menu-sales') }}" class="px-3.5 py-2 bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition">Item Sales Report</a>
        </div>
    </div>

    <!-- Date Filter Form (Screen Only) -->
    <div class="no-print bg-white p-4 border border-slate-200/80 shadow-sm">
        <form method="GET" action="{{ route('reports.sales') }}" class="flex flex-wrap items-center gap-4">
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Start Date</label>
                <input type="date" name="start_date" value="{{ $startDate }}" class="px-4 py-2 border border-slate-300 text-sm font-bold">
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">End Date</label>
                <input type="date" name="end_date" value="{{ $endDate }}" class="px-4 py-2 border border-slate-300 text-sm font-bold">
            </div>

            @if(Auth::user()->role === 'super_admin')
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Branch</label>
                <select name="branch_id" class="px-4 py-2 border border-slate-300 text-sm font-bold">
                    <option value="">All Branches</option>
                    @foreach($branches as $b)
                    <option value="{{ $b->id }}" {{ $selectedBranch == $b->id ? 'selected' : '' }}>{{ $b->branch_name ?? $b->name }}</option>
                    @endforeach
                </select>
            </div>
            @endif

            <div class="self-end">
                <button type="submit" class="px-5 py-2.5 bg-slate-900 text-white font-bold text-sm shadow-md">Filter Sales</button>
            </div>
        </form>
    </div>

    <!-- Financial Summary KPI Cards (Screen Only) -->
    <div class="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 border border-slate-200/80 shadow-xs">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Bill Subtotal</span>
            <span class="text-2xl font-black text-slate-900 mt-1 block">{{ number_format($totalSubtotal, 2) }}</span>
            <span class="block text-xs text-slate-500 font-semibold mt-1">{{ $totalOrders }} Total Orders</span>
        </div>

        <div class="bg-white p-5 border border-slate-200/80 shadow-xs">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Service Charges Total</span>
            <span class="text-2xl font-black text-amber-600 mt-1 block">+ {{ number_format($totalServiceCharge, 2) }}</span>
            <span class="block text-xs text-slate-500 font-semibold mt-1">{{ $dineInOrders }} Dine In Orders</span>
        </div>

        <div class="bg-white p-5 border border-slate-200/80 shadow-xs">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Total Discounts Allowed</span>
            <span class="text-2xl font-black text-rose-600 mt-1 block">- {{ number_format($totalDiscount, 2) }}</span>
            <span class="block text-xs text-slate-500 font-semibold mt-1">Bill Discounts Applied</span>
        </div>

        <div class="bg-white p-5 border border-slate-200/80 shadow-xs border-l-4 border-l-emerald-500">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Net Sales Revenue</span>
            <span class="text-2xl font-black text-emerald-600 mt-1 block">{{ number_format($totalSales, 2) }}</span>
            <span class="block text-xs text-slate-500 font-semibold mt-1">Subtotal + Service - Discount</span>
        </div>
    </div>

    <!-- Sales Detailed Table -->
    <div class="bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                        <th class="py-4 px-6">Date / Time</th>
                        <th class="py-4 px-6">Order #</th>
                        <th class="py-4 px-6">Type</th>
                        <th class="py-4 px-6">Payment Mode</th>
                        <th class="py-4 px-6 text-right">Bill Subtotal</th>
                        <th class="py-4 px-6 text-right">Service Charges</th>
                        <th class="py-4 px-6 text-right">Discount</th>
                        <th class="py-4 px-6 text-right">Net Total</th>
                        <th class="py-4 px-6 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($orders as $o)
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6 text-slate-500 text-xs font-semibold">{{ $o->created_at->format('M d, Y h:i A') }}</td>
                        <td class="py-4 px-6 font-extrabold text-slate-900">{{ $o->order_number }}</td>
                        <td class="py-4 px-6">
                            <span class="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-bold">{{ $o->order_type }}</span>
                        </td>
                        <td class="py-4 px-6 font-bold text-slate-800">
                            {{ $o->payment_mode ?? 'Cash' }}
                            @if($o->payment_status === 'Paid')
                                <span class="text-[10px] text-emerald-600 font-extrabold ml-1">(PAID)</span>
                            @endif
                        </td>
                        <td class="py-4 px-6 font-extrabold text-slate-900 text-right">{{ number_format($o->subtotal, 2) }}</td>
                        <td class="py-4 px-6 font-bold text-amber-700 text-right">+ {{ number_format($o->service_charge, 2) }}</td>
                        <td class="py-4 px-6 font-bold text-rose-600 text-right">- {{ number_format($o->discount_amount, 2) }}</td>
                        <td class="py-4 px-6 font-black text-emerald-700 text-right text-base">{{ number_format($o->net_total, 2) }}</td>
                        <td class="py-4 px-6 text-right">
                            <a href="{{ route('orders.show', $o->id) }}" class="text-xs font-bold text-orange-600 hover:text-orange-800 bg-orange-50 px-3 py-1 border border-orange-200">
                                View Bill →
                            </a>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="9" class="py-12 text-center text-slate-400 font-medium">No sales transactions found for the selected date range.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
