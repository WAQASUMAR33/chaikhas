@extends('layouts.app')

@section('content')
<div class="space-y-6 pb-12" x-data="{
    activeTab: 'tables',
    activeHallFilter: 'all',
    searchTable: '',
    autoRefresh: true,
    refreshInterval: null,
    currentTime: '',
    init() {
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    },
    updateTime() {
        const now = new Date();
        this.currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}">

    <!-- 1. Top Header Console with Direct 'Make an Order' Action -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#013854] to-[#026897] p-6 text-white shadow-xl border border-sky-500/20">
        <!-- Background decorative ambient circles -->
        <div class="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute right-1/3 -bottom-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <!-- Left: Waiter / Floor Info -->
            <div>
                <div class="flex items-center gap-3 mb-2 flex-wrap">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        {{ __('Floor Console Active') }}
                    </span>
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/90 border border-white/15">
                        📍 {{ $branch->branch_name ?? 'Main Branch' }}
                    </span>
                    <span class="text-xs font-mono text-sky-200/80 bg-black/25 px-2.5 py-1 rounded-md" x-text="currentTime"></span>
                </div>
                <h1 class="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                    <span>👋 {{ __('Welcome') }}, {{ $user->name }}</span>
                </h1>
                <p class="text-xs lg:text-sm text-sky-100/80 mt-1 max-w-xl">
                    {{ __('Order Taker Terminal: Select any table below to seat guests, take new orders, or manage live orders.') }}
                </p>
            </div>

            <!-- Right: High-Priority Primary Action Buttons -->
            <div class="flex items-center gap-3 flex-wrap w-full lg:w-auto">
                <!-- ⚡ Primary: MAKE NEW ORDER (POS) Button -->
                <a href="{{ route('orders.create') }}" hx-boost="false"
                   class="group flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-emerald-300/40">
                    <span class="text-lg group-hover:rotate-12 transition-transform">⚡</span>
                    <span>{{ __('+ Make an Order (POS)') }}</span>
                    <kbd class="hidden sm:inline-block text-[10px] font-mono bg-black/25 px-1.5 py-0.5 rounded text-white/90">F2</kbd>
                </a>

                <!-- Quick Takeaway Button -->
                <a href="{{ route('orders.create', ['order_type' => 'Takeaway']) }}" hx-boost="false"
                   class="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-wide backdrop-blur-sm border border-white/20 hover:border-white/30 transition-all duration-200 shadow-sm">
                    <span>🥡</span>
                    <span>{{ __('Takeaway') }}</span>
                </a>

                <!-- Quick Delivery Button -->
                <a href="{{ route('orders.create', ['order_type' => 'Delivery']) }}" hx-boost="false"
                   class="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-wide backdrop-blur-sm border border-white/20 hover:border-white/30 transition-all duration-200 shadow-sm">
                    <span>🛵</span>
                    <span>{{ __('Delivery') }}</span>
                </a>
            </div>
        </div>
    </div>

    <!-- 2. High Definition HD KPI Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <!-- Metric 1: My Active / Running Orders -->
        <div class="hd-widget-emerald rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-black uppercase tracking-wider text-emerald-100/90">{{ __('Active Running Orders') }}</p>
                    <h3 class="text-3xl lg:text-4xl font-black tracking-tight text-white mt-1">{{ $activeOrders->count() }}</h3>
                </div>
                <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner border border-white/30">
                    📋
                </div>
            </div>
            <div class="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-emerald-50">
                <span>{{ __('My Assigned Orders:') }} <strong>{{ $myActiveOrders->count() }}</strong></span>
                <span class="inline-flex items-center gap-1 font-bold">
                    <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    {{ __('Live') }}
                </span>
            </div>
        </div>

        <!-- Metric 2: Urgent Kitchen Alerts (Food Ready!) -->
        <div class="hd-widget-amber rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between {{ $readyOrders->count() > 0 ? 'ring-2 ring-amber-300 ring-offset-2' : '' }}">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-black uppercase tracking-wider text-amber-100/90">{{ __('Kitchen Ready for Table') }}</p>
                    <h3 class="text-3xl lg:text-4xl font-black tracking-tight text-white mt-1">{{ $readyOrders->count() }}</h3>
                </div>
                <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner border border-white/30 {{ $readyOrders->count() > 0 ? 'animate-bounce' : '' }}">
                    🔔
                </div>
            </div>
            <div class="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-amber-50">
                @if($readyOrders->count() > 0)
                    <span class="font-extrabold text-white flex items-center gap-1">
                        ⚠️ {{ __('Pickup food from kitchen!') }}
                    </span>
                @else
                    <span>{{ __('All items served to tables') }}</span>
                @endif
                <span class="font-bold">KDS Alert</span>
            </div>
        </div>

        <!-- Metric 3: Floor & Tables Availability -->
        <div class="hd-widget-blue rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-black uppercase tracking-wider text-sky-100/90">{{ __('Available Tables') }}</p>
                    <div class="flex items-baseline gap-2 mt-1">
                        <h3 class="text-3xl lg:text-4xl font-black tracking-tight text-white">{{ $availableTablesCount }}</h3>
                        <span class="text-sm font-bold text-sky-200">/ {{ $totalTables }} {{ __('Total') }}</span>
                    </div>
                </div>
                <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner border border-white/30">
                    🪑
                </div>
            </div>
            <div class="mt-4 pt-3 border-t border-white/15">
                <div class="flex items-center justify-between text-xs text-sky-100 mb-1 font-semibold">
                    <span>{{ $occupiedTablesCount }} {{ __('Occupied') }}</span>
                    <span>{{ $totalTables > 0 ? round(($availableTablesCount / $totalTables) * 100) : 0 }}% {{ __('Free') }}</span>
                </div>
                <div class="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-white h-1.5 rounded-full transition-all duration-500" style="width: {{ $totalTables > 0 ? ($availableTablesCount / $totalTables) * 100 : 0 }}%"></div>
                </div>
            </div>
        </div>

        <!-- Metric 4: Today's Orders & Sales -->
        <div class="hd-widget-rose rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-black uppercase tracking-wider text-rose-100/90">{{ __('Today\'s Sales') }}</p>
                    <h3 class="text-2xl lg:text-3xl font-black tracking-tight text-white mt-1">{{ currency_symbol() }} {{ number_format($todaySalesAmount, 2) }}</h3>
                </div>
                <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner border border-white/30">
                    💰
                </div>
            </div>
            <div class="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-rose-50">
                <span>{{ __('Orders Today:') }} <strong>{{ $todayOrdersCount }}</strong></span>
                <span class="font-bold">Total Sales</span>
            </div>
        </div>
    </div>

    <!-- 3. Urgent Kitchen Food Ready Alert Banner (Shown when Kitchen finished cooking) -->
    @if($readyOrders->count() > 0)
    <div class="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 text-white shadow-lg border border-amber-300/40 animate-pulse">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                    🔔
                </div>
                <div>
                    <h4 class="font-black text-sm lg:text-base text-white">
                        {{ __('Kitchen Alert: :count Order(s) Ready for Table Delivery!', ['count' => $readyOrders->count()]) }}
                    </h4>
                    <p class="text-xs text-amber-100">
                        {{ __('Food is ready at the pass. Please pick up and serve to the respective tables immediately.') }}
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                @foreach($readyOrders->take(3) as $rOrd)
                <a href="{{ route('orders.show', $rOrd->id) }}"
                   class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-900 font-extrabold text-xs shadow-sm hover:bg-amber-50 transition-colors">
                    <span>Table #{{ $rOrd->table->table_number ?? 'N/A' }}</span>
                    <span class="text-amber-700">({{ $rOrd->order_number }})</span>
                </a>
                @endforeach
            </div>
        </div>
    </div>
    @endif

    <!-- 4. Main Section Tabs & Filter Controls -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
        <!-- Navigation Header Tabs -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 lg:p-5 border-b border-slate-200/80 bg-slate-50/50">
            <!-- Tabs -->
            <div class="flex items-center gap-2 bg-slate-200/60 p-1 rounded-xl">
                <button @click="activeTab = 'tables'"
                        :class="activeTab === 'tables' ? 'bg-white text-[#026897] shadow-sm font-black' : 'text-slate-600 hover:text-slate-900 font-bold'"
                        class="px-4 py-2 rounded-lg text-xs tracking-wide transition-all duration-150 flex items-center gap-2">
                    <span>🪑</span>
                    <span>{{ __('Floor & Tables Matrix') }}</span>
                    <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 font-extrabold">{{ $totalTables }}</span>
                </button>
                <button @click="activeTab = 'orders'"
                        :class="activeTab === 'orders' ? 'bg-white text-[#026897] shadow-sm font-black' : 'text-slate-600 hover:text-slate-900 font-bold'"
                        class="px-4 py-2 rounded-lg text-xs tracking-wide transition-all duration-150 flex items-center gap-2">
                    <span>📋</span>
                    <span>{{ __('Live Active Orders') }}</span>
                    <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">{{ $activeOrders->count() }}</span>
                </button>
                <button @click="activeTab = 'completed'"
                        :class="activeTab === 'completed' ? 'bg-white text-[#026897] shadow-sm font-black' : 'text-slate-600 hover:text-slate-900 font-bold'"
                        class="px-4 py-2 rounded-lg text-xs tracking-wide transition-all duration-150 flex items-center gap-2">
                    <span>🧾</span>
                    <span>{{ __('Completed Today') }}</span>
                    <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 font-extrabold">{{ $recentCompletedOrders->count() }}</span>
                </button>
            </div>

            <!-- Floor Hall Filter Tabs (When on Tables Tab) -->
            <div class="flex items-center gap-2 flex-wrap" x-show="activeTab === 'tables'">
                <span class="text-xs font-bold text-slate-400 mr-1">{{ __('Hall:') }}</span>
                <button @click="activeHallFilter = 'all'"
                        :class="activeHallFilter === 'all' ? 'bg-[#026897] text-white shadow-sm font-black' : 'bg-white text-slate-700 hover:bg-slate-100 font-bold border border-slate-200'"
                        class="px-3 py-1.5 rounded-lg text-xs transition-all">
                    {{ __('All Halls') }}
                </button>
                @foreach($halls as $hall)
                <button @click="activeHallFilter = '{{ $hall->id }}'"
                        :class="activeHallFilter == '{{ $hall->id }}' ? 'bg-[#026897] text-white shadow-sm font-black' : 'bg-white text-slate-700 hover:bg-slate-100 font-bold border border-slate-200'"
                        class="px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5">
                    <span>{{ $hall->name }}</span>
                    <span class="px-1.5 py-0.2 rounded text-[10px] bg-black/10 font-mono">{{ $hall->tables->count() }}</span>
                </button>
                @endforeach
            </div>
        </div>

        <!-- TAB CONTENT 1: Interactive Floor & Tables Matrix -->
        <div x-show="activeTab === 'tables'" class="p-4 lg:p-6 space-y-6">
            <!-- Legend Indicators -->
            <div class="flex items-center gap-4 text-xs font-bold text-slate-600 flex-wrap pb-2 border-b border-slate-100">
                <span class="text-slate-400 uppercase tracking-wider text-[11px] font-black">{{ __('Status Legend:') }}</span>
                <span class="inline-flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-md bg-emerald-500 shadow-xs"></span>
                    <span>{{ __('Available (1-Click Order)') }}</span>
                </span>
                <span class="inline-flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-md bg-amber-500 shadow-xs"></span>
                    <span>{{ __('Occupied / Running') }}</span>
                </span>
                <span class="inline-flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-md bg-purple-600 shadow-xs"></span>
                    <span>{{ __('Bill Printed / Payment Pending') }}</span>
                </span>
                <span class="inline-flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-md bg-rose-500 shadow-xs"></span>
                    <span>{{ __('Kitchen Ready Alert') }}</span>
                </span>
            </div>

            <!-- Hall-by-Hall or All Tables Matrix -->
            @foreach($halls as $hall)
            <div x-show="activeHallFilter === 'all' || activeHallFilter == '{{ $hall->id }}'" class="space-y-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">🏛️</span>
                        <h3 class="font-black text-sm lg:text-base text-slate-800 tracking-tight">{{ $hall->name }}</h3>
                        <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-[#026897]">
                            {{ $hall->tables->count() }} {{ __('Tables') }}
                        </span>
                    </div>
                </div>

                <!-- Table Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    @forelse($hall->tables as $tbl)
                        @php
                            $activeOrd = $tableOrders[$tbl->id] ?? null;
                            $isOccupied = !is_null($activeOrd);
                            $isReady = $activeOrd && $activeOrd->order_status === 'Ready';
                            $isBillGenerated = $activeOrd && $activeOrd->order_status === 'Bill Generated';
                        @endphp

                        @if(!$isOccupied)
                        <!-- 🟢 AVAILABLE TABLE CARD -->
                        <div class="group relative rounded-2xl bg-white border-2 border-emerald-300 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all duration-200 p-4 flex flex-col justify-between overflow-hidden">
                            <div class="flex items-start justify-between">
                                <div>
                                    <div class="flex items-center gap-1.5">
                                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span class="text-[10px] font-black uppercase tracking-wider text-emerald-600">{{ __('Available') }}</span>
                                    </div>
                                    <h4 class="text-xl font-black text-slate-900 mt-1">
                                        {{ $tbl->table_number }}
                                    </h4>
                                </div>
                                <span class="px-2 py-1 rounded-lg text-[11px] font-black bg-slate-100 text-slate-600 flex items-center gap-1">
                                    👥 {{ $tbl->capacity }}
                                </span>
                            </div>

                            <p class="text-[11px] text-slate-400 mt-3 font-medium">
                                {{ __('Empty table ready for guests.') }}
                            </p>

                            <!-- Direct 1-Click Action to Take Order & Pre-select Table in POS -->
                            <div class="mt-4 pt-3 border-t border-slate-100">
                                <a href="{{ route('orders.create', ['table_id' => $tbl->id, 'hall_id' => $tbl->hall_id, 'order_type' => 'Dine In']) }}" hx-boost="false"
                                   class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    <span>⚡</span>
                                    <span>{{ __('+ Make Order') }}</span>
                                </a>
                            </div>
                        </div>

                        @else
                        <!-- 🟡 / 🟣 / 🔴 OCCUPIED TABLE CARD -->
                        <div class="relative rounded-2xl bg-white border-2 {{ $isReady ? 'border-rose-400 bg-rose-50/20' : ($isBillGenerated ? 'border-purple-400 bg-purple-50/20' : 'border-amber-400 bg-amber-50/15') }} shadow-sm hover:shadow-md transition-all duration-200 p-4 flex flex-col justify-between overflow-hidden">
                            <div>
                                <div class="flex items-start justify-between">
                                    <div>
                                        <div class="flex items-center gap-1.5">
                                            @if($isReady)
                                                <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                                                <span class="text-[10px] font-black uppercase tracking-wider text-rose-600">{{ __('Food Ready!') }}</span>
                                            @elseif($isBillGenerated)
                                                <span class="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                                                <span class="text-[10px] font-black uppercase tracking-wider text-purple-700">{{ __('Bill Generated') }}</span>
                                            @else
                                                <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                                <span class="text-[10px] font-black uppercase tracking-wider text-amber-700">{{ __('Running') }}</span>
                                            @endif
                                        </div>
                                        <h4 class="text-xl font-black text-slate-900 mt-1">
                                            {{ $tbl->table_number }}
                                        </h4>
                                    </div>
                                    <span class="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black {{ $isReady ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800' }}">
                                        {{ $activeOrd->order_number }}
                                    </span>
                                </div>

                                <!-- Order Details Subtext -->
                                <div class="mt-2.5 space-y-1 text-xs">
                                    <div class="flex items-center justify-between font-bold text-slate-700">
                                        <span>{{ __('Bill Total:') }}</span>
                                        <span class="text-sm font-black text-[#026897]">{{ currency_symbol() }} {{ number_format($activeOrd->net_total, 2) }}</span>
                                    </div>
                                    <div class="flex items-center justify-between text-[11px] text-slate-500">
                                        <span>{{ __('Items:') }} {{ $activeOrd->items->sum('quantity') }}</span>
                                        <span>⏱️ {{ $activeOrd->created_at->diffForHumans(null, true) }}</span>
                                    </div>
                                    @if($activeOrd->orderTaker)
                                    <div class="text-[10px] text-slate-400 font-semibold truncate">
                                        Waiter: {{ $activeOrd->orderTaker->name }}
                                    </div>
                                    @endif
                                </div>
                            </div>

                            <!-- Interactive Quick Actions on Occupied Table -->
                            <div class="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-2 gap-2">
                                <!-- + Add More Items to Table's Order -->
                                <a href="{{ route('orders.create', ['edit' => $activeOrd->id]) }}" hx-boost="false"
                                   class="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-sky-50 text-[#026897] hover:bg-[#026897] hover:text-white font-extrabold text-[11px] border border-sky-200 transition-colors"
                                   title="Add items to this order">
                                    <span>➕</span>
                                    <span>{{ __('Add Items') }}</span>
                                </a>

                                <!-- View / Settle Bill -->
                                <a href="{{ route('orders.show', $activeOrd->id) }}"
                                   class="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-800 hover:text-white font-extrabold text-[11px] transition-colors"
                                   title="View order details">
                                    <span>👁️</span>
                                    <span>{{ __('View Bill') }}</span>
                                </a>
                            </div>
                        </div>
                        @endif
                    @empty
                        <div class="col-span-full py-8 text-center text-slate-400 text-xs font-semibold">
                            {{ __('No tables assigned to this hall.') }}
                        </div>
                    @endforelse
                </div>
            </div>
            @endforeach
        </div>

        <!-- TAB CONTENT 2: Live Active Orders List -->
        <div x-show="activeTab === 'orders'" class="p-4 lg:p-6 space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="font-black text-sm lg:text-base text-slate-900 tracking-tight">
                    {{ __('Live Orders Stream (:count Active)', ['count' => $activeOrders->count()]) }}
                </h3>
                <a href="{{ route('orders.create') }}" hx-boost="false"
                   class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#026897] text-white text-xs font-black hover:bg-[#01547b] transition-colors">
                    <span>⚡</span>
                    <span>{{ __('+ New Order') }}</span>
                </a>
            </div>

            @if($activeOrders->isEmpty())
                <div class="py-12 text-center text-slate-400">
                    <span class="text-4xl block mb-2">🍽️</span>
                    <p class="text-sm font-bold text-slate-600">{{ __('No active running orders right now.') }}</p>
                    <p class="text-xs text-slate-400 mt-1">{{ __('Click "+ Make an Order" to create a new order.') }}</p>
                </div>
            @else
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                                <th class="py-3 px-4">{{ __('Order #') }}</th>
                                <th class="py-3 px-4">{{ __('Type') }}</th>
                                <th class="py-3 px-4">{{ __('Table / Hall') }}</th>
                                <th class="py-3 px-4">{{ __('Waiter') }}</th>
                                <th class="py-3 px-4">{{ __('Status') }}</th>
                                <th class="py-3 px-4 text-right">{{ __('Total') }}</th>
                                <th class="py-3 px-4 text-center">{{ __('Elapsed') }}</th>
                                <th class="py-3 px-4 text-right">{{ __('Actions') }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            @foreach($activeOrders as $ord)
                            <tr class="hover:bg-sky-50/40 transition-colors">
                                <td class="py-3 px-4 font-black text-slate-900">
                                    <a href="{{ route('orders.show', $ord->id) }}" class="text-[#026897] hover:underline font-mono">
                                        {{ $ord->order_number }}
                                    </a>
                                </td>
                                <td class="py-3 px-4">
                                    @if($ord->order_type === 'Dine In')
                                        <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-100 text-[#026897]">🍽️ Dine In</span>
                                    @elseif($ord->order_type === 'Take Away' || $ord->order_type === 'Takeaway')
                                        <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800">🥡 Takeaway</span>
                                    @else
                                        <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800">🛵 Delivery</span>
                                    @endif
                                </td>
                                <td class="py-3 px-4 font-bold text-slate-800">
                                    @if($ord->table)
                                        <span>Table #{{ $ord->table->table_number }}</span>
                                        <span class="text-slate-400 font-normal">({{ $ord->hall->name ?? 'Hall' }})</span>
                                    @else
                                        <span class="text-slate-400 font-normal">—</span>
                                    @endif
                                </td>
                                <td class="py-3 px-4 font-semibold text-slate-700">
                                    {{ $ord->orderTaker->name ?? $ord->user->name ?? 'Staff' }}
                                </td>
                                <td class="py-3 px-4">
                                    @if($ord->order_status === 'Ready')
                                        <span class="px-2.5 py-1 rounded-md text-[10px] font-black bg-rose-500 text-white animate-pulse">
                                            🔔 {{ __('Food Ready') }}
                                        </span>
                                    @elseif($ord->order_status === 'Preparing')
                                        <span class="px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-500 text-white">
                                            🍳 {{ __('Preparing') }}
                                        </span>
                                    @elseif($ord->order_status === 'Bill Generated')
                                        <span class="px-2.5 py-1 rounded-md text-[10px] font-black bg-purple-600 text-white">
                                            🧾 {{ __('Bill Generated') }}
                                        </span>
                                    @else
                                        <span class="px-2.5 py-1 rounded-md text-[10px] font-black bg-sky-600 text-white">
                                            ⚡ {{ __('Running') }}
                                        </span>
                                    @endif
                                </td>
                                <td class="py-3 px-4 text-right font-black text-slate-900">
                                    {{ currency_symbol() }} {{ number_format($ord->net_total, 2) }}
                                </td>
                                <td class="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                                    ⏱️ {{ $ord->created_at->diffForHumans(null, true) }}
                                </td>
                                <td class="py-3 px-4 text-right">
                                    <div class="flex items-center justify-end gap-1.5">
                                        <a href="{{ route('orders.create', ['edit' => $ord->id]) }}" hx-boost="false"
                                           class="p-1.5 rounded-lg bg-sky-50 text-[#026897] hover:bg-[#026897] hover:text-white transition-colors"
                                           title="Add items to order">
                                            ➕
                                        </a>
                                        <a href="{{ route('orders.show', $ord->id) }}"
                                           class="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
                                           title="View Order">
                                            👁️
                                        </a>
                                        <a href="{{ route('orders.receipt', $ord->id) }}" target="_blank"
                                           class="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
                                           title="Print Receipt">
                                            🖨️
                                        </a>
                                    </div>
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif
        </div>

        <!-- TAB CONTENT 3: Completed Orders Today -->
        <div x-show="activeTab === 'completed'" class="p-4 lg:p-6 space-y-4">
            <h3 class="font-black text-sm lg:text-base text-slate-900 tracking-tight">
                {{ __('Recent Settled Orders Today (:count)', ['count' => $recentCompletedOrders->count()]) }}
            </h3>

            @if($recentCompletedOrders->isEmpty())
                <div class="py-12 text-center text-slate-400">
                    <span class="text-4xl block mb-2">🧾</span>
                    <p class="text-sm font-bold text-slate-600">{{ __('No orders completed today yet.') }}</p>
                </div>
            @else
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                                <th class="py-3 px-4">{{ __('Order #') }}</th>
                                <th class="py-3 px-4">{{ __('Type') }}</th>
                                <th class="py-3 px-4">{{ __('Table') }}</th>
                                <th class="py-3 px-4">{{ __('Completed At') }}</th>
                                <th class="py-3 px-4 text-right">{{ __('Net Amount') }}</th>
                                <th class="py-3 px-4 text-right">{{ __('Receipt') }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            @foreach($recentCompletedOrders as $cOrd)
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="py-3 px-4 font-mono font-black text-slate-900">
                                    <a href="{{ route('orders.show', $cOrd->id) }}" class="text-[#026897] hover:underline">
                                        {{ $cOrd->order_number }}
                                    </a>
                                </td>
                                <td class="py-3 px-4">
                                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                        {{ $cOrd->order_type }}
                                    </span>
                                </td>
                                <td class="py-3 px-4 font-semibold text-slate-800">
                                    {{ $cOrd->table->table_number ?? '—' }}
                                </td>
                                <td class="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                    {{ $cOrd->updated_at->format('h:i A') }}
                                </td>
                                <td class="py-3 px-4 text-right font-black text-emerald-600">
                                    {{ currency_symbol() }} {{ number_format($cOrd->net_total, 2) }}
                                </td>
                                <td class="py-3 px-4 text-right">
                                    <a href="{{ route('orders.receipt', $cOrd->id) }}" target="_blank"
                                       class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-[#026897] hover:text-white font-extrabold text-[11px] transition-colors">
                                        🖨️ {{ __('Receipt') }}
                                    </a>
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif
        </div>
    </div>
</div>
@endsection
