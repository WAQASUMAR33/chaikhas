@extends('layouts.app')

@section('content')
<div class="space-y-8">
    <!-- Header Banner -->
    <div class="bg-transparent py-2 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#026897]/15 to-sky-100 text-[#026897] text-xs font-black mb-1.5 border border-sky-300/60 shadow-2xs">
                <span>⚡ {{ __('Executive Command Console') }}</span>
            </div>
            <h1 class="text-2xl md:text-3xl font-black tracking-tight text-slate-900">{{ __('Super Admin Overview') }}</h1>
            <p class="text-slate-500 mt-1 font-medium text-xs md:text-sm">{{ __('Real-time cross-branch restaurant performance & management console') }}</p>
        </div>
        <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black shadow-md shadow-emerald-500/20">
                <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                {{ __('System Live') }}
            </span>
        </div>
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

    <!-- High Definition Metrics Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Branches Widget (Vivid Ocean HD Gradient) -->
        <div class="hd-widget-ocean p-6 rounded-2xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div class="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition"></div>
            <div class="flex items-center justify-between mb-4 relative z-10">
                <span class="text-xs font-black uppercase tracking-wider text-sky-100">{{ __('Total Branches') }}</span>
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-xl shadow-inner">
                    🏢
                </div>
            </div>
            <div class="relative z-10 flex items-baseline justify-between">
                <span class="text-3xl font-black text-white tracking-tight">{{ $totalBranches }}</span>
                <span class="text-[11px] font-extrabold bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-sky-100 border border-white/20">
                    {{ __('Active') }}
                </span>
            </div>
            <span class="block text-xs text-sky-100/90 mt-2 font-medium relative z-10">{{ __('Network Outlets') }}</span>
        </div>

        <!-- Sales Today Widget (Vivid Emerald HD Gradient) -->
        <div class="hd-widget-emerald p-6 rounded-2xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div class="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/15 blur-xl pointer-events-none group-hover:scale-125 transition"></div>
            <div class="flex items-center justify-between mb-4 relative z-10">
                <span class="text-xs font-black uppercase tracking-wider text-emerald-100">{{ __('Sales Today') }}</span>
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-xl shadow-inner">
                    💰
                </div>
            </div>
            <div class="relative z-10">
                <span class="text-3xl font-black text-white tracking-tight">
                    {{ currency_symbol() }} {{ number_format($totalSalesToday, 2) }}
                </span>
            </div>
            <div class="flex items-center justify-between mt-2 text-xs text-emerald-100/90 font-bold relative z-10">
                <span>{{ __('Gross Revenue') }}</span>
                <span class="text-[11px] font-black bg-white/20 px-2 py-0.5 rounded-full text-white">Live Sync</span>
            </div>
        </div>

        <!-- Orders Today Widget (Vivid Electric Blue HD Gradient) -->
        <div class="hd-widget-blue p-6 rounded-2xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div class="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/15 blur-xl pointer-events-none group-hover:scale-125 transition"></div>
            <div class="flex items-center justify-between mb-4 relative z-10">
                <span class="text-xs font-black uppercase tracking-wider text-sky-100">{{ __('Orders Today') }}</span>
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-xl shadow-inner">
                    🧾
                </div>
            </div>
            <div class="relative z-10 flex items-baseline justify-between">
                <span class="text-3xl font-black text-white tracking-tight">{{ $totalOrdersToday }}</span>
                <span class="text-[11px] font-extrabold bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-sky-100 border border-white/20">
                    {{ __('Orders Placed') }}
                </span>
            </div>
            <span class="block text-xs text-sky-100/90 mt-2 font-medium relative z-10">{{ __('All Stations Active') }}</span>
        </div>

        <!-- System Users Widget (Vivid Amber/Sunset HD Gradient) -->
        <div class="hd-widget-amber p-6 rounded-2xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div class="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/15 blur-xl pointer-events-none group-hover:scale-125 transition"></div>
            <div class="flex items-center justify-between mb-4 relative z-10">
                <span class="text-xs font-black uppercase tracking-wider text-amber-100">{{ __('System Users') }}</span>
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-xl shadow-inner">
                    👥
                </div>
            </div>
            <div class="relative z-10 flex items-baseline justify-between">
                <span class="text-3xl font-black text-white tracking-tight">{{ $totalUsers }}</span>
                <span class="text-[11px] font-extrabold bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-amber-100 border border-white/20">
                    {{ __('Online') }}
                </span>
            </div>
            <span class="block text-xs text-amber-100/90 mt-2 font-medium relative z-10">{{ __('Staff & Operators') }}</span>
        </div>
    </div>

    <!-- High Definition Graphical Analytics Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 7-Day Revenue Velocity & Orders Trend Area Chart -->
        <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-blue-600 bg-gradient-to-tr from-sky-700 to-blue-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                        📈
                    </div>
                    <div>
                        <h2 class="text-base font-black text-slate-900 tracking-tight">{{ __('Sales & Revenue Velocity') }}</h2>
                        <p class="text-xs text-slate-500 font-medium mt-0.5">{{ __('Daily revenue trajectory and order volume (Last 7 Days)') }}</p>
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
                <div id="chart-revenue-trend" class="w-full h-72"></div>
            </div>
        </div>

        <!-- Order Channels Distribution Donut Chart -->
        <div class="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div class="pb-4 border-b border-slate-100 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl hd-badge-delivery text-white flex items-center justify-center font-black text-lg shadow-sm">
                    🍽️
                </div>
                <div>
                    <h2 class="text-base font-black text-slate-900 tracking-tight">{{ __('Dining Channels') }}</h2>
                    <p class="text-xs text-slate-500 font-medium mt-0.5">{{ __('Order volume by channel distribution') }}</p>
                </div>
            </div>
            <div class="pt-4 flex-1 flex flex-col items-center justify-center">
                <div id="chart-order-types" class="w-full flex justify-center"></div>
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

    <!-- Secondary Charts Row: Top Items & Branch Comparison -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Selling Menu Items Bar Chart -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl hd-badge-takeaway text-white flex items-center justify-center font-black text-lg shadow-sm">
                        🔥
                    </div>
                    <div>
                        <h2 class="text-base font-black text-slate-900 tracking-tight">{{ __('Top Selling Dishes') }}</h2>
                        <p class="text-xs text-slate-500 font-medium mt-0.5">{{ __('Highest revenue generating culinary items') }}</p>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full hd-badge-takeaway text-white font-extrabold text-xs shadow-md">
                    {{ __('Best Sellers') }}
                </span>
            </div>
            <div class="pt-4">
                <div id="chart-top-items" class="w-full h-64"></div>
            </div>
        </div>

        <!-- Cross-Branch Performance Comparison Column Chart -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl hd-badge-dinein text-white flex items-center justify-center font-black text-lg shadow-sm">
                        📊
                    </div>
                    <div>
                        <h2 class="text-base font-black text-slate-900 tracking-tight">{{ __('Branch Sales Volume') }}</h2>
                        <p class="text-xs text-slate-500 font-medium mt-0.5">{{ __('Comparative gross revenue across all branches') }}</p>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full hd-badge-dinein text-white font-extrabold text-xs shadow-md">
                    {{ __('Multi-Branch') }}
                </span>
            </div>
            <div class="pt-4">
                <div id="chart-branch-comparison" class="w-full h-64"></div>
            </div>
        </div>
    </div>

    <!-- Branch Status Table -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-md p-6">
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl hd-badge-dinein text-white flex items-center justify-center font-black text-lg shadow-sm">
                    🏢
                </div>
                <div>
                    <h2 class="text-lg font-black text-slate-900">{{ __('Branch Performance Overview') }}</h2>
                    <p class="text-xs text-slate-500 font-medium mt-0.5">{{ __('Real-time status and volume by branch') }}</p>
                </div>
            </div>
            <a href="{{ route('branches.index') }}" class="inline-flex items-center gap-1.5 text-xs font-black text-white hd-badge-dinein hover:opacity-90 px-4 py-2 rounded-xl transition shadow-md">
                {{ __('Manage Branches') }} →
            </a>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left rtl:text-right border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-50/80">
                        <th class="py-3.5 px-4 rounded-l-xl rtl:rounded-l-none rtl:rounded-r-xl">{{ __('Branch Name') }}</th>
                        <th class="py-3.5 px-4">{{ __('Code') }}</th>
                        <th class="py-3.5 px-4">{{ __('Tables') }}</th>
                        <th class="py-3.5 px-4">{{ __('Total Orders') }}</th>
                        <th class="py-3.5 px-4 rounded-r-xl rtl:rounded-r-none rtl:rounded-l-xl">{{ __('Status') }}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @foreach($branches as $branch)
                    <tr class="hover:bg-sky-50/40 transition">
                        <td class="py-4 px-4 font-black text-slate-900">{{ $branch->branch_name }}</td>
                        <td class="py-4 px-4"><span class="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-mono text-xs font-black border border-slate-200/80">{{ $branch->branch_code }}</span></td>
                        <td class="py-4 px-4 font-bold text-slate-800">{{ $branch->tables_count }} {{ __('Tables') }}</td>
                        <td class="py-4 px-4 font-black text-slate-900">{{ $branch->orders_count }} {{ __('Orders') }}</td>
                        <td class="py-4 px-4">
                            <span class="px-3 py-1 rounded-full text-xs font-black border {{ $branch->status === 'Active' ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-500/20' : 'bg-rose-500 text-white border-rose-400 shadow-sm shadow-rose-500/20' }}">
                                ● {{ $branch->status }}
                            </span>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- ApexCharts Initialization Scripts -->
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
    new ApexCharts(document.querySelector("#chart-revenue-trend"), trendOptions).render();

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
    new ApexCharts(document.querySelector("#chart-order-types"), orderTypeOptions).render();

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
    new ApexCharts(document.querySelector("#chart-top-items"), topItemsOptions).render();

    // 4. Branch Comparison Column Chart (High Definition Cyan/Ocean Bar)
    const branchComparisonOptions = {
        series: [{
            name: "{{ __('Gross Sales') }}",
            data: @json($branchComparisonData['sales'])
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
                columnWidth: '40%',
                distributed: false
            }
        },
        colors: ['#026897'],
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return currency + ' ' + (val ? val.toLocaleString() : 0);
            },
            style: { fontSize: '11px', fontWeight: 900 }
        },
        xaxis: {
            categories: @json($branchComparisonData['labels']),
            labels: {
                style: { colors: '#0f172a', fontSize: '11px', fontWeight: 800 }
            }
        },
        yaxis: {
            labels: {
                formatter: function (val) {
                    return currency + ' ' + (val ? val.toLocaleString() : 0);
                },
                style: { colors: '#64748b', fontSize: '10px', fontWeight: 700 }
            }
        },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
    };
    new ApexCharts(document.querySelector("#chart-branch-comparison"), branchComparisonOptions).render();
});
</script>
@endsection
