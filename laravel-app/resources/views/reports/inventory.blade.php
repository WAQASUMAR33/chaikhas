@extends('layouts.app')

@section('content')
<div class="space-y-6">
    @include('reports.partials.header', ['reportTitle' => 'Inventory Stock Valuation Report'])

    <!-- Header (Screen Only) -->
    <div class="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Inventory & Stock Valuation Report</h1>
            <p class="text-slate-500 text-sm font-medium">Asset value report of raw materials across Main Store and Kitchen Stores</p>
        </div>
        <a href="{{ route('reports.index') }}" class="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm">
            ← All Reports Hub
        </a>
    </div>

    <!-- Summary Cards (Screen Only) -->
    <div class="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 border border-slate-200/80 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Main Store Asset Value</span>
            <span class="text-2xl font-black text-slate-900">{{ number_format($mainStoreValuation, 2) }}</span>
            <span class="block text-xs text-slate-500 font-medium mt-1">{{ $mainStocks->count() }} Raw Material Items</span>
        </div>

        <div class="bg-white p-5 border border-slate-200/80 shadow-xs">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Kitchen Store Asset Value</span>
            <span class="text-2xl font-black text-orange-600">{{ number_format($kitchenStoreValuation, 2) }}</span>
            <span class="block text-xs text-slate-500 font-medium mt-1">{{ $kitchenStocks->count() }} Station Items</span>
        </div>

        <div class="bg-white p-5 border border-slate-200/80 shadow-xs border-l-4 border-l-emerald-500">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Combined Stock Value</span>
            <span class="text-2xl font-black text-emerald-600">{{ number_format($totalValuation, 2) }}</span>
            <span class="block text-xs text-rose-600 font-bold mt-1">{{ $lowStockItems->count() }} Items at Low Stock Alert</span>
        </div>
    </div>

    <!-- Main Store Stock Table -->
    <div class="bg-white border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-6">
        <h3 class="text-base font-extrabold text-slate-900">Main Store Stock Valuation Breakdown</h3>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                        <th class="py-3 px-4">Raw Item</th>
                        <th class="py-3 px-4">Category</th>
                        <th class="py-3 px-4">Quantity on Hand</th>
                        <th class="py-3 px-4">Avg Unit Cost</th>
                        <th class="py-3 px-4">Total Stock Value</th>
                        <th class="py-3 px-4">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($mainStocks as $stock)
                    @php $itemVal = $stock->quantity * $stock->avg_unit_cost; @endphp
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-3 px-4 font-extrabold text-slate-900">{{ $stock->item->item_name ?? '-' }}</td>
                        <td class="py-3 px-4 text-xs font-bold text-slate-500">{{ $stock->item->category ?? 'General' }}</td>
                        <td class="py-3 px-4 font-bold text-slate-800">{{ number_format($stock->quantity, 2) }} {{ $stock->item->unit ?? '' }}</td>
                        <td class="py-3 px-4 font-extrabold text-slate-900">{{ number_format($stock->avg_unit_cost, 2) }}</td>
                        <td class="py-3 px-4 font-black text-slate-900">{{ number_format($itemVal, 2) }}</td>
                        <td class="py-3 px-4">
                            @if($stock->quantity <= ($stock->item->min_stock_alert ?? 5))
                                <span class="px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-800">Low Alert</span>
                            @else
                                <span class="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800">Optimal</span>
                            @endif
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="6" class="py-8 text-center text-slate-400 font-medium">No items registered in Main Store.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
