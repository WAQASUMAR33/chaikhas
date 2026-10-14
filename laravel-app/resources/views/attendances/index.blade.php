@extends('layouts.app')

@section('content')
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Staff Attendance Register</h1>
            <p class="text-slate-500 text-sm font-medium">Record daily employee attendance status, clock-in/out times, and shift roster logs</p>
        </div>
    </div>

    <!-- Attendance Form -->
    <div class="bg-white border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
        <form method="GET" action="{{ route('attendances.index') }}" class="flex items-center gap-4 border-b border-slate-200 pb-4">
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Select Attendance Date</label>
                <input type="date" name="date" value="{{ $date }}" onchange="this.form.submit()" class="px-4 py-2 border border-slate-300 text-sm font-bold">
            </div>
            <button type="submit" class="mt-5 px-4 py-2 bg-slate-900 text-white text-xs font-bold shadow-md">Load Roster</button>
        </form>

        <form method="POST" action="{{ route('attendances.store') }}" class="space-y-4">
            @csrf
            <input type="hidden" name="date" value="{{ $date }}">

            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-400 bg-slate-100/50">
                        <th class="py-3 px-4">Staff Member</th>
                        <th class="py-3 px-4">Role</th>
                        <th class="py-3 px-4">Status</th>
                        <th class="py-3 px-4">Clock In</th>
                        <th class="py-3 px-4">Clock Out</th>
                        <th class="py-3 px-4">Notes</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @foreach($users as $index => $u)
                    @php $att = $attendances->get($u->id); @endphp
                    <tr>
                        <td class="py-3 px-4">
                            <input type="hidden" name="attendances[{{ $index }}][user_id]" value="{{ $u->id }}">
                            <span class="font-extrabold text-slate-900 block">{{ $u->name }}</span>
                            <span class="text-xs text-slate-400 font-bold">{{ $u->email }}</span>
                        </td>
                        <td class="py-3 px-4 uppercase text-xs font-bold text-slate-500">{{ $u->role }}</td>
                        <td class="py-3 px-4">
                            <select name="attendances[{{ $index }}][status]" class="px-3 py-1.5 border border-slate-300 text-xs font-bold">
                                <option value="Present" {{ optional($att)->status === 'Present' ? 'selected' : '' }}>Present</option>
                                <option value="Absent" {{ optional($att)->status === 'Absent' ? 'selected' : '' }}>Absent</option>
                                <option value="Late" {{ optional($att)->status === 'Late' ? 'selected' : '' }}>Late</option>
                                <option value="Leave" {{ optional($att)->status === 'Leave' ? 'selected' : '' }}>Leave</option>
                            </select>
                        </td>
                        <td class="py-3 px-4">
                            <input type="time" name="attendances[{{ $index }}][clock_in]" value="{{ optional($att)->clock_in }}" class="px-2 py-1 border border-slate-300 text-xs">
                        </td>
                        <td class="py-3 px-4">
                            <input type="time" name="attendances[{{ $index }}][clock_out]" value="{{ optional($att)->clock_out }}" class="px-2 py-1 border border-slate-300 text-xs">
                        </td>
                        <td class="py-3 px-4">
                            <input type="text" name="attendances[{{ $index }}][notes]" value="{{ optional($att)->notes }}" placeholder="Shift notes..." class="w-full px-2 py-1 border border-slate-300 text-xs">
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>

            <div class="pt-4 border-t border-slate-100 flex justify-end">
                <button type="submit" class="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition">
                    ✓ Save Attendance Register
                </button>
            </div>
        </form>
    </div>
</div>
@endsection
