@extends('layouts.app')

@section('content')
<div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Inventory Audit & Activity Logs</h1>
            <p class="text-slate-500 text-sm font-medium">Trace all stock movements, purchases, kitchen transfers, stock returns, and user activity audit trails</p>
        </div>
        <a href="{{ route('inventory.index') }}" class="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm">
            ← Back to Store Stock
        </a>
    </div>

    <!-- Filter Form -->
    <div class="bg-white p-4 border border-slate-200/80 shadow-sm">
        <form method="GET" action="{{ route('inventory.logs') }}" class="flex flex-wrap items-center gap-4">
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Action Type Filter</label>
                <select name="action_type" onchange="this.form.submit()" class="px-4 py-2 border border-slate-200 text-sm font-bold text-slate-700">
                    <option value="">All Action Types</option>
                    <option value="PURCHASE" {{ request('action_type') === 'PURCHASE' ? 'selected' : '' }}>PURCHASE (Vendor Inward)</option>
                    <option value="TRANSFER_TO_KITCHEN" {{ request('action_type') === 'TRANSFER_TO_KITCHEN' ? 'selected' : '' }}>TRANSFER_TO_KITCHEN</option>
                    <option value="RETURN_TO_MAIN" {{ request('action_type') === 'RETURN_TO_MAIN' ? 'selected' : '' }}>RETURN_TO_MAIN (Kitchen Return)</option>
                </select>
            </div>
        </form>
    </div>

    <!-- Logs Table -->
    <div class="bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                        <th class="py-4 px-6">Timestamp</th>
                        <th class="py-4 px-6">Action Type</th>
                        <th class="py-4 px-6">Item Name</th>
                        <th class="py-4 px-6">Store Location</th>
                        <th class="py-4 px-6 text-center">Qty Change</th>
                        <th class="py-4 px-6">Stock Progression</th>
                        <th class="py-4 px-6">Added By / User</th>
                        <th class="py-4 px-6">Notes / Reference</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($logs as $log)
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6 text-xs text-slate-500 font-semibold whitespace-nowrap">
                            {{ \Carbon\Carbon::parse($log->created_at)->format('M d, Y h:i A') }}
                        </td>
                        <td class="py-4 px-6">
                            <span class="px-2.5 py-1 text-xs font-extrabold 
                                {{ $log->action_type === 'PURCHASE' ? 'bg-emerald-100 text-emerald-800' : '' }}
                                {{ $log->action_type === 'TRANSFER_TO_KITCHEN' ? 'bg-orange-100 text-orange-800' : '' }}
                                {{ $log->action_type === 'RETURN_TO_MAIN' ? 'bg-amber-100 text-amber-800' : '' }}">
                                {{ $log->action_type }}
                            </span>
                        </td>
                        <td class="py-4 px-6 font-extrabold text-slate-900">{{ $log->item->item_name ?? '-' }}</td>
                        <td class="py-4 px-6 text-xs font-bold text-slate-700">
                            {{ str_replace('_', ' ', $log->store_type) }}
                            @if($log->kitchen_name)
                                <span class="block text-slate-500 font-semibold">({{ $log->kitchen_name }})</span>
                            @endif
                        </td>
                        <td class="py-4 px-6 text-center font-black text-sm {{ $log->quantity_change >= 0 ? 'text-emerald-600' : 'text-rose-600' }}">
                            {{ $log->quantity_change > 0 ? '+' : '' }}{{ number_format($log->quantity_change, 2) }} {{ $log->item->unit ?? '' }}
                        </td>
                        <td class="py-4 px-6 text-xs font-bold text-slate-800 whitespace-nowrap">
                            <span class="text-slate-400">{{ number_format($log->previous_qty, 2) }}</span>
                            <span class="text-slate-400 mx-1">→</span>
                            <span class="font-extrabold text-slate-900">{{ number_format($log->new_qty, 2) }}</span>
                        </td>
                        <td class="py-4 px-6 font-bold text-slate-900 text-xs">
                            👤 {{ $log->addedBy->name ?? 'System' }}
                        </td>
                        <td class="py-4 px-6 text-xs text-slate-500 font-medium">
                            {{ $log->notes ?? '-' }}
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="8" class="py-12 text-center text-slate-400 font-medium">No inventory activity audit logs recorded yet.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-slate-100">
            {{ $logs->links() }}
        </div>
    </div>
</div>
@endsection
