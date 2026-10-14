<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Hall;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class HallController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $query = Hall::with('branch');

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $halls = $query->latest()->get();
        $branches = Branch::where('status', 'Active')->get();

        return view('halls.index', compact('halls', 'branches'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
            'capacity' => 'required|integer|min:0',
            'status' => 'required|in:Active,Inactive',
        ]);

        Hall::create($validated);

        return redirect()->route('halls.index')->with('success', 'Hall created successfully.');
    }

    public function update(Request $request, Hall $hall)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
            'capacity' => 'required|integer|min:0',
            'status' => 'required|in:Active,Inactive',
        ]);

        $hall->update($validated);

        return redirect()->route('halls.index')->with('success', 'Hall updated successfully.');
    }

    public function destroy(Hall $hall)
    {
        $hall->delete();
        return redirect()->route('halls.index')->with('success', 'Hall deleted successfully.');
    }
}
