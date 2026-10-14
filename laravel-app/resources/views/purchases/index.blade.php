@extends('layouts.app')

@section('content')
<div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Main Store Purchases & Inward Stock</h1>
            <p class="text-slate-500 text-sm font-medium">Log vendor purchase orders, receive raw inventory into Main Store, and track invoices</p>
        </div>
        <a href="{{ route('purchases.create') }}" class="px-5 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition">
            + New Purchase Order
        </a>
    </div>

    <!-- Purchases Table -->
    <div class="bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                        <th class="py-4 px-6">PO Number</th>
                        <th class="py-4 px-6">Vendor</th>
                        <th class="py-4 px-6">Date</th>
                        <th class="py-4 px-6">Items Purchased</th>
                        <th class="py-4 px-6">Total Cost</th>
                        <th class="py-4 px-6">Payment</th>
                        <th class="py-4 px-6 text-right">Added By</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($purchases as $po)
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6 font-extrabold text-slate-900">
                            {{ $po->po_number }}
                            @if($po->invoice_number)
                                <span class="block text-xs font-semibold text-slate-400">Inv: {{ $po->invoice_number }}</span>
                            @endif
                        </td>
                        <td class="py-4 px-6 font-extrabold text-slate-900">{{ $po->vendor->name ?? '-' }}</td>
                        <td class="py-4 px-6 text-slate-500 text-xs font-semibold">{{ \Carbon\Carbon::parse($po->purchase_date)->format('M d, Y') }}</td>
                        <td class="py-4 px-6">
                            <div class="space-y-0.5">
                                @foreach($po->items as $pItem)
                                    <div class="text-xs font-bold text-slate-800">
                                        • {{ $pItem->item->item_name ?? 'Item' }}: {{ $pItem->quantity }} {{ $pItem->item->unit ?? '' }} @ {{ number_format($pItem->unit_cost, 2) }}
                                    </div>
                                @endforeach
                            </div>
                        </td>
                        <td class="py-4 px-6 font-black text-slate-900">{{ number_format($po->total_amount, 2) }}</td>
                        <td class="py-4 px-6">
                            <span class="px-2.5 py-1 text-xs font-bold 
                                {{ $po->payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : '' }}
                                {{ $po->payment_status === 'Unpaid' ? 'bg-rose-100 text-rose-800' : '' }}
                                {{ $po->payment_status === 'Partial' ? 'bg-amber-100 text-amber-800' : '' }}">
                                {{ $po->payment_status }}
                            </span>
                        </td>
                        <td class="py-4 px-6 text-right font-bold text-slate-800 text-xs">
                            👤 {{ $po->addedBy->name ?? 'System' }}
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="7" class="py-12 text-center text-slate-400 font-medium">No inward purchases logged yet.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-slate-100">
            {{ $purchases->links() }}
        </div>
    </div>
</div>
@endsection
