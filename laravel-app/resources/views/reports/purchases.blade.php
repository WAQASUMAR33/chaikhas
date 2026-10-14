@extends('layouts.app')

@section('content')
<div class="space-y-6">
    @include('reports.partials.header', ['reportTitle' => 'Purchases & Vendor Report'])

    <!-- Header (Screen Only) -->
    <div class="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Purchases & Vendor Inward Report</h1>
            <p class="text-slate-500 text-sm font-medium">Track vendor purchases, payment statuses, and supplier spending analysis</p>
        </div>

        <div class="flex items-center gap-3">
            <form method="GET" action="{{ route('reports.purchases') }}" class="flex items-center gap-2 bg-white p-2 border border-slate-200">
                <input type="date" name="start_date" value="{{ $startDate }}" class="px-2.5 py-1 border border-slate-300 text-xs font-bold">
                <span class="text-slate-400 font-bold">to</span>
                <input type="date" name="end_date" value="{{ $endDate }}" class="px-2.5 py-1 border border-slate-300 text-xs font-bold">
                <button type="submit" class="px-3 py-1 bg-slate-900 text-white font-extrabold text-xs">Filter</button>
            </form>
            <a href="{{ route('reports.index') }}" class="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm">
                ← Hub
            </a>
        </div>
    </div>

    <!-- Metrics Cards (Screen Only) -->
    <div class="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 border border-slate-200/80 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Purchases Spend</span>
            <span class="text-2xl font-black text-slate-900">{{ number_format($totalPurchases, 2) }}</span>
            <span class="block text-xs text-slate-500 font-medium mt-1">{{ $purchases->count() }} Inward Orders Logged</span>
        </div>

        <div class="bg-white p-5 border border-slate-200/80 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Paid Purchases Total</span>
            <span class="text-2xl font-black text-emerald-600">{{ number_format($paidPurchases, 2) }}</span>
            <span class="block text-xs text-slate-500 font-medium mt-1">Cleared Supplier Invoices</span>
        </div>

        <div class="bg-white p-5 border border-slate-200/80 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Unpaid / Outstanding Total</span>
            <span class="text-2xl font-black text-rose-600">{{ number_format($unpaidPurchases, 2) }}</span>
            <span class="block text-xs text-slate-500 font-medium mt-1">Pending Supplier Balances</span>
        </div>
    </div>

    <!-- Vendor Breakdown Cards -->
    <div class="bg-white p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h3 class="text-base font-extrabold text-slate-900">Vendor Spends Summary</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            @foreach($vendorBreakdown as $vendorName => $vData)
                <div class="p-4 bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                        <span class="font-extrabold text-slate-900 text-sm block">{{ $vendorName }}</span>
                        <span class="text-xs text-slate-500 font-semibold">{{ $vData['orders_count'] }} Orders</span>
                    </div>
                    <span class="font-black text-slate-900 text-sm">{{ number_format($vData['total_amount'], 2) }}</span>
                </div>
            @endforeach
        </div>
    </div>
</div>
@endsection
