<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CustomerLedgerController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $customerId = $request->input('customer_id');
        $customers = Customer::orderBy('name')->get();

        $selectedCustomer = null;
        $ledgers = collect();
        $totalDebit = 0;
        $totalCredit = 0;
        $currentBalance = 0;

        if ($customerId) {
            $selectedCustomer = Customer::find($customerId);
            $ledgers = CustomerLedger::where('customer_id', $customerId)->latest()->get();

            $totalDebit = $ledgers->where('type', 'debit')->sum('amount');
            $totalCredit = $ledgers->where('type', 'credit')->sum('amount');
            $currentBalance = $totalDebit - $totalCredit;
        }

        return view('customer_ledgers.index', compact(
            'customers', 'selectedCustomer', 'ledgers', 'customerId',
            'totalDebit', 'totalCredit', 'currentBalance'
        ));
    }

    public function storePayment(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'amount' => 'required|numeric|min:0.01',
            'reference_no' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:255',
        ]);

        $user = Auth::user();
        $lastLedger = CustomerLedger::where('customer_id', $validated['customer_id'])->latest()->first();
        $prevBalance = $lastLedger ? $lastLedger->balance : 0;
        $newBalance = $prevBalance - $validated['amount'];

        CustomerLedger::create([
            'customer_id' => $validated['customer_id'],
            'branch_id' => $user->branch_id,
            'type' => 'credit',
            'amount' => $validated['amount'],
            'balance' => $newBalance,
            'description' => $validated['description'] ?? 'Payment Collection Receipt',
            'reference_no' => $validated['reference_no'],
        ]);

        \App\Models\AuditLog::log('Customer Payment Received', 'CustomerLedger', null, $validated);

        return redirect()->route('customer-ledgers.index', ['customer_id' => $validated['customer_id']])
            ->with('success', 'Customer payment receipt recorded successfully!');
    }
}
