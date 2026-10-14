@extends('layouts.app')

@section('content')
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Table Booking & Reservations</h1>
            <p class="text-slate-500 text-sm font-medium">Manage customer advance table bookings, time slots, guest counts, and status updates</p>
        </div>
    </div>

    <!-- Date Filter & Create Form Modal -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 bg-white p-5 border border-slate-200 shadow-sm">
            <h3 class="text-base font-bold text-slate-900 mb-3">Book a Table</h3>
            <form method="POST" action="{{ route('reservations.store') }}" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Customer Name</label>
                    <input type="text" name="customer_name" required placeholder="John Doe" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Phone Number</label>
                    <input type="text" name="customer_phone" required placeholder="0300-1234567" class="w-full px-3 py-2 border border-slate-300 text-sm">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Date</label>
                        <input type="date" name="reservation_date" value="{{ $date }}" required class="w-full px-3 py-2 border border-slate-300 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Time Slot</label>
                        <input type="text" name="time_slot" required placeholder="08:00 PM" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Guest Count</label>
                        <input type="number" min="1" name="guest_count" value="2" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Assigned Table</label>
                        <select name="table_id" class="w-full px-3 py-2 border border-slate-300 text-sm">
                            <option value="">-- Unassigned --</option>
                            @foreach($tables as $t)
                                <option value="{{ $t->id }}">Table {{ $t->table_number }} (Cap: {{ $t->capacity }})</option>
                            @endforeach
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Deposit Advance ($)</label>
                    <input type="number" step="0.01" name="deposit_amount" value="0.00" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-emerald-600">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Notes / Instructions</label>
                    <textarea name="notes" rows="2" placeholder="Birthday table setup requested" class="w-full px-3 py-2 border border-slate-300 text-sm"></textarea>
                </div>

                <button type="submit" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition">
                    + Confirm Booking
                </button>
            </form>
        </div>

        <!-- Bookings List Table -->
        <div class="lg:col-span-2 bg-white border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
            <form method="GET" action="{{ route('reservations.index') }}" class="flex items-center gap-4 border-b border-slate-200 pb-4">
                <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-400">Date</label>
                    <input type="date" name="date" value="{{ $date }}" onchange="this.form.submit()" class="px-3 py-1.5 border border-slate-300 text-xs font-bold">
                </div>
                <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-400">Filter Status</label>
                    <select name="status" onchange="this.form.submit()" class="px-3 py-1.5 border border-slate-300 text-xs font-bold">
                        <option value="">All Statuses</option>
                        <option value="Confirmed" {{ $status === 'Confirmed' ? 'selected' : '' }}>Confirmed</option>
                        <option value="Seated" {{ $status === 'Seated' ? 'selected' : '' }}>Seated</option>
                        <option value="Cancelled" {{ $status === 'Cancelled' ? 'selected' : '' }}>Cancelled</option>
                    </select>
                </div>
            </form>

            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-400 bg-slate-100/50">
                        <th class="py-3 px-4">Time</th>
                        <th class="py-3 px-4">Customer</th>
                        <th class="py-3 px-4">Guests</th>
                        <th class="py-3 px-4">Table</th>
                        <th class="py-3 px-4">Status</th>
                        <th class="py-3 px-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($reservations as $res)
                    <tr>
                        <td class="py-3 px-4 font-black text-slate-900">{{ $res->time_slot }}</td>
                        <td class="py-3 px-4">
                            <span class="font-extrabold text-slate-900 block">{{ $res->customer_name }}</span>
                            <span class="text-xs text-slate-400 font-bold">{{ $res->customer_phone }}</span>
                        </td>
                        <td class="py-3 px-4 font-bold text-orange-600">{{ $res->guest_count }} Guests</td>
                        <td class="py-3 px-4 font-bold text-slate-800">{{ $res->table ? 'Table ' . $res->table->table_number : 'Unassigned' }}</td>
                        <td class="py-3 px-4">
                            <span class="inline-flex px-2 py-0.5 text-xs font-black uppercase {{ $res->status === 'Confirmed' ? 'bg-blue-100 text-blue-800' : ($res->status === 'Seated' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600') }}">
                                {{ $res->status }}
                            </span>
                        </td>
                        <td class="py-3 px-4 text-right">
                            <div class="inline-flex items-center gap-1.5 justify-end">
                                @if($res->status !== 'Seated' && $res->status !== 'Cancelled')
                                    <form method="POST" action="{{ route('reservations.seat', $res->id) }}">
                                        @csrf
                                        <button type="submit" class="px-2.5 py-1 bg-[#026897] hover:bg-[#01547b] text-white text-xs font-black shadow-xs rounded-none transition flex items-center gap-1">
                                            <span>🪑</span>
                                            <span>Seat & Open POS</span>
                                        </button>
                                    </form>
                                    <form method="POST" action="{{ route('reservations.updateStatus', $res->id) }}">
                                        @csrf
                                        @method('PATCH')
                                        <input type="hidden" name="status" value="Cancelled">
                                        <button type="submit" onclick="return confirm('Cancel this reservation?')" class="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold border border-rose-200 rounded-none transition">
                                            Cancel
                                        </button>
                                    </form>
                                @else
                                    <span class="text-xs font-bold text-slate-400">Completed</span>
                                @endif
                            </div>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="6" class="py-8 text-center text-slate-400 font-medium">No table bookings scheduled for this date.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
