<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Hall;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TableController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $query = Table::with(['branch', 'hall']);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $tables = $query->latest()->get();
        $branches = Branch::where('status', 'Active')->get();
        $halls = Hall::where('status', 'Active')->get();

        return view('tables.index', compact('tables', 'branches', 'halls'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'hall_id' => 'required|exists:halls,id',
            'table_number' => 'required|string|max:50',
            'capacity' => 'required|integer|min:1',
            'status' => 'required|in:Available,Running,Reserved,Maintenance',
        ]);

        Table::create($validated);

        return redirect()->route('tables.index')->with('success', 'Table created successfully.');
    }

    public function update(Request $request, Table $table)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'hall_id' => 'required|exists:halls,id',
            'table_number' => 'required|string|max:50',
            'capacity' => 'required|integer|min:1',
            'status' => 'required|in:Available,Running,Reserved,Maintenance',
        ]);

        $table->update($validated);

        return redirect()->route('tables.index')->with('success', 'Table updated successfully.');
    }

    public function destroy(Table $table)
    {
        $table->delete();
        return redirect()->route('tables.index')->with('success', 'Table deleted successfully.');
    }
}
