@extends('layouts.app')

@section('content')
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Security Audit Trail Logs</h1>
            <p class="text-slate-500 text-sm font-medium">Monitor system activity history, user actions, discount approvals, and data mutations</p>
        </div>
    </div>

    <!-- Filter Form -->
    <div class="bg-white p-5 border border-slate-200 shadow-sm">
        <form method="GET" action="{{ route('audit-logs.index') }}" class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Module Filter</label>
                <select name="module" onchange="this.form.submit()" class="w-full px-3 py-2 border border-slate-300 text-xs font-bold">
                    <option value="">All Modules</option>
                    <option value="Orders" {{ $module === 'Orders' ? 'selected' : '' }}>Orders / POS</option>
                    <option value="Recipe" {{ $module === 'Recipe' ? 'selected' : '' }}>Recipes / BOM</option>
                    <option value="CustomerLedger" {{ $module === 'CustomerLedger' ? 'selected' : '' }}>Customer Khata</option>
                    <option value="VendorLedger" {{ $module === 'VendorLedger' ? 'selected' : '' }}>Vendor Payables</option>
                    <option value="WasteLog" {{ $module === 'WasteLog' ? 'selected' : '' }}>Waste Logs</option>
                    <option value="Attendance" {{ $module === 'Attendance' ? 'selected' : '' }}>Attendance</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Action Keyword</label>
                <input type="text" name="action" value="{{ $action }}" placeholder="e.g. Payment, Saved, Created" class="w-full px-3 py-2 border border-slate-300 text-xs font-bold">
            </div>
            <div>
                <button type="submit" class="w-full py-2 bg-slate-900 text-white font-bold text-xs shadow-md">Filter Logs</button>
            </div>
        </form>
    </div>

    <!-- Logs Table -->
    <div class="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-400 bg-slate-100/50">
                    <th class="py-3 px-4">Timestamp</th>
                    <th class="py-3 px-4">User</th>
                    <th class="py-3 px-4">Module</th>
                    <th class="py-3 px-4">Action Description</th>
                    <th class="py-3 px-4">IP Address</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                @forelse($logs as $log)
                <tr>
                    <td class="py-3 px-4 text-xs font-bold text-slate-500">{{ $log->created_at->format('M d, Y h:i A') }}</td>
                    <td class="py-3 px-4 font-bold text-slate-900">{{ $log->user->name ?? 'System' }}</td>
                    <td class="py-3 px-4">
                        <span class="inline-flex px-2 py-0.5 text-xs font-black uppercase bg-slate-100 text-slate-800">
                            {{ $log->module }}
                        </span>
                    </td>
                    <td class="py-3 px-4 font-bold text-slate-800">{{ $log->action }}</td>
                    <td class="py-3 px-4 text-xs text-slate-400 font-mono">{{ $log->ip_address ?? '127.0.0.1' }}</td>
                </tr>
                @empty
                <tr>
                    <td colspan="5" class="py-8 text-center text-slate-400 font-medium">No security audit logs recorded matching search criteria.</td>
                </tr>
                @endforelse
            </tbody>
        </table>
        <div class="p-4 border-t border-slate-100">
            {{ $logs->links() }}
        </div>
    </div>
</div>
@endsection
