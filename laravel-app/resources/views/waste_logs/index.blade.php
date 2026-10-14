@extends('layouts.app')

@section('content')
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Waste, Spoilage & Damage Logs</h1>
            <p class="text-slate-500 text-sm font-medium">Record spoiled, expired, or spilled raw ingredients with financial loss valuation tracking</p>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Record Waste Log Form -->
        <div class="lg:col-span-1 bg-white p-5 border border-slate-200 shadow-sm">
            <h3 class="text-base font-bold text-slate-900 mb-3">Record Waste / Damage Log</h3>
            <form method="POST" action="{{ route('waste-logs.store') }}" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Target Store Location</label>
                    <select name="store_type" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                        <option value="Main Store">Main Store</option>
                        <option value="Kitchen Store">Kitchen Store</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Raw Inventory Item</label>
                    <select name="inventory_item_id" required class="w-full px-3 py-2 border border-slate-300 text-sm">
                        <option value="">-- Choose Inventory Item --</option>
                        @foreach($inventoryItems as $item)
                            <option value="{{ $item->id }}">{{ $item->item_name }} (Unit: {{ $item->unit }})</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Wasted Quantity</label>
                    <input type="number" step="0.0001" name="quantity" required placeholder="1.50" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Reason / Cause</label>
                    <select name="reason" required class="w-full px-3 py-2 border border-slate-300 text-sm">
                        <option value="Spoilage / Expiry">Spoilage / Expiry</option>
                        <option value="Spillage / Accidental Drop">Spillage / Accidental Drop</option>
                        <option value="Quality Rejection">Quality Rejection</option>
                        <option value="Kitchen Over-Preparation">Kitchen Over-Preparation</option>
                    </select>
                </div>

                <button type="submit" class="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md transition">
                    ⚠ Record Waste & Deduct Stock
                </button>
            </form>
        </div>

        <!-- Waste Logs Table -->
        <div class="lg:col-span-2 bg-white border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
            <div class="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 class="font-extrabold text-slate-900 text-base">Recorded Inventory Losses</h3>
                <span class="text-sm font-black text-rose-600 uppercase">Total Loss: ${{ number_format($totalLoss, 2) }}</span>
            </div>

            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-400 bg-slate-100/50">
                        <th class="py-3 px-4">Date & Time</th>
                        <th class="py-3 px-4">Location</th>
                        <th class="py-3 px-4">Item Name</th>
                        <th class="py-3 px-4">Wasted Qty</th>
                        <th class="py-3 px-4">Reason</th>
                        <th class="py-3 px-4 text-right">Financial Loss</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($wasteLogs as $log)
                    <tr>
                        <td class="py-3 px-4 text-xs font-bold text-slate-500">{{ $log->created_at->format('M d, Y h:i A') }}</td>
                        <td class="py-3 px-4 font-bold text-slate-800">{{ $log->store_type }}</td>
                        <td class="py-3 px-4 font-extrabold text-slate-900">{{ $log->inventoryItem->item_name ?? 'Unknown' }}</td>
                        <td class="py-3 px-4 font-bold text-rose-600">{{ number_format($log->quantity, 2) }} {{ $log->inventoryItem->unit ?? '' }}</td>
                        <td class="py-3 px-4 text-xs font-bold text-slate-600">{{ $log->reason }}</td>
                        <td class="py-3 px-4 text-right font-black text-rose-600">${{ number_format($log->total_loss, 2) }}</td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="6" class="py-8 text-center text-slate-400 font-medium">No waste or spoilage logs recorded for this period.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
