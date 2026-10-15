<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Expense;
use App\Models\Hall;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        // 0. Order Taker Dashboard (Role-specific or Admin preview via ?view=order_taker)
        if ($user->role === 'order_taker' || $request->query('view') === 'order_taker') {
            return $this->orderTakerDashboard($user, $request);
        }

        // 1. Super Admin Dashboard
        if ($user->role === 'super_admin') {
            $todayStart = now()->startOfDay()->toDateTimeString();
            $todayEnd = now()->endOfDay()->toDateTimeString();

            $todayOrderStats = DB::table('orders')
                ->whereBetween('created_at', [$todayStart, $todayEnd])
                ->selectRaw('COUNT(*) as total_count, COALESCE(SUM(net_total), 0) as total_sales')
                ->first();

            $totalBranches = Branch::count();
            $totalUsers = User::count();
            $totalOrdersToday = (int) ($todayOrderStats->total_count ?? 0);
            $totalSalesToday = (float) ($todayOrderStats->total_sales ?? 0);
            $branches = Branch::withCount(['orders', 'tables'])->get();

            // 7-Day Trend Analytics
            $trendData = $this->get7DayTrend();

            // Order Types Distribution (Dine In vs Takeaway vs Delivery)
            $orderTypeData = $this->getOrderTypeDistribution();

            // Top Selling Menu Items
            $topItemsData = $this->getTopSellingItems();

            // Branch Comparison Analytics for Bar Chart
            $branchComparisonData = $this->getBranchComparison($branches);

            // Low Stock Threshold Alerts (Filtered directly in database)
            $lowStockItems = \App\Models\InventoryItem::with(['mainStoreStock', 'kitchenStoreStocks'])
                ->where('min_stock_alert', '>', 0)
                ->get()
                ->filter(function($item) {
                    $total = ($item->mainStoreStock->quantity ?? 0) + $item->kitchenStoreStocks->sum('quantity');
                    return $total <= $item->min_stock_alert;
                });
            $lowStockCount = $lowStockItems->count();

            return view('dashboard.super_admin', compact(
                'user',
                'totalBranches',
                'totalUsers',
                'totalOrdersToday',
                'totalSalesToday',
                'branches',
                'trendData',
                'orderTypeData',
                'topItemsData',
                'branchComparisonData',
                'lowStockCount',
                'lowStockItems'
            ));
        }

        // 2. Branch Admin / Staff Dashboards
        $branchId = $user->branch_id ?? Branch::first()->id ?? 1;

        $runningOrders = Order::where('branch_id', $branchId)->whereIn('order_status', ['Running', 'Preparing', 'Ready'])->count();
        $totalTables = Table::where('branch_id', $branchId)->count();
        $availableTables = Table::where('branch_id', $branchId)->where('status', 'Available')->count();
        $occupiedTables = Table::where('branch_id', $branchId)->where('status', 'Running')->count();

        $todaySales = (float) Order::where('branch_id', $branchId)->whereDate('created_at', now()->today())->sum('net_total');
        $todayExpenses = (float) Expense::where('branch_id', $branchId)->whereDate('expense_date', now()->today())->sum('amount');

        $recentOrders = Order::with(['table', 'hall', 'user'])->where('branch_id', $branchId)->latest()->take(5)->get();

        // 7-Day Trend for this branch
        $trendData = $this->get7DayTrend($branchId);

        // Order Types Distribution for this branch
        $orderTypeData = $this->getOrderTypeDistribution($branchId);

        // Top Selling Menu Items for this branch
        $topItemsData = $this->getTopSellingItems($branchId);

        // Low Stock Threshold Alerts (Filtered directly in database)
        $lowStockItems = \App\Models\InventoryItem::with(['mainStoreStock', 'kitchenStoreStocks'])
            ->where('branch_id', $branchId)
            ->where('min_stock_alert', '>', 0)
            ->get()
            ->filter(function($item) {
                $total = ($item->mainStoreStock->quantity ?? 0) + $item->kitchenStoreStocks->sum('quantity');
                return $total <= $item->min_stock_alert;
            });
        $lowStockCount = $lowStockItems->count();

        return view('dashboard.branch_admin', compact(
            'user',
            'runningOrders',
            'totalTables',
            'availableTables',
            'occupiedTables',
            'todaySales',
            'todayExpenses',
            'recentOrders',
            'trendData',
            'orderTypeData',
            'topItemsData',
            'lowStockCount',
            'lowStockItems'
        ));
    }

    /**
     * Get 7-Day Sales & Orders Velocity Trend (Optimized Single Aggregation)
     */
    private function get7DayTrend(?int $branchId = null): array
    {
        $startDate = now()->subDays(6)->startOfDay();

        $query = Order::where('created_at', '>=', $startDate);
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $records = $query->selectRaw('DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(net_total), 0) as sales')
            ->groupBy('date')
            ->get()
            ->keyBy('date');

        $labels = [];
        $sales = [];
        $orders = [];

        for ($i = 6; $i >= 0; $i--) {
            $dateObj = now()->subDays($i);
            $dateStr = $dateObj->toDateString();
            $label = $dateObj->format('d M');

            $row = $records->get($dateStr);
            $labels[] = $label;
            $sales[] = $row ? round((float) $row->sales, 2) : 0;
            $orders[] = $row ? (int) $row->orders : 0;
        }

        return [
            'labels' => $labels,
            'sales' => $sales,
            'orders' => $orders,
        ];
    }

    /**
     * Get Order Channel Distribution (Dine In vs Takeaway vs Delivery)
     */
    private function getOrderTypeDistribution(?int $branchId = null): array
    {
        $query = Order::query();
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $counts = $query->selectRaw('order_type, count(*) as count')
            ->groupBy('order_type')
            ->pluck('count', 'order_type')
            ->toArray();

        $dineIn = (int) ($counts['Dine In'] ?? 0);
        $takeaway = (int) ($counts['Take Away'] ?? $counts['Takeaway'] ?? 0);
        $delivery = (int) ($counts['Delivery'] ?? 0);

        return [
            'labels' => ['Dine In', 'Takeaway', 'Delivery'],
            'series' => [$dineIn, $takeaway, $delivery],
            'total' => $dineIn + $takeaway + $delivery,
        ];
    }

    /**
     * Get Top 5 Selling Menu Items by Revenue
     */
    private function getTopSellingItems(?int $branchId = null): array
    {
        $query = OrderItem::selectRaw('item_name, sum(quantity) as total_qty, sum(total_amount) as total_sales')
            ->groupBy('item_name')
            ->orderByDesc('total_sales')
            ->take(5);

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $items = $query->get();

        $labels = [];
        $sales = [];
        $quantities = [];

        foreach ($items as $item) {
            $labels[] = $item->item_name;
            $sales[] = round((float) $item->total_sales, 2);
            $quantities[] = (int) $item->total_qty;
        }

        return [
            'labels' => $labels,
            'sales' => $sales,
            'quantities' => $quantities,
        ];
    }

    /**
     * Get Branch Sales & Order Comparison (Optimized Single Grouped Query)
     */
    private function getBranchComparison($branches): array
    {
        $branchStats = Order::selectRaw('branch_id, COUNT(*) as orders, COALESCE(SUM(net_total), 0) as sales')
            ->groupBy('branch_id')
            ->get()
            ->keyBy('branch_id');

        $labels = [];
        $sales = [];
        $orders = [];

        foreach ($branches as $branch) {
            $labels[] = $branch->branch_name;
            $stat = $branchStats->get($branch->id);

            $sales[] = $stat ? round((float) $stat->sales, 2) : 0;
            $orders[] = $stat ? (int) $stat->orders : 0;
        }

        return [
            'labels' => $labels,
            'sales' => $sales,
            'orders' => $orders,
        ];
    }

    /**
     * Dedicated Order Taker / Waiter Floor Console Dashboard
     */
    public function orderTakerDashboard(User $user, Request $request)
    {
        $branchId = $user->branch_id ?? Branch::first()->id ?? 1;
        $branch = Branch::find($branchId);

        // Fetch Halls with their Tables
        $halls = Hall::where('branch_id', $branchId)
            ->with(['tables' => function ($q) {
                $q->orderBy('table_number');
            }])
            ->get();

        $allTables = Table::with('hall')
            ->where('branch_id', $branchId)
            ->orderBy('table_number')
            ->get();

        // Active Orders in branch (Running, Preparing, Ready, Bill Generated)
        $activeOrders = Order::with(['table', 'hall', 'orderTaker', 'items'])
            ->where('branch_id', $branchId)
            ->whereIn('order_status', ['Running', 'Preparing', 'Ready', 'Bill Generated'])
            ->latest()
            ->get();

        // Map active orders to table_id for instantaneous lookup in floor plan
        $tableOrders = [];
        foreach ($activeOrders as $ord) {
            if ($ord->table_id) {
                $tableOrders[$ord->table_id] = $ord;
            }
        }

        // Waiter specific active orders
        $myActiveOrders = $activeOrders->filter(function ($ord) use ($user) {
            if ($user->role === 'order_taker') {
                return $ord->order_taker_id == $user->id;
            }
            return true;
        })->values();

        // Urgent alerts: Kitchen finished cooking, ready for pickup to table!
        $readyOrders = $activeOrders->where('order_status', 'Ready')->values();

        // Table Metrics
        $totalTables = $allTables->count();
        $occupiedTablesCount = count($tableOrders);
        $availableTablesCount = max(0, $totalTables - $occupiedTablesCount);

        // Today's Stats for Order Taker
        $todayStart = now()->startOfDay()->toDateTimeString();
        $todayEnd = now()->endOfDay()->toDateTimeString();

        $todayOrdersQuery = Order::where('branch_id', $branchId)
            ->whereBetween('created_at', [$todayStart, $todayEnd]);

        if ($user->role === 'order_taker') {
            $todayOrdersQuery->where('order_taker_id', $user->id);
        }

        $todayOrdersCount = (clone $todayOrdersQuery)->count();
        $todaySalesAmount = (float) (clone $todayOrdersQuery)->sum('net_total');

        // Recent Completed Orders for quick receipt / bill reprint
        $recentCompletedOrders = (clone $todayOrdersQuery)
            ->with(['table', 'hall', 'items'])
            ->whereIn('order_status', ['Completed', 'Complete'])
            ->latest()
            ->take(8)
            ->get();

        return view('dashboard.order_taker', compact(
            'user',
            'branch',
            'branchId',
            'halls',
            'allTables',
            'tableOrders',
            'activeOrders',
            'myActiveOrders',
            'readyOrders',
            'totalTables',
            'occupiedTablesCount',
            'availableTablesCount',
            'todayOrdersCount',
            'todaySalesAmount',
            'recentCompletedOrders'
        ));
    }
}

