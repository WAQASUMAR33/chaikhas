@extends('layouts.app')

@section('content')
<div class="max-w-5xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <a href="{{ route('purchases.index') }}" class="text-xs font-bold text-slate-500 hover:text-slate-800 transition">← Back to Purchases</a>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-3">
                <span>Inward Purchase #{{ $purchase->po_number }}</span>
                <span class="px-2.5 py-1 text-xs font-black uppercase rounded-none
                    {{ $purchase->payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : '' }}
                    {{ $purchase->payment_status === 'Unpaid' ? 'bg-rose-100 text-rose-800' : '' }}
                    {{ $purchase->payment_status === 'Partial' ? 'bg-amber-100 text-amber-800' : '' }}">
                    {{ $purchase->payment_status }}
                </span>
            </h1>
        </div>
        <div class="flex items-center gap-2">
            <a href="{{ route('purchases.print', $purchase->id) }}" target="_blank" class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2 rounded-none">
                <span>🖨️</span>
                <span>Print GRN Voucher</span>
            </a>
            <a href="{{ route('vendor-ledgers.index', ['vendor_id' => $purchase->vendor_id]) }}" class="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-xs transition flex items-center gap-2 rounded-none">
                <span>📑</span>
                <span>Vendor Ledger</span>
            </a>
        </div>
    </div>

    <!-- Metadata Card -->
    <div class="bg-white border border-slate-200/80 shadow-xs p-6 rounded-none">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-slate-100 text-xs">
            <div>
                <span class="block font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier / Vendor</span>
                <span class="text-sm font-black text-slate-900 block">{{ $purchase->vendor->name ?? 'N/A' }}</span>
                <span class="text-slate-500 font-medium">{{ $purchase->vendor->phone ?? 'No Phone' }}</span>
            </div>
            <div>
                <span class="block font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier Invoice #</span>
                <span class="text-sm font-black text-slate-900 block">{{ $purchase->invoice_number ?? 'N/A' }}</span>
                <span class="text-slate-500 font-medium">Branch: {{ $purchase->branch->name ?? 'Default' }}</span>
            </div>
            <div>
                <span class="block font-bold text-slate-400 uppercase tracking-wider mb-1">Purchase Date</span>
                <span class="text-sm font-black text-slate-900 block">{{ \Carbon\Carbon::parse($purchase->purchase_date)->format('M d, Y') }}</span>
                <span class="text-slate-500 font-medium">Store: Main Warehouse</span>
            </div>
            <div>
                <span class="block font-bold text-slate-400 uppercase tracking-wider mb-1">Received By</span>
                <span class="text-sm font-black text-slate-900 block">👤 {{ $purchase->addedBy->name ?? 'System' }}</span>
                <span class="text-slate-500 font-medium">Created: {{ $purchase->created_at->format('d-M-Y h:i A') }}</span>
            </div>
        </div>

        <!-- Line Items Table -->
        <div class="mt-6">
            <h3 class="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Received Raw Products & Ingredients</h3>
            <div class="overflow-x-auto border border-slate-200">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                            <th class="py-3 px-4">Item Name</th>
                            <th class="py-3 px-4">Category</th>
                            <th class="py-3 px-4 text-center">Quantity</th>
                            <th class="py-3 px-4 text-right">Unit Cost</th>
                            <th class="py-3 px-4 text-right">Total Cost</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-800">
                        @foreach($purchase->items as $item)
                        <tr>
                            <td class="py-3.5 px-4 font-black">
                                {{ $item->item->item_name ?? 'Item' }}
                                @if(!empty($item->item->sku))
                                    <span class="text-[10px] font-mono text-slate-400 block font-normal">SKU: {{ $item->item->sku }}</span>
                                @endif
                            </td>
                            <td class="py-3.5 px-4 text-xs font-bold text-slate-500">
                                {{ $item->item->category ?? 'General' }}
                            </td>
                            <td class="py-3.5 px-4 text-center font-extrabold text-slate-900">
                                {{ (float)$item->quantity }} <span class="text-xs text-slate-500 font-normal">{{ $item->item->unit ?? '' }}</span>
                            </td>
                            <td class="py-3.5 px-4 text-right font-bold text-slate-700">
                                {{ currency_symbol() }} {{ number_format($item->unit_cost, 2) }}
                            </td>
                            <td class="py-3.5 px-4 text-right font-black text-slate-900">
                                {{ currency_symbol() }} {{ number_format($item->total_cost, 2) }}
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                    <tfoot>
                        <tr class="bg-slate-50/80 border-t-2 border-slate-200 font-black text-sm">
                            <td colspan="4" class="py-3.5 px-4 text-right uppercase tracking-wider text-slate-600">Total Purchase Amount:</td>
                            <td class="py-3.5 px-4 text-right text-base text-[#026897]">
                                {{ currency_symbol() }} {{ number_format($purchase->total_amount, 2) }}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        @if($purchase->notes)
        <div class="mt-6 p-4 bg-slate-50 border border-slate-200 text-xs">
            <span class="font-bold text-slate-600 uppercase tracking-wider block mb-1">Invoice Notes:</span>
            <p class="text-slate-800">{{ $purchase->notes }}</p>
        </div>
        @endif
    </div>
</div>
@endsection
