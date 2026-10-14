<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ExpenseController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $query = Expense::with(['branch', 'user']);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $expenses = $query->latest()->paginate(15);
        $branches = Branch::where('status', 'Active')->get();

        return view('expenses.index', compact('expenses', 'branches'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $validated['user_id'] = Auth::id();

        Expense::create($validated);

        return redirect()->route('expenses.index')->with('success', 'Expense logged successfully.');
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();
        return redirect()->route('expenses.index')->with('success', 'Expense deleted successfully.');
    }
}
