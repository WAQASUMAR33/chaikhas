<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" dir="{{ (isset($isRtl) && $isRtl) || app()->getLocale() === 'ar' ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name', 'Restaurant Management System') }}</title>
    @if(file_exists(public_path('build/manifest.json')))
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    @else
        <!-- Tailwind CSS CDN -->
        <script src="https://cdn.tailwindcss.com"></script>
    @endif
    <!-- Alpine.js CDN -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <!-- ApexCharts for Dashboard Analytics -->
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    <!-- NProgress for Top Loading Bar -->
    <script src="https://unpkg.com/nprogress@0.2.0/nprogress.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/nprogress@0.2.0/nprogress.css" />
    <!-- Google Fonts (Cairo for Arabic, Plus Jakarta Sans for Latin) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        html[dir="rtl"] body { font-family: 'Cairo', 'Plus Jakarta Sans', sans-serif; }
        [x-cloak] { display: none !important; }

        /* Smooth Page Transition Effect */
        #main-content {
            transition: opacity 0.15s ease-in-out;
            opacity: 1;
        }

        /* Top Ocean NProgress Bar Styling */
        #nprogress .bar {
            background: #38bdf8 !important;
            height: 3px !important;
        }
        #nprogress .peg {
            box-shadow: 0 0 10px #38bdf8, 0 0 5px #38bdf8 !important;
        }
        #nprogress .spinner-icon {
            border-top-color: #38bdf8 !important;
            border-left-color: #38bdf8 !important;
        }

        /* Custom Scrollbar for Sleek Aesthetics */
        .custom-scrollbar::-webkit-scrollbar {
            width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }

        /* Modern Topbar Glassmorphism */
        .topbar-modern {
            background: linear-gradient(135deg, #014769 0%, #026897 50%, #0284c7 100%);
            box-shadow: 0 4px 20px -2px rgba(2, 104, 151, 0.28);
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        /* High Definition Widgets & Glowing Accents */
        .hd-widget-ocean {
            background: linear-gradient(135deg, #026897 0%, #0284c7 50%, #0369a1 100%) !important;
            box-shadow: 0 12px 28px -6px rgba(2, 104, 151, 0.45), 0 8px 12px -6px rgba(2, 104, 151, 0.3) !important;
            border: 1px solid rgba(56, 189, 248, 0.4) !important;
            color: #ffffff !important;
        }
        .hd-widget-emerald {
            background: linear-gradient(135deg, #047857 0%, #059669 45%, #10b981 100%) !important;
            box-shadow: 0 12px 28px -6px rgba(5, 150, 105, 0.45), 0 8px 12px -6px rgba(5, 150, 105, 0.3) !important;
            border: 1px solid rgba(52, 211, 153, 0.4) !important;
            color: #ffffff !important;
        }
        .hd-widget-blue {
            background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%) !important;
            box-shadow: 0 12px 28px -6px rgba(37, 99, 235, 0.45), 0 8px 12px -6px rgba(37, 99, 235, 0.3) !important;
            border: 1px solid rgba(96, 165, 250, 0.4) !important;
            color: #ffffff !important;
        }
        .hd-widget-amber {
            background: linear-gradient(135deg, #c2410c 0%, #d97706 45%, #f59e0b 100%) !important;
            box-shadow: 0 12px 28px -6px rgba(217, 119, 6, 0.45), 0 8px 12px -6px rgba(217, 119, 6, 0.3) !important;
            border: 1px solid rgba(251, 191, 36, 0.4) !important;
            color: #ffffff !important;
        }
        .hd-widget-rose {
            background: linear-gradient(135deg, #be123c 0%, #e11d48 50%, #f43f5e 100%) !important;
            box-shadow: 0 12px 28px -6px rgba(225, 29, 72, 0.45), 0 8px 12px -6px rgba(225, 29, 72, 0.3) !important;
            border: 1px solid rgba(251, 113, 133, 0.4) !important;
            color: #ffffff !important;
        }
        .hd-badge-dinein {
            background: linear-gradient(135deg, #026897 0%, #0284c7 100%) !important;
            box-shadow: 0 4px 12px rgba(2, 104, 151, 0.35) !important;
            color: #ffffff !important;
        }
        .hd-badge-takeaway {
            background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%) !important;
            box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35) !important;
            color: #ffffff !important;
        }
        .hd-badge-delivery {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.35) !important;
            color: #ffffff !important;
        }

        /* Sidebar Modern Active Link */
        .nav-item-active {
            background: linear-gradient(135deg, #026897 0%, #0284c7 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(2, 104, 151, 0.3) !important;
        }

        /* RTL layout enhancements */
        html[dir="rtl"] aside {
            border-left-width: 1px !important;
            border-right-width: 0 !important;
            right: 0 !important;
            left: auto !important;
        }
    </style>
    <!-- Global Localization & Currency Config for JavaScript -->
    <script>
        window.__currencySymbol = "{{ $currencySymbol ?? \App\Services\CurrencyService::getSymbol() }}";
        window.__currencyCode = "{{ $currentCurrency ?? \App\Services\CurrencyService::getCurrentCurrency() }}";
        window.__locale = "{{ app()->getLocale() }}";
        window.__isRtl = {{ ((isset($isRtl) && $isRtl) || app()->getLocale() === 'ar') ? 'true' : 'false' }};
        window.formatCurrency = function(amount) {
            var num = Number(amount || 0);
            return window.__currencySymbol + ' ' + num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        };
    </script>
</head>
<body class="bg-[#edf4fa] text-slate-800 antialiased font-sans selection:bg-[#0284c7] selection:text-white" 
      x-data="{ 
          sidebarOpen: window.innerWidth >= 1024,
          isFullscreen: false,
          toggleFullscreen() {
              if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(err => {});
                  this.isFullscreen = true;
              } else {
                  document.exitFullscreen().catch(err => {});
                  this.isFullscreen = false;
              }
          }
      }"
      @keydown.f2.window="window.location.href = '{{ route('orders.create') }}'"
      @keydown.window="if ((($event.ctrlKey || $event.metaKey) && $event.key.toLowerCase() === 'k') || $event.key === '/') { if (document.getElementById('sidebar-search-input')) { $event.preventDefault(); document.getElementById('sidebar-search-input').focus(); } }">

    <div class="min-h-screen flex relative">
        <!-- Mobile Sidebar Backdrop Overlay -->
        <div x-show="sidebarOpen" 
             @click="sidebarOpen = false" 
             x-cloak
             x-transition:enter="transition-opacity ease-linear duration-200"
             x-transition:enter-start="opacity-0"
             x-transition:enter-end="opacity-100"
             x-transition:leave="transition-opacity ease-linear duration-200"
             x-transition:leave-start="opacity-100"
             x-transition:leave-end="opacity-0"
             class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden">
        </div>

        <!-- Sidebar (Sticky Modern Left Console) -->
        <aside class="fixed inset-y-0 left-0 rtl:right-0 rtl:left-auto z-50 bg-white/95 backdrop-blur-xl text-slate-800 shadow-2xl lg:shadow-none border-r rtl:border-l rtl:border-r-0 border-slate-200/90 transform transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:shrink-0 flex flex-col"
               :class="sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:opacity-0 lg:p-0'">
            
            <!-- Logo Header -->
            @php
                $brandLogo = \App\Models\Setting::get('restaurant_logo');
                $brandName = \App\Models\Setting::get('restaurant_name', 'RAPIDTECHPRO');
            @endphp
            <div class="h-16 flex items-center justify-between px-4 bg-white/60 border-b border-slate-200/80 min-w-[16rem] shrink-0">
                <div class="flex items-center gap-3" x-data="{ logoError: false }">
                    @if($brandLogo)
                        <img src="{{ asset('storage/' . $brandLogo) }}" alt="Logo" class="w-9 h-9 object-contain rounded-xl bg-white p-0.5 shadow-sm border border-slate-200" x-show="!logoError" x-on:error="logoError = true">
                    @endif
                    <div x-show="logoError || {{ $brandLogo ? 'false' : 'true' }}" class="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0284c7] via-[#026897] to-[#01547b] flex items-center justify-center text-white font-black text-sm shadow-sm">
                        {{ strtoupper(substr($brandName, 0, 2)) }}
                    </div>
                    <div class="min-w-0">
                        <span class="font-black text-sm text-slate-900 tracking-tight line-clamp-1 block">{{ $brandName }}</span>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span class="text-[10px] text-[#026897] font-extrabold uppercase tracking-wider">{{ __('POS Terminal') }}</span>
                        </div>
                    </div>
                </div>
                <button @click="sidebarOpen = false" 
                        class="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer" 
                        hx-boost="false" 
                        title="Collapse Sidebar">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <!-- Navigation Links -->
            <nav class="p-3 space-y-3 overflow-y-auto flex-1 min-w-[16rem] custom-scrollbar"
                 x-data="{
                     billingQuery: '',
                     matches(title) {
                         if (!this.billingQuery.trim()) return true;
                         return title.toLowerCase().includes(this.billingQuery.toLowerCase().trim());
                     }
                 }">

                <!-- Search / Filter Billing Options with Shortcut Key -->
                <div class="relative mb-2">
                    <span class="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto pl-3 rtl:pr-3 rtl:pl-0 flex items-center text-slate-400 pointer-events-none text-xs">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </span>
                    <input type="text"
                           id="sidebar-search-input"
                           x-model="billingQuery"
                           placeholder="{{ __('Filter options...') }}"
                           class="w-full pl-8 rtl:pr-8 rtl:pl-7 pr-12 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition-all shadow-xs">
                    <div class="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto pr-2 rtl:pl-2 rtl:pr-0 flex items-center gap-1">
                        <template x-if="billingQuery">
                            <button @click="billingQuery = ''" class="text-slate-400 hover:text-slate-700 text-xs font-bold p-1" title="Clear">
                                ✕
                            </button>
                        </template>
                        <template x-if="!billingQuery">
                            <kbd class="text-[9px] font-mono text-slate-400 bg-white border border-slate-200 px-1 py-0.5 rounded shadow-2xs">Ctrl+K</kbd>
                        </template>
                    </div>
                </div>

                <!-- Primary Action: NEW BILL (POS) Button -->
                @if(Auth::user()->hasPermission('pos'))
                <a href="{{ route('orders.create') }}" hx-boost="false"
                   x-show="matches('New Bill Create Order POS Quick Terminal')"
                   class="group relative flex items-center justify-between w-full py-3 px-3.5 rounded-xl bg-gradient-to-r from-[#026897] via-[#0284c7] to-[#0ea5e9] text-white font-black text-xs tracking-wide shadow-md shadow-[#026897]/25 hover:shadow-xl hover:shadow-[#026897]/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 border border-sky-300/30">
                    <div class="flex items-center gap-2.5">
                        <div class="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center text-white text-xs font-black group-hover:scale-110 transition-transform">
                            ⚡
                        </div>
                        <span class="tracking-tight">{{ __('+ NEW BILL (POS)') }}</span>
                    </div>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-black/25 text-white uppercase tracking-wider">
                        <span>F2</span>
                    </span>
                </a>
                @endif

                <!-- Section 1: CORE OPERATIONS -->
                <div class="pt-1 space-y-1">
                    <div class="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>{{ __('Core Operations') }}</span>
                    </div>

                    <!-- 1. Dashboard Overview -->
                    <a href="{{ route('dashboard') }}"
                       x-show="matches('Dashboard Overview Analytics Summary Home')"
                       class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group {{ (request()->routeIs('dashboard') && !request('view')) ? 'nav-item-active' : 'text-slate-700 hover:bg-sky-50/80 hover:text-[#026897]' }}">
                        <div class="flex items-center gap-3">
                            <span class="text-base group-hover:scale-110 transition-transform">📊</span>
                            <span>{{ __('Dashboard Overview') }}</span>
                        </div>
                        @if(request()->routeIs('dashboard') && !request('view'))
                            <span class="w-2 h-2 rounded-full bg-white shadow-sm"></span>
                        @endif
                    </a>

                    <!-- Order Taker Floor & POS Console -->
                    <a href="{{ route('dashboard', ['view' => 'order_taker']) }}"
                       x-show="matches('Order Taker Floor Waiter Tables Orders POS Live')"
                       class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group {{ (request('view') === 'order_taker' || (request()->routeIs('dashboard') && Auth::user()->role === 'order_taker')) ? 'nav-item-active' : 'text-slate-700 hover:bg-sky-50/80 hover:text-[#026897]' }}">
                        <div class="flex items-center gap-3">
                            <span class="text-base group-hover:scale-110 transition-transform">🍽️</span>
                            <span>{{ __('Order Taker Floor') }}</span>
                        </div>
                        <span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-black {{ (request('view') === 'order_taker' || (request()->routeIs('dashboard') && Auth::user()->role === 'order_taker')) ? 'bg-black/25 text-white' : 'bg-emerald-100 text-emerald-800' }}">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live
                        </span>
                    </a>

                    <!-- 2. New Bill Terminal -->
                    @if(Auth::user()->hasPermission('pos'))
                    <a href="{{ route('orders.create') }}" hx-boost="false"
                       x-show="matches('New Bill Terminal POS Create Order')"
                       class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group {{ request()->routeIs('orders.create') ? 'nav-item-active' : 'text-slate-700 hover:bg-sky-50/80 hover:text-[#026897]' }}">
                        <div class="flex items-center gap-3">
                            <span class="text-base group-hover:scale-110 transition-transform">💳</span>
                            <span>{{ __('New Bill (POS)') }}</span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-md font-black {{ request()->routeIs('orders.create') ? 'bg-black/25 text-white' : 'bg-sky-100 text-[#026897]' }}">+ POS</span>
                    </a>
                    @endif

                    <!-- 3. All Orders & Bills -->
                    @if(Auth::user()->hasPermission('orders'))
                    <a href="{{ route('orders.index') }}"
                       x-show="matches('All Orders Bills Invoices Receipts Receipts History')"
                       class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group {{ request()->routeIs('orders.index') || request()->routeIs('orders.show') ? 'nav-item-active' : 'text-slate-700 hover:bg-sky-50/80 hover:text-[#026897]' }}">
                        <div class="flex items-center gap-3">
                            <span class="text-base group-hover:scale-110 transition-transform">🧾</span>
                            <span>{{ __('All Orders & Bills') }}</span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-md font-extrabold {{ request()->routeIs('orders.index') || request()->routeIs('orders.show') ? 'bg-black/25 text-white' : 'bg-slate-100 text-slate-600' }}">History</span>
                    </a>
                    @endif

                    <!-- 4. Kitchen Display (KDS) -->
                    @if(Auth::user()->hasPermission('kitchen_kds'))
                    <a href="{{ route('kitchen.index') }}" hx-boost="false"
                       x-show="matches('Kitchen Display KDS Live Cook Orders Chef')"
                       class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group {{ request()->routeIs('kitchen.*') ? 'nav-item-active' : 'text-slate-700 hover:bg-sky-50/80 hover:text-[#026897]' }}">
                        <div class="flex items-center gap-3">
                            <span class="text-base group-hover:scale-110 transition-transform">🍳</span>
                            <span>{{ __('Kitchen Display (KDS)') }}</span>
                        </div>
                        <span class="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md font-black {{ request()->routeIs('kitchen.*') ? 'bg-black/25 text-white' : 'bg-emerald-100 text-emerald-800' }}">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live
                        </span>
                    </a>
                    @endif
                </div>

                <!-- Section 2: SERVICE & FLEET -->
                @if(Auth::user()->hasPermission('users'))
                <div class="pt-2 space-y-1">
                    <div class="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <span>{{ __('Service & Fleet') }}</span>
                    </div>

                    <!-- Delivery Riders -->
                    <a href="{{ route('riders.index') }}"
                       x-show="matches('Delivery Riders Dispatch Drivers Fleet')"
                       class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group {{ request()->routeIs('riders.*') ? 'nav-item-active' : 'text-slate-700 hover:bg-sky-50/80 hover:text-[#026897]' }}">
                        <div class="flex items-center gap-3">
                            <span class="text-base group-hover:scale-110 transition-transform">🛵</span>
                            <span>{{ __('Delivery & Riders') }}</span>
                        </div>
                    </a>

                    <!-- Order Takers / Waiters -->
                    <a href="{{ route('users.index', ['role' => 'order_taker']) }}"
                       x-show="matches('Order Takers Waiters Staff Service Floor')"
                       class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group {{ (request()->routeIs('users.*') && request('role') == 'order_taker') ? 'nav-item-active' : 'text-slate-700 hover:bg-sky-50/80 hover:text-[#026897]' }}">
                        <div class="flex items-center gap-3">
                            <span class="text-base group-hover:scale-110 transition-transform">👤</span>
                            <span>{{ __('Order Takers (Waiters)') }}</span>
                        </div>
                    </a>
                </div>
                @endif

                <!-- Section 3: REGISTER & FINANCE -->
                <div class="pt-2 space-y-1">
                    <div class="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <span>{{ __('Register & Finance') }}</span>
                    </div>

                    <!-- Daily Expenses -->
                    @if(Auth::user()->hasPermission('expenses'))
                    <a href="{{ route('expenses.index') }}"
                       x-show="matches('Daily Expenses Cash Out Petty Cash')"
                       class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group {{ request()->routeIs('expenses.*') ? 'nav-item-active' : 'text-slate-700 hover:bg-sky-50/80 hover:text-[#026897]' }}">
                        <div class="flex items-center gap-3">
                            <span class="text-base group-hover:scale-110 transition-transform">💸</span>
                            <span>{{ __('Daily Expenses') }}</span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold {{ request()->routeIs('expenses.*') ? 'bg-black/25 text-white' : 'bg-slate-100 text-slate-600' }}">Cash</span>
                    </a>
                    @endif

                    <!-- Day Closing Reconciliation -->
                    @if(Auth::user()->hasPermission('dayend'))
                    <a href="{{ route('dayend.index') }}"
                       x-show="matches('Day Closing Day End Reconciliation Shift Close Register Cash Drawer')"
                       class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group {{ request()->routeIs('dayend.*') ? 'nav-item-active' : 'text-slate-700 hover:bg-sky-50/80 hover:text-[#026897]' }}">
                        <div class="flex items-center gap-3">
                            <span class="text-base group-hover:scale-110 transition-transform">🔒</span>
                            <span>{{ __('Day Closing (Day End)') }}</span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold {{ request()->routeIs('dayend.*') ? 'bg-black/25 text-white' : 'bg-slate-100 text-slate-600' }}">Daily</span>
                    </a>
                    @endif

                    <!-- PRA Punjab Revenue Authority Invoicing -->
                    @if(Auth::user()->hasPermission('pra_settings') || Auth::user()->hasPermission('settings') || Auth::user()->role === 'super_admin')
                    <a href="{{ route('settings.pra.index') }}"
                       x-show="matches('PRA Punjab Revenue Authority Tax Invoicing POS FBR Punjab IMS')"
                       class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group {{ request()->routeIs('settings.pra.*') ? 'nav-item-active' : 'text-slate-700 hover:bg-emerald-50/80 hover:text-emerald-700' }}">
                        <div class="flex items-center gap-3">
                            <span class="text-base group-hover:scale-110 transition-transform">🏛️</span>
                            <span>{{ __('PRA Invoicing') }}</span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold {{ request()->routeIs('settings.pra.*') ? 'bg-black/25 text-white' : (\App\Services\PRAService::isEnabled() ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500') }}">
                            {{ \App\Services\PRAService::isEnabled() ? 'Active' : 'Off' }}
                        </span>
                    </a>
                    @endif
                </div>

                <!-- Modern Settings & All Modules Hub Card -->
                <div class="pt-3 pb-1 border-t border-slate-200/80">
                    <a href="{{ route('settings.index') }}"
                       class="block group p-3.5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 {{ request()->routeIs('settings.*') ? 'bg-white border-[#0284c7] shadow-lg shadow-[#0284c7]/15 ring-2 ring-[#0284c7]/20' : 'bg-white/80 hover:bg-white border-slate-200 hover:border-[#0284c7] shadow-xs hover:shadow-md' }}">
                        <div class="flex items-start justify-between mb-1.5">
                            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-100 to-cyan-50 text-[#026897] border border-sky-200 flex items-center justify-center text-sm font-black group-hover:rotate-45 transition-transform duration-300 shadow-2xs">
                                ⚙️
                            </div>
                            <span class="inline-flex items-center gap-1 text-[10px] font-black text-[#026897] bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {{ __('All Modules') }}
                            </span>
                        </div>
                        <h4 class="text-xs font-black text-slate-900 group-hover:text-[#026897] transition-colors flex items-center gap-1">
                            <span>{{ __('Settings & Categories') }}</span>
                            <span class="text-slate-400 group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1">→</span>
                        </h4>
                        <p class="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">
                            {{ __('Inventory, Menu, Ledgers, Reports & System Config') }}
                        </p>
                    </a>
                </div>

                <!-- Empty filter state -->
                <div x-show="billingQuery && !matches('New Bill Create Order POS Dashboard Overview All Orders Bills Kitchen Display KDS Delivery Riders Order Takers Waiters Daily Expenses Day Closing')"
                     class="px-3 py-5 text-center text-xs text-slate-500 font-semibold bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span>🔍 {{ __('No matching options found') }}</span>
                </div>
            </nav>
        </aside>

        <!-- Main Workspace -->
        <div class="flex-1 flex flex-col min-w-0 min-h-screen">
            <!-- Modern High-Definition Top Navbar -->
            <header class="h-16 topbar-modern flex items-center justify-between px-4 lg:px-7 shadow-md sticky top-0 z-30 text-white select-none backdrop-blur-md">
                <!-- Left: Sidebar Toggle, Branch Badge & Role -->
                <div class="flex items-center gap-3">
                    <button @click="sidebarOpen = !sidebarOpen" 
                            class="p-2 rounded-xl text-white bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 transition flex items-center justify-center cursor-pointer shadow-xs" 
                            title="{{ __('Toggle Sidebar') }}" 
                            hx-boost="false">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>

                    <!-- Active Branch Pill -->
                    <div class="flex items-center gap-2">
                        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow-xs transition">
                            <span class="w-2 h-2 rounded-full bg-cyan-300 animate-pulse"></span>
                            <span class="font-extrabold tracking-tight">{{ Auth::user()->branch->branch_name ?? __('All Branches') }}</span>
                        </div>
                        <span class="hidden sm:inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-black bg-cyan-400/20 text-cyan-100 capitalize border border-cyan-300/30">
                            {{ str_replace('_', ' ', Auth::user()->role) }}
                        </span>
                    </div>
                </div>

                <!-- Center: Quick Action Button (POS Shortcut) -->
                @if(Auth::user()->hasPermission('pos'))
                <div class="hidden md:flex items-center">
                    <a href="{{ route('orders.create') }}" 
                       class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 border border-white/25 text-white font-black text-xs shadow-xs hover:shadow-md transition-all group"
                       title="{{ __('Open POS Terminal (F2)') }}">
                        <span class="text-amber-300 group-hover:scale-110 transition-transform">⚡</span>
                        <span>{{ __('Quick POS') }}</span>
                        <kbd class="bg-black/25 text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold text-white/90">F2</kbd>
                    </a>
                </div>
                @endif

                <!-- Right: Currency, Language, Fullscreen, Lock & User Profile Dropdown -->
                <div class="flex items-center gap-2 sm:gap-2.5" x-data="{ dropdownOpen: false, currencyOpen: false, langOpen: false }">
                    
                    <!-- 1. Fullscreen Toggle Button -->
                    <button @click="toggleFullscreen()" 
                            class="hidden sm:inline-flex p-2 rounded-xl text-white bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 transition shadow-xs cursor-pointer"
                            :title="isFullscreen ? '{{ __('Exit Fullscreen') }}' : '{{ __('Fullscreen Mode') }}'">
                        <template x-if="!isFullscreen">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                        </template>
                        <template x-if="isFullscreen">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 9L4 4m0 5h5m6-5l5 5m-5 0V4m-6 16l-5-5m5 0H4m16 5l-5-5m0 5v-5"></path></svg>
                        </template>
                    </button>

                    <!-- 2. Currency Switcher Dropdown -->
                    <div class="relative">
                        <button @click="currencyOpen = !currencyOpen; langOpen = false; dropdownOpen = false;" 
                                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-white border border-white/20 text-xs font-bold cursor-pointer shadow-xs" 
                                title="{{ __('Switch Currency') }}">
                            <span class="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs text-sky-100 shadow-inner">{{ $currencySymbol ?? '₨' }}</span>
                            <span class="font-black">{{ $currentCurrency ?? 'PKR' }}</span>
                            <svg class="w-3.5 h-3.5 text-sky-200 transition-transform duration-200" :class="currencyOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>

                        <div x-show="currencyOpen" 
                             @click.away="currencyOpen = false" 
                             x-cloak
                             x-transition:enter="transition ease-out duration-150 transform"
                             x-transition:enter-start="opacity-0 translate-y-2 scale-95"
                             x-transition:enter-end="opacity-100 translate-y-0 scale-100"
                             x-transition:leave="transition ease-in duration-100 transform"
                             x-transition:leave-start="opacity-100 scale-100"
                             x-transition:leave-end="opacity-0 scale-95"
                             class="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-52 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 divide-y divide-slate-100">
                            <div class="px-3.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                                <span>{{ __('Select Currency') }}</span>
                                <span class="text-[#026897] font-bold">{{ $currentCurrency ?? 'PKR' }}</span>
                            </div>
                            <div class="pt-1">
                                @foreach(($supportedCurrencies ?? \App\Services\CurrencyService::getSupportedCurrencies()) as $currCode => $curr)
                                    <a href="{{ route('currency.set', $currCode) }}" hx-boost="false"
                                       class="flex items-center justify-between px-3.5 py-2 text-xs font-bold hover:bg-sky-50 transition {{ ($currentCurrency ?? 'PKR') === $currCode ? 'text-[#026897] bg-sky-50/70 font-black' : 'text-slate-700' }}">
                                        <span class="flex items-center gap-2.5">
                                            <span class="w-6 h-6 rounded-lg bg-slate-100 text-center flex items-center justify-center font-black text-xs text-[#026897]">{{ $curr['symbol'] }}</span>
                                            <span>{{ $currCode }}</span>
                                        </span>
                                        <div class="flex items-center gap-1.5">
                                            <span class="text-[10px] text-slate-400 font-semibold">{{ $curr['name'] }}</span>
                                            @if(($currentCurrency ?? 'PKR') === $currCode)
                                                <span class="text-xs text-[#026897] font-black">✓</span>
                                            @endif
                                        </div>
                                    </a>
                                @endforeach
                            </div>
                        </div>
                    </div>

                    <!-- 3. Language Switcher Dropdown -->
                    <div class="relative">
                        <button @click="langOpen = !langOpen; currencyOpen = false; dropdownOpen = false;" 
                                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-white border border-white/20 text-xs font-bold cursor-pointer shadow-xs" 
                                title="{{ __('Switch Language') }}">
                            <span class="text-base leading-none">{{ $currentLocaleData['flag'] ?? '🌐' }}</span>
                            <span class="uppercase font-black">{{ $currentLocale ?? app()->getLocale() }}</span>
                            <svg class="w-3.5 h-3.5 text-sky-200 transition-transform duration-200" :class="langOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>

                        <div x-show="langOpen" 
                             @click.away="langOpen = false" 
                             x-cloak
                             x-transition:enter="transition ease-out duration-150 transform"
                             x-transition:enter-start="opacity-0 translate-y-2 scale-95"
                             x-transition:enter-end="opacity-100 translate-y-0 scale-100"
                             x-transition:leave="transition ease-in duration-100 transform"
                             x-transition:leave-start="opacity-100 scale-100"
                             x-transition:leave-end="opacity-0 scale-95"
                             class="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-48 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 divide-y divide-slate-100">
                            <div class="px-3.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                                <span>{{ __('Language') }}</span>
                                <span class="uppercase text-[#026897] font-bold">{{ $currentLocale ?? app()->getLocale() }}</span>
                            </div>
                            <div class="pt-1">
                                @foreach(($supportedLocales ?? \App\Http\Controllers\LocalizationController::$supportedLocales) as $locCode => $loc)
                                    <a href="{{ route('locale.set', $locCode) }}" hx-boost="false"
                                       class="flex items-center justify-between px-3.5 py-2 text-xs font-bold hover:bg-sky-50 transition {{ ($currentLocale ?? app()->getLocale()) === $locCode ? 'text-[#026897] bg-sky-50/70 font-black' : 'text-slate-700' }}">
                                        <span class="flex items-center gap-2.5">
                                            <span class="text-base">{{ $loc['flag'] }}</span>
                                            <span>{{ $loc['native'] }}</span>
                                        </span>
                                        <div class="flex items-center gap-1.5">
                                            <span class="text-[10px] text-slate-400 uppercase font-bold">{{ $locCode }}</span>
                                            @if(($currentLocale ?? app()->getLocale()) === $locCode)
                                                <span class="text-xs text-[#026897] font-black">✓</span>
                                            @endif
                                        </div>
                                    </a>
                                @endforeach
                            </div>
                        </div>
                    </div>

                    <!-- 4. Quick Lock Button -->
                    <button onclick="if(confirm('{{ __('Lock this terminal session?') }}')) { document.getElementById('top-logout-form').submit(); }" 
                            class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 text-sky-100 hover:text-white transition border border-white/20 cursor-pointer shadow-xs" 
                            title="{{ __('Lock Session') }}">
                        <svg class="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        <span>{{ __('Lock') }}</span>
                    </button>

                    <!-- 5. User Profile Dropdown -->
                    <div class="relative">
                        <button @click="dropdownOpen = !dropdownOpen; currencyOpen = false; langOpen = false;" 
                                class="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-white border border-white/20 cursor-pointer shadow-xs" 
                                hx-boost="false">
                            <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-sky-200 text-[#026897] flex items-center justify-center font-black text-xs shadow-sm">
                                {{ strtoupper(substr(Auth::user()->name, 0, 2)) }}
                            </div>
                            <span class="text-xs font-black hidden sm:inline tracking-tight">{{ Auth::user()->name }}</span>
                            <svg class="w-3.5 h-3.5 text-sky-200 transition-transform duration-200" :class="dropdownOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>

                        <div x-show="dropdownOpen" 
                             @click.away="dropdownOpen = false" 
                             x-cloak
                             x-transition:enter="transition ease-out duration-150 transform"
                             x-transition:enter-start="opacity-0 translate-y-2 scale-95"
                             x-transition:enter-end="opacity-100 translate-y-0 scale-100"
                             x-transition:leave="transition ease-in duration-100 transform"
                             x-transition:leave-start="opacity-100 scale-100"
                             x-transition:leave-end="opacity-0 scale-95"
                             class="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-56 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 divide-y divide-slate-100">
                            
                            <!-- User Card Info -->
                            <div class="px-4 py-2.5">
                                <p class="text-xs font-black text-slate-900 leading-tight">{{ Auth::user()->name }}</p>
                                <p class="text-[11px] text-slate-400 font-medium truncate mt-0.5">{{ Auth::user()->email }}</p>
                                <div class="flex items-center gap-1.5 mt-2">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-100 text-[#026897] capitalize">
                                        {{ str_replace('_', ' ', Auth::user()->role) }}
                                    </span>
                                    <span class="text-[10px] text-slate-500 font-bold truncate">
                                        {{ Auth::user()->branch->branch_name ?? 'All Branches' }}
                                    </span>
                                </div>
                            </div>

                            <!-- User Quick Links -->
                            <div class="py-1">
                                <a href="{{ route('dashboard') }}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-[#026897] transition">
                                    <span>📊</span>
                                    <span>{{ __('Dashboard Overview') }}</span>
                                </a>
                                @if(Auth::user()->hasPermission('settings'))
                                <a href="{{ route('settings.index') }}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-[#026897] transition">
                                    <span>⚙️</span>
                                    <span>{{ __('System Settings') }}</span>
                                </a>
                                @endif
                                @if(Auth::user()->hasPermission('pra_settings') || Auth::user()->hasPermission('settings') || Auth::user()->role === 'super_admin')
                                <a href="{{ route('settings.pra.index') }}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition">
                                    <span>🏛️</span>
                                    <span>{{ __('PRA Management') }}</span>
                                </a>
                                @endif
                                @if(Auth::user()->hasPermission('dayend'))
                                <a href="{{ route('dayend.index') }}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-[#026897] transition">
                                    <span>🔒</span>
                                    <span>{{ __('Day End Closing') }}</span>
                                </a>
                                @endif
                            </div>

                            <!-- Logout Action -->
                            <div class="pt-1">
                                <form id="top-logout-form" method="POST" action="{{ route('logout') }}" hx-boost="false">
                                    @csrf
                                    <button type="submit" class="w-full text-left rtl:text-right px-4 py-2.5 text-xs text-rose-600 font-black hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition">
                                        <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                        {{ __('Logout') }}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Page Content -->
            <main id="main-content" class="flex-1 overflow-y-auto {{ request()->routeIs('orders.create') ? 'p-0' : 'p-4 lg:p-8' }} bg-gray-50">
                <!-- Global Toast Notification Container (Top-Right Floating) -->
                <div x-data="{ 
                        showToast: false, 
                        toastType: 'success',
                        toastTitle: 'Success',
                        toastMessage: '',
                        notify(msg, type = 'success', title = '') {
                            if (!msg) return;
                            this.toastMessage = msg;
                            this.toastType = type;
                            this.toastTitle = title || (type === 'success' ? 'Success' : (type === 'error' ? 'Error' : 'Notification'));
                            this.showToast = true;
                            setTimeout(() => { this.showToast = false; }, 4500);
                        }
                    }"
                    x-init="
                        @if(session('success'))
                            notify({{ json_encode(session('success')) }}, 'success', 'Success');
                        @elseif(session('error'))
                            notify({{ json_encode(session('error')) }}, 'error', 'Error');
                        @elseif(session('warning'))
                            notify({{ json_encode(session('warning')) }}, 'warning', 'Warning');
                        @elseif(session('info'))
                            notify({{ json_encode(session('info')) }}, 'info', 'Notice');
                        @elseif(isset($errors) && $errors->any())
                            notify({{ json_encode($errors->first()) }}, 'error', 'Validation Error');
                        @endif
                    "
                    @toast-notify.window="notify($event.detail.message, $event.detail.type, $event.detail.title)"
                    x-show="showToast"
                    x-transition:enter="transition ease-out duration-300 transform"
                    x-transition:enter-start="opacity-0 translate-y-2 sm:translate-y-0 sm:translate-x-4 scale-95"
                    x-transition:enter-end="opacity-100 translate-y-0 sm:translate-x-0 scale-100"
                    x-transition:leave="transition ease-in duration-200 transform"
                    x-transition:leave-start="opacity-100 translate-x-0 scale-100"
                    x-transition:leave-end="opacity-0 translate-x-4 scale-95"
                    x-cloak
                    class="fixed top-5 right-5 z-50 max-w-sm w-full shadow-2xl p-4 flex items-center justify-between gap-3 border rounded-xl"
                    :class="{
                        'bg-slate-900 text-white border-emerald-500/60 shadow-emerald-900/30': toastType === 'success',
                        'bg-slate-900 text-white border-rose-500/60 shadow-rose-900/30': toastType === 'error',
                        'bg-slate-900 text-white border-amber-500/60 shadow-amber-900/30': toastType === 'warning',
                        'bg-slate-900 text-white border-sky-500/60 shadow-sky-900/30': toastType === 'info'
                    }">
                    
                    <div class="flex items-center gap-3">
                        <template x-if="toastType === 'success'">
                            <div class="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                        </template>
                        <template x-if="toastType === 'error'">
                            <div class="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                                <svg class="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </div>
                        </template>
                        <template x-if="toastType === 'warning' || toastType === 'info'">
                            <div class="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                                <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                        </template>

                        <div>
                            <h4 class="font-extrabold text-xs uppercase tracking-wider text-slate-300" x-text="toastTitle"></h4>
                            <p class="text-xs font-bold text-white mt-0.5" x-text="toastMessage"></p>
                        </div>
                    </div>

                    <button @click="showToast = false" class="text-slate-400 hover:text-white text-sm font-extrabold p-1 transition">
                        ✕
                    </button>
                </div>

                <script>
                    window.showToast = function(message, type = 'success', title = '') {
                        window.dispatchEvent(new CustomEvent('toast-notify', { detail: { message, type, title } }));
                    };
                </script>

                @yield('content')
            </main>
        </div>
    </div>

</body>
</html>

