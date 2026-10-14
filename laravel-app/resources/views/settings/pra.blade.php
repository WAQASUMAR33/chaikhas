@extends('layouts.app')

@section('content')
<div class="max-w-7xl mx-auto space-y-6" x-data="{
    praEnabled: {{ $config['enabled'] ? 'true' : 'false' }},
    taxMode: '{{ $config['tax_mode'] ?? 'variable' }}',
    envMode: '{{ $config['environment'] ?? 'sandbox' }}',
    showToken: false,
    testingConnection: false,
    testResult: null,
    async togglePRA() {
        try {
            const res = await fetch('{{ route('settings.pra.toggle') }}', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': '{{ csrf_token() }}',
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();
            if (data.success) {
                this.praEnabled = data.enabled;
            }
        } catch (e) {
            console.error('Toggle error', e);
        }
    },
    async runTestConnection() {
        this.testingConnection = true;
        this.testResult = null;
        try {
            const res = await fetch('{{ route('settings.pra.test') }}', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': '{{ csrf_token() }}',
                    'Accept': 'application/json'
                }
            });
            this.testResult = await res.json();
        } catch (e) {
            this.testResult = { success: false, message: 'Connection request failed: ' + e.message };
        } finally {
            this.testingConnection = false;
        }
    }
}">

    <!-- Alert Flash Messages -->
    @if(session('success'))
    <div class="p-4 bg-emerald-50 border-l-4 border-emerald-600 border border-slate-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs">
        <span class="flex items-center gap-2">
            <span class="text-base text-emerald-700">✓</span>
            <span>{{ session('success') }}</span>
        </span>
        <button @click="$el.parentElement.remove()" class="text-emerald-800 hover:text-emerald-950 font-black cursor-pointer">✕</button>
    </div>
    @endif

    @if(session('error'))
    <div class="p-4 bg-rose-50 border-l-4 border-rose-600 border border-slate-300 text-rose-900 text-xs font-bold flex items-center justify-between shadow-xs">
        <span class="flex items-center gap-2">
            <span class="text-base text-rose-700">⚠️</span>
            <span>{{ session('error') }}</span>
        </span>
        <button @click="$el.parentElement.remove()" class="text-rose-800 hover:text-rose-950 font-black cursor-pointer">✕</button>
    </div>
    @endif

    <!-- Header Section with Executive Sharp Switch -->
    <div class="bg-white border border-slate-300 border-t-4 border-t-[#026897] p-6 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-slate-900 text-white flex items-center justify-center font-black text-xl shrink-0">
                    🏛️
                </div>
                <div>
                    <div class="flex items-center gap-3">
                        <h1 class="text-xl font-black text-slate-900 uppercase tracking-tight">Punjab Revenue Authority (PRA)</h1>
                        <span class="px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider border"
                              :class="praEnabled ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'">
                            <span x-text="praEnabled ? '● PRA INVOICING ACTIVE' : '○ INVOICING DISABLED'"></span>
                        </span>
                    </div>
                    <p class="text-xs text-slate-600 font-medium mt-1">
                        Government electronic POS fiscal integration • Real-time invoice transmission • Punjab Sales Tax compliance
                    </p>
                </div>
            </div>

            <!-- Crisp Executive Segmented Toggle Switch (Zero Round Corners) -->
            <div class="bg-slate-100 border border-slate-300 p-2.5 flex flex-col sm:flex-row sm:items-center gap-3 self-start md:self-center">
                <div class="text-left sm:text-right pr-2">
                    <div class="text-xs font-black uppercase tracking-wider text-slate-900">PRA Invoicing Switch</div>
                    <div class="text-[11px] font-medium text-slate-500" x-text="praEnabled ? 'Auto-send invoices on payment' : 'Normal invoices without PRA'"></div>
                </div>

                <div class="inline-flex border-2 border-slate-300 bg-white p-1 select-none shadow-xs">
                    <!-- OFF BUTTON -->
                    <button type="button"
                            @click="if (praEnabled) togglePRA()"
                            class="px-4 py-2 text-xs font-black uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 cursor-pointer border-none"
                            :style="!praEnabled ? 'background-color: #0f172a; color: #ffffff;' : 'background-color: transparent; color: #64748b;'">
                        <span>✕</span>
                        <span>DISABLED</span>
                    </button>

                    <!-- ON BUTTON -->
                    <button type="button"
                            @click="if (!praEnabled) togglePRA()"
                            class="px-5 py-2 text-xs font-black uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 cursor-pointer border-none"
                            :style="praEnabled ? 'background-color: #059669; color: #ffffff;' : 'background-color: transparent; color: #64748b;'">
                        <span class="inline-block w-2 h-2 rounded-full" :style="praEnabled ? 'background-color: #a7f3d0;' : 'background-color: #cbd5e1;'"></span>
                        <span>✓ ACTIVE</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Summary Metrics Cards (Sharp Corners & Crisp Top Accent Borders) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Metric 1: Synced Invoices -->
        <div class="bg-white p-5 border border-slate-300 border-t-4 border-t-emerald-600 shadow-xs flex items-center gap-4">
            <div class="w-11 h-11 bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-lg font-black shrink-0">
                ✓
            </div>
            <div>
                <div class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Synced to PRA</div>
                <div class="text-2xl font-black text-slate-900 mt-0.5">{{ number_format($totalSynced) }}</div>
                <div class="text-[10px] font-medium text-slate-500">Verified fiscal bills</div>
            </div>
        </div>

        <!-- Metric 2: Gross Turnover Synced -->
        <div class="bg-white p-5 border border-slate-300 border-t-4 border-t-[#026897] shadow-xs flex items-center gap-4">
            <div class="w-11 h-11 bg-sky-50 text-[#026897] border border-sky-200 flex items-center justify-center text-lg font-black shrink-0">
                ₨
            </div>
            <div>
                <div class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Volume Synced</div>
                <div class="text-2xl font-black text-slate-900 mt-0.5">₨ {{ number_format($syncedOrdersTotal, 0) }}</div>
                <div class="text-[10px] font-medium text-slate-500">Gross sales transmitted</div>
            </div>
        </div>

        <!-- Metric 3: Pending / Failed -->
        <div class="bg-white p-5 border border-slate-300 border-t-4 {{ $totalFailed > 0 ? 'border-t-rose-600' : 'border-t-slate-400' }} shadow-xs flex items-center gap-4">
            <div class="w-11 h-11 {{ $totalFailed > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-300' }} flex items-center justify-center text-lg font-black shrink-0">
                ⚠️
            </div>
            <div>
                <div class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Failed / Pending</div>
                <div class="text-2xl font-black {{ $totalFailed > 0 ? 'text-rose-600' : 'text-slate-900' }} mt-0.5">{{ number_format($totalFailed) }}</div>
                <div class="text-[10px] font-medium text-slate-500">Awaiting retry / unsent</div>
            </div>
        </div>

        <!-- Metric 4: Gateway Mode -->
        <div class="bg-white p-5 border border-slate-300 border-t-4 border-t-purple-600 shadow-xs flex items-center gap-4">
            <div class="w-11 h-11 bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center text-lg font-black shrink-0">
                🌐
            </div>
            <div>
                <div class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Gateway Mode</div>
                <div class="text-sm font-black text-slate-900 mt-1 uppercase tracking-tight">
                    {{ $config['environment'] === 'production' ? 'Live Production' : 'Sandbox Testing' }}
                </div>
                <div class="text-[10px] font-bold text-purple-800">POS ID: {{ $config['pos_id'] ?: 'Not configured' }}</div>
            </div>
        </div>
    </div>

    <!-- Configuration Form (Crisp Sharp Borders) -->
    <form method="POST" action="{{ route('settings.pra.update') }}" class="space-y-6">
        @csrf

        <input type="hidden" name="pra_enabled" :value="praEnabled ? '1' : '0'">

        <!-- Settings Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <!-- Column 1: Terminal Identity & API Credentials -->
            <div class="bg-white border border-slate-300 shadow-xs flex flex-col justify-between">
                <div>
                    <!-- Panel Header -->
                    <div class="bg-slate-100 border-b border-slate-300 px-5 py-3.5 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-sm">🔑</span>
                            <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">POS Terminal Identification & API</h3>
                        </div>
                        <span class="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-200 text-slate-700 border border-slate-300">Mandatory</span>
                    </div>

                    <div class="p-6 space-y-5">
                        <!-- Environment Selector -->
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                Gateway Environment
                            </label>
                            <div class="grid grid-cols-2 gap-3">
                                <label class="cursor-pointer border-2 p-3.5 flex items-center gap-3 transition"
                                       :class="envMode === 'sandbox' ? 'border-emerald-600 bg-emerald-50/40' : 'border-slate-300 bg-slate-50 hover:border-slate-400'">
                                    <input type="radio" name="pra_environment" value="sandbox" x-model="envMode" class="text-emerald-600 focus:ring-0">
                                    <div>
                                        <div class="text-xs font-black text-slate-900 uppercase">Sandbox Mode</div>
                                        <div class="text-[11px] text-slate-500 font-medium">Test simulation & verified QR</div>
                                    </div>
                                </label>
                                <label class="cursor-pointer border-2 p-3.5 flex items-center gap-3 transition"
                                       :class="envMode === 'production' ? 'border-emerald-600 bg-emerald-50/40' : 'border-slate-300 bg-slate-50 hover:border-slate-400'">
                                    <input type="radio" name="pra_environment" value="production" x-model="envMode" class="text-emerald-600 focus:ring-0">
                                    <div>
                                        <div class="text-xs font-black text-slate-900 uppercase">Live Production</div>
                                        <div class="text-[11px] text-slate-500 font-medium">Transmits to PRA live API</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- POS ID & NTN -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    PRA POS ID <span class="text-rose-600">*</span>
                                </label>
                                <input type="text" name="pra_pos_id" value="{{ old('pra_pos_id', $config['pos_id']) }}" required
                                       placeholder="e.g. 109824"
                                       class="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                                <span class="text-[10px] text-slate-500 mt-1 block">Assigned by PRA for this terminal machine</span>
                            </div>

                            <div>
                                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Restaurant NTN / STRN <span class="text-rose-600">*</span>
                                </label>
                                <input type="text" name="pra_ntn" value="{{ old('pra_ntn', $config['ntn']) }}" required
                                       placeholder="e.g. 7845129-3"
                                       class="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                                <span class="text-[10px] text-slate-500 mt-1 block">National Tax / Sales Tax Registration</span>
                            </div>
                        </div>

                        <!-- Auth Token -->
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                                <span>PRA API Bearer Token</span>
                                <button type="button" @click="showToken = !showToken" class="text-[11px] text-[#026897] font-black uppercase hover:underline cursor-pointer">
                                    <span x-text="showToken ? 'Hide Key' : 'Show Key'"></span>
                                </button>
                            </label>
                            <input :type="showToken ? 'text' : 'password'" name="pra_auth_token" value="{{ old('pra_auth_token', $config['auth_token']) }}"
                                   placeholder="Bearer token provided by PRA portal"
                                   class="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                            <span class="text-[10px] text-slate-500 mt-1 block">Authentication token issued by Punjab Revenue Authority</span>
                        </div>

                        <!-- Endpoint URL -->
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                PRA Endpoint URL <span class="text-rose-600">*</span>
                            </label>
                            <input type="url" name="pra_api_url" value="{{ old('pra_api_url', $config['api_url']) }}" required
                                   placeholder="https://ims.pra.punjab.gov.pk/api/Live/PostData"
                                   class="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                            <span class="text-[10px] text-slate-500 mt-1 block">Default: <code>https://ims.pra.punjab.gov.pk/api/Live/PostData</code></span>
                        </div>
                    </div>
                </div>

                <!-- Test Connection Panel Footer -->
                <div class="p-5 bg-slate-50 border-t border-slate-300">
                    <button type="button"
                            @click="runTestConnection()"
                            :disabled="testingConnection"
                            class="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50 flex items-center gap-2 border-none">
                        <svg x-show="testingConnection" class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                        <span>⚡ Test Connection Status</span>
                    </button>

                    <template x-if="testResult">
                        <div class="mt-3 p-3 text-xs font-bold border"
                             :class="testResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'">
                            <div class="flex items-center justify-between">
                                <span class="flex items-center gap-1.5">
                                    <span x-text="testResult.success ? '✓' : '✕'"></span>
                                    <span x-text="testResult.message"></span>
                                </span>
                                <span class="text-[10px] font-black uppercase px-2 py-0.5"
                                      :class="testResult.success ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'"
                                      x-text="testResult.status"></span>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

            <!-- Column 2: Punjab Restaurant Sales Tax Rules & Auto-Send -->
            <div class="bg-white border border-slate-300 shadow-xs flex flex-col justify-between">
                <div>
                    <!-- Panel Header -->
                    <div class="bg-slate-100 border-b border-slate-300 px-5 py-3.5 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-sm">🧾</span>
                            <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Sales Tax Rates & Automation</h3>
                        </div>
                        <span class="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300">Punjab Rules</span>
                    </div>

                    <div class="p-6 space-y-5">
                        <!-- Tax Mode -->
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                Tax Calculation Structure
                            </label>
                            <div class="grid grid-cols-2 gap-3">
                                <label class="cursor-pointer border-2 p-3.5 flex items-center gap-3 transition"
                                       :class="taxMode === 'variable' ? 'border-emerald-600 bg-emerald-50/40' : 'border-slate-300 bg-slate-50 hover:border-slate-400'">
                                    <input type="radio" name="pra_tax_mode" value="variable" x-model="taxMode" class="text-emerald-600 focus:ring-0">
                                    <div>
                                        <div class="text-xs font-black text-slate-900 uppercase">Variable Mode</div>
                                        <div class="text-[11px] text-slate-500 font-medium">5% on Card / 16% on Cash</div>
                                    </div>
                                </label>
                                <label class="cursor-pointer border-2 p-3.5 flex items-center gap-3 transition"
                                       :class="taxMode === 'flat' ? 'border-emerald-600 bg-emerald-50/40' : 'border-slate-300 bg-slate-50 hover:border-slate-400'">
                                    <input type="radio" name="pra_tax_mode" value="flat" x-model="taxMode" class="text-emerald-600 focus:ring-0">
                                    <div>
                                        <div class="text-xs font-black text-slate-900 uppercase">Flat Tax Mode</div>
                                        <div class="text-[11px] text-slate-500 font-medium">Same rate on all payments</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Variable Rates (Card vs Cash) -->
                        <div x-show="taxMode === 'variable'" class="space-y-4">
                            <div class="p-3 bg-sky-50 border-l-4 border-sky-600 border border-slate-300 text-sky-950 text-xs font-medium">
                                💡 <strong>Punjab Revenue Authority Incentive:</strong> Restaurant services paid via debit/credit cards or digital payment qualify for reduced rate (<strong>5%</strong>), while cash transactions carry standard rate (<strong>16%</strong>).
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                        Card / Digital Tax Rate (%) <span class="text-rose-600">*</span>
                                    </label>
                                    <div class="relative">
                                        <input type="number" step="0.01" min="0" max="100" name="pra_card_tax_rate" 
                                               value="{{ old('pra_card_tax_rate', $config['card_tax_rate']) }}" required
                                               class="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-300 text-xs font-black text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                                        <span class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 font-black text-xs">%</span>
                                    </div>
                                    <span class="text-[10px] text-slate-500 mt-1 block">Applied to Card, POS, Digital & Bank sales</span>
                                </div>

                                <div>
                                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                        Cash Payment Tax Rate (%) <span class="text-rose-600">*</span>
                                    </label>
                                    <div class="relative">
                                        <input type="number" step="0.01" min="0" max="100" name="pra_cash_tax_rate" 
                                               value="{{ old('pra_cash_tax_rate', $config['cash_tax_rate']) }}" required
                                               class="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-300 text-xs font-black text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                                        <span class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 font-black text-xs">%</span>
                                    </div>
                                    <span class="text-[10px] text-slate-500 mt-1 block">Standard rate applied to cash sales</span>
                                </div>
                            </div>
                        </div>

                        <!-- Flat Rate Field -->
                        <div x-show="taxMode === 'flat'">
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Flat Service Tax Rate (%) <span class="text-rose-600">*</span>
                            </label>
                            <div class="relative max-w-xs">
                                <input type="number" step="0.01" min="0" max="100" name="pra_flat_tax_rate" 
                                       value="{{ old('pra_flat_tax_rate', $config['flat_tax_rate']) }}" required
                                       class="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-300 text-xs font-black text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                                <span class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 font-black text-xs">%</span>
                            </div>
                            <span class="text-[10px] text-slate-500 mt-1 block">Uniform tax rate applied regardless of payment method</span>
                        </div>

                        <!-- Auto-send on payment option -->
                        <div class="p-3.5 bg-slate-50 border border-slate-300 flex items-start gap-3">
                            <input type="checkbox" name="pra_auto_send_on_payment" value="1" id="auto_send"
                                   {{ $config['auto_send_on_payment'] ? 'checked' : '' }}
                                   class="mt-1 h-4 w-4 text-[#026897] border-slate-400 rounded-none focus:ring-0">
                            <label for="auto_send" class="cursor-pointer select-none">
                                <div class="text-xs font-black text-slate-900 uppercase">Automatic Invoicing upon Payment Checkout</div>
                                <div class="text-[11px] text-slate-600 mt-0.5">
                                    When an order is marked as Paid, immediately transmit fiscal record to PRA and generate thermal receipt QR code.
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Submit Button Panel Footer -->
                <div class="p-5 bg-slate-50 border-t border-slate-300 flex items-center justify-end">
                    <button type="submit" class="px-6 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-black text-xs tracking-wider uppercase transition cursor-pointer border-none shadow-sm">
                        Save PRA Configuration
                    </button>
                </div>
            </div>
        </div>
    </form>

    <!-- Recent PRA Transmission Log & Retry Center -->
    <div class="bg-white border border-slate-300 shadow-sm space-y-0">
        <div class="bg-slate-100 border-b border-slate-300 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>📡</span>
                    <span>Recent PRA Invoices & Transmission Log</span>
                </h3>
                <p class="text-[11px] text-slate-600 font-medium mt-0.5">Fiscal record of orders transmitted to Punjab Revenue Authority IMS.</p>
            </div>
            <div class="text-[11px] text-slate-600 font-bold uppercase">
                Latest {{ $recentOrders->count() }} Orders
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-300 text-[11px] font-black uppercase tracking-wider text-slate-600 bg-slate-50">
                        <th class="py-3 px-4 border-r border-slate-200">Order #</th>
                        <th class="py-3 px-4 border-r border-slate-200">Date / Time</th>
                        <th class="py-3 px-4 border-r border-slate-200">Customer / Type</th>
                        <th class="py-3 px-4 border-r border-slate-200">Payment</th>
                        <th class="py-3 px-4 text-right border-r border-slate-200">Net Total</th>
                        <th class="py-3 px-4 text-center border-r border-slate-200">PRA Status</th>
                        <th class="py-3 px-4 border-r border-slate-200">PRA Invoice #</th>
                        <th class="py-3 px-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 text-xs">
                    @forelse($recentOrders as $ord)
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="py-3 px-4 font-black text-slate-900 border-r border-slate-100">
                            <a href="{{ route('orders.show', $ord->id) }}" class="text-[#026897] hover:underline">
                                {{ $ord->order_number }}
                            </a>
                        </td>
                        <td class="py-3 px-4 text-slate-600 font-medium text-[11px] border-r border-slate-100">
                            {{ $ord->created_at ? $ord->created_at->format('d M Y, h:i A') : '—' }}
                        </td>
                        <td class="py-3 px-4 text-slate-800 font-semibold border-r border-slate-100">
                            {{ $ord->customer_name ?: ($ord->order_type . ' Order') }}
                        </td>
                        <td class="py-3 px-4 text-slate-700 border-r border-slate-100">
                            <span class="font-bold">
                                {{ $ord->payment_mode ?: 'Cash' }}
                            </span>
                        </td>
                        <td class="py-3 px-4 text-right font-black text-slate-900 border-r border-slate-100">
                            ₨ {{ number_format($ord->net_total, 2) }}
                        </td>
                        <td class="py-3 px-4 text-center border-r border-slate-100">
                            @if($ord->pra_status === 'synced')
                                <span class="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    ✓ Synced
                                </span>
                            @elseif($ord->pra_status === 'failed')
                                <span class="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase bg-rose-100 text-rose-900 border border-rose-300" title="{{ $ord->pra_response }}">
                                    ✕ Failed
                                </span>
                            @else
                                <span class="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300">
                                    Pending
                                </span>
                            @endif
                        </td>
                        <td class="py-3 px-4 font-mono text-[11px] text-slate-800 font-bold border-r border-slate-100">
                            {{ $ord->pra_invoice_number ?: '—' }}
                        </td>
                        <td class="py-3 px-4 text-right space-x-2">
                            @if($ord->pra_status !== 'synced')
                            <form method="POST" action="{{ route('settings.pra.retry', $ord->id) }}" class="inline-block">
                                @csrf
                                <button type="submit" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase rounded-none text-[10px] tracking-wider transition cursor-pointer border-none shadow-2xs">
                                    🚀 Send PRA
                                </button>
                            </form>
                            @else
                            <a href="{{ route('orders.receipt', $ord->id) }}" target="_blank" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase rounded-none text-[10px] tracking-wider transition inline-block border-none shadow-2xs">
                                🖨️ Receipt
                            </a>
                            @endif
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="8" class="py-8 text-center text-slate-500 font-semibold">
                            No orders recorded yet. Complete an order to view PRA transmission logs.
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="p-4 bg-slate-50 border-t border-slate-200">
            {{ $recentOrders->links() }}
        </div>
    </div>
</div>
@endsection
