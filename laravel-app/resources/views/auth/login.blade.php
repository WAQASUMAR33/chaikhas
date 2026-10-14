<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" dir="{{ app()->getLocale() === 'ar' ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ __('Welcome to RAPIDTECHPRO') }} - {{ config('app.name', 'RAPIDTECHPRO') }}</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Alpine.js CDN -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <!-- Google Fonts (Cairo for Arabic, Plus Jakarta Sans for Latin) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        html[dir="rtl"] body { font-family: 'Cairo', 'Plus Jakarta Sans', sans-serif; }
        [x-cloak] { display: none !important; }
    </style>
</head>
<body class="bg-[#edf4fa] min-h-screen flex flex-col justify-between selection:bg-[#026897] selection:text-white" x-data="{ showPassword: false }">

    <!-- Top Navigation Bar / Brand & Language Bar -->
    <header class="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#01547b] via-[#026897] to-[#0284c7] flex items-center justify-center text-white font-black text-sm tracking-wider shadow-md shadow-[#026897]/25">
                RT
            </div>
            <div>
                <span class="font-black text-base text-slate-900 tracking-tight block leading-tight">RAPIDTECHPRO</span>
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#026897]">{{ __('Restaurant Operations & Cloud POS') }}</span>
            </div>
        </div>

        <div class="flex items-center gap-3">
            <!-- System Status Badge -->
            <div class="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{{ __('All Systems Operational') }}</span>
            </div>

            <!-- Language Switcher Dropdown -->
            <div class="relative" x-data="{ openLang: false }">
                <button @click="openLang = !openLang" @click.outside="openLang = false" 
                        class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs">
                    <span>🌐</span>
                    <span class="uppercase">{{ app()->getLocale() }}</span>
                    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div x-show="openLang" x-cloak class="absolute right-0 rtl:right-auto rtl:left-0 mt-1.5 w-36 bg-white rounded-xl shadow-xl border border-slate-200/80 py-1.5 z-50">
                    <a href="{{ route('locale.set', 'en') }}" class="flex items-center justify-between px-3.5 py-2 text-xs font-bold {{ app()->getLocale() === 'en' ? 'text-[#026897] bg-sky-50' : 'text-slate-700 hover:bg-slate-50' }}">
                        <span>English</span>
                        <span>🇬🇧</span>
                    </a>
                    <a href="{{ route('locale.set', 'ar') }}" class="flex items-center justify-between px-3.5 py-2 text-xs font-bold {{ app()->getLocale() === 'ar' ? 'text-[#026897] bg-sky-50' : 'text-slate-700 hover:bg-slate-50' }}">
                        <span>العربية</span>
                        <span>🇸🇦</span>
                    </a>
                    <a href="{{ route('locale.set', 'fr') }}" class="flex items-center justify-between px-3.5 py-2 text-xs font-bold {{ app()->getLocale() === 'fr' ? 'text-[#026897] bg-sky-50' : 'text-slate-700 hover:bg-slate-50' }}">
                        <span>Français</span>
                        <span>🇫🇷</span>
                    </a>
                    <a href="{{ route('locale.set', 'it') }}" class="flex items-center justify-between px-3.5 py-2 text-xs font-bold {{ app()->getLocale() === 'it' ? 'text-[#026897] bg-sky-50' : 'text-slate-700 hover:bg-slate-50' }}">
                        <span>Italiano</span>
                        <span>🇮🇹</span>
                    </a>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Container: Premium Split Presentation -->
    <main class="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div class="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-[#026897]/8 border border-slate-200/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
            
            <!-- Left Branding Showcase Panel -->
            <div class="lg:col-span-5 bg-gradient-to-br from-[#00334e] via-[#01547b] to-[#026897] p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
                <!-- Background Decorative Glows -->
                <div class="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none"></div>
                <div class="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#0284c7]/30 blur-3xl pointer-events-none"></div>
                
                <div class="relative z-10 space-y-6">
                    <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-sky-200 text-xs font-extrabold backdrop-blur-md">
                        <span>✨</span>
                        <span>Enterprise POS & Dining Engine</span>
                    </div>

                    <div>
                        <h2 class="text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                            RAPIDTECHPRO <br>
                            <span class="text-transparent bg-clip-text bg-gradient-to-r from-sky-200 to-cyan-400">Restaurant Suite</span>
                        </h2>
                        <p class="text-sky-100/90 text-sm font-medium mt-3 leading-relaxed">
                            Complete end-to-end dining management: seamless POS, real-time KDS, dynamic table booking, and live financial ledger tracking.
                        </p>
                    </div>

                    <!-- Highlight Features List -->
                    <div class="space-y-3 pt-2">
                        <div class="flex items-center gap-3 text-xs font-bold text-sky-100">
                            <div class="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0">⚡</div>
                            <span>{{ __('Active Kitchen Orders') }} & Kitchen Display (KDS)</span>
                        </div>
                        <div class="flex items-center gap-3 text-xs font-bold text-sky-100">
                            <div class="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0">🧾</div>
                            <span>Smart POS, Dine In, Takeaway & Split Billing</span>
                        </div>
                        <div class="flex items-center gap-3 text-xs font-bold text-sky-100">
                            <div class="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0">🌐</div>
                            <span>Multi-Currency (PKR, USD, SAR, AED, EUR) & Multi-Language</span>
                        </div>
                    </div>
                </div>

                <!-- Bottom Station Pill -->
                <div class="relative z-10 pt-8 mt-6 border-t border-white/15 flex items-center justify-between text-xs text-sky-200 font-semibold">
                    <span>Cloud Sync Active</span>
                    <span class="font-mono text-[11px] bg-white/10 px-2.5 py-1 rounded-md border border-white/10">v2.5 Enterprise</span>
                </div>
            </div>

            <!-- Right Login Form Panel -->
            <div class="lg:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-white">
                <div class="max-w-md w-full mx-auto space-y-7">
                    
                    <div>
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-50 text-[#026897] text-xs font-black border border-sky-200/80 mb-3">
                            <span>🔐</span>
                            <span>{{ __('Sign In to Terminal') }}</span>
                        </div>
                        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            {{ __('Welcome to RAPIDTECHPRO') }}
                        </h1>
                        <p class="text-slate-500 text-xs sm:text-sm font-medium mt-1">
                            {{ __('Sign in to access your POS & Management Dashboard') }}
                        </p>
                    </div>

                    @if($errors->any())
                        <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-3 shadow-xs">
                            <span class="text-rose-600 text-base leading-none">⚠️</span>
                            <div>
                                <p class="font-extrabold">{{ __('Login Failed') }}</p>
                                <p class="font-medium mt-0.5">{{ $errors->first() }}</p>
                            </div>
                        </div>
                    @endif

                    <form method="POST" action="{{ route('login') }}" class="space-y-5">
                        @csrf
                        
                        <!-- Username or Email -->
                        <div class="space-y-1.5">
                            <label class="block text-xs font-black uppercase tracking-wider text-slate-700">
                                {{ __('Username or Email') }}
                            </label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-slate-400">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                </div>
                                <input type="text" name="login" value="{{ old('login') }}" required autofocus
                                       class="w-full pl-11 rtl:pl-4 rtl:pr-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#026897] focus:border-transparent text-slate-900 font-bold text-sm bg-slate-50/50 hover:bg-white focus:bg-white transition"
                                       placeholder="e.g. superadmin or admin@rapidtechpro.com">
                            </div>
                        </div>

                        <!-- Password with Show/Hide Toggle -->
                        <div class="space-y-1.5">
                            <div class="flex items-center justify-between">
                                <label class="block text-xs font-black uppercase tracking-wider text-slate-700">
                                    {{ __('Password') }}
                                </label>
                            </div>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-slate-400">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                </div>
                                <input :type="showPassword ? 'text' : 'password'" name="password" required
                                       class="w-full pl-11 rtl:pl-11 rtl:pr-11 pr-11 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#026897] focus:border-transparent text-slate-900 font-bold text-sm bg-slate-50/50 hover:bg-white focus:bg-white transition"
                                       placeholder="••••••••">
                                <button type="button" @click="showPassword = !showPassword" 
                                        class="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3.5 rtl:pr-0 rtl:pl-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer">
                                    <span x-show="!showPassword" class="text-sm">👁️</span>
                                    <span x-show="showPassword" x-cloak class="text-sm">🙈</span>
                                </button>
                            </div>
                        </div>

                        <!-- Remember me & Help -->
                        <div class="flex items-center justify-between pt-1">
                            <label class="flex items-center gap-2.5 cursor-pointer select-none">
                                <input type="checkbox" name="remember" class="w-4 h-4 rounded text-[#026897] focus:ring-[#026897] border-slate-300 transition">
                                <span class="text-slate-600 font-bold text-xs">{{ __('Remember me') }}</span>
                            </label>
                            <span class="text-xs text-slate-400 font-medium">{{ __('Need access? Contact Admin') }}</span>
                        </div>

                        <!-- Submit Button -->
                        <button type="submit" 
                                class="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#026897] via-[#0275af] to-[#0284c7] hover:from-[#01547b] hover:to-[#026897] text-white font-black text-sm shadow-md shadow-[#026897]/25 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2">
                            <span>{{ __('Sign In to Terminal') }}</span>
                            <span class="rtl:rotate-180">→</span>
                        </button>
                    </form>

                    <!-- Quick Credentials Reference Pills -->
                    <div class="pt-5 border-t border-slate-100">
                        <span class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">{{ __('Quick Station Demo Accounts') }}:</span>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                                <span class="block font-black text-slate-800">Super Admin</span>
                                <span class="text-[11px] text-slate-500 font-mono">superadmin</span>
                            </div>
                            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                                <span class="block font-black text-slate-800">Branch Cashier</span>
                                <span class="text-[11px] text-slate-500 font-mono">admin_sufi</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    </main>

    <!-- Footer -->
    <footer class="w-full py-4 text-center text-xs text-slate-400 font-medium">
        &copy; {{ date('Y') }} RAPIDTECHPRO Group. {{ __('Restaurant Operations & Cloud POS') }}
    </footer>

</body>
</html>
