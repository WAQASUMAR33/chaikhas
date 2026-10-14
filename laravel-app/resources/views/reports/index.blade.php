@extends('layouts.app')

@section('content')
<div class="space-y-6">
    @include('reports.partials.header', ['reportTitle' => 'Business Analytics & Executive Summary Report'])

    <!-- Header & Date Filter (Screen Only) -->
    <div class="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Business Analytics Hub</h1>
            <p class="text-slate-500 text-sm font-medium">Comprehensive financial, sales, inventory, purchase, and expense reporting</p>
        </div>

        <form method="GET" action="{{ route('reports.index') }}" class="flex items-center gap-3 bg-white p-2 border border-slate-200 shadow-xs">
            <input type="date" name="start_date" value="{{ $startDate }}" class="px-3 py-1.5 border border-slate-300 text-xs font-bold text-slate-700">
            <span class="text-slate-400 font-bold">to</span>
            <input type="date" name="end_date" value="{{ $endDate }}" class="px-3 py-1.5 border border-slate-300 text-xs font-bold text-slate-700">
            <button type="submit" class="px-4 py-1.5 bg-slate-900 text-white font-extrabold text-xs">Filter Range</button>
        </form>
    </div>

    <!-- Top KPI Cards (Screen Only) -->
    <div class="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 border border-slate-200/80 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Gross Revenue</span>
            <span class="text-2xl font-black text-slate-900">{{ number_format($totalRevenue, 2) }}</span>
            <span class="block text-xs text-emerald-600 font-bold mt-1">{{ $totalOrdersCount }} Completed Orders</span>
        </div>

        <div class="bg-white p-5 border border-slate-200/80 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Purchases Cost</span>
            <span class="text-2xl font-black text-slate-900">{{ number_format($totalPurchasesAmount, 2) }}</span>
            <span class="block text-xs text-slate-500 font-semibold mt-1">Vendor Raw Stock Orders</span>
        </div>

        <div class="bg-white p-5 border border-slate-200/80 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Operational Expenses</span>
            <span class="text-2xl font-black text-slate-900">{{ number_format($totalExpensesAmount, 2) }}</span>
            <span class="block text-xs text-rose-600 font-bold mt-1">Utilities, Salaries & Misc</span>
        </div>

        <div class="bg-white p-5 border border-slate-200/80 shadow-xs border-l-4 border-l-emerald-500">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Estimated Net Profit</span>
            <span class="text-2xl font-black {{ $netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600' }}">{{ number_format($netProfit, 2) }}</span>
            <span class="block text-xs text-slate-400 font-medium mt-1">Revenue - (Purchases + Expenses)</span>
        </div>
    </div>

    <!-- All Report Suites Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Report 1: Sales Report -->
        <a href="{{ route('reports.sales', ['start_date' => $startDate, 'end_date' => $endDate]) }}" class="bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-orange-500 transition group flex flex-col justify-between">
            <div class="space-y-2">
                <div class="w-10 h-10 bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg">
                    📈
                </div>
                <h3 class="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition">Overall Sales Report</h3>
                <p class="text-xs text-slate-500 font-medium">Analyze sales performance, total orders count, dine-in vs takeaway trends, and daily revenue breakdown.</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600">
                <span>View Sales Report</span>
                <span>→</span>
            </div>
        </a>

        <!-- Report 2: Menu Sales Report -->
        <a href="{{ route('reports.menu-sales', ['start_date' => $startDate, 'end_date' => $endDate]) }}" class="bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-orange-500 transition group flex flex-col justify-between">
            <div class="space-y-2">
                <div class="w-10 h-10 bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg">
                    🍕
                </div>
                <h3 class="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition">Menu & Category Sales Report</h3>
                <p class="text-xs text-slate-500 font-medium">Track top selling dishes, category performance, itemized quantities sold, and item revenue.</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600">
                <span>View Menu Sales</span>
                <span>→</span>
            </div>
        </a>

        <!-- Report 3: Inventory Stock Valuation Report -->
        <a href="{{ route('reports.inventory') }}" class="bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-orange-500 transition group flex flex-col justify-between">
            <div class="space-y-2">
                <div class="w-10 h-10 bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg">
                    📦
                </div>
                <h3 class="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition">Inventory & Stock Valuation</h3>
                <p class="text-xs text-slate-500 font-medium">Main store stock valuation, kitchen-wise stock assets, and low-stock alert monitoring.</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600">
                <span>View Inventory Report</span>
                <span>→</span>
            </div>
        </a>

        <!-- Report 4: Purchases & Vendor Inward Report -->
        <a href="{{ route('reports.purchases', ['start_date' => $startDate, 'end_date' => $endDate]) }}" class="bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-orange-500 transition group flex flex-col justify-between">
            <div class="space-y-2">
                <div class="w-10 h-10 bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-lg">
                    🛍️
                </div>
                <h3 class="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition">Purchases & Vendor Report</h3>
                <p class="text-xs text-slate-500 font-medium">Vendor inward purchases, payment status (Paid/Unpaid/Partial), and vendor-wise total spends.</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600">
                <span>View Purchases Report</span>
                <span>→</span>
            </div>
        </a>

        <!-- Report 5: Expenses Report -->
        <a href="{{ route('reports.expenses', ['start_date' => $startDate, 'end_date' => $endDate]) }}" class="bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-orange-500 transition group flex flex-col justify-between">
            <div class="space-y-2">
                <div class="w-10 h-10 bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg">
                    💸
                </div>
                <h3 class="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition">Operational Expenses Report</h3>
                <p class="text-xs text-slate-500 font-medium">Category-wise expense breakdown, utility bills, staff wages, and daily petty cash expenses.</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600">
                <span>View Expenses Report</span>
                <span>→</span>
            </div>
        </a>

        <!-- Report 6: Day End Reconciliation -->
        <a href="{{ route('dayend.index') }}" class="bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-orange-500 transition group flex flex-col justify-between">
            <div class="space-y-2">
                <div class="w-10 h-10 bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">
                    🌙
                </div>
                <h3 class="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition">Day End Reconciliation</h3>
                <p class="text-xs text-slate-500 font-medium">Cash drawer closing audits, shift variance reports, cash overage/shortage records.</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600">
                <span>View Day End Reconciliation</span>
                <span>→</span>
            </div>
        </a>
    </div>
</div>
@endsection
