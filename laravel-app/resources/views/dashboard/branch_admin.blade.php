@extends('layouts.app')

@section('content')
<div class="space-y-8">
    <!-- Header Banner -->
    <div class="bg-transparent py-2 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#026897]/15 to-sky-100 text-[#026897] text-xs font-black mb-1.5 border border-sky-300/60 shadow-2xs">
                <span>📍 {{ Auth::user()->branch->branch_name ?? __('Branch Dashboard') }}</span>
            </div>
            <h1 class="text-2xl md:text-3xl font-black tracking-tight text-slate-900">{{ __('Branch Operations Console') }}</h1>
            <p class="text-slate-500 text-xs md:text-sm font-medium mt-0.5">{{ __('Live order tracking, table seating status, and daily sales metrics') }}</p>
        </div>
        <a href="{{ route('orders.create') }}" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#026897] to-[#0284c7] hover:from-[#01547b] hover:to-[#026897] text-white font-black text-xs shadow-md shadow-[#026897]/25 transition transform hover:-translate-y-0.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            {{ __('Open POS / New Order') }}
        </a>
    </div>

    <!-- High Definition Styling System -->
    <style>
        .hd-widget-ocean {
            background: linear-gradient(135deg, #026897 0%, #0284c7 50%, #0369a1 100%) !important;
            box-shadow: 0 12px 28px -6px rgba(2, 104, 151, 0.45), 0 8px 12px -6px rgba(2, 104, 151, 0.3) !important;
            border: 1px solid rgba(56, 189, 248, 0.4) !important;
        }
        .hd-widget-emerald {
            background: linear-gradient(135deg, #047857 0%, #059669 45%, #10b981 100%) !important;
            box-shadow: 0 12px 28px -6px rgba(5, 150, 105, 0.45), 0 8px 12px -6px rgba(5, 150, 105, 0.3) !important;
            border: 1px solid rgba(52, 211, 153, 0.4) !important;
        }
        .hd-widget-blue {
            background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%) !important;
            box-shadow: 0 12px 28px -6px rgba(37, 99, 235, 0.45), 0 8px 12px -6px rgba(37, 99, 235, 0.3) !important;
            border: 1px solid rgba(96, 165, 250, 0.4) !important;
        }
        .hd-widget-amber {
            background: linear-gradient(135deg, #c2410c 0%, #d97706 45%, #f59e0b 100%) !important;
            box-shadow: 0 12px 28px -6px rgba(217, 119, 6, 0.45), 0 8px 12px -6px rgba(217, 119, 6, 0.3) !important;
            border: 1px solid rgba(251, 191, 36, 0.4) !important;
        }
        .hd-widget-rose {
            background: linear-gradient(135deg, #be123c 0%, #e11d48 50%, #f43f5e 100%) !important;
            box-shadow: 0 12px 28px -6px rgba(225, 29, 72, 0.45), 0 8px 12px -6px rgba(225, 29, 72, 0.3) !important;
            border: 1px solid rgba(251, 113, 133, 0.4) !important;
        }
        .hd-badge-dinein {
            background: linear-gradient(135deg, #026897 0%, #0284c7 100%) !important;
            box-shadow: 0 4px 12px rgba(2, 104, 151, 0.35) !important;
        }
        .hd-badge-takeaway {
            background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%) !important;
            box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35) !important;
        }
        .hd-badge-delivery {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.35) !important;
        }
    </style>

    @if(isset($lowStockCount) && $lowStockCount > 0)
    <div class="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-none shadow-xs">
        <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-none bg-rose-500 text-white flex items-center justify-center font-black text-lg">
                    ⚠️
                </div>
                <div>
                    <h3 class="text-sm font-black text-rose-900 tracking-tight flex items-center gap-2">
                        <span>{{ __('CRITICAL INVENTORY ALERT') }}</span>
                        <span class="px-2 py-0.5 rounded-none bg-rose-200 text-rose-900 text-[10px] font-black uppercase">{{ $lowStockCount }} {{ __('items depleted') }}</span>
                    </h3>
                    <p class="text-xs font-semibold text-rose-700 mt-0.5">
                        {{ __('The following raw materials have breached their minimum reorder thresholds. Restock immediately via Purchase Order.') }}
                    </p>
                </div>
            </div>
            <a href="{{ route('purchases.create') }}" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-none bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider transition shadow-sm">
                <span>+ {{ __('Create Purchase Order') }}</span>
            </a>
        </div>
        <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-2 border-t border-rose-200">
            @foreach($lowStockItems->take(8) as $item)
                @php
                    $curStock = ($item->mainStoreStock->quantity ?? 0) + $item->kitchenStoreStocks->sum('quantity');
                @endphp
                <div class="p-2 bg-white border border-rose-200 rounded-none flex items-center justify-between text-xs">
                    <span class="font-bold text-slate-800 truncate" title="{{ $item->item_name }}">{{ $item->item_name }}</span>
                    <span class="font-black text-rose-600 whitespace-nowrap">{{ $curStock }} / {{ $item->min_stock_alert }} {{ $item->unit }}</span>
                </div>
            @endforeach
        </div>
    </div>
    @endif

    <!-- High Definition Metrics Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Active Running Orders (Vivid Sunset Amber HD Gradient) -->
        <div class="hd-widget-amber p-6 rounded-2xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div class="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/15 blur-xl pointer-events-none group-hover:scale-125 transition"></div>
            <div class="flex items-center justify-between mb-4 relative z-10">
                <span class="text-xs font-black uppercase tracking-wider text-amber-100">{{ __('Active Kitchen Orders') }}</span>
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-xl shadow-inner">
                    ⚡
                </div>
            </div>
            <div class="relative z-10 flex items-baseline justify-between">
                <span class="text-3xl font-black text-white tracking-tight">{{ $runningOrders }}</span>
                <span class="text-[11px] font-black bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white flex items-center gap-1 border border-white/20">
                    <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    {{ __('Live') }}
                </span>
            </div>
            <span class="block text-xs text-amber-100/90 mt-2 font-medium relative z-10">{{ __('In kitchen & serving') }}</span>
        </div>

        <!-- Available Tables (Vivid Emerald HD Gradient) -->
        <div class="hd-widget-emerald p-6 rounded-2xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div class="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/15 blur-xl pointer-events-none group-hover:scale-125 transition"></div>
            <div class="flex items-center justify-between mb-4 relative z-10">
                <span class="text-xs font-black uppercase tracking-wider text-emerald-100">{{ __('Available Tables') }}</span>
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-xl shadow-inner">
                    🪑
                </div>
            </div>
            <div class="relative z-10 flex items-baseline justify-between">
                <span class="text-3xl font-black text-white tracking-tight">{{ $availableTables }} <span class="text-emerald-200 text-xl font-bold">/ {{ $totalTables }}</span></span>
                <span class="text-[11px] font-black bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white border border-white/20">
                    {{ $occupiedTables }} {{ __('Occupied') }}
                </span>
            </div>
            <span class="block text-xs text-emerald-100/90 mt-2 font-medium relative z-10">{{ __('Dining & Seating Capacity') }}</span>
        </div>

        <!-- Today's Sales (Vivid Ocean HD Gradient) -->
        <div class="hd-widget-ocean p-6 rounded-2xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div class="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition"></div>
            <div class="flex items-center justify-between mb-4 relative z-10">
                <span class="text-xs font-black uppercase tracking-wider text-sky-100">{{ __('Today\'s Sales') }}</span>
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-xl shadow-inner">
                    💰
                </div>
            </div>
            <div class="relative z-10">
                <span class="text-3xl font-black text-white tracking-tight">
                    {{ currency_symbol() }} {{ number_format($todaySales, 2) }}
                </span>
            </div>
            <div class="flex items-center justify-between mt-2 text-xs text-sky-100/90 font-bold relative z-10">
                <span>{{ __('Gross Revenue') }}</span>
                <span class="text-[11px] font-black bg-white/20 px-2 py-0.5 rounded-full text-white">Live</span>
            </div>
        </div>

        <!-- Today's Expenses (Vivid Ruby/Rose HD Gradient) -->
        <div class="hd-widget-rose p-6 rounded-2xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div class="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/15 blur-xl pointer-events-none group-hover:scale-125 transition"></div>
            <div class="flex items-center justify-between mb-4 relative z-10">
                <span class="text-xs font-black uppercase tracking-wider text-rose-100">{{ __('Today\'s Expenses') }}</span>
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-xl shadow-inner">
                    📉
                </div>
            </div>
            <div class="relative z-10">
                <span class="text-3xl font-black text-white tracking-tight">
                    {{ currency_symbol() }} {{ number_format($todayExpenses, 2) }}
                </span>
            </div>
            <span class="block text-xs text-rose-100/90 mt-2 font-medium relative z-10">{{ __('Daily Logged Expenses') }}</span>
        </div>
    </div>

    <!-- High Definition Graphical Analytics Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 7-Day Revenue Velocity & Orders Trend Area Chart -->
        <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl hd-badge-dinein text-white flex items-center justify-center font-black text-lg shadow-sm">
                        📈
                    </div>
                    <div>
                        <h2 class="text-base font-black text-slate-900 tracking-tight">{{ __('Branch Sales & Revenue Velocity') }}</h2>
                        <p class="text-xs text-slate-500 font-medium mt-0.5">{{ __('Daily branch revenue and volume trend (Last 7 Days)') }}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2.5">
                    <span class="px-3 py-1.5 rounded-xl hd-badge-dinein text-white font-black text-xs shadow-md">
                        {{ currency_symbol() }} {{ number_format(array_sum($trendData['sales']), 2) }} {{ __('Total') }}
                    </span>
                    <span class="px-3 py-1.5 rounded-xl hd-badge-takeaway text-white font-black text-xs shadow-md">
                        {{ array_sum($trendData['orders']) }} {{ __('Orders') }}
                    </span>
                </div>
            </div>
            <div class="pt-4 flex-1">
                <div id="branch-chart-revenue-trend" class="w-full h-72"></div>
            </div>
        </div>

        <!-- Dining Channels Distribution Donut Chart -->
        <div class="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div class="pb-4 border-b border-slate-100 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl hd-badge-delivery text-white flex items-center justify-center font-black text-lg shadow-sm">
                    🍽️
                </div>
                <div>
                    <h2 class="text-base font-black text-slate-900 tracking-tight">{{ __('Dining Channels') }}</h2>
                    <p class="text-xs text-slate-500 font-medium mt-0.5">{{ __('Distribution across dine in, takeaway & delivery') }}</p>
                </div>
            </div>
            <div class="pt-4 flex-1 flex flex-col items-center justify-center">
                <div id="branch-chart-order-types" class="w-full flex justify-center"></div>
                <!-- High Definition Channel Badges -->
                <div class="grid grid-cols-3 gap-2 w-full pt-4 mt-2 border-t border-slate-100 text-center">
                    <div class="p-2.5 rounded-xl hd-badge-dinein text-white shadow-md">
                        <span class="block text-[10px] font-black uppercase tracking-wider text-sky-100">{{ __('Dine In') }}</span>
                        <span class="text-lg font-black">{{ $orderTypeData['series'][0] }}</span>
                    </div>
                    <div class="p-2.5 rounded-xl hd-badge-takeaway text-white shadow-md">
                        <span class="block text-[10px] font-black uppercase tracking-wider text-amber-100">{{ __('Takeaway') }}</span>
                        <span class="text-lg font-black">{{ $orderTypeData['series'][1] }}</span>
                    </div>
                    <div class="p-2.5 rounded-xl hd-badge-delivery text-white shadow-md">
                        <span class="block text-[10px] font-black uppercase tracking-wider text-emerald-100">{{ __('Delivery') }}</span>
                        <span class="text-lg font-black">{{ $orderTypeData['series'][2] }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    @if(!empty($topItemsData['labels']))
    <!-- Top Selling Dishes Bar Chart -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl hd-badge-takeaway text-white flex items-center justify-center font-black text-lg shadow-sm">
                    🔥
                </div>
                <div>
                    <h2 class="text-base font-black text-slate-900 tracking-tight">{{ __('Top Performing Dishes') }}</h2>
                    <p class="text-xs text-slate-500 font-medium mt-0.5">{{ __('Leading culinary items by sales revenue at this branch') }}</p>
                </div>
            </div>
            <span class="px-3 py-1 rounded-full hd-badge-takeaway text-white font-extrabold text-xs shadow-md">
                {{ __('Best Sellers') }}
            </span>
        </div>
        <div class="pt-4">
            <div id="branch-chart-top-items" class="w-full h-64"></div>
        </div>
    </div>
    @endif

    <!-- Recent Branch Orders -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-md p-6">
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl hd-badge-dinein text-white flex items-center justify-center font-black text-lg shadow-sm">
                    🧾
                </div>
                <div>
                    <h2 class="text-lg font-black text-slate-900">{{ __('Recent Branch Orders') }}</h2>
                    <p class="text-xs text-slate-500 font-medium mt-0.5">{{ __('Latest transactions processed today') }}</p>
                </div>
            </div>
            <a href="{{ route('orders.index') }}" class="inline-flex items-center gap-1.5 text-xs font-black text-white hd-badge-dinein hover:opacity-90 px-4 py-2 rounded-xl transition shadow-md">
                {{ __('View All Orders') }} →
            </a>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left rtl:text-right border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-50/80">
                        <th class="py-3.5 px-4 rounded-l-xl rtl:rounded-l-none rtl:rounded-r-xl">{{ __('Order #') }}</th>
                        <th class="py-3.5 px-4">{{ __('Type') }}</th>
                        <th class="py-3.5 px-4">{{ __('Table') }}</th>
                        <th class="py-3.5 px-4">{{ __('Total') }}</th>
                        <th class="py-3.5 px-4">{{ __('Status') }}</th>
                        <th class="py-3.5 px-4 text-right rtl:text-left rounded-r-xl rtl:rounded-r-none rtl:rounded-l-xl">{{ __('Actions') }}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($recentOrders as $order)
                    <tr class="hover:bg-sky-50/40 transition">
                        <td class="py-4 px-4 font-black text-slate-900">{{ $order->order_number }}</td>
                        <td class="py-4 px-4">
                            <span class="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-black border border-slate-200/80">{{ $order->order_type }}</span>
                        </td>
                        <td class="py-4 px-4 font-bold text-slate-800">{{ $order->table->table_number ?? '-' }}</td>
                        <td class="py-4 px-4 font-black text-slate-900">{{ currency_symbol() }} {{ number_format($order->net_total, 2) }}</td>
                        <td class="py-4 px-4">
                            <span class="px-3 py-1 rounded-full text-xs font-black border
                                {{ $order->order_status === 'Running' ? 'bg-amber-500 text-white border-amber-400 shadow-sm shadow-amber-500/20' : '' }}
                                {{ $order->order_status === 'Ready' ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/20' : '' }}
                                {{ $order->order_status === 'Completed' ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-500/20' : '' }}
                                {{ $order->order_status === 'Cancelled' ? 'bg-rose-500 text-white border-rose-400 shadow-sm shadow-rose-500/20' : '' }}
                                {{ $order->order_status === 'Bill Generated' ? 'bg-amber-500 text-white border-amber-400 shadow-sm shadow-amber-500/20' : '' }}">
                                {{ $order->order_status }}
                            </span>
                        </td>
                        <td class="py-4 px-4 text-right rtl:text-left">
                            <a href="{{ route('orders.show', $order->id) }}" class="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 hover:bg-sky-100 text-[#026897] hover:text-[#01547b] border border-sky-200/80 font-black text-xs rounded-lg transition">
                                {{ __('Details') }} →
                            </a>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="6" class="py-8 text-center text-slate-400 font-medium">{{ __('No orders created today yet.') }}</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- ApexCharts Initialization Scripts for Branch Dashboard -->
<script>
document.addEventListener('DOMContentLoaded', function () {
    const currency = "{{ currency_symbol() }}";

    // 1. Revenue & Sales Velocity Area Chart (High Definition Colors)
    const trendOptions = {
        series: [{
            name: "{{ __('Revenue') }}",
            type: 'area',
            data: @json($trendData['sales'])
        }, {
            name: "{{ __('Orders') }}",
            type: 'line',
            data: @json($trendData['orders'])
        }],
        chart: {
            height: 280,
            type: 'line',
            fontFamily: 'inherit',
            toolbar: { show: false },
            zoom: { enabled: false }
        },
        colors: ['#0284c7', '#f59e0b'],
        stroke: {
            curve: 'smooth',
            width: [3.5, 2.5],
            dashArray: [0, 4]
        },
        fill: {
            type: ['gradient', 'solid'],
            gradient: {
                shade: 'light',
                type: 'vertical',
                shadeIntensity: 0.7,
                gradientToColors: ['#00d2ff'],
                inverseColors: false,
                opacityFrom: 0.65,
                opacityTo: 0.08,
                stops: [0, 95, 100]
            }
        },
        markers: {
            size: [5, 4],
            strokeWidth: 2,
            colors: ['#0284c7', '#f59e0b'],
            strokeColors: '#ffffff',
            hover: { size: 7 }
        },
        xaxis: {
            categories: @json($trendData['labels']),
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: { colors: '#64748b', fontSize: '11px', fontWeight: 700 }
            }
        },
        yaxis: [{
            title: { text: "{{ __('Revenue') }} (" + currency + ")", style: { color: '#0284c7', fontWeight: 800, fontSize: '11px' } },
            labels: {
                formatter: function (val) {
                    return currency + ' ' + (val ? val.toLocaleString() : 0);
                },
                style: { colors: '#64748b', fontSize: '11px', fontWeight: 700 }
            }
        }, {
            opposite: true,
            title: { text: "{{ __('Orders') }}", style: { color: '#f59e0b', fontWeight: 800, fontSize: '11px' } },
            labels: {
                formatter: function (val) {
                    return Math.round(val);
                },
                style: { colors: '#64748b', fontSize: '11px', fontWeight: 700 }
            }
        }],
        tooltip: {
            shared: true,
            intersect: false,
            theme: 'dark',
            y: {
                formatter: function (y, { seriesIndex }) {
                    if (seriesIndex === 0) {
                        return currency + ' ' + (y ? y.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00');
                    }
                    return y + " {{ __('Orders') }}";
                }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            fontWeight: 800,
            fontSize: '12px'
        },
        grid: {
            borderColor: '#f1f5f9',
            strokeDashArray: 4
        }
    };
    new ApexCharts(document.querySelector("#branch-chart-revenue-trend"), trendOptions).render();

    // 2. Dining Channels Donut Chart (High Definition Saturated Colors)
    const orderTypeSeries = @json($orderTypeData['series']);
    const hasOrderTypes = orderTypeSeries.some(s => s > 0);
    const orderTypeOptions = {
        series: hasOrderTypes ? orderTypeSeries : [1],
        labels: hasOrderTypes ? @json($orderTypeData['labels']) : ["{{ __('No Orders Yet') }}"],
        chart: {
            type: 'donut',
            height: 220,
            fontFamily: 'inherit'
        },
        colors: hasOrderTypes ? ['#0284c7', '#f59e0b', '#10b981'] : ['#cbd5e1'],
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: "{{ __('Total') }}",
                            fontSize: '13px',
                            fontWeight: 900,
                            color: '#0f172a',
                            formatter: function () {
                                return {{ $orderTypeData['total'] }};
                            }
                        }
                    }
                }
            }
        },
        dataLabels: { enabled: false },
        legend: { show: false },
        stroke: { width: 3, colors: ['#ffffff'] }
    };
    new ApexCharts(document.querySelector("#branch-chart-order-types"), orderTypeOptions).render();

    @if(!empty($topItemsData['labels']))
    // 3. Top Selling Dishes Bar Chart (High Definition Multi-Hue Gradient Bars)
    const topItemsOptions = {
        series: [{
            name: "{{ __('Sales') }}",
            data: @json($topItemsData['sales'])
        }],
        chart: {
            type: 'bar',
            height: 240,
            fontFamily: 'inherit',
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                borderRadius: 8,
                horizontal: true,
                barHeight: '55%',
                distributed: true
            }
        },
        colors: ['#026897', '#0284c7', '#0d9488', '#f59e0b', '#8b5cf6'],
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return currency + ' ' + (val ? val.toLocaleString() : 0);
            },
            style: { fontSize: '11px', fontWeight: 900, colors: ['#0f172a'] },
            offsetX: 10
        },
        xaxis: {
            categories: @json($topItemsData['labels']),
            labels: {
                style: { colors: '#64748b', fontSize: '10px', fontWeight: 700 }
            }
        },
        yaxis: {
            labels: {
                style: { colors: '#0f172a', fontSize: '11px', fontWeight: 800 },
                maxWidth: 160
            }
        },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: function (val) {
                    return currency + ' ' + (val ? val.toLocaleString(undefined, {minimumFractionDigits: 2}) : 0);
                }
            }
        }
    };
    new ApexCharts(document.querySelector("#branch-chart-top-items"), topItemsOptions).render();
    @endif
});
</script>
@endsection
