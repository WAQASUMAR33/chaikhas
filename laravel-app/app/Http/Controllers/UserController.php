<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('branch')->latest()->get();
        $branches = Branch::where('status', 'Active')->get();
        $allModules = User::allModules();
        $rolePermissions = User::rolePermissions();

        return view('users.index', compact('users', 'branches', 'allModules', 'rolePermissions'));
    }

    public function store(Request $request)
    {
        $branchId = $request->input('branch_id');
        if (empty($branchId) || $branchId === '0' || $branchId === '') {
            $branchId = null;
        }
        $request->merge(['branch_id' => $branchId]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:100|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|string|max:100',
            'permissions' => 'nullable|array',
            'branch_id' => 'nullable|exists:branches,id',
            'phone' => 'nullable|string|max:50',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['branch_id'] = $branchId;
        $validated['status'] = $request->input('status', 'Active');
        $validated['permissions'] = $request->input('permissions', []);
        $validated['fullname'] = $validated['name'];

        User::create($validated);

        return redirect()->route('users.index')->with('success', 'User created with assigned role and permissions successfully.');
    }

    public function update(Request $request, User $user)
    {
        $branchId = $request->input('branch_id');
        if (empty($branchId) || $branchId === '0' || $branchId === '') {
            $branchId = null;
        }
        $request->merge(['branch_id' => $branchId]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:100|unique:users,username,' . $user->id,
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
            'role' => 'required|string|max:100',
            'permissions' => 'nullable|array',
            'branch_id' => 'nullable|exists:branches,id',
            'phone' => 'nullable|string|max:50',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $validated['branch_id'] = $branchId;
        $validated['status'] = $request->input('status', 'Active');
        $validated['permissions'] = $request->input('permissions', []);
        $validated['fullname'] = $validated['name'];

        $user->update($validated);

        return redirect()->route('users.index')->with('success', 'User role & permissions updated successfully.');
    }

    public function show($id)
    {
        return redirect()->route('users.index');
    }

    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            if (request()->wantsJson()) {
                return response()->json(['success' => true, 'message' => 'User already deleted or not found.']);
            }
            return redirect()->route('users.index')->with('success', 'User has been removed.');
        }

        if (auth()->check() && auth()->id() === $user->id) {
            if (request()->wantsJson()) {
                return response()->json(['success' => false, 'message' => 'You cannot delete your own account while logged in.'], 403);
            }
            return redirect()->route('users.index')->with('error', 'You cannot delete your own account while logged in.');
        }

        try {
            $user->delete();

            if (request()->wantsJson()) {
                return response()->json(['success' => true, 'message' => 'User deleted successfully.']);
            }
            return redirect()->route('users.index')->with('success', 'User deleted successfully.');
        } catch (\Throwable $e) {
            if (request()->wantsJson()) {
                return response()->json(['success' => false, 'message' => 'Failed to delete user: ' . $e->getMessage()], 500);
            }
            return redirect()->route('users.index')->with('error', 'Unable to delete user: ' . $e->getMessage());
        }
    }
}
