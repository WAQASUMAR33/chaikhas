<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Reservation;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReservationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $branchId = $user->branch_id ?? Branch::first()->id ?? 1;

        $date = $request->input('date', now()->toDateString());
        $status = $request->input('status');

        $query = Reservation::with('table')->where('branch_id', $branchId)->whereDate('reservation_date', $date);

        if (!empty($status)) {
            $query->where('status', $status);
        }

        $reservations = $query->orderBy('time_slot')->get();
        $tables = Table::where('branch_id', $branchId)->get();

        return view('reservations.index', compact('reservations', 'tables', 'date', 'status', 'branchId'));
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $branchId = $user->branch_id ?? Branch::first()->id ?? 1;

        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:50',
            'reservation_date' => 'required|date',
            'time_slot' => 'required|string',
            'guest_count' => 'required|integer|min:1',
            'deposit_amount' => 'nullable|numeric|min:0',
            'table_id' => 'nullable|exists:tables,id',
            'notes' => 'nullable|string',
        ]);

        $reservation = Reservation::create([
            'branch_id' => $branchId,
            'table_id' => $validated['table_id'] ?? null,
            'customer_name' => $validated['customer_name'],
            'customer_phone' => $validated['customer_phone'],
            'reservation_date' => $validated['reservation_date'],
            'time_slot' => $validated['time_slot'],
            'guest_count' => $validated['guest_count'],
            'deposit_amount' => $validated['deposit_amount'] ?? 0,
            'status' => 'Confirmed',
            'notes' => $validated['notes'] ?? null,
        ]);

        \App\Models\AuditLog::log('Created Reservation', 'Reservation', null, $reservation->toArray());

        return redirect()->route('reservations.index', ['date' => $validated['reservation_date']])
            ->with('success', 'Table reservation created successfully!');
    }

    public function updateStatus(Request $request, $id)
    {
        $reservation = Reservation::findOrFail($id);
        $status = $request->input('status');
        if (in_array($status, ['Pending', 'Confirmed', 'Seated', 'Cancelled'])) {
            $reservation->update(['status' => $status]);
        }

        return redirect()->back()->with('success', 'Reservation status updated!');
    }

    public function seatGuest(Request $request, $id)
    {
        $reservation = Reservation::with('table')->findOrFail($id);
        $reservation->update(['status' => 'Seated']);

        if ($reservation->table_id) {
            Table::where('id', $reservation->table_id)->update(['status' => 'Running']);
        }

        \App\Models\AuditLog::log('Seated Reservation Guest at Table', 'Reservation', null, ['reservation_id' => $id, 'table_id' => $reservation->table_id]);

        $params = [
            'order_type' => 'Dine In',
            'table_id' => $reservation->table_id,
            'hall_id' => $reservation->table?->hall_id,
            'customer_name' => $reservation->customer_name,
            'customer_phone' => $reservation->customer_phone,
        ];

        return redirect()->route('orders.create', array_filter($params))
            ->with('success', "Guest '{$reservation->customer_name}' seated! Creating bill in POS...");
    }
}
