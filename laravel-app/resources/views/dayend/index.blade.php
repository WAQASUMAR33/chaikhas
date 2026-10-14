@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ modalOpen: false, form: { branch_id: '{{ $branchId }}', opening_cash: 5000, notes: '' } }">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Day End Reconciliation</h1>
            <p class="text-slate-500 text-sm font-medium">Perform shift and day-end cash register closures</p>
        </div>
        <button @click="modalOpen = true" class="px-5 py-2.5 rounded-xl bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition">
            🔒 Close Day / Shift Now
        </button>
    </div>

    <!-- Summary Box -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Today's Total Sales</span>
            <span class="text-2xl font-black text-emerald-600 mt-1 block">{{ number_format($todaySales, 2) }}</span>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Today's Total Expenses</span>
            <span class="text-2xl font-black text-rose-600 mt-1 block">{{ number_format($todayExpenses, 2) }}</span>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Est. Cash Difference</span>
            <span class="text-2xl font-black text-slate-900 mt-1 block">{{ number_format($todaySales - $todayExpenses, 2) }}</span>
        </div>
    </div>

    <!-- Closure History Table -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                    <th class="py-4 px-6">Closure Date</th>
                    <th class="py-4 px-6">Branch</th>
                    <th class="py-4 px-6">Opening Cash</th>
                    <th class="py-4 px-6">Total Sales</th>
                    <th class="py-4 px-6">Expenses</th>
                    <th class="py-4 px-6">Closing Cash</th>
                    <th class="py-4 px-6">Closed By</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                @foreach($dayEnds as $d)
                <tr class="hover:bg-slate-50/50 transition">
                    <td class="py-4 px-6 font-extrabold text-slate-900">{{ $d->date->format('M d, Y') }}</td>
                    <td class="py-4 px-6 font-semibold">{{ $d->branch->branch_name ?? '-' }}</td>
                    <td class="py-4 px-6">{{ number_format($d->opening_cash, 2) }}</td>
                    <td class="py-4 px-6 font-bold text-emerald-600">{{ number_format($d->total_sales, 2) }}</td>
                    <td class="py-4 px-6 font-bold text-rose-600">{{ number_format($d->total_expenses, 2) }}</td>
                    <td class="py-4 px-6 font-black text-slate-900">{{ number_format($d->closing_cash, 2) }}</td>
                    <td class="py-4 px-6 font-bold text-slate-800">{{ $d->user->name ?? 'Staff' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        <div class="p-4 border-t border-slate-100">
            {{ $dayEnds->links() }}
        </div>
    </div>

    <!-- Modal Dialog -->
    <div x-show="modalOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 class="text-xl font-extrabold text-slate-900">Day End Closure</h2>
            <form action="{{ route('dayend.store') }}" method="POST" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Branch *</label>
                    <select name="branch_id" x-model="form.branch_id" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">
                        @foreach($branches as $b)
                        <option value="{{ $b->id }}">{{ $b->branch_name }}</option>
                        @endforeach
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Opening Till Float Cash  *</label>
                    <input type="number" step="0.01" name="opening_cash" x-model="form.opening_cash" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm">
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Notes / Discrepancies</label>
                    <textarea name="notes" x-model="form.notes" class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm"></textarea>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" @click="modalOpen = false" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancel</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-[#026897] text-white font-bold text-xs shadow-md">Confirm Day End</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
