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

    public function storeCustomer(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'opening_balance' => 'nullable|numeric|min:0',
        ]);

        $customer = Customer::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'loyalty_points' => 0,
        ]);

        $openingBal = (float)($validated['opening_balance'] ?? 0);
        if ($openingBal > 0) {
            $user = Auth::user();
            CustomerLedger::create([
                'customer_id' => $customer->id,
                'branch_id' => $user->branch_id,
                'type' => 'debit',
                'amount' => $openingBal,
                'balance' => $openingBal,
                'description' => 'Opening Khata Balance',
                'reference_no' => 'OPENING-BAL',
            ]);
        }

        \App\Models\AuditLog::log('Registered Khata Customer', 'Customer', null, ['customer_id' => $customer->id, 'name' => $customer->name]);

        return redirect()->route('customer-ledgers.index', ['customer_id' => $customer->id])
            ->with('success', "Customer '{$customer->name}' registered successfully in Khata!");
    }

    public function lookupByPhone(Request $request)
    {
        $phone = $request->input('phone');
        if (!$phone) {
            return response()->json(['success' => false, 'message' => 'Phone required.']);
        }

        $customer = Customer::where('phone', 'like', "%{$phone}%")->first();
        if ($customer) {
            $lastLedger = CustomerLedger::where('customer_id', $customer->id)->latest()->first();
            return response()->json([
                'success' => true,
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'loyalty_points' => (int)($customer->loyalty_points ?? 0),
                    'current_balance' => $lastLedger ? (float)$lastLedger->balance : 0,
                ]
            ]);
        }

        return response()->json(['success' => false, 'message' => 'Customer not found.']);
    }
}
