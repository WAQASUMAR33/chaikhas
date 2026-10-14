@extends('layouts.app')

@section('content')
<div class="space-y-6">
    @include('reports.partials.header', ['reportTitle' => 'Menu Sales Performance Report'])

    <!-- Header (Screen Only) -->
    <div class="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Menu Sales Performance Report</h1>
            <p class="text-slate-500 text-sm font-medium">Analyze sales performance menu item wise, category wise, and date wise</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <a href="{{ route('reports.menu-sales', array_merge(request()->query(), ['export' => 'stream_pdf'])) }}" target="_blank" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5">
                📄 View PDF Report
            </a>
            <a href="{{ route('reports.menu-sales', array_merge(request()->query(), ['export' => 'pdf'])) }}" class="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5">
                ⬇️ Download PDF
            </a>
            <a href="{{ route('reports.menu-sales', array_merge(request()->query(), ['export' => 'csv'])) }}" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5">
                📊 Export CSV (Excel)
            </a>
            <a href="{{ route('reports.sales') }}" class="px-3.5 py-2 bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition">Sales Report</a>
        </div>
    </div>

    <!-- Analytics Summary Cards (Screen Only) -->
    <div class="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Total Units Sold</span>
            <span class="text-2xl font-black text-orange-600 mt-1 block">{{ number_format($grandTotalQty) }} Items</span>
        </div>
        <div class="bg-white p-5 border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Total Cancelled Qty</span>
            <span class="text-2xl font-black text-rose-600 mt-1 block">{{ number_format($grandTotalCancelledQty) }} Items</span>
        </div>
        <div class="bg-white p-5 border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Total Menu Revenue</span>
            <span class="text-2xl font-black text-emerald-600 mt-1 block">{{ number_format($grandTotalRevenue, 2) }}</span>
        </div>
        <div class="bg-white p-5 border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Top Selling Item</span>
            <span class="text-xl font-black text-slate-900 mt-1 block truncate">{{ $topItem->item_name ?? 'N/A' }}</span>
        </div>
    </div>

    <!-- Multi-Filter Form (Screen Only) -->
    <div class="no-print bg-white p-4 border border-slate-200/80 shadow-sm">
        <form method="GET" action="{{ route('reports.menu-sales') }}" class="flex flex-wrap items-end gap-4">
            <!-- Date Wise -->
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Start Date</label>
                <input type="date" name="start_date" value="{{ $startDate }}" class="px-4 py-2 border border-slate-200 text-sm font-bold text-slate-800">
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">End Date</label>
                <input type="date" name="end_date" value="{{ $endDate }}" class="px-4 py-2 border border-slate-200 text-sm font-bold text-slate-800">
            </div>

            <!-- Category Wise -->
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Category Wise</label>
                <select name="category_id" class="px-4 py-2 border border-slate-200 text-sm font-bold text-slate-700">
                    <option value="">All Categories</option>
                    @foreach($categories as $cat)
                        <option value="{{ $cat->id }}" {{ (string)$categoryId === (string)$cat->id ? 'selected' : '' }}>
                            {{ $cat->name }}
                        </option>
                    @endforeach
                </select>
            </div>

            <!-- Menu Item Wise -->
            <div class="flex-1 min-w-[200px]">
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Menu Item Wise</label>
                <input type="text" name="search" value="{{ $search }}" placeholder="Search menu item / dish..." class="w-full px-4 py-2 border border-slate-200 text-sm font-medium">
            </div>

            <div>
                <button type="submit" class="px-5 py-2 bg-orange-600 text-white font-bold text-sm shadow-md hover:bg-orange-500 transition">
                    Filter Menu Sales
                </button>
            </div>
        </form>
    </div>

    <!-- Menu Item Sales Table -->
    <div class="bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                        <th class="py-4 px-6">Rank</th>
                        <th class="py-4 px-6">Item / Dish Name</th>
                        <th class="py-4 px-6">Category</th>
                        <th class="py-4 px-6 text-center">Total Qty Sold</th>
                        <th class="py-4 px-6 text-center text-rose-700">Cancelled Qty</th>
                        <th class="py-4 px-6 text-right">Total Revenue</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($menuSales as $index => $item)
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6 font-extrabold text-slate-400">#{{ $index + 1 }}</td>
                        <td class="py-4 px-6 font-extrabold text-slate-900">{{ $item->item_name }}</td>
                        <td class="py-4 px-6">
                            <span class="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold">
                                {{ $item->category_name ?? 'General' }}
                            </span>
                        </td>
                        <td class="py-4 px-6 font-extrabold text-center text-orange-600">{{ number_format($item->total_qty) }}</td>
                        <td class="py-4 px-6 font-extrabold text-center text-rose-600">
                            @if($item->total_cancelled_qty > 0)
                                <span class="px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-md border border-rose-200 text-xs font-bold">{{ number_format($item->total_cancelled_qty) }}</span>
                            @else
                                <span class="text-slate-400">0</span>
                            @endif
                        </td>
                        <td class="py-4 px-6 font-black text-slate-900 text-right">{{ number_format($item->total_revenue, 2) }}</td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="6" class="py-12 text-center text-slate-400 font-medium">
                            No menu sales data found for the selected filter options.
                        </td>
                    </tr>
                    @endforelse
                </tbody>
                @if($menuSales->count() > 0)
                <tfoot>
                    <tr class="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                        <td colSpan="3" class="py-4 px-6 uppercase text-xs">Summary Total:</td>
                        <td class="py-4 px-6 text-center text-orange-600 text-base">{{ number_format($grandTotalQty) }}</td>
                        <td class="py-4 px-6 text-center text-rose-600 text-base">{{ number_format($grandTotalCancelledQty) }}</td>
                        <td class="py-4 px-6 text-right text-emerald-600 text-base">{{ number_format($grandTotalRevenue, 2) }}</td>
                    </tr>
                </tfoot>
                @endif
            </table>
        </div>
    </div>
</div>
@endsection
