<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use App\Models\VendorLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VendorLedgerController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $vendorId = $request->input('vendor_id');
        $vendors = Vendor::orderBy('name')->get();

        $selectedVendor = null;
        $ledgers = collect();
        $totalBills = 0;
        $totalPayments = 0;
        $currentPayable = 0;

        if ($vendorId) {
            $selectedVendor = Vendor::find($vendorId);
            $ledgers = VendorLedger::where('vendor_id', $vendorId)->latest()->get();

            $totalBills = $ledgers->where('type', 'bill')->sum('amount');
            $totalPayments = $ledgers->where('type', 'payment')->sum('amount');
            $currentPayable = $totalBills - $totalPayments;
        }

        return view('vendor_ledgers.index', compact(
            'vendors', 'selectedVendor', 'ledgers', 'vendorId',
            'totalBills', 'totalPayments', 'currentPayable'
        ));
    }

    public function storeVoucher(Request $request)
    {
        $validated = $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string',
            'notes' => 'nullable|string|max:255',
        ]);

        $user = Auth::user();
        $lastLedger = VendorLedger::where('vendor_id', $validated['vendor_id'])->latest()->first();
        $prevBalance = $lastLedger ? $lastLedger->balance : 0;
        $newBalance = $prevBalance - $validated['amount'];

        VendorLedger::create([
            'vendor_id' => $validated['vendor_id'],
            'branch_id' => $user->branch_id,
            'type' => 'payment',
            'amount' => $validated['amount'],
            'balance' => $newBalance,
            'payment_method' => $validated['payment_method'],
            'notes' => $validated['notes'] ?? 'Vendor Payment Voucher',
        ]);

        \App\Models\AuditLog::log('Vendor Payment Voucher Paid', 'VendorLedger', null, $validated);

        return redirect()->route('vendor-ledgers.index', ['vendor_id' => $validated['vendor_id']])
            ->with('success', 'Vendor payment voucher recorded successfully!');
    }
}
