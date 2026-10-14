<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function index()
    {
        $branches = Branch::latest()->get();
        return view('branches.index', compact('branches'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_name' => 'required|string|max:255',
            'branch_code' => 'required|string|max:50|unique:branches,branch_code',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'status' => 'required|in:Active,Inactive',
        ]);

        Branch::create($validated);

        return redirect()->route('branches.index')->with('success', 'Branch created successfully.');
    }

    public function update(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'branch_name' => 'required|string|max:255',
            'branch_code' => 'required|string|max:50|unique:branches,branch_code,' . $branch->id,
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'status' => 'required|in:Active,Inactive',
        ]);

        $branch->update($validated);

        return redirect()->route('branches.index')->with('success', 'Branch updated successfully.');
    }

    public function destroy(Branch $branch)
    {
        $branch->delete();
        return redirect()->route('branches.index')->with('success', 'Branch deleted successfully.');
    }
}
