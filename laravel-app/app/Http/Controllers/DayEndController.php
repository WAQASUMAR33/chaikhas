<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\DayEnd;
use App\Models\Expense;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DayEndController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $query = DayEnd::with(['branch', 'user']);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $dayEnds = $query->latest()->paginate(15);
        $branches = Branch::where('status', 'Active')->get();

        $branchId = $user->branch_id ?? Branch::first()->id ?? 1;
        $todaySales = Order::where('branch_id', $branchId)->whereDate('created_at', now()->today())->sum('net_total');
        $todayExpenses = Expense::where('branch_id', $branchId)->whereDate('expense_date', now()->today())->sum('amount');

        return view('dayend.index', compact('dayEnds', 'branches', 'todaySales', 'todayExpenses', 'branchId'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'opening_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $date = now()->today();
        $sales = Order::where('branch_id', $validated['branch_id'])->whereDate('created_at', $date)->sum('net_total');
        $expenses = Expense::where('branch_id', $validated['branch_id'])->whereDate('expense_date', $date)->sum('amount');
        $closingCash = $validated['opening_cash'] + $sales - $expenses;

        DayEnd::create([
            'branch_id' => $validated['branch_id'],
            'user_id' => Auth::id(),
            'date' => $date,
            'opening_cash' => $validated['opening_cash'],
            'total_sales' => $sales,
            'total_expenses' => $expenses,
            'closing_cash' => $closingCash,
            'closed_at' => now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->route('dayend.index')->with('success', 'Day-end closure recorded successfully.');
    }
}
