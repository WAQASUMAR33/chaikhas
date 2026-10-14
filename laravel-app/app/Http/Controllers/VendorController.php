<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VendorController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Vendor::with('branch');

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $vendors = $query->latest()->paginate(15);
        $branches = Branch::where('status', 'Active')->get();

        return view('vendors.index', compact('vendors', 'branches'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        Vendor::create($validated);

        return back()->with('success', 'Vendor added successfully.');
    }

    public function update(Request $request, Vendor $vendor)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'status' => 'required|in:Active,Inactive',
        ]);

        $vendor->update($validated);

        return back()->with('success', 'Vendor details updated successfully.');
    }

    public function destroy(Vendor $vendor)
    {
        $vendor->delete();
        return back()->with('success', 'Vendor deleted successfully.');
    }
}
