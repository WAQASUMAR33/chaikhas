<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Kitchen;
use App\Models\Printer;
use App\Services\KitchenPrinterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class KitchenManagementController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Kitchen::with(['branch', 'printer', 'storeStocks', 'categories']);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $kitchens = $query->latest()->paginate(15);
        $branches = Branch::where('status', 'Active')->get();
        $printers = Printer::all();

        return view('kitchens.index', compact('kitchens', 'branches', 'printers'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100',
            'printer_id' => 'nullable|exists:printers,id',
            'printer_ip' => 'nullable|string|max:100',
            'printer_port' => 'nullable|integer|min:1|max:65535',
            'status' => 'required|in:Active,Inactive',
            'description' => 'nullable|string',
        ]);

        if (empty($validated['printer_port'])) {
            $validated['printer_port'] = 9100;
        }

        Kitchen::create($validated);

        return back()->with('success', 'New kitchen station created successfully with printer setup.');
    }

    public function update(Request $request, Kitchen $kitchen)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100',
            'printer_id' => 'nullable|exists:printers,id',
            'printer_ip' => 'nullable|string|max:100',
            'printer_port' => 'nullable|integer|min:1|max:65535',
            'status' => 'required|in:Active,Inactive',
            'description' => 'nullable|string',
        ]);

        if (empty($validated['printer_port'])) {
            $validated['printer_port'] = 9100;
        }

        $kitchen->update($validated);

        return back()->with('success', 'Kitchen station and printer configuration updated successfully.');
    }

    public function destroy(Kitchen $kitchen)
    {
        $kitchen->delete();
        return back()->with('success', 'Kitchen station deleted successfully.');
    }

    public function testPrinter(Request $request, Kitchen $kitchen)
    {
        $result = KitchenPrinterService::testPrinter($kitchen);

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }

        return back()->with('error', $result['message']);
    }
}
