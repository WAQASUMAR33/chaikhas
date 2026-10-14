@extends('layouts.app')

@section('content')
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Vendor Accounts Payable Ledger</h1>
            <p class="text-slate-500 text-sm font-medium">Track supplier invoices, payment vouchers, and outstanding accounts payable balances</p>
        </div>
    </div>

    <!-- Vendor Selector -->
    <div class="bg-white p-5 border border-slate-200 shadow-sm">
        <form method="GET" action="{{ route('vendor-ledgers.index') }}" class="flex items-end gap-4">
            <div class="flex-1">
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Select Supplier / Vendor</label>
                <select name="vendor_id" onchange="this.form.submit()" class="w-full px-4 py-2.5 border border-slate-300 text-sm font-bold text-slate-800">
                    <option value="">-- Choose Vendor --</option>
                    @foreach($vendors as $v)
                        <option value="{{ $v->id }}" {{ (string)$vendorId === (string)$v->id ? 'selected' : '' }}>
                            {{ $v->name }} ({{ $v->phone ?? 'No Phone' }})
                        </option>
                    @endforeach
                </select>
            </div>
            <button type="submit" class="px-5 py-2.5 bg-slate-900 text-white font-bold text-sm shadow-md hover:bg-slate-800">Load Vendor Ledger</button>
        </form>
    </div>

    @if($selectedVendor)
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Summary & Record Voucher Form -->
        <div class="lg:col-span-1 space-y-6">
            <div class="bg-white p-5 border border-slate-200 shadow-sm space-y-4">
                <h3 class="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">{{ $selectedVendor->name }}</h3>
                <div class="text-xs text-slate-500 font-bold uppercase">Phone: <span class="text-slate-900 text-sm">{{ $selectedVendor->phone ?? 'N/A' }}</span></div>

                <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <div class="bg-slate-50 p-3 border border-slate-200">
                        <span class="block text-[10px] font-bold text-slate-400 uppercase">Total Bills</span>
                        <span class="text-sm font-black text-slate-900">{{ number_format($totalBills, 2) }}</span>
                    </div>
                    <div class="bg-slate-50 p-3 border border-slate-200">
                        <span class="block text-[10px] font-bold text-slate-400 uppercase">Current Payable</span>
                        <span class="text-sm font-black text-rose-600">{{ number_format($currentPayable, 2) }}</span>
                    </div>
                </div>
            </div>

            <div class="bg-white p-5 border border-slate-200 shadow-sm">
                <h3 class="text-base font-bold text-slate-900 mb-3">Record Supplier Payment Voucher</h3>
                <form method="POST" action="{{ route('vendor-ledgers.voucher') }}" class="space-y-4">
                    @csrf
                    <input type="hidden" name="vendor_id" value="{{ $selectedVendor->id }}">

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Amount Paid ($)</label>
                        <input type="number" step="0.01" name="amount" required placeholder="0.00" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Payment Method</label>
                        <select name="payment_method" required class="w-full px-3 py-2 border border-slate-300 text-sm">
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Notes / Voucher Reference</label>
                        <input type="text" name="notes" placeholder="Voucher #PV-9912" class="w-full px-3 py-2 border border-slate-300 text-sm">
                    </div>

                    <button type="submit" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition">
                        ✓ Record Payment Voucher
                    </button>
                </form>
            </div>
        </div>

        <!-- Ledger History Table -->
        <div class="lg:col-span-2 bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 class="font-extrabold text-slate-900 text-base">Payable Account Statement</h3>
                <span class="text-xs font-bold uppercase text-slate-500">{{ $ledgers->count() }} Entries</span>
            </div>
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-400 bg-slate-100/50">
                        <th class="py-3 px-4">Date & Time</th>
                        <th class="py-3 px-4">Entry Type</th>
                        <th class="py-3 px-4">Notes / Method</th>
                        <th class="py-3 px-4 text-right">Amount</th>
                        <th class="py-3 px-4 text-right">Running Payable</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($ledgers as $leg)
                    <tr>
                        <td class="py-3 px-4 text-xs font-bold text-slate-500">{{ $leg->created_at->format('M d, Y h:i A') }}</td>
                        <td class="py-3 px-4">
                            <span class="inline-flex px-2 py-0.5 text-xs font-black uppercase {{ $leg->type === 'bill' ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800' }}">
                                {{ $leg->type === 'bill' ? 'Bill Inward' : 'Voucher Paid' }}
                            </span>
                        </td>
                        <td class="py-3 px-4 text-slate-800 font-bold">{{ $leg->notes ?? $leg->payment_method ?? '-' }}</td>
                        <td class="py-3 px-4 text-right font-black {{ $leg->type === 'bill' ? 'text-slate-900' : 'text-emerald-600' }}">
                            {{ number_format($leg->amount, 2) }}
                        </td>
                        <td class="py-3 px-4 text-right font-black text-rose-600">{{ number_format($leg->balance, 2) }}</td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="5" class="py-8 text-center text-slate-400 font-medium">No purchase bill or payment voucher records found for this vendor.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
    @endif
</div>
@endsection
