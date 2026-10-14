@extends('layouts.app')

@section('content')
<div class="max-w-7xl mx-auto space-y-8" x-data="{
    searchQuery: '',
    matches(title, desc = '') {
        if (!this.searchQuery.trim()) return true;
        let q = this.searchQuery.toLowerCase().trim();
        return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
    }
}">

    <!-- Alert Flash Messages -->
    @if(session('success'))
    <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between shadow-2xs">
        <span class="flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>{{ session('success') }}</span>
        </span>
        <button @click="$el.parentElement.remove()" class="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
    </div>
    @endif

    <!-- Header Section with Search -->
    <div class="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-sky-100 text-[#026897] flex items-center justify-center font-bold text-xl shadow-xs">
                    ⚙️
                </div>
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">System Control Center & All Modules</h1>
                    <p class="text-xs text-slate-500 font-medium mt-0.5">Explore and configure all modules across POS, Inventory, Menu Catalog, Ledgers, Reports, and System Administration.</p>
                </div>
            </div>
        </div>

        <!-- Search Modules Filter -->
        <div class="relative w-full md:w-80">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none text-xs">
                🔍
            </span>
            <input type="text"
                   x-model="searchQuery"
                   placeholder="Search any module or setting..."
                   class="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition shadow-2xs">
            <template x-if="searchQuery">
                <button @click="searchQuery = ''" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 text-xs font-bold">
                    ✕
                </button>
            </template>
        </div>
    </div>

    <!-- Category 1: POS & Billing Operations -->
    <div class="space-y-3">
        <div class="flex items-center gap-2 px-1">
            <span class="text-base">⚡</span>
            <h2 class="text-sm font-extrabold uppercase tracking-wider text-slate-800">POS & Billing Operations</h2>
            <span class="text-[11px] text-slate-400 font-semibold">• Live Terminals & Service</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Create Order POS -->
            @if(Auth::user()->hasPermission('pos'))
            <a href="{{ route('orders.create') }}" hx-boost="false"
               x-show="matches('Create Order POS', 'new bill terminal live order taking')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-sky-50 text-[#026897] flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    ⚡
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition">Create Order (POS)</span>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">+ POS</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Instant order creation, touch-friendly menu grid, bill discounts & printing.</p>
                </div>
            </a>
            @endif

            <!-- All Orders & Bills -->
            @if(Auth::user()->hasPermission('orders'))
            <a href="{{ route('orders.index') }}"
               x-show="matches('All Orders Bills', 'order history bill search reprint status')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🧾
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition">All Orders & Bills</span>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">History</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Track running orders, search previous receipts, and view payment statuses.</p>
                </div>
            </a>
            @endif

            <!-- Kitchen Display System -->
            @if(Auth::user()->hasPermission('kitchen_kds'))
            <a href="{{ route('kitchen.index') }}"
               x-show="matches('Kitchen Display KDS', 'live chef screen order preparation ticket')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    👨‍🍳
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition">Kitchen Display (KDS)</span>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Live KDS</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Real-time digital kitchen order board for cooks to mark dishes preparing & served.</p>
                </div>
            </a>
            @endif

            <!-- Kitchen Stations Setup -->
            @if(Auth::user()->hasPermission('kitchen_setup'))
            <a href="{{ route('kitchens.index') }}"
               x-show="matches('Kitchen Stations Setup', 'tandoor bbq bar fast food stations')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🍳
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Kitchen Stations Setup</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Configure separate kitchen prep stations, printers, and dish routing rules.</p>
                </div>
            </a>
            @endif

            <!-- Table Reservations -->
            <a href="{{ route('reservations.index') }}"
               x-show="matches('Table Reservations', 'booking guest dining hall advance schedule')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    📅
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition">Table Reservations</span>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-700">Booking</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Manage customer guest bookings, table reservations, and party timings.</p>
                </div>
            </a>

            <!-- Delivery Riders -->
            <a href="{{ route('riders.index') }}"
               x-show="matches('Delivery Riders Dispatch', 'order delivery takeaway rider bike tracking')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🛵
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Delivery Riders & Dispatch</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Assign delivery drivers to takeout parcels and track delivery fulfillment.</p>
                </div>
            </a>

            <!-- Order Takers & Waiters -->
            @if(Auth::user()->hasPermission('users'))
            <a href="{{ route('users.index') }}?role=order_taker"
               x-show="matches('Order Takers Waiters Staff Rating', 'waiter staff rating performance')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🤵
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Order Takers & Waiters</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Manage server staff, waiter account logins, and dining hall table commissions.</p>
                </div>
            </a>
            @endif
        </div>
    </div>

    <!-- Category 2: Inventory & Store Operations -->
    <div class="space-y-3">
        <div class="flex items-center gap-2 px-1">
            <span class="text-base">📦</span>
            <h2 class="text-sm font-extrabold uppercase tracking-wider text-slate-800">Inventory & Store Operations</h2>
            <span class="text-[11px] text-slate-400 font-semibold">• Stock & Recipe BOM</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Recipe BOM -->
            <a href="{{ route('recipes.index') }}"
               x-show="matches('Recipe BOM Auto-Deduction', 'ingredients consumption formula bill of materials')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    📜
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Recipe BOM Auto-Deduction</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Link raw kitchen ingredients to menu items for automated stock consumption per order.</p>
                </div>
            </a>

            <!-- Raw Products -->
            @if(Auth::user()->hasPermission('inventory_products'))
            <a href="{{ route('inventory.products') }}"
               x-show="matches('Purchasable Raw Products', 'store items raw materials stock catalog')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-sky-50 text-[#026897] flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🛒
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Purchasable Raw Products</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Manage raw ingredients catalog, measurement units (kg, liters, pcs), and purchase prices.</p>
                </div>
            </a>
            @endif

            <!-- Main & Kitchen Stock -->
            @if(Auth::user()->hasPermission('inventory_stock'))
            <a href="{{ route('inventory.index') }}"
               x-show="matches('Main Kitchen Stock Levels', 'inventory count balance transfer warehouse')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🏬
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Store & Kitchen Stock Levels</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Track real-time inventory balances between main store warehouse and kitchen lines.</p>
                </div>
            </a>
            @endif

            <!-- Waste & Damage Logs -->
            <a href="{{ route('waste-logs.index') }}"
               x-show="matches('Waste Damage Spoilage Logs', 'spoilage expired lost ingredients')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    ⚠️
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Waste & Damage Logs</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Record spoiled food, expired raw ingredients, and kitchen accidents with cost tracking.</p>
                </div>
            </a>

            <!-- Main Store Purchases -->
            @if(Auth::user()->hasPermission('purchases'))
            <a href="{{ route('purchases.index') }}"
               x-show="matches('Main Store Purchases', 'vendor bill invoice grn receiving stock buying')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    📥
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Main Store Purchases</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Create vendor purchasing invoices, record receiving quantities, and update stock costs.</p>
                </div>
            </a>
            @endif
        </div>
    </div>

    <!-- Category 3: Setup & Menu Catalog -->
    <div class="space-y-3">
        <div class="flex items-center gap-2 px-1">
            <span class="text-base">🍽️</span>
            <h2 class="text-sm font-extrabold uppercase tracking-wider text-slate-800">Dining Setup & Menu Catalog</h2>
            <span class="text-[11px] text-slate-400 font-semibold">• Tables, Dishes & Categories</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Halls & Tables Layout -->
            @if(Auth::user()->hasPermission('halls_tables'))
            <a href="{{ route('tables.index') }}"
               x-show="matches('Halls Tables Layout Setup', 'dining rooms floor plan table seating')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🪑
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Halls & Tables Layout Setup</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Manage family halls, rooftop, indoor dining areas, and table seating capacity.</p>
                </div>
            </a>
            @endif

            <!-- Menu Dishes & Catalog -->
            @if(Auth::user()->hasPermission('menu_catalog'))
            <a href="{{ route('menu.index') }}"
               x-show="matches('Menu Items Dishes Catalog', 'food prices description dish variants')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🍛
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Menu Dishes & Catalog</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Add or edit dishes, prices, descriptions, dish images, and station routing.</p>
                </div>
            </a>

            <!-- Menu Categories -->
            <a href="{{ route('categories.index') }}"
               x-show="matches('Menu Categories Setup', 'food groups pizza burger beverages')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🏷️
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Menu Categories Setup</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Organize food categories (Starters, BBQ, Pizza, Chai, Desserts) for the POS screen.</p>
                </div>
            </a>
            @endif
        </div>
    </div>

    <!-- Category 4: Accounts, Khatas & Ledgers -->
    <div class="space-y-3">
        <div class="flex items-center gap-2 px-1">
            <span class="text-base">📖</span>
            <h2 class="text-sm font-extrabold uppercase tracking-wider text-slate-800">Accounts, Khatas & Ledgers</h2>
            <span class="text-[11px] text-slate-400 font-semibold">• Receivables, Payables & Daily Expenses</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Customer Khata Ledger -->
            <a href="{{ route('customer-ledgers.index') }}"
               x-show="matches('Customer Khata Ledger', 'credit customers udhar balance receivables')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    👤
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Customer Khata Ledger</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Track regular credit accounts (Udhar), statement balances, and payment receipts.</p>
                </div>
            </a>

            <!-- Vendors & Suppliers -->
            @if(Auth::user()->hasPermission('vendors'))
            <a href="{{ route('vendors.index') }}"
               x-show="matches('Vendors Suppliers Directory', 'poultry dairy grocery suppliers')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🚚
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Vendors & Suppliers</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Directory of meat, dairy, grocery, and packaging suppliers with contact information.</p>
                </div>
            </a>

            <!-- Vendor Accounts Payable -->
            <a href="{{ route('vendor-ledgers.index') }}"
               x-show="matches('Vendor Accounts Payable Ledger', 'supplier bills payment vouchers dues')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    📑
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Vendor Accounts Payable</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Track outstanding supplier bills, record payments made, and check balance sheets.</p>
                </div>
            </a>
            @endif

            <!-- Daily Expenses -->
            @if(Auth::user()->hasPermission('expenses'))
            <a href="{{ route('expenses.index') }}"
               x-show="matches('Daily Expenses Log', 'petty cash bills electricity repairs fuel costs')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    💸
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Daily Expenses Log</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Record daily petty cash expenses, utility bills, maintenance costs, and salaries.</p>
                </div>
            </a>
            @endif
        </div>
    </div>

    <!-- Category 5: Business Reports & Analytics -->
    @if(Auth::user()->hasPermission('reports') || Auth::user()->hasPermission('dayend'))
    <div class="space-y-3">
        <div class="flex items-center gap-2 px-1">
            <span class="text-base">📊</span>
            <h2 class="text-sm font-extrabold uppercase tracking-wider text-slate-800">Business Reports & Financials</h2>
            <span class="text-[11px] text-slate-400 font-semibold">• P&L, Sales & Day End</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- All Reports Hub -->
            <a href="{{ route('reports.index') }}"
               x-show="matches('All Reports Hub', 'financial overview analytics summary')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-sky-50 text-[#026897] flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    📈
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">All Reports Hub</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Complete reporting dashboard providing high-level revenue charts and metrics.</p>
                </div>
            </a>

            <!-- Profit & Loss Sales Report -->
            <a href="{{ route('reports.sales') }}"
               x-show="matches('Profit Loss Sales Report', 'daily sales monthly revenue net profit margins')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    💰
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition">Profit & Loss Report</span>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">P&L</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Calculate net earnings by comparing order sales against recipe costs and expenses.</p>
                </div>
            </a>

            <!-- Menu Sales Report -->
            <a href="{{ route('reports.menu-sales') }}"
               x-show="matches('Menu Sales Item Performance', 'top selling dishes popular food revenue analysis')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🍕
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Menu Item Sales Performance</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Identify top-selling items, quantities ordered, and highest-earning dishes.</p>
                </div>
            </a>

            <!-- Stock Valuation -->
            <a href="{{ route('reports.inventory') }}"
               x-show="matches('Stock Valuation Inventory Value', 'asset worth inventory valuation raw materials')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    ⚖️
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Stock Valuation & Quantities</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Compute total financial valuation of ingredients currently stored in warehouses.</p>
                </div>
            </a>

            <!-- Expenses Breakdown -->
            <a href="{{ route('reports.expenses') }}"
               x-show="matches('Expenses Analysis Breakdown', 'overhead costs spending category analysis')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    📉
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Expenses Breakdown Analysis</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Categorize operational spending to find savings opportunities across branches.</p>
                </div>
            </a>

            <!-- Day Closing Reconciliation -->
            @if(Auth::user()->hasPermission('dayend'))
            <a href="{{ route('dayend.index') }}"
               x-show="matches('Day Closing Reconciliation Daily Cash', 'drawer register cash tally end of day')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🏁
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition">Day Closing Reconciliation</span>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Daily</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Tally cashier cash drawers against POS sales totals and lock daily register books.</p>
                </div>
            </a>
            @endif
        </div>
    </div>
    @endif

    <!-- Category 6: System Administration & Infrastructure -->
    @if(Auth::user()->role === 'super_admin' || Auth::user()->hasPermission('branches') || Auth::user()->hasPermission('users'))
    <div class="space-y-3">
        <div class="flex items-center gap-2 px-1">
            <span class="text-base">⚙️</span>
            <h2 class="text-sm font-extrabold uppercase tracking-wider text-slate-800">System Administration & Infrastructure</h2>
            <span class="text-[11px] text-slate-400 font-semibold">• Security, Staff, Nodes & Branding</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Branch Management -->
            @if(Auth::user()->hasPermission('branches'))
            <a href="{{ route('branches.index') }}"
               x-show="matches('Branch Management', 'multi-branch location outlets store')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🏢
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Branch Management</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Create new restaurant locations, assign codes, addresses, and managers.</p>
                </div>
            </a>
            @endif

            <!-- Users & Permissions -->
            @if(Auth::user()->hasPermission('users'))
            <a href="{{ route('users.index') }}"
               x-show="matches('Users Staff Roles Permissions', 'user accounts passwords security roles admin')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    👥
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Users & Permissions</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Add cashier, manager, and waiter accounts with granular capability permissions.</p>
                </div>
            </a>
            @endif

            <!-- Staff Attendance -->
            <a href="{{ route('attendances.index') }}"
               x-show="matches('Staff Attendance Roster', 'clock in shift timing employee attendance')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    📅
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Staff Attendance Roster</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Log employee shift attendance, clock-in timings, and monthly presence sheets.</p>
                </div>
            </a>

            <!-- Security Audit Trail -->
            <a href="{{ route('audit-logs.index') }}"
               x-show="matches('Security Audit Trail Logs', 'security activity tracker deleted bills changes')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🛡️
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Security Audit Trail</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Inspect critical system actions, bill edits, item deletions, and user logins.</p>
                </div>
            </a>

            <!-- Restaurant Branding & Logo -->
            <a href="{{ route('branding.index') }}"
               x-show="matches('Restaurant Branding Logo', 'restaurant name logo receipt header customization')"
               class="group p-5 bg-white rounded-xl border border-slate-200/80 hover:border-[#026897]/60 hover:shadow-md transition-all flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🎨
                </div>
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-sm text-slate-900 group-hover:text-[#026897] transition block">Restaurant Branding & Logo</span>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Upload official restaurant logo, customize printed receipt headers, and brand colors.</p>
                </div>
            </a>

            <!-- Punjab Revenue Authority (PRA) Management -->
            @if(Auth::user()->hasPermission('pra_settings') || Auth::user()->hasPermission('settings') || Auth::user()->role === 'super_admin')
            <a href="{{ route('settings.pra.index') }}"
               x-show="matches('Punjab Revenue Authority PRA Invoicing', 'pra tax invoicing punjab pos fbr rate variable cash card')"
               class="group p-5 bg-white rounded-xl border border-emerald-200/80 hover:border-emerald-600 hover:shadow-md transition-all flex items-start gap-4 bg-gradient-to-br from-emerald-50/20 to-white">
                <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🏛️
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition">PRA Tax & Invoicing</span>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold {{ \App\Services\PRAService::isEnabled() ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500' }}">
                            {{ \App\Services\PRAService::isEnabled() ? 'Active' : 'Disabled' }}
                        </span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Configure Punjab Revenue Authority POS integration, variable sales tax rates, and on/off toggle.</p>
                </div>
            </a>
            @endif

            <!-- Multi-Node Webhook Sync -->
            @if(Auth::user()->role === 'super_admin')
            <a href="{{ route('sync-nodes.index') }}"
               x-show="matches('Multi-Node Database Webhook Sync', 'live replication sync nodes branches offline online webhooks')"
               class="group p-5 bg-white rounded-xl border border-purple-200/80 hover:border-purple-500 hover:shadow-md transition-all flex items-start gap-4 bg-gradient-to-br from-purple-50/30 to-white">
                <div class="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                    🔄
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-purple-900 group-hover:text-purple-700 transition">Multi-Node Webhook Sync</span>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-700">Live Sync</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">Live database change replication across branches and servers via secure webhooks.</p>
                </div>
            </a>
            @endif
        </div>
    </div>
    @endif

    <!-- Category 7: Global Billing & Currency Preferences Form -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 md:p-8 space-y-6">
        <div class="border-b border-slate-100 pb-4">
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>🛠️</span>
                <span>Global Billing & Preferences</span>
            </h3>
            <p class="text-xs text-slate-500 font-medium mt-0.5">Configure automatic dine-in service charges, receipt currency symbol, and display names.</p>
        </div>

        <form method="POST" action="{{ route('settings.update') }}" class="space-y-6">
            @csrf

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Service Charges -->
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Dine-In Service Charge (%)
                    </label>
                    <div class="relative">
                        <input type="number" step="0.01" min="0" max="100" name="service_charge_percentage" 
                               value="{{ old('service_charge_percentage', $serviceChargePct) }}" required 
                               class="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0284c7] transition shadow-2xs">
                        <span class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 font-black">%</span>
                    </div>
                    <p class="text-[11px] font-medium text-slate-500 mt-1.5">
                        Automatically calculated on subtotal for <strong>Dine-In</strong> orders.
                    </p>
                    @error('service_charge_percentage')
                    <span class="text-xs text-red-600 font-bold block mt-1">{{ $message }}</span>
                    @enderror
                </div>

                <!-- Default Currency -->
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        {{ __('Default Currency') }}
                    </label>
                    <select name="default_currency" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0284c7] transition shadow-2xs">
                        <option value="PKR" {{ old('default_currency', $defaultCurrency) === 'PKR' ? 'selected' : '' }}>PKR (₨) - Pakistani Rupee</option>
                        <option value="USD" {{ old('default_currency', $defaultCurrency) === 'USD' ? 'selected' : '' }}>USD ($) - US Dollar</option>
                        <option value="EUR" {{ old('default_currency', $defaultCurrency) === 'EUR' ? 'selected' : '' }}>EUR (€) - Euro</option>
                        <option value="GBP" {{ old('default_currency', $defaultCurrency) === 'GBP' ? 'selected' : '' }}>GBP (£) - British Pound</option>
                        <option value="SAR" {{ old('default_currency', $defaultCurrency) === 'SAR' ? 'selected' : '' }}>SAR (﷼) - Saudi Riyal</option>
                        <option value="AED" {{ old('default_currency', $defaultCurrency) === 'AED' ? 'selected' : '' }}>AED (د.إ) - UAE Dirham</option>
                    </select>
                    <p class="text-[11px] font-medium text-slate-500 mt-1.5">
                        Base default currency used across billing, orders, and reports.
                    </p>
                </div>

                <!-- Default Language -->
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        {{ __('Default Language') }}
                    </label>
                    <select name="default_language" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0284c7] transition shadow-2xs">
                        <option value="en" {{ old('default_language', $defaultLanguage) === 'en' ? 'selected' : '' }}>🇬🇧 English</option>
                        <option value="ar" {{ old('default_language', $defaultLanguage) === 'ar' ? 'selected' : '' }}>🇸🇦 العربية (Arabic - RTL)</option>
                        <option value="fr" {{ old('default_language', $defaultLanguage) === 'fr' ? 'selected' : '' }}>🇫🇷 Français (French)</option>
                        <option value="it" {{ old('default_language', $defaultLanguage) === 'it' ? 'selected' : '' }}>🇮🇹 Italiano (Italian)</option>
                    </select>
                    <p class="text-[11px] font-medium text-slate-500 mt-1.5">
                        System default language for login screen and new user sessions.
                    </p>
                </div>

                <!-- Currency Symbol -->
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        {{ __('Currency') }} Symbol
                    </label>
                    <input type="text" name="currency_symbol" value="{{ old('currency_symbol', $currencySymbol) }}" 
                           placeholder="e.g. ₨, $, €, £"
                           class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0284c7] transition shadow-2xs">
                    <p class="text-[11px] font-medium text-slate-500 mt-1.5">
                        Default fallback symbol for physical receipts and bills.
                    </p>
                </div>

                <!-- Restaurant Display Name -->
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Restaurant Display Name
                    </label>
                    <input type="text" name="restaurant_name" value="{{ old('restaurant_name', $restaurantName) }}" 
                           placeholder="e.g. Chai Khas Restaurant"
                           class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0284c7] transition shadow-2xs">
                    <p class="text-[11px] font-medium text-slate-500 mt-1.5">
                        Top header name displayed across the system and printed on invoices.
                    </p>
                </div>
            </div>

            <!-- Submit Button -->
            <div class="pt-4 border-t border-slate-100 flex justify-end">
                <button type="submit" class="px-6 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-xs transition cursor-pointer">
                    Save Restaurant Preferences
                </button>
            </div>
        </form>
    </div>
</div>
@endsection
