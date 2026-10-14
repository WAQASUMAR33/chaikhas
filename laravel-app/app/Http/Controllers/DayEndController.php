<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\DayEnd;
use App\Models\Expense;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DayEndController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = DayEnd::with(['branch', 'user']);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
            $branchId = $user->branch_id;
        } else {
            $branchId = $request->input('branch_id', Branch::where('status', 'Active')->first()->id ?? 1);
            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }

        $dayEnds = $query->latest('date')->latest('id')->paginate(15)->withQueryString();
        $branches = Branch::where('status', 'Active')->get();

        // Compute live today metrics for initial dashboard view
        $todaySummary = $this->calculateDaySummary($branchId, now()->toDateString());

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'dayEnds' => $dayEnds,
                'todaySummary' => $todaySummary,
            ]);
        }

        return view('dayend.index', compact('dayEnds', 'branches', 'todaySummary', 'branchId'));
    }

    /**
     * Preview endpoint for real-time live calculation when closing day.
     */
    public function preview(Request $request)
    {
        $user = Auth::user();
        $branchId = ($user->role !== 'super_admin' && $user->branch_id) 
            ? $user->branch_id 
            : $request->input('branch_id', Branch::where('status', 'Active')->first()->id ?? 1);

        $date = $request->input('date', now()->toDateString());
        $summary = $this->calculateDaySummary($branchId, $date);

        return response()->json([
            'success' => true,
            'summary' => $summary,
        ]);
    }

    /**
     * Store and finalize Day End Closure with full details and snapshot.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'date' => 'nullable|date',
            'opening_cash' => 'required|numeric|min:0',
            'actual_cash' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $branchId = ($user->role !== 'super_admin' && $user->branch_id) 
            ? $user->branch_id 
            : $validated['branch_id'];

        $date = $validated['date'] ?? now()->toDateString();

        // Calculate comprehensive metrics & breakdowns
        $summary = $this->calculateDaySummary($branchId, $date);

        $openingCash = round((float) $validated['opening_cash'], 2);
        $cashSales = round((float) $summary['cash_sales'], 2);
        $totalExpenses = round((float) $summary['total_expenses'], 2);

        // Expected cash in drawer = Opening Float + Cash Sales - Cash Expenses
        $expectedCash = round($openingCash + $cashSales - $totalExpenses, 2);

        // Actual cash counted by manager (if not provided, default to expected)
        $actualCash = isset($validated['actual_cash']) && $validated['actual_cash'] !== '' 
            ? round((float) $validated['actual_cash'], 2) 
            : $expectedCash;

        // Cash difference: Positive = Over, Negative = Short, 0 = Balanced
        $cashDifference = round($actualCash - $expectedCash, 2);

        $dayEnd = DayEnd::create([
            'branch_id' => $branchId,
            'user_id' => Auth::id(),
            'date' => $date,
            'opening_cash' => $openingCash,
            'gross_sales' => $summary['gross_sales'],
            'total_discount' => $summary['total_discount'],
            'total_service_charges' => $summary['total_service_charges'],
            'total_tax' => $summary['total_tax'],
            'total_sales' => $summary['total_sales'],
            'cash_sales' => $cashSales,
            'card_sales' => $summary['card_sales'],
            'online_sales' => $summary['online_sales'],
            'other_sales' => $summary['other_sales'],
            'total_orders' => $summary['total_orders'],
            'completed_orders' => $summary['completed_orders'],
            'cancelled_orders' => $summary['cancelled_orders'],
            'dine_in_sales' => $summary['dine_in_sales'],
            'dine_in_count' => $summary['dine_in_count'],
            'takeaway_sales' => $summary['takeaway_sales'],
            'takeaway_count' => $summary['takeaway_count'],
            'delivery_sales' => $summary['delivery_sales'],
            'delivery_count' => $summary['delivery_count'],
            'total_expenses' => $totalExpenses,
            'expected_cash' => $expectedCash,
            'actual_cash' => $actualCash,
            'cash_difference' => $cashDifference,
            'closing_cash' => $actualCash,
            'closed_at' => now(),
            'status' => 'Closed',
            'notes' => $validated['notes'] ?? null,
            'details' => [
                'category_sales' => $summary['category_sales'],
                'top_items' => $summary['top_items'],
                'expenses_list' => $summary['expenses_list'],
                'hourly_sales' => $summary['hourly_sales'],
                'cashier_breakdown' => $summary['cashier_breakdown'],
                'running_orders_count' => $summary['running_orders_count'],
            ],
        ]);

        AuditLog::log('Day End Closed', 'DayEnd', null, [
            'day_end_id' => $dayEnd->id,
            'branch_id' => $branchId,
            'date' => $date,
            'total_sales' => $summary['total_sales'],
            'actual_cash' => $actualCash,
            'difference' => $cashDifference,
        ]);

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Day-end closure recorded successfully with full details.',
                'dayEnd' => $dayEnd->load(['branch', 'user']),
            ]);
        }

        return redirect()->route('dayend.index')->with('success', 'Day-end closure recorded successfully with full details.');
    }

    /**
     * Show full day closing details (Z-Report modal data).
     */
    public function show(Request $request, DayEnd $dayend)
    {
        $dayend->load(['branch', 'user']);

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'dayEnd' => $dayend,
            ]);
        }

        return view('dayend.show', compact('dayend'));
    }

    /**
     * Printable Z-Report receipt slip.
     */
    public function printZReport(DayEnd $dayend)
    {
        $dayend->load(['branch', 'user']);
        return view('dayend.print_zreport', compact('dayend'));
    }

    /**
     * Calculate comprehensive financial and operational summary for a branch & date.
     */
    private function calculateDaySummary($branchId, $date): array
    {
        $startOfDay = Carbon::parse($date)->startOfDay();
        $endOfDay = Carbon::parse($date)->endOfDay();

        // 1. Fetch Orders
        $ordersQuery = Order::where('branch_id', $branchId)
            ->whereBetween('created_at', [$startOfDay, $endOfDay]);

        $allOrders = (clone $ordersQuery)->with(['user', 'orderTaker'])->get();
        $completedOrders = $allOrders->where('order_status', 'Completed');
        $cancelledOrders = $allOrders->where('order_status', 'Cancelled');
        $runningOrders = $allOrders->where('order_status', 'Running');

        // Sales totals from completed orders
        $grossSales = round((float) $completedOrders->sum('subtotal'), 2);
        $totalDiscount = round((float) $completedOrders->sum('discount_amount'), 2);
        $totalServiceCharges = round((float) $completedOrders->sum('service_charge'), 2);
        $totalTax = round((float) ($completedOrders->sum('tax_amount') ?? 0), 2);
        $netTotalSales = round((float) $completedOrders->sum('net_total'), 2);

        // Payment modes breakdown
        $cashSales = 0;
        $cardSales = 0;
        $onlineSales = 0;
        $otherSales = 0;

        foreach ($completedOrders as $order) {
            $mode = strtolower(trim((string) $order->payment_mode));
            $amt = (float) $order->net_total;

            if ($mode === 'cash' || $mode === '') {
                $cashSales += $amt;
            } elseif ($mode === 'card' || $mode === 'credit card' || $mode === 'debit card') {
                $cardSales += $amt;
            } elseif (in_array($mode, ['online', 'bank', 'bank transfer', 'easypaisa', 'jazzcash', 'digital'])) {
                $onlineSales += $amt;
            } else {
                $otherSales += $amt;
            }
        }

        $cashSales = round($cashSales, 2);
        $cardSales = round($cardSales, 2);
        $onlineSales = round($onlineSales, 2);
        $otherSales = round($otherSales, 2);

        // Order types breakdown
        $dineInOrders = $completedOrders->filter(fn($o) => strcasecmp($o->order_type, 'Dine In') === 0);
        $takeawayOrders = $completedOrders->filter(fn($o) => in_array(strtolower($o->order_type), ['takeaway', 'take away']));
        $deliveryOrders = $completedOrders->filter(fn($o) => strcasecmp($o->order_type, 'Delivery') === 0);

        $dineInSales = round((float) $dineInOrders->sum('net_total'), 2);
        $dineInCount = $dineInOrders->count();

        $takeawaySales = round((float) $takeawayOrders->sum('net_total'), 2);
        $takeawayCount = $takeawayOrders->count();

        $deliverySales = round((float) $deliveryOrders->sum('net_total'), 2);
        $deliveryCount = $deliveryOrders->count();

        // 2. Fetch Expenses
        $expenses = Expense::where('branch_id', $branchId)
            ->where(function($q) use ($date, $startOfDay, $endOfDay) {
                $q->whereDate('expense_date', $date)
                  ->orWhereBetween('created_at', [$startOfDay, $endOfDay]);
            })
            ->with('user')
            ->get();

        $totalExpenses = round((float) $expenses->sum('amount'), 2);
        $expensesList = $expenses->map(function($e) {
            return [
                'id' => $e->id,
                'title' => $e->title,
                'category' => $e->category ?? 'General',
                'amount' => (float) $e->amount,
                'user' => $e->user?->name ?? 'Staff',
                'notes' => $e->notes,
            ];
        })->toArray();

        // 3. Category & Item breakdown
        $completedOrderIds = $completedOrders->pluck('id');
        $orderItems = OrderItem::whereIn('order_id', $completedOrderIds)
            ->where('quantity', '>', 0)
            ->where(function($q) {
                $q->whereNull('is_cancel')->orWhere('is_cancel', 0);
            })
            ->with('menuItem.category')
            ->get();

        $categoryBreakdown = [];
        $itemBreakdown = [];

        foreach ($orderItems as $item) {
            $catName = $item->menuItem?->category?->name ?? 'Other';
            if (!isset($categoryBreakdown[$catName])) {
                $categoryBreakdown[$catName] = ['name' => $catName, 'quantity' => 0, 'total' => 0];
            }
            $categoryBreakdown[$catName]['quantity'] += (int) $item->quantity;
            $categoryBreakdown[$catName]['total'] += (float) $item->total_amount;

            $itemName = $item->item_name ?? $item->menuItem?->name ?? 'Dish';
            if (!isset($itemBreakdown[$itemName])) {
                $itemBreakdown[$itemName] = ['name' => $itemName, 'quantity' => 0, 'total' => 0];
            }
            $itemBreakdown[$itemName]['quantity'] += (int) $item->quantity;
            $itemBreakdown[$itemName]['total'] += (float) $item->total_amount;
        }

        // Sort items by total sales descending
        usort($itemBreakdown, fn($a, $b) => $b['total'] <=> $a['total']);
        $topItems = array_slice($itemBreakdown, 0, 10);
        $categorySales = array_values($categoryBreakdown);

        // 4. Hourly distribution
        $hourly = [];
        foreach ($completedOrders as $order) {
            $hour = $order->created_at->format('h:00 A');
            if (!isset($hourly[$hour])) {
                $hourly[$hour] = ['hour' => $hour, 'orders' => 0, 'total' => 0];
            }
            $hourly[$hour]['orders']++;
            $hourly[$hour]['total'] += (float) $order->net_total;
        }

        // 5. Cashier / Staff breakdown
        $cashiers = [];
        foreach ($completedOrders as $order) {
            $staffName = $order->user?->name ?? $order->orderTaker?->name ?? 'Cashier';
            if (!isset($cashiers[$staffName])) {
                $cashiers[$staffName] = ['name' => $staffName, 'orders' => 0, 'total' => 0];
            }
            $cashiers[$staffName]['orders']++;
            $cashiers[$staffName]['total'] += (float) $order->net_total;
        }

        return [
            'date' => $date,
            'branch_id' => $branchId,
            'gross_sales' => $grossSales,
            'total_discount' => $totalDiscount,
            'total_service_charges' => $totalServiceCharges,
            'total_tax' => $totalTax,
            'total_sales' => $netTotalSales,
            'cash_sales' => $cashSales,
            'card_sales' => $cardSales,
            'online_sales' => $onlineSales,
            'other_sales' => $otherSales,
            'total_orders' => $allOrders->count(),
            'completed_orders' => $completedOrders->count(),
            'cancelled_orders' => $cancelledOrders->count(),
            'running_orders_count' => $runningOrders->count(),
            'dine_in_sales' => $dineInSales,
            'dine_in_count' => $dineInCount,
            'takeaway_sales' => $takeawaySales,
            'takeaway_count' => $takeawayCount,
            'delivery_sales' => $deliverySales,
            'delivery_count' => $deliveryCount,
            'total_expenses' => $totalExpenses,
            'expenses_list' => $expensesList,
            'category_sales' => $categorySales,
            'top_items' => $topItems,
            'hourly_sales' => array_values($hourly),
            'cashier_breakdown' => array_values($cashiers),
        ];
    }
}
