@extends('layouts.app')

@section('content')
<div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <a href="{{ route('orders.index') }}" class="text-xs font-bold text-slate-500 hover:text-slate-700">← Back to Orders</a>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Order Summary: {{ $order->order_number }}</h1>
        </div>
        <div class="flex items-center gap-3">
            <a href="{{ route('orders.receipt', $order->id) }}" target="_blank" class="px-5 py-2.5 bg-slate-900 text-white font-bold text-sm shadow-md transition">
                🖨️ Thermal Print Receipt
            </a>
        </div>
    </div>

    <!-- Flash Notification -->
    @if(session('success'))
    <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
        <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        <span>{{ session('success') }}</span>
    </div>
    @endif

    <!-- Order Details Box -->
    <div class="bg-white border border-slate-200/80 shadow-sm p-6 space-y-6">
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-4 pb-6 border-b border-slate-100">
            <div>
                <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Order Type</span>
                <span class="text-sm font-extrabold text-slate-900">{{ $order->order_type }}</span>
            </div>
            <div>
                <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Table / Hall</span>
                <span class="text-sm font-extrabold text-slate-900">{{ $order->table->table_number ?? 'N/A' }}</span>
            </div>
            <div>
                <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Order Taker</span>
                <span class="text-sm font-extrabold text-slate-900">{{ $order->orderTaker->name ?? 'N/A' }}</span>
            </div>
            <div>
                <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Created At</span>
                <span class="text-sm font-extrabold text-slate-900">{{ $order->created_at->format('M d, Y h:i A') }}</span>
            </div>
            <div class="min-w-0">
                <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Bill Status</span>
                <form method="POST" action="{{ route('orders.updateStatus', $order->id) }}" class="mt-1">
                    @csrf
                    @method('PATCH')
                    <select name="order_status" 
                            onchange="if(this.value === 'Cancelled' && !confirm('Are you sure you want to CANCEL this order?\n\nThis will mark all items as CANCELLED and free the table.')) { location.reload(); return false; } this.form.submit();"
                            class="w-full max-w-full px-2.5 py-1.5 text-xs font-extrabold rounded-lg border focus:outline-none cursor-pointer shadow-xs transition truncate
                            {{ 
                                $order->order_status === 'Running' ? 'bg-sky-50 text-sky-900 border-sky-300' : (
                                $order->order_status === 'Bill Generated' ? 'bg-amber-50 text-amber-900 border-amber-300' : (
                                in_array($order->order_status, ['Complete', 'Completed']) ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-rose-50 text-rose-900 border-rose-300'
                                ))
                            }}">
                        <option value="Running" {{ $order->order_status === 'Running' ? 'selected' : '' }}>🔵 Running</option>
                        <option value="Bill Generated" {{ $order->order_status === 'Bill Generated' ? 'selected' : '' }}>🟡 Bill Generated</option>
                        <option value="Completed" {{ in_array($order->order_status, ['Complete', 'Completed']) ? 'selected' : '' }}>🟢 Completed</option>
                        <option value="Cancelled" {{ $order->order_status === 'Cancelled' ? 'selected' : '' }}>🔴 Cancelled</option>
                    </select>
                </form>
            </div>
        </div>

        <!-- Ordered Items Table -->
        <div>
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Line Items</h3>
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400">
                        <th class="py-2 px-2">Item Name</th>
                        <th class="py-2 px-2 text-center">Unit Price</th>
                        <th class="py-2 px-2 text-center">Qty</th>
                        <th class="py-2 px-2 text-right">Total</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium">
                    @foreach($order->items as $item)
                    <tr class="{{ $item->quantity == 0 ? 'bg-rose-50/60 text-slate-400 line-through' : 'text-slate-900' }}">
                        <td class="py-3 px-2 font-extrabold">
                            <div class="flex items-center gap-2">
                                <span>{{ $item->item_name }}</span>
                                @if($item->cancelled_quantity > 0)
                                    <span class="px-2 py-0.5 text-[10px] font-black bg-rose-100 text-rose-700 rounded-md border border-rose-200 no-underline">({{ $item->cancelled_quantity }} Cancelled)</span>
                                @endif
                            </div>
                        </td>
                        <td class="py-3 px-2 text-center text-slate-700">{{ currency_symbol() }} {{ number_format($item->price, 2) }}</td>
                        <td class="py-3 px-2 text-center font-extrabold">{{ $item->quantity }}</td>
                        <td class="py-3 px-2 text-right font-black">{{ currency_symbol() }} {{ number_format($item->total_amount, 2) }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <!-- Billing Summary & Discounts -->
        <div class="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <!-- Apply Discount & Payment Form -->
            <div class="space-y-4">
                <!-- Apply Discount Form -->
                <form method="POST" action="{{ route('orders.updateBilling', $order->id) }}" 
                      x-data="{ discountType: '{{ $order->discount_type ?? 'fixed' }}', discountValue: '{{ (float)($order->discount_value ?? $order->discount_amount) }}' }" 
                      class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    @csrf
                    <div class="flex items-center justify-between">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">{{ __('Discount') }}</label>
                        <div class="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
                            <button type="button" @click="discountType = 'fixed'" 
                                    :class="discountType === 'fixed' ? 'bg-white text-[#026897] shadow-xs' : 'text-slate-600 hover:text-slate-900'" 
                                    class="px-2.5 py-1 rounded-md transition">
                                {{ currency_symbol() }} Fixed Amount
                            </button>
                            <button type="button" @click="discountType = 'percentage'" 
                                    :class="discountType === 'percentage' ? 'bg-white text-[#026897] shadow-xs' : 'text-slate-600 hover:text-slate-900'" 
                                    class="px-2.5 py-1 rounded-md transition">
                                % Percentage
                            </button>
                        </div>
                    </div>

                    <input type="hidden" name="discount_type" :value="discountType">

                    <div class="flex gap-2">
                        <div class="relative flex-1">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-extrabold text-slate-400 pointer-events-none" x-text="discountType === 'fixed' ? '{{ currency_symbol() }}' : '%'"></span>
                            <input type="number" :step="discountType === 'fixed' ? '0.01' : '0.1'" min="0" :max="discountType === 'percentage' ? '100' : ''" 
                                   name="discount_value" x-model="discountValue" 
                                   :placeholder="discountType === 'fixed' ? 'Discount amount...' : 'Discount percentage...'" 
                                   class="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
                        </div>
                        <button type="submit" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg shadow-sm transition">Apply Discount</button>
                    </div>
                </form>

                <!-- Payment Form -->
                <div class="p-4 bg-slate-50 border border-slate-200 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-700">Payment Status</span>
                        @if($order->payment_status === 'Paid')
                            <span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase">
                                ✅ Paid via {{ $order->payment_mode ?? 'Cash' }}
                            </span>
                        @else
                            <span class="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-black uppercase">
                                ❌ Unpaid
                            </span>
                        @endif
                    </div>

                    @if($order->payment_status !== 'Paid')
                    <form method="POST" action="{{ route('orders.processPayment', $order->id) }}" class="space-y-3 pt-2">
                        @csrf
                        <div>
                            <label class="block text-xs font-bold text-slate-600 mb-1">Select Payment Method *</label>
                            <select name="payment_mode" required class="w-full px-3 py-2 bg-white border border-slate-300 text-sm font-bold text-slate-900">
                                <option value="Cash">Cash</option>
                                <option value="Card">Credit / Debit Card</option>
                                <option value="Online">Online / Mobile Wallet</option>
                            </select>
                        </div>
                        <button type="submit" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition">
                            💳 Process Payment & Mark Complete
                        </button>
                    </form>
                    @endif
                </div>
            </div>

            <!-- Billing Totals Card -->
            <div class="p-5 bg-slate-50 border border-slate-200 space-y-3 text-sm font-bold text-slate-700">
                <div class="flex justify-between">
                    <span>{{ __('Subtotal') }}</span>
                    <span class="font-extrabold text-slate-900">{{ currency_symbol() }} {{ number_format($order->subtotal, 2) }}</span>
                </div>

                @if($order->order_type === 'Dine In')
                <div class="flex justify-between text-slate-600">
                    <span>Dine-In Service Charge ({{ $serviceChargePct }}%)</span>
                    <span class="font-extrabold text-slate-900">+ {{ currency_symbol() }} {{ number_format($order->service_charge, 2) }}</span>
                </div>
                @else
                <div class="flex justify-between text-slate-400">
                    <span>Service Charge</span>
                    <span>{{ currency_symbol() }} 0.00 (Take Away)</span>
                </div>
                @endif

                <div class="flex justify-between text-slate-600">
                    <span>{{ __('Discount') }} @if($order->discount_type === 'percentage' && $order->discount_value > 0)({{ (float)$order->discount_value }}%)@endif</span>
                    <span class="font-extrabold text-rose-600">- {{ currency_symbol() }} {{ number_format($order->discount_amount, 2) }}</span>
                </div>

                <div class="flex justify-between text-lg font-black text-slate-900 pt-3 border-t border-slate-200">
                    <span>{{ __('Net Total') }}</span>
                    <span class="text-[#026897]">{{ currency_symbol() }} {{ number_format($order->net_total, 2) }}</span>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
