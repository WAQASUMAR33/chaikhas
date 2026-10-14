<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $currentUser = Auth::user();
        $branchId = $currentUser->branch_id ?? Branch::first()->id ?? 1;
        $date = $request->input('date', now()->toDateString());

        $users = User::where(function ($q) use ($branchId) {
            $q->where('branch_id', $branchId)->orWhereNull('branch_id');
        })->where('status', 'Active')->orderBy('name')->get();

        $attendances = Attendance::where('branch_id', $branchId)->whereDate('date', $date)->get()->keyBy('user_id');

        return view('attendances.index', compact('users', 'attendances', 'date', 'branchId'));
    }

    public function store(Request $request)
    {
        $currentUser = Auth::user();
        $branchId = $currentUser->branch_id ?? Branch::first()->id ?? 1;

        $validated = $request->validate([
            'date' => 'required|date',
            'attendances' => 'required|array',
            'attendances.*.user_id' => 'required|exists:users,id',
            'attendances.*.status' => 'required|in:Present,Absent,Late,Leave',
            'attendances.*.clock_in' => 'nullable|string',
            'attendances.*.clock_out' => 'nullable|string',
            'attendances.*.notes' => 'nullable|string',
        ]);

        foreach ($validated['attendances'] as $att) {
            Attendance::updateOrCreate(
                [
                    'user_id' => $att['user_id'],
                    'date' => $validated['date'],
                ],
                [
                    'branch_id' => $branchId,
                    'status' => $att['status'],
                    'clock_in' => $att['clock_in'] ?? null,
                    'clock_out' => $att['clock_out'] ?? null,
                    'notes' => $att['notes'] ?? null,
                ]
            );
        }

        \App\Models\AuditLog::log('Saved Staff Attendance Register', 'Attendance', null, ['date' => $validated['date']]);

        return redirect()->route('attendances.index', ['date' => $validated['date']])
            ->with('success', 'Staff attendance register saved successfully!');
    }
}
