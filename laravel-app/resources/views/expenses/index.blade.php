@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ modalOpen: false, form: { branch_id: '{{ $branches->first()->id ?? '' }}', title: '', category: 'General', amount: '', expense_date: '{{ date('Y-m-d') }}', notes: '' } }">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Expense Management</h1>
            <p class="text-slate-500 text-sm font-medium">Log restaurant operational expenses, supplier bills, and utility costs</p>
        </div>
        <button @click="modalOpen = true" class="px-5 py-2.5 rounded-xl bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition">
            + Log New Expense
        </button>
    </div>

    <!-- Expense History Table -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                    <th class="py-4 px-6">Expense Title</th>
                    <th class="py-4 px-6">Category</th>
                    <th class="py-4 px-6">Branch</th>
                    <th class="py-4 px-6">Date</th>
                    <th class="py-4 px-6">Amount</th>
                    <th class="py-4 px-6 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                @foreach($expenses as $e)
                <tr class="hover:bg-slate-50/50 transition">
                    <td class="py-4 px-6 font-extrabold text-slate-900">{{ $e->title }}</td>
                    <td class="py-4 px-6"><span class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold">{{ $e->category }}</span></td>
                    <td class="py-4 px-6 font-semibold">{{ $e->branch->branch_name ?? '-' }}</td>
                    <td class="py-4 px-6 text-slate-500">{{ $e->expense_date->format('M d, Y') }}</td>
                    <td class="py-4 px-6 font-extrabold text-rose-600">{{ number_format($e->amount, 2) }}</td>
                    <td class="py-4 px-6 text-right">
                        <form method="POST" action="{{ route('expenses.destroy', $e->id) }}" class="inline-block" onsubmit="return confirm('Delete expense?')">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">Delete</button>
                        </form>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
        <div class="p-4 border-t border-slate-100">
            {{ $expenses->links() }}
        </div>
    </div>

    <!-- Modal Dialog -->
    <div x-show="modalOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 class="text-xl font-extrabold text-slate-900">Log New Expense</h2>
            <form action="{{ route('expenses.store') }}" method="POST" class="space-y-4">
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
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Title / Description *</label>
                    <input type="text" name="title" x-model="form.title" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm" placeholder="e.g. Milk & Tea Inventory Supply">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Category</label>
                        <select name="category" x-model="form.category" class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">
                            <option value="Raw Material">Raw Material</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Salaries">Salaries</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="General">General</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Amount  *</label>
                        <input type="number" step="0.01" name="amount" x-model="form.amount" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Date *</label>
                    <input type="date" name="expense_date" x-model="form.expense_date" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm">
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" @click="modalOpen = false" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancel</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-[#026897] text-white font-bold text-xs shadow-md">Submit Expense</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
