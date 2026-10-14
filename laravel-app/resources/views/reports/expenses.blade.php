@extends('layouts.app')

@section('content')
<div class="space-y-6">
    @include('reports.partials.header', ['reportTitle' => 'Operational Expenses Report'])

    <!-- Header (Screen Only) -->
    <div class="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Operational Expenses Analytics</h1>
            <p class="text-slate-500 text-sm font-medium">Category-wise expense breakdown, utility bills, salaries, and daily petty cash logs</p>
        </div>

        <div class="flex items-center gap-3">
            <form method="GET" action="{{ route('reports.expenses') }}" class="flex items-center gap-2 bg-white p-2 border border-slate-200">
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

    <!-- Summary KPI Card (Screen Only) -->
    <div class="no-print bg-white p-6 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Expenses (Selected Period)</span>
            <span class="text-3xl font-black text-rose-600">{{ number_format($totalExpenses, 2) }}</span>
        </div>
        <span class="px-4 py-2 bg-rose-100 text-rose-800 text-xs font-extrabold">{{ $expenses->count() }} Recorded Entries</span>
    </div>

    <!-- Category Breakdown Grid -->
    <div class="bg-white p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h3 class="text-base font-extrabold text-slate-900">Category-Wise Expense Distribution</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            @foreach($categoryBreakdown as $catName => $cData)
                <div class="p-4 bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                        <span class="font-extrabold text-slate-900 text-sm block">{{ $catName }}</span>
                        <span class="text-xs text-slate-500 font-semibold">{{ $cData['count'] }} Vouchers</span>
                    </div>
                    <span class="font-black text-rose-600 text-sm">{{ number_format($cData['total_amount'], 2) }}</span>
                </div>
            @endforeach
        </div>
    </div>
</div>
@endsection
