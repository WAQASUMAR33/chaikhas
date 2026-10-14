@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ 
    // State
    modalOpen: false,
    detailsModalOpen: false,
    selectedDayEnd: null,
    activeTab: 'overview',
    isPreviewLoading: false,

    // Form
    form: {
        branch_id: '{{ $branchId }}',
        date: '{{ now()->toDateString() }}',
        opening_cash: 5000,
        actual_cash: '',
        notes: ''
    },

    // Live preview data for modal
    previewData: {
        gross_sales: {{ $todaySummary['gross_sales'] ?? 0 }},
        total_discount: {{ $todaySummary['total_discount'] ?? 0 }},
        total_service_charges: {{ $todaySummary['total_service_charges'] ?? 0 }},
        total_sales: {{ $todaySummary['total_sales'] ?? 0 }},
        cash_sales: {{ $todaySummary['cash_sales'] ?? 0 }},
        card_sales: {{ $todaySummary['card_sales'] ?? 0 }},
        online_sales: {{ $todaySummary['online_sales'] ?? 0 }},
        other_sales: {{ $todaySummary['other_sales'] ?? 0 }},
        total_orders: {{ $todaySummary['total_orders'] ?? 0 }},
        completed_orders: {{ $todaySummary['completed_orders'] ?? 0 }},
        cancelled_orders: {{ $todaySummary['cancelled_orders'] ?? 0 }},
        running_orders_count: {{ $todaySummary['running_orders_count'] ?? 0 }},
        dine_in_sales: {{ $todaySummary['dine_in_sales'] ?? 0 }},
        takeaway_sales: {{ $todaySummary['takeaway_sales'] ?? 0 }},
        delivery_sales: {{ $todaySummary['delivery_sales'] ?? 0 }},
        total_expenses: {{ $todaySummary['total_expenses'] ?? 0 }},
        expenses_list: @js($todaySummary['expenses_list'] ?? []),
        category_sales: @js($todaySummary['category_sales'] ?? []),
        top_items: @js($todaySummary['top_items'] ?? [])
    },

    get expectedCash() {
        const opening = parseFloat(this.form.opening_cash) || 0;
        const cashIn = parseFloat(this.previewData.cash_sales) || 0;
        const expenses = parseFloat(this.previewData.total_expenses) || 0;
        return (opening + cashIn - expenses).toFixed(2);
    },

    get cashDifference() {
        if (this.form.actual_cash === '' || isNaN(this.form.actual_cash)) {
            return 0;
        }
        const actual = parseFloat(this.form.actual_cash) || 0;
        const expected = parseFloat(this.expectedCash) || 0;
        return (actual - expected).toFixed(2);
    },

    async fetchPreview() {
        this.isPreviewLoading = true;
        try {
            const url = '{{ route('dayend.preview') }}?branch_id=' + this.form.branch_id + '&date=' + this.form.date;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const data = await res.json();
            if (data.success && data.summary) {
                this.previewData = data.summary;
                if (this.form.actual_cash === '') {
                    this.form.actual_cash = this.expectedCash;
                }
            }
        } catch (e) {
            console.error('Failed to load dayend preview:', e);
        } finally {
            this.isPreviewLoading = false;
        }
    },

    openCloseModal() {
        this.fetchPreview();
        this.modalOpen = true;
    },

    openDetails(dayEnd) {
        this.selectedDayEnd = dayEnd;
        this.activeTab = 'overview';
        this.detailsModalOpen = true;
    }
}">

    <!-- Header Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Day End Reconciliation & Z-Report</h1>
            <p class="text-slate-500 text-xs font-semibold mt-0.5">Comprehensive shift & day-end register closures with complete sales and expense details</p>
        </div>
        <div class="flex gap-2">
            <button type="button" 
                    @click="openCloseModal()" 
                    class="px-5 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-xs uppercase tracking-wide shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                <span>🔒</span> Close Day / Shift Now
            </button>
        </div>
    </div>

    <!-- Flash Notifications -->
    @if(session('success'))
    <div class="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-xs flex items-center justify-between">
        <span>✓ {{ session('success') }}</span>
        <button onclick="this.parentElement.remove()" class="text-emerald-700 hover:text-emerald-900 font-black">✕</button>
    </div>
    @endif
    @if(session('error'))
    <div class="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold shadow-xs flex items-center justify-between">
        <span>✕ {{ session('error') }}</span>
        <button onclick="this.parentElement.remove()" class="text-rose-700 hover:text-rose-900 font-black">✕</button>
    </div>
    @endif

    <!-- Top Live Metric Cards (Zero Radius Square Design) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Today's Total Sales -->
        <div class="bg-white p-4 border border-slate-300 shadow-xs flex items-center justify-between">
            <div>
                <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Today's Net Sales</span>
                <span class="text-2xl font-black text-emerald-600 mt-1 block">{{ number_format($todaySummary['total_sales'] ?? 0, 2) }}</span>
                <span class="text-[10px] text-slate-400 font-semibold block mt-0.5">
                    Gross: {{ number_format($todaySummary['gross_sales'] ?? 0, 0) }} | Disc: {{ number_format($todaySummary['total_discount'] ?? 0, 0) }}
                </span>
            </div>
            <div class="w-10 h-10 border border-emerald-300 bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-lg">
                💰
            </div>
        </div>

        <!-- Cash in Till -->
        <div class="bg-white p-4 border border-slate-300 shadow-xs flex items-center justify-between">
            <div>
                <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Today's Cash Sales</span>
                <span class="text-2xl font-black text-[#026897] mt-1 block">{{ number_format($todaySummary['cash_sales'] ?? 0, 2) }}</span>
                <span class="text-[10px] text-slate-400 font-semibold block mt-0.5">
                    Card/Online: {{ number_format(($todaySummary['card_sales'] ?? 0) + ($todaySummary['online_sales'] ?? 0), 2) }}
                </span>
            </div>
            <div class="w-10 h-10 border border-sky-300 bg-sky-50 text-[#026897] flex items-center justify-center font-black text-lg">
                💵
            </div>
        </div>

        <!-- Today's Expenses -->
        <div class="bg-white p-4 border border-slate-300 shadow-xs flex items-center justify-between">
            <div>
                <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Today's Expenses</span>
                <span class="text-2xl font-black text-rose-600 mt-1 block">{{ number_format($todaySummary['total_expenses'] ?? 0, 2) }}</span>
                <span class="text-[10px] text-slate-400 font-semibold block mt-0.5">
                    Count: {{ count($todaySummary['expenses_list'] ?? []) }} expenses
                </span>
            </div>
            <div class="w-10 h-10 border border-rose-300 bg-rose-50 text-rose-700 flex items-center justify-center font-black text-lg">
                🧾
            </div>
        </div>

        <!-- Orders & Operational Status -->
        <div class="bg-white p-4 border border-slate-300 shadow-xs flex items-center justify-between">
            <div>
                <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Orders Status</span>
                <span class="text-2xl font-black text-slate-900 mt-1 block">{{ $todaySummary['completed_orders'] ?? 0 }} <span class="text-xs text-slate-500 font-normal">/ {{ $todaySummary['total_orders'] ?? 0 }}</span></span>
                <span class="text-[10px] font-bold block mt-0.5 {{ ($todaySummary['running_orders_count'] ?? 0) > 0 ? 'text-amber-600' : 'text-slate-400' }}">
                    {{ ($todaySummary['running_orders_count'] ?? 0) > 0 ? '⚠️ ' . $todaySummary['running_orders_count'] . ' Running orders' : 'All orders settled' }}
                </span>
            </div>
            <div class="w-10 h-10 border border-slate-300 bg-slate-100 text-slate-700 flex items-center justify-center font-black text-lg">
                🍽️
            </div>
        </div>
    </div>

    <!-- Closure History Table -->
    <div class="bg-white border border-slate-300 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
                <h3 class="text-sm font-black uppercase tracking-wider text-slate-900">Historical Day Closures (Z-Reports)</h3>
                <p class="text-[11px] text-slate-500 font-medium">Archived shift records with complete audit trails, payment splits, and expenses</p>
            </div>
            <span class="text-xs font-bold text-slate-600">Total Records: {{ $dayEnds->total() }}</span>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100/80">
                        <th class="py-3 px-5">Closure Date</th>
                        <th class="py-3 px-5">Branch</th>
                        <th class="py-3 px-5">Net Sales</th>
                        <th class="py-3 px-5">Cash Sales</th>
                        <th class="py-3 px-5">Expenses</th>
                        <th class="py-3 px-5">Expected Cash</th>
                        <th class="py-3 px-5">Actual Cash</th>
                        <th class="py-3 px-5">Difference</th>
                        <th class="py-3 px-5">Closed By</th>
                        <th class="py-3 px-5 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 text-xs font-medium text-slate-800">
                    @forelse($dayEnds as $d)
                    <tr class="hover:bg-slate-50/80 transition">
                        <!-- Date -->
                        <td class="py-3.5 px-5">
                            <span class="font-extrabold text-slate-900 block">{{ $d->date->format('M d, Y') }}</span>
                            <span class="text-[10px] font-mono text-slate-400">ID #{{ str_pad($d->id, 5, '0', STR_PAD_LEFT) }}</span>
                        </td>

                        <!-- Branch -->
                        <td class="py-3.5 px-5 font-semibold text-slate-700">
                            {{ $d->branch->branch_name ?? 'Global' }}
                        </td>

                        <!-- Net Sales -->
                        <td class="py-3.5 px-5">
                            <span class="font-black text-emerald-600 block">{{ number_format($d->total_sales, 2) }}</span>
                            @if($d->total_orders > 0)
                            <span class="text-[10px] text-slate-400 font-semibold">{{ $d->completed_orders }} orders</span>
                            @endif
                        </td>

                        <!-- Cash Sales -->
                        <td class="py-3.5 px-5 font-bold text-[#026897]">
                            {{ number_format($d->cash_sales ?: $d->total_sales, 2) }}
                        </td>

                        <!-- Expenses -->
                        <td class="py-3.5 px-5 font-bold text-rose-600">
                            {{ number_format($d->total_expenses, 2) }}
                        </td>

                        <!-- Expected Cash -->
                        <td class="py-3.5 px-5 font-semibold text-slate-700">
                            {{ number_format($d->expected_cash ?: ($d->opening_cash + $d->total_sales - $d->total_expenses), 2) }}
                        </td>

                        <!-- Actual Counted Cash -->
                        <td class="py-3.5 px-5 font-black text-slate-900">
                            {{ number_format($d->actual_cash ?: $d->closing_cash, 2) }}
                        </td>

                        <!-- Difference -->
                        <td class="py-3.5 px-5">
                            @php
                                $diff = (float) $d->cash_difference;
                            @endphp
                            @if($diff > 0)
                                <span class="px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-300">
                                    +{{ number_format($diff, 2) }} (Over)
                                </span>
                            @elseif($diff < 0)
                                <span class="px-2 py-0.5 text-[10px] font-black uppercase bg-rose-50 text-rose-800 border border-rose-300">
                                    {{ number_format($diff, 2) }} (Short)
                                </span>
                            @else
                                <span class="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-50 text-slate-700 border border-slate-300">
                                    Balanced
                                </span>
                            @endif
                        </td>

                        <!-- Closed By -->
                        <td class="py-3.5 px-5 font-semibold text-slate-800">
                            {{ $d->user->name ?? 'Staff' }}
                        </td>

                        <!-- Actions -->
                        <td class="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                            <button type="button" 
                                    @click='openDetails(@json($d))'
                                    class="text-xs font-bold text-slate-700 hover:text-white hover:bg-[#026897] bg-white px-3 py-1.5 border border-slate-300 transition cursor-pointer">
                                🔍 Full Details
                            </button>
                            <a href="{{ route('dayend.print', $d->id) }}" 
                               target="_blank"
                               class="inline-block text-xs font-bold text-[#026897] hover:text-white hover:bg-[#026897] bg-sky-50 px-3 py-1.5 border border-sky-300 transition cursor-pointer">
                                🖨️ Z-Report
                            </a>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="10" class="py-10 px-6 text-center text-slate-400">
                            <div class="text-3xl mb-2">🔒</div>
                            <p class="font-bold text-slate-700">No day-end reconciliation records found.</p>
                            <p class="text-xs">Click "Close Day / Shift Now" above to create today's closing snapshot.</p>
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        @if($dayEnds->hasPages())
        <div class="p-4 border-t border-slate-200 bg-slate-50">
            {{ $dayEnds->links() }}
        </div>
        @endif
    </div>

    <!-- Day End Closure Modal (Zero Radius Square Design & Live Calculation) -->
    <div x-show="modalOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white border border-slate-300 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto" @click.away="modalOpen = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                    <h2 class="text-lg font-black text-slate-900">Record Day End Closure (Z-Report)</h2>
                    <p class="text-[11px] text-slate-500 font-semibold">Store comprehensive daily sales, payment splits, expenses, and till reconciliation</p>
                </div>
                <button type="button" @click="modalOpen = false" class="text-slate-400 hover:text-slate-700 font-black text-lg p-1">✕</button>
            </div>

            <form action="{{ route('dayend.store') }}" method="POST" class="space-y-4">
                @csrf

                <!-- Branch & Date Selectors -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Branch *</label>
                        <select name="branch_id" 
                                x-model="form.branch_id" 
                                @change="fetchPreview()"
                                required 
                                class="w-full px-3 py-2 border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:border-[#026897] outline-none">
                            @foreach($branches as $b)
                            <option value="{{ $b->id }}">{{ $b->branch_name }}</option>
                            @endforeach
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Closure Date *</label>
                        <input type="date" 
                               name="date" 
                               x-model="form.date" 
                               @change="fetchPreview()"
                               required 
                               class="w-full px-3 py-2 border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:border-[#026897] outline-none">
                    </div>
                </div>

                <!-- Live Summary Snapshot Preview Box -->
                <div class="p-3 bg-slate-50 border border-slate-300 space-y-3 relative">
                    <div x-show="isPreviewLoading" class="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
                        <span class="animate-spin text-lg">🔄</span>
                    </div>

                    <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span class="text-xs font-black uppercase text-slate-700 tracking-wide">Day's Financial Snapshot</span>
                        <template x-if="previewData.running_orders_count > 0">
                            <span class="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                                ⚠️ <span x-text="previewData.running_orders_count"></span> Running Orders Pending
                            </span>
                        </template>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div class="p-2 bg-white border border-slate-200">
                            <span class="text-[10px] text-slate-400 font-bold uppercase block">Gross Sales</span>
                            <span class="font-extrabold text-slate-800" x-text="Number(previewData.gross_sales).toFixed(2)"></span>
                        </div>
                        <div class="p-2 bg-white border border-slate-200">
                            <span class="text-[10px] text-slate-400 font-bold uppercase block">Discounts</span>
                            <span class="font-extrabold text-rose-600" x-text="'-' + Number(previewData.total_discount).toFixed(2)"></span>
                        </div>
                        <div class="p-2 bg-white border border-slate-200">
                            <span class="text-[10px] text-slate-400 font-bold uppercase block">Net Sales</span>
                            <span class="font-extrabold text-emerald-600" x-text="Number(previewData.total_sales).toFixed(2)"></span>
                        </div>
                        <div class="p-2 bg-white border border-slate-200">
                            <span class="text-[10px] text-slate-400 font-bold uppercase block">Expenses</span>
                            <span class="font-extrabold text-rose-600" x-text="'-' + Number(previewData.total_expenses).toFixed(2)"></span>
                        </div>
                    </div>

                    <!-- Payment Splits -->
                    <div class="grid grid-cols-3 gap-2 text-[11px] pt-1">
                        <div class="bg-white p-2 border border-slate-200">
                            <span class="text-slate-500 font-semibold">💵 Cash Sales:</span>
                            <span class="font-bold text-slate-900 block" x-text="Number(previewData.cash_sales).toFixed(2)"></span>
                        </div>
                        <div class="bg-white p-2 border border-slate-200">
                            <span class="text-slate-500 font-semibold">💳 Card Sales:</span>
                            <span class="font-bold text-slate-900 block" x-text="Number(previewData.card_sales).toFixed(2)"></span>
                        </div>
                        <div class="bg-white p-2 border border-slate-200">
                            <span class="text-slate-500 font-semibold">🌐 Online/Digital:</span>
                            <span class="font-bold text-slate-900 block" x-text="Number(previewData.online_sales).toFixed(2)"></span>
                        </div>
                    </div>
                </div>

                <!-- Cash Reconciliation Fields -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Opening Till Float Cash *
                        </label>
                        <input type="number" 
                               step="0.01" 
                               name="opening_cash" 
                               x-model="form.opening_cash" 
                               required 
                               placeholder="e.g. 5000"
                               class="w-full px-3 py-2 border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:border-[#026897] outline-none">
                        <p class="text-[10px] text-slate-400 mt-0.5">Cash present in register at opening of shift</p>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Actual Counted Till Cash <span class="text-slate-400 font-normal lowercase">(optional)</span>
                        </label>
                        <input type="number" 
                               step="0.01" 
                               name="actual_cash" 
                               x-model="form.actual_cash" 
                               :placeholder="'e.g. ' + expectedCash"
                               class="w-full px-3 py-2 border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:border-[#026897] outline-none">
                        <p class="text-[10px] text-slate-400 mt-0.5">Physical cash counted (defaults to expected till cash)</p>
                    </div>
                </div>

                <!-- Live Till Balance & Variance Card -->
                <div class="p-3 bg-white border border-slate-300 flex items-center justify-between text-xs">
                    <div>
                        <span class="text-slate-500 font-semibold">Expected Cash in Drawer:</span>
                        <span class="font-black text-slate-900 ml-1" x-text="expectedCash"></span>
                        <div class="text-[10px] text-slate-400">Opening (float) + Cash Sales - Cash Expenses</div>
                    </div>

                    <div class="text-right">
                        <span class="text-slate-500 font-semibold">Variance / Discrepancy:</span>
                        <div class="mt-0.5">
                            <template x-if="cashDifference > 0">
                                <span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-black text-xs">
                                    +<span x-text="cashDifference"></span> (Over)
                                </span>
                            </template>
                            <template x-if="cashDifference < 0">
                                <span class="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-300 font-black text-xs">
                                    <span x-text="cashDifference"></span> (Short)
                                </span>
                            </template>
                            <template x-if="cashDifference == 0">
                                <span class="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs">
                                    0.00 (Balanced)
                                </span>
                            </template>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Notes / Discrepancies</label>
                    <textarea name="notes" 
                              x-model="form.notes" 
                              rows="2" 
                              placeholder="Any cash discrepancies, shift notes, or handover comments..."
                              class="w-full px-3 py-2 border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:border-[#026897] outline-none"></textarea>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
                    <button type="button" @click="modalOpen = false" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase cursor-pointer">
                        Cancel
                    </button>
                    <button type="submit" 
                            class="px-5 py-2 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-xs uppercase tracking-wide shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                        <span>🔒</span> Save Day End & Generate Z-Report
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Full Details Modal (Executive Tabbed View & Z-Report) -->
    <div x-show="detailsModalOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white border border-slate-300 max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto" @click.away="detailsModalOpen = false">
            <template x-if="selectedDayEnd">
                <div class="space-y-4">
                    <!-- Modal Header -->
                    <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-lg font-black text-slate-900" x-text="'Day End Z-Report #' + String(selectedDayEnd.id).padStart(5, '0')"></h2>
                                <span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase">Closed</span>
                            </div>
                            <p class="text-[11px] text-slate-500 font-semibold" x-text="'Branch: ' + (selectedDayEnd.branch ? selectedDayEnd.branch.branch_name : 'Global') + ' • Date: ' + (selectedDayEnd.date ? selectedDayEnd.date.substring(0,10) : '') + ' • Closed by: ' + (selectedDayEnd.user ? selectedDayEnd.user.name : 'Staff')"></p>
                        </div>
                        <div class="flex items-center gap-2">
                            <a :href="'/dayend/' + selectedDayEnd.id + '/print'" 
                               target="_blank" 
                               class="px-3 py-1.5 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-xs uppercase flex items-center gap-1">
                                <span>🖨️</span> Print Slip
                            </a>
                            <button type="button" @click="detailsModalOpen = false" class="text-slate-400 hover:text-slate-700 font-black text-lg p-1">✕</button>
                        </div>
                    </div>

                    <!-- Top 4 Summary Cards -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div class="p-3 bg-slate-50 border border-slate-300">
                            <span class="text-[10px] text-slate-500 uppercase font-bold block">Net Sales</span>
                            <span class="text-lg font-black text-emerald-700 mt-0.5 block" x-text="Number(selectedDayEnd.total_sales).toFixed(2)"></span>
                        </div>
                        <div class="p-3 bg-slate-50 border border-slate-300">
                            <span class="text-[10px] text-slate-500 uppercase font-bold block">Total Expenses</span>
                            <span class="text-lg font-black text-rose-700 mt-0.5 block" x-text="Number(selectedDayEnd.total_expenses).toFixed(2)"></span>
                        </div>
                        <div class="p-3 bg-slate-50 border border-slate-300">
                            <span class="text-[10px] text-slate-500 uppercase font-bold block">Counted Cash</span>
                            <span class="text-lg font-black text-slate-900 mt-0.5 block" x-text="Number(selectedDayEnd.actual_cash || selectedDayEnd.closing_cash).toFixed(2)"></span>
                        </div>
                        <div class="p-3 bg-slate-50 border border-slate-300">
                            <span class="text-[10px] text-slate-500 uppercase font-bold block">Variance</span>
                            <span class="text-lg font-black mt-0.5 block" 
                                  :class="Number(selectedDayEnd.cash_difference) >= 0 ? 'text-emerald-700' : 'text-rose-700'"
                                  x-text="(Number(selectedDayEnd.cash_difference) > 0 ? '+' : '') + Number(selectedDayEnd.cash_difference || 0).toFixed(2)">
                            </span>
                        </div>
                    </div>

                    <!-- Tabs Header -->
                    <div class="flex border-b border-slate-200 text-xs font-bold">
                        <button type="button" 
                                @click="activeTab = 'overview'" 
                                :class="activeTab === 'overview' ? 'border-b-2 border-[#026897] text-[#026897]' : 'text-slate-500 hover:text-slate-800'"
                                class="py-2 px-4 uppercase tracking-wider">
                            Financial & Cash
                        </button>
                        <button type="button" 
                                @click="activeTab = 'orders'" 
                                :class="activeTab === 'orders' ? 'border-b-2 border-[#026897] text-[#026897]' : 'text-slate-500 hover:text-slate-800'"
                                class="py-2 px-4 uppercase tracking-wider">
                            Orders & Channels
                        </button>
                        <button type="button" 
                                @click="activeTab = 'dishes'" 
                                :class="activeTab === 'dishes' ? 'border-b-2 border-[#026897] text-[#026897]' : 'text-slate-500 hover:text-slate-800'"
                                class="py-2 px-4 uppercase tracking-wider">
                            Top Dishes & Categories
                        </button>
                        <button type="button" 
                                @click="activeTab = 'expenses'" 
                                :class="activeTab === 'expenses' ? 'border-b-2 border-[#026897] text-[#026897]' : 'text-slate-500 hover:text-slate-800'"
                                class="py-2 px-4 uppercase tracking-wider">
                            Itemized Expenses
                        </button>
                    </div>

                    <!-- Tab 1: Financial & Cash Reconciliation -->
                    <div x-show="activeTab === 'overview'" class="space-y-3 text-xs">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <!-- Revenue Breakdown -->
                            <div class="p-3 bg-white border border-slate-300 space-y-2">
                                <h4 class="font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">Revenue Breakdown</h4>
                                <div class="flex justify-between py-1 border-b border-slate-100">
                                    <span class="text-slate-600">Gross Sales (Subtotal):</span>
                                    <span class="font-bold text-slate-900" x-text="Number(selectedDayEnd.gross_sales || selectedDayEnd.total_sales).toFixed(2)"></span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-100 text-rose-600">
                                    <span>Total Discounts:</span>
                                    <span class="font-bold" x-text="'-' + Number(selectedDayEnd.total_discount || 0).toFixed(2)"></span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-100">
                                    <span class="text-slate-600">Service Charges:</span>
                                    <span class="font-bold text-slate-900" x-text="'+' + Number(selectedDayEnd.total_service_charges || 0).toFixed(2)"></span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-100">
                                    <span class="text-slate-600">Sales Tax / PRA:</span>
                                    <span class="font-bold text-slate-900" x-text="'+' + Number(selectedDayEnd.total_tax || 0).toFixed(2)"></span>
                                </div>
                                <div class="flex justify-between py-1 font-black text-sm bg-slate-50 px-2">
                                    <span class="text-slate-900">Net Sales Total:</span>
                                    <span class="text-emerald-700" x-text="Number(selectedDayEnd.total_sales).toFixed(2)"></span>
                                </div>
                            </div>

                            <!-- Payment Modes Breakdown -->
                            <div class="p-3 bg-white border border-slate-300 space-y-2">
                                <h4 class="font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">Payment Modes Breakdown</h4>
                                <div class="flex justify-between py-1 border-b border-slate-100">
                                    <span class="text-slate-600">💵 Cash Sales:</span>
                                    <span class="font-bold text-[#026897]" x-text="Number(selectedDayEnd.cash_sales || selectedDayEnd.total_sales).toFixed(2)"></span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-100">
                                    <span class="text-slate-600">💳 Card Sales:</span>
                                    <span class="font-bold text-slate-900" x-text="Number(selectedDayEnd.card_sales || 0).toFixed(2)"></span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-100">
                                    <span class="text-slate-600">🌐 Online / Digital Sales:</span>
                                    <span class="font-bold text-slate-900" x-text="Number(selectedDayEnd.online_sales || 0).toFixed(2)"></span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-100">
                                    <span class="text-slate-600">Other / Split Sales:</span>
                                    <span class="font-bold text-slate-900" x-text="Number(selectedDayEnd.other_sales || 0).toFixed(2)"></span>
                                </div>
                            </div>
                        </div>

                        <!-- Cash Drawer Balance Card -->
                        <div class="p-3 bg-slate-50 border border-slate-300">
                            <h4 class="font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">Till Reconciliation</h4>
                            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                                <div class="bg-white p-2 border border-slate-200">
                                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Opening Float</span>
                                    <span class="font-bold text-slate-900" x-text="Number(selectedDayEnd.opening_cash).toFixed(2)"></span>
                                </div>
                                <div class="bg-white p-2 border border-slate-200">
                                    <span class="text-[10px] text-slate-400 uppercase font-bold block">(+) Cash Sales</span>
                                    <span class="font-bold text-emerald-700" x-text="Number(selectedDayEnd.cash_sales || selectedDayEnd.total_sales).toFixed(2)"></span>
                                </div>
                                <div class="bg-white p-2 border border-slate-200">
                                    <span class="text-[10px] text-slate-400 uppercase font-bold block">(-) Expenses</span>
                                    <span class="font-bold text-rose-700" x-text="Number(selectedDayEnd.total_expenses).toFixed(2)"></span>
                                </div>
                                <div class="bg-white p-2 border border-slate-200 font-bold">
                                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Expected Till</span>
                                    <span class="font-black text-slate-900" x-text="Number(selectedDayEnd.expected_cash || (selectedDayEnd.opening_cash + selectedDayEnd.total_sales - selectedDayEnd.total_expenses)).toFixed(2)"></span>
                                </div>
                                <div class="bg-white p-2 border border-slate-200 font-bold">
                                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Actual Counted</span>
                                    <span class="font-black text-slate-900" x-text="Number(selectedDayEnd.actual_cash || selectedDayEnd.closing_cash).toFixed(2)"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 2: Orders & Channels -->
                    <div x-show="activeTab === 'orders'" class="space-y-3 text-xs">
                        <div class="grid grid-cols-3 gap-3">
                            <div class="p-3 bg-white border border-slate-300">
                                <span class="text-[10px] text-slate-500 uppercase font-bold block">Dine In</span>
                                <span class="text-base font-black text-slate-900 mt-1 block" x-text="Number(selectedDayEnd.dine_in_sales || 0).toFixed(2)"></span>
                                <span class="text-[10px] text-slate-400 font-semibold" x-text="(selectedDayEnd.dine_in_count || 0) + ' orders'"></span>
                            </div>
                            <div class="p-3 bg-white border border-slate-300">
                                <span class="text-[10px] text-slate-500 uppercase font-bold block">Takeaway</span>
                                <span class="text-base font-black text-slate-900 mt-1 block" x-text="Number(selectedDayEnd.takeaway_sales || 0).toFixed(2)"></span>
                                <span class="text-[10px] text-slate-400 font-semibold" x-text="(selectedDayEnd.takeaway_count || 0) + ' orders'"></span>
                            </div>
                            <div class="p-3 bg-white border border-slate-300">
                                <span class="text-[10px] text-slate-500 uppercase font-bold block">Delivery</span>
                                <span class="text-base font-black text-slate-900 mt-1 block" x-text="Number(selectedDayEnd.delivery_sales || 0).toFixed(2)"></span>
                                <span class="text-[10px] text-slate-400 font-semibold" x-text="(selectedDayEnd.delivery_count || 0) + ' orders'"></span>
                            </div>
                        </div>

                        <!-- Orders Count Summary -->
                        <div class="p-3 bg-slate-50 border border-slate-300 grid grid-cols-3 gap-3 text-center">
                            <div>
                                <span class="text-[10px] text-slate-500 uppercase font-bold block">Total Orders</span>
                                <span class="font-black text-base text-slate-900" x-text="selectedDayEnd.total_orders || 0"></span>
                            </div>
                            <div>
                                <span class="text-[10px] text-slate-500 uppercase font-bold block">Completed Orders</span>
                                <span class="font-black text-base text-emerald-700" x-text="selectedDayEnd.completed_orders || 0"></span>
                            </div>
                            <div>
                                <span class="text-[10px] text-slate-500 uppercase font-bold block">Cancelled Orders</span>
                                <span class="font-black text-base text-rose-700" x-text="selectedDayEnd.cancelled_orders || 0"></span>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 3: Top Dishes & Categories -->
                    <div x-show="activeTab === 'dishes'" class="space-y-3 text-xs">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <!-- Top Items -->
                            <div class="p-3 bg-white border border-slate-300">
                                <h4 class="font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">Top Selling Dishes</h4>
                                <template x-if="selectedDayEnd.details && selectedDayEnd.details.top_items && selectedDayEnd.details.top_items.length">
                                    <table class="w-full text-left">
                                        <thead>
                                            <tr class="text-[10px] text-slate-400 uppercase border-b border-slate-100">
                                                <th>Dish</th>
                                                <th class="text-right">Qty</th>
                                                <th class="text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100">
                                            <template x-for="item in selectedDayEnd.details.top_items" :key="item.name">
                                                <tr>
                                                    <td class="py-1 font-semibold text-slate-800" x-text="item.name"></td>
                                                    <td class="py-1 text-right font-bold" x-text="item.quantity"></td>
                                                    <td class="py-1 text-right font-black text-slate-900" x-text="Number(item.total).toFixed(2)"></td>
                                                </tr>
                                            </template>
                                        </tbody>
                                    </table>
                                </template>
                                <template x-if="!selectedDayEnd.details || !selectedDayEnd.details.top_items || !selectedDayEnd.details.top_items.length">
                                    <p class="text-slate-400 italic">No dish-level data available for this record.</p>
                                </template>
                            </div>

                            <!-- Categories -->
                            <div class="p-3 bg-white border border-slate-300">
                                <h4 class="font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">Category Summary</h4>
                                <template x-if="selectedDayEnd.details && selectedDayEnd.details.category_sales && selectedDayEnd.details.category_sales.length">
                                    <table class="w-full text-left">
                                        <thead>
                                            <tr class="text-[10px] text-slate-400 uppercase border-b border-slate-100">
                                                <th>Category</th>
                                                <th class="text-right">Qty</th>
                                                <th class="text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100">
                                            <template x-for="cat in selectedDayEnd.details.category_sales" :key="cat.name">
                                                <tr>
                                                    <td class="py-1 font-semibold text-slate-800" x-text="cat.name"></td>
                                                    <td class="py-1 text-right font-bold" x-text="cat.quantity"></td>
                                                    <td class="py-1 text-right font-black text-slate-900" x-text="Number(cat.total).toFixed(2)"></td>
                                                </tr>
                                            </template>
                                        </tbody>
                                    </table>
                                </template>
                                <template x-if="!selectedDayEnd.details || !selectedDayEnd.details.category_sales || !selectedDayEnd.details.category_sales.length">
                                    <p class="text-slate-400 italic">No category data available for this record.</p>
                                </template>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 4: Itemized Expenses -->
                    <div x-show="activeTab === 'expenses'" class="space-y-3 text-xs">
                        <div class="p-3 bg-white border border-slate-300">
                            <h4 class="font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">Expenses Incurred</h4>
                            <template x-if="selectedDayEnd.details && selectedDayEnd.details.expenses_list && selectedDayEnd.details.expenses_list.length">
                                <table class="w-full text-left">
                                    <thead>
                                        <tr class="text-[10px] text-slate-400 uppercase border-b border-slate-100">
                                            <th>Title</th>
                                            <th>Category</th>
                                            <th>Recorded By</th>
                                            <th class="text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <template x-for="exp in selectedDayEnd.details.expenses_list" :key="exp.id">
                                            <tr>
                                                <td class="py-1.5 font-semibold text-slate-800" x-text="exp.title"></td>
                                                <td class="py-1.5 text-slate-600" x-text="exp.category || 'General'"></td>
                                                <td class="py-1.5 text-slate-500" x-text="exp.user || 'Staff'"></td>
                                                <td class="py-1.5 text-right font-black text-rose-600" x-text="Number(exp.amount).toFixed(2)"></td>
                                            </tr>
                                        </template>
                                    </tbody>
                                </table>
                            </template>
                            <template x-if="!selectedDayEnd.details || !selectedDayEnd.details.expenses_list || !selectedDayEnd.details.expenses_list.length">
                                <p class="text-slate-400 italic">No expenses recorded for this day closure.</p>
                            </template>
                        </div>
                    </div>

                    <!-- Notes -->
                    <template x-if="selectedDayEnd.notes">
                        <div class="p-3 bg-slate-50 border border-slate-200 text-xs">
                            <span class="font-bold text-slate-700">Manager Notes:</span>
                            <p class="text-slate-600 mt-0.5" x-text="selectedDayEnd.notes"></p>
                        </div>
                    </template>
                </div>
            </template>
        </div>
    </div>

</div>
@endsection
