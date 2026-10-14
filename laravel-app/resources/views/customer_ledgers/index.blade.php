@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ showNewCustomerModal: false }">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Customer Credit Accounts (Khata Ledger)</h1>
            <p class="text-slate-500 text-xs font-semibold">Track customer running balances, credit purchases, and payment collection receipts</p>
        </div>
        <button @click="showNewCustomerModal = true" class="px-5 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-black text-xs shadow-md transition flex items-center gap-2 rounded-none">
            <span>+</span>
            <span>Register New Khata Customer</span>
        </button>
    </div>

    <!-- Customer Selector -->
    <div class="bg-white p-5 border border-slate-200 shadow-xs rounded-none">
        <form method="GET" action="{{ route('customer-ledgers.index') }}" class="flex items-end gap-4">
            <div class="flex-1">
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Select Customer Account</label>
                <select name="customer_id" onchange="this.form.submit()" class="w-full px-4 py-2.5 border border-slate-300 text-sm font-bold text-slate-800 rounded-none bg-white">
                    <option value="">-- Select Customer Account --</option>
                    @foreach($customers as $c)
                        <option value="{{ $c->id }}" {{ (string)$customerId === (string)$c->id ? 'selected' : '' }}>
                            {{ $c->name }} ({{ $c->phone }}) - Loyalty: {{ (int)($c->loyalty_points ?? 0) }} pts
                        </option>
                    @endforeach
                </select>
            </div>
            <button type="submit" class="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs shadow-md hover:bg-slate-800 rounded-none">View Statement</button>
        </form>
    </div>

    @if($selectedCustomer)
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Summary & Record Payment Modal -->
        <div class="lg:col-span-1 space-y-6">
            <div class="bg-white p-5 border border-slate-200 shadow-sm space-y-4">
                <h3 class="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">{{ $selectedCustomer->name }}</h3>
                <div class="text-xs text-slate-500 font-bold uppercase">Phone: <span class="text-slate-900 text-sm">{{ $selectedCustomer->phone }}</span></div>
                <div class="text-xs text-slate-500 font-bold uppercase">Loyalty Points: <span class="text-orange-600 font-black text-sm">{{ $selectedCustomer->loyalty_points ?? 0 }} pts</span></div>

                <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <div class="bg-slate-50 p-3 border border-slate-200">
                        <span class="block text-[10px] font-bold text-slate-400 uppercase">Total Debits</span>
                        <span class="text-sm font-black text-rose-600">{{ number_format($totalDebit, 2) }}</span>
                    </div>
                    <div class="bg-slate-50 p-3 border border-slate-200">
                        <span class="block text-[10px] font-bold text-slate-400 uppercase">Current Due</span>
                        <span class="text-sm font-black text-orange-600">{{ number_format($currentBalance, 2) }}</span>
                    </div>
                </div>
            </div>

            <div class="bg-white p-5 border border-slate-200 shadow-sm">
                <h3 class="text-base font-bold text-slate-900 mb-3">Record Payment Received</h3>
                <form method="POST" action="{{ route('customer-ledgers.payment') }}" class="space-y-4">
                    @csrf
                    <input type="hidden" name="customer_id" value="{{ $selectedCustomer->id }}">

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Amount Paid ($)</label>
                        <input type="number" step="0.01" name="amount" required placeholder="0.00" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Receipt / Ref #</label>
                        <input type="text" name="reference_no" placeholder="REC-1002" class="w-full px-3 py-2 border border-slate-300 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Description / Notes</label>
                        <input type="text" name="description" placeholder="Cash Payment Received" class="w-full px-3 py-2 border border-slate-300 text-sm">
                    </div>

                    <button type="submit" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition">
                        ✓ Record Payment Receipt
                    </button>
                </form>
            </div>
        </div>

        <!-- Ledger Statement Table -->
        <div class="lg:col-span-2 bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 class="font-extrabold text-slate-900 text-base">Account Ledger History</h3>
                <span class="text-xs font-bold uppercase text-slate-500">{{ $ledgers->count() }} Transactions</span>
            </div>
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-400 bg-slate-100/50">
                        <th class="py-3 px-4">Date & Time</th>
                        <th class="py-3 px-4">Type</th>
                        <th class="py-3 px-4">Description</th>
                        <th class="py-3 px-4 text-right">Amount</th>
                        <th class="py-3 px-4 text-right">Running Balance</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($ledgers as $leg)
                    <tr>
                        <td class="py-3 px-4 text-xs font-bold text-slate-500">{{ $leg->created_at->format('M d, Y h:i A') }}</td>
                        <td class="py-3 px-4">
                            <span class="inline-flex px-2 py-0.5 text-xs font-black uppercase {{ $leg->type === 'debit' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800' }}">
                                {{ $leg->type === 'debit' ? 'Debit (Order)' : 'Credit (Paid)' }}
                            </span>
                        </td>
                        <td class="py-3 px-4 text-slate-800 font-bold">{{ $leg->description ?? '-' }}</td>
                        <td class="py-3 px-4 text-right font-black {{ $leg->type === 'debit' ? 'text-rose-600' : 'text-emerald-600' }}">
                            {{ number_format($leg->amount, 2) }}
                        </td>
                        <td class="py-3 px-4 text-right font-black text-slate-900">{{ number_format($leg->balance, 2) }}</td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="5" class="py-8 text-center text-slate-400 font-medium">No ledger transaction records found for this customer account.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
    @endif

    <!-- Register New Customer Modal -->
    <div x-show="showNewCustomerModal" 
         x-cloak
         class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div @click.away="showNewCustomerModal = false"
             class="bg-white border border-slate-300 w-full max-w-md shadow-2xl p-6 rounded-none space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 class="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>👤</span>
                    <span>Register New Khata Customer</span>
                </h3>
                <button @click="showNewCustomerModal = false" class="text-slate-400 hover:text-slate-700 font-black text-sm">✕</button>
            </div>

            <form method="POST" action="{{ route('customer-ledgers.customer.store') }}" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Customer Full Name *</label>
                    <input type="text" name="name" required placeholder="e.g. Haji Muhammad Tariq" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-900 rounded-none focus:outline-none focus:border-[#026897]">
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Phone Number (Required for POS Lookup) *</label>
                    <input type="text" name="phone" required placeholder="e.g. 0300-1234567" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-900 rounded-none focus:outline-none focus:border-[#026897]">
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Email (Optional)</label>
                    <input type="email" name="email" placeholder="customer@domain.com" class="w-full px-3 py-2 border border-slate-300 text-sm text-slate-900 rounded-none focus:outline-none focus:border-[#026897]">
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Address / Landmark</label>
                    <textarea name="address" rows="2" placeholder="Delivery or business address..." class="w-full px-3 py-2 border border-slate-300 text-xs text-slate-900 rounded-none focus:outline-none focus:border-[#026897]"></textarea>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Opening Udhar / Debit Balance (Rs.)</label>
                    <input type="number" step="0.01" min="0" name="opening_balance" value="0.00" class="w-full px-3 py-2 border border-slate-300 text-sm font-black text-slate-900 rounded-none focus:outline-none focus:border-[#026897]">
                    <span class="text-[10px] text-slate-400 font-medium block mt-0.5">Leave 0 if customer starts with clean zero balance.</span>
                </div>

                <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button type="button" @click="showNewCustomerModal = false" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-none">
                        Cancel
                    </button>
                    <button type="submit" class="px-5 py-2 bg-[#026897] hover:bg-[#01547b] text-white font-black text-xs shadow-md rounded-none">
                        ✓ Save Customer Account
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
