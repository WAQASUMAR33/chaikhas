<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Expense;
use App\Models\InventoryItem;
use App\Models\KitchenStoreStock;
use App\Models\MainStoreStock;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Purchase;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        // Quick Stats Summary (indexable date boundaries)
        $start = "{$startDate} 00:00:00";
        $end = "{$endDate} 23:59:59";

        $salesQuery = Order::whereBetween('created_at', [$start, $end]);
        $purchaseQuery = Purchase::whereBetween('purchase_date', [$startDate, $endDate]);
        $expenseQuery = Expense::whereBetween('expense_date', [$startDate, $endDate]);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $salesQuery->where('branch_id', $user->branch_id);
            $purchaseQuery->where('branch_id', $user->branch_id);
            $expenseQuery->where('branch_id', $user->branch_id);
        }

        $totalRevenue = $salesQuery->sum('net_total');
        $totalOrdersCount = $salesQuery->count();
        $totalPurchasesAmount = $purchaseQuery->sum('total_amount');
        $totalExpensesAmount = $expenseQuery->sum('amount');
        $netProfit = $totalRevenue - ($totalPurchasesAmount + $totalExpensesAmount);

        return view('reports.index', compact(
            'startDate', 'endDate', 'totalRevenue', 'totalOrdersCount',
            'totalPurchasesAmount', 'totalExpensesAmount', 'netProfit'
        ));
    }

    public function sales(Request $request)
    {
        $user = Auth::user();
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        $selectedBranch = $request->input('branch_id', $user->branch_id);

        $query = Order::whereBetween('created_at', ["{$startDate} 00:00:00", "{$endDate} 23:59:59"]);

        if ($user->role !== 'super_admin') {
            $query->where('branch_id', $user->branch_id);
        } elseif ($selectedBranch) {
            $query->where('branch_id', $selectedBranch);
        }

        // Single SQL aggregate query for maximum performance
        $stats = (clone $query)->select(DB::raw("
            COALESCE(SUM(subtotal), 0) as total_subtotal,
            COALESCE(SUM(service_charge), 0) as total_service_charge,
            COALESCE(SUM(discount_amount), 0) as total_discount,
            COALESCE(SUM(net_total), 0) as total_sales,
            COUNT(*) as total_orders,
            COUNT(CASE WHEN order_type = 'Dine In' THEN 1 END) as dine_in_orders,
            COUNT(CASE WHEN order_type = 'Take Away' THEN 1 END) as take_away_orders
        "))->first();

        $totalSubtotal = (float) ($stats->total_subtotal ?? 0);
        $totalServiceCharge = (float) ($stats->total_service_charge ?? 0);
        $totalDiscount = (float) ($stats->total_discount ?? 0);
        $totalSales = (float) ($stats->total_sales ?? 0);
        $totalOrders = (int) ($stats->total_orders ?? 0);
        $dineInOrders = (int) ($stats->dine_in_orders ?? 0);
        $takeAwayOrders = (int) ($stats->take_away_orders ?? 0);

        $export = $request->input('export');
        if ($export === 'pdf' || $export === 'stream_pdf') {
            $allOrders = $query->with(['branch', 'user'])->latest()->get();
            $branding = ['restaurant_name' => \App\Models\Setting::get('restaurant_name', 'Chai Khas Restaurant')];
            $viewData = compact(
                'totalSubtotal', 'totalServiceCharge', 'totalDiscount', 'totalSales',
                'totalOrders', 'dineInOrders', 'takeAwayOrders', 'startDate', 'endDate', 'branding'
            ) + ['orders' => $allOrders];

            if ($export === 'pdf') {
                return \App\Services\ReportExportService::downloadPdf('reports.pdf.sales', $viewData, "sales_report_{$startDate}_to_{$endDate}.pdf");
            }
            return \App\Services\ReportExportService::streamPdf('reports.pdf.sales', $viewData, "sales_report_{$startDate}_to_{$endDate}.pdf");
        }

        if ($export === 'csv') {
            $allOrders = $query->with(['branch', 'user'])->latest()->get();
            $columns = ['Order #', 'Date & Time', 'Type', 'Status', 'Subtotal', 'Discount', 'Service Charge', 'Net Total'];
            $rows = [];
            foreach ($allOrders as $ord) {
                $rows[] = [
                    $ord->order_number,
                    $ord->created_at->format('Y-m-d H:i:s'),
                    $ord->order_type,
                    $ord->order_status,
                    number_format($ord->subtotal, 2, '.', ''),
                    number_format($ord->discount_amount, 2, '.', ''),
                    number_format($ord->service_charge, 2, '.', ''),
                    number_format($ord->net_total, 2, '.', '')
                ];
            }
            $rows[] = ['SUMMARY TOTAL', '', '', '', number_format($totalSubtotal, 2, '.', ''), number_format($totalDiscount, 2, '.', ''), number_format($totalServiceCharge, 2, '.', ''), number_format($totalSales, 2, '.', '')];

            return \App\Services\ReportExportService::downloadCsv("sales_report_{$startDate}_to_{$endDate}.csv", $columns, $rows);
        }

        $orders = $query->with(['branch', 'user'])->latest()->paginate(25)->withQueryString();
        $branches = \App\Services\MasterDataCache::getActiveBranches();

        return view('reports.sales', compact(
            'orders', 'totalSubtotal', 'totalServiceCharge', 'totalDiscount', 'totalSales',
            'totalOrders', 'dineInOrders', 'takeAwayOrders',
            'startDate', 'endDate', 'branches', 'selectedBranch'
        ));
    }

    public function menuSales(Request $request)
    {
        $user = Auth::user();
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        $categoryId = $request->input('category_id');
        $search = $request->input('search');

        $categories = \App\Models\Category::where('status', 'Active')->get();

        $query = OrderItem::select(
            'order_items.item_name',
            'menu_items.category_id',
            'categories.name as category_name',
            DB::raw('SUM(CASE WHEN orders.order_status = "Cancelled" THEN 0 ELSE COALESCE(order_items.quantity, 0) END) as total_qty'),
            DB::raw('SUM(CASE WHEN orders.order_status = "Cancelled" AND (order_items.cancelled_quantity IS NULL OR order_items.cancelled_quantity = 0) THEN order_items.quantity ELSE COALESCE(order_items.cancelled_quantity, 0) END) as total_cancelled_qty'),
            DB::raw('SUM(CASE WHEN orders.order_status = "Cancelled" THEN 0 ELSE COALESCE(order_items.total_amount, 0) END) as total_revenue')
        )
        ->join('orders', 'orders.id', '=', 'order_items.order_id')
        ->leftJoin('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
        ->leftJoin('categories', 'categories.id', '=', 'menu_items.category_id')
        ->whereBetween('orders.created_at', ["{$startDate} 00:00:00", "{$endDate} 23:59:59"]);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('orders.branch_id', $user->branch_id);
        }

        if (!empty($categoryId)) {
            $query->where('menu_items.category_id', $categoryId);
        }

        if (!empty($search)) {
            $query->where('order_items.item_name', 'like', "%{$search}%");
        }

        $menuSales = $query->groupBy('order_items.item_name', 'menu_items.category_id', 'categories.name')
            ->orderByDesc('total_qty')
            ->get();

        $grandTotalQty = $menuSales->sum('total_qty');
        $grandTotalCancelledQty = $menuSales->sum('total_cancelled_qty');
        $grandTotalRevenue = $menuSales->sum('total_revenue');
        $topItem = $menuSales->first();

        $categoryName = $categoryId ? ($categories->firstWhere('id', $categoryId)->name ?? 'Selected Category') : 'All Categories';

        $export = $request->input('export');
        if ($export === 'pdf' || $export === 'stream_pdf') {
            $branding = [
                'restaurant_name' => \App\Models\Setting::get('restaurant_name', 'Chai Khas Restaurant'),
            ];
            $viewData = compact(
                'menuSales', 'startDate', 'endDate', 'categoryName', 'branding',
                'grandTotalQty', 'grandTotalCancelledQty', 'grandTotalRevenue', 'topItem'
            );

            if ($export === 'pdf') {
                return \App\Services\ReportExportService::downloadPdf('reports.pdf.menu_sales', $viewData, "menu_sales_report_{$startDate}_to_{$endDate}.pdf");
            }
            return \App\Services\ReportExportService::streamPdf('reports.pdf.menu_sales', $viewData, "menu_sales_report_{$startDate}_to_{$endDate}.pdf");
        }

        if ($export === 'csv') {
            $columns = ['Rank', 'Item / Dish Name', 'Category', 'Total Qty Sold', 'Cancelled Qty', 'Total Revenue'];
            $rows = [];
            foreach ($menuSales as $idx => $item) {
                $rows[] = [
                    '#' . ($idx + 1),
                    $item->item_name,
                    $item->category_name ?? 'General',
                    $item->total_qty,
                    $item->total_cancelled_qty,
                    number_format($item->total_revenue, 2, '.', '')
                ];
            }
            $rows[] = ['SUMMARY TOTAL', '', '', $grandTotalQty, $grandTotalCancelledQty, number_format($grandTotalRevenue, 2, '.', '')];

            return \App\Services\ReportExportService::downloadCsv("menu_sales_report_{$startDate}_to_{$endDate}.csv", $columns, $rows);
        }

        return view('reports.menu_sales', compact(
            'menuSales', 'startDate', 'endDate', 'categories', 'categoryId', 'search',
            'grandTotalQty', 'grandTotalCancelledQty', 'grandTotalRevenue', 'topItem'
        ));
    }

    public function inventoryReport(Request $request)
    {
        $user = Auth::user();
        $branchId = $request->input('branch_id', $user->branch_id ?? Branch::first()->id ?? 1);

        $mainStocks = MainStoreStock::with('item')->where('branch_id', $branchId)->get();
        $kitchenStocks = KitchenStoreStock::with('item')->where('branch_id', $branchId)->get();

        $mainStoreValuation = $mainStocks->sum(fn($s) => $s->quantity * $s->avg_unit_cost);
        $kitchenStoreValuation = $kitchenStocks->sum(fn($s) => $s->quantity * ($s->item->default_purchase_price ?? 0));
        $totalValuation = $mainStoreValuation + $kitchenStoreValuation;

        $lowStockItems = $mainStocks->filter(fn($s) => $s->quantity <= ($s->item->min_stock_alert ?? 5));

        $export = $request->input('export');
        if ($export === 'pdf' || $export === 'stream_pdf') {
            $branding = ['restaurant_name' => \App\Models\Setting::get('restaurant_name', 'Chai Khas Restaurant')];
            $viewData = compact(
                'mainStocks', 'kitchenStocks', 'mainStoreValuation', 'kitchenStoreValuation',
                'totalValuation', 'lowStockItems', 'branchId', 'branding'
            );
            if ($export === 'pdf') {
                return \App\Services\ReportExportService::downloadPdf('reports.pdf.inventory', $viewData, "inventory_report.pdf");
            }
            return \App\Services\ReportExportService::streamPdf('reports.pdf.inventory', $viewData, "inventory_report.pdf");
        }

        if ($export === 'csv') {
            $columns = ['Item Name', 'Unit', 'Stock Quantity', 'Avg Unit Cost', 'Total Valuation'];
            $rows = [];
            foreach ($mainStocks as $s) {
                $rows[] = [
                    $s->item->name ?? 'Unknown',
                    $s->item->unit ?? 'Units',
                    $s->quantity,
                    number_format($s->avg_unit_cost, 2, '.', ''),
                    number_format($s->quantity * $s->avg_unit_cost, 2, '.', '')
                ];
            }
            $rows[] = ['MAIN STORE TOTAL VALUATION', '', '', '', number_format($mainStoreValuation, 2, '.', '')];

            return \App\Services\ReportExportService::downloadCsv("inventory_report.csv", $columns, $rows);
        }

        return view('reports.inventory', compact(
            'mainStocks', 'kitchenStocks', 'mainStoreValuation', 'kitchenStoreValuation',
            'totalValuation', 'lowStockItems', 'branchId'
        ));
    }

    public function purchasesReport(Request $request)
    {
        $user = Auth::user();
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $query = Purchase::with(['vendor', 'addedBy', 'items.item'])
                    ->whereBetween('purchase_date', [$startDate, $endDate]);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $purchases = $query->latest()->get();

        $totalPurchases = $purchases->sum('total_amount');
        $paidPurchases = $purchases->where('payment_status', 'Paid')->sum('total_amount');
        $unpaidPurchases = $purchases->where('payment_status', 'Unpaid')->sum('total_amount');

        $vendorBreakdown = $purchases->groupBy('vendor.name')->map(fn($group) => [
            'vendor_name' => $group->first()->vendor->name ?? 'Unknown',
            'total_amount' => $group->sum('total_amount'),
            'orders_count' => $group->count()
        ]);

        $export = $request->input('export');
        if ($export === 'pdf' || $export === 'stream_pdf') {
            $branding = ['restaurant_name' => \App\Models\Setting::get('restaurant_name', 'Chai Khas Restaurant')];
            $viewData = compact(
                'purchases', 'startDate', 'endDate', 'totalPurchases',
                'paidPurchases', 'unpaidPurchases', 'vendorBreakdown', 'branding'
            );
            if ($export === 'pdf') {
                return \App\Services\ReportExportService::downloadPdf('reports.pdf.purchases', $viewData, "purchases_report_{$startDate}_to_{$endDate}.pdf");
            }
            return \App\Services\ReportExportService::streamPdf('reports.pdf.purchases', $viewData, "purchases_report_{$startDate}_to_{$endDate}.pdf");
        }

        if ($export === 'csv') {
            $columns = ['Invoice #', 'Purchase Date', 'Vendor', 'Payment Status', 'Total Amount'];
            $rows = [];
            foreach ($purchases as $p) {
                $rows[] = [
                    $p->invoice_number,
                    $p->purchase_date,
                    $p->vendor->name ?? 'Direct Supplier',
                    $p->payment_status,
                    number_format($p->total_amount, 2, '.', '')
                ];
            }
            $rows[] = ['TOTAL PURCHASES SUMMARY', '', '', '', number_format($totalPurchases, 2, '.', '')];

            return \App\Services\ReportExportService::downloadCsv("purchases_report_{$startDate}_to_{$endDate}.csv", $columns, $rows);
        }

        return view('reports.purchases', compact(
            'purchases', 'startDate', 'endDate', 'totalPurchases',
            'paidPurchases', 'unpaidPurchases', 'vendorBreakdown'
        ));
    }

    public function expensesReport(Request $request)
    {
        $user = Auth::user();
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $query = Expense::whereBetween('expense_date', [$startDate, $endDate]);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $expenses = $query->latest()->get();
        $totalExpenses = $expenses->sum('amount');

        $categoryBreakdown = $expenses->groupBy('category')->map(fn($group) => [
            'category' => $group->first()->category ?? 'General',
            'total_amount' => $group->sum('amount'),
            'count' => $group->count()
        ]);

        $export = $request->input('export');
        if ($export === 'pdf' || $export === 'stream_pdf') {
            $branding = ['restaurant_name' => \App\Models\Setting::get('restaurant_name', 'Chai Khas Restaurant')];
            $viewData = compact('expenses', 'startDate', 'endDate', 'totalExpenses', 'categoryBreakdown', 'branding');
            if ($export === 'pdf') {
                return \App\Services\ReportExportService::downloadPdf('reports.pdf.expenses', $viewData, "expenses_report_{$startDate}_to_{$endDate}.pdf");
            }
            return \App\Services\ReportExportService::streamPdf('reports.pdf.expenses', $viewData, "expenses_report_{$startDate}_to_{$endDate}.pdf");
        }

        if ($export === 'csv') {
            $columns = ['Date', 'Category', 'Description / Reference', 'Amount'];
            $rows = [];
            foreach ($expenses as $e) {
                $rows[] = [
                    $e->expense_date,
                    $e->category,
                    $e->description ?? '-',
                    number_format($e->amount, 2, '.', '')
                ];
            }
            $rows[] = ['TOTAL EXPENSES SUMMARY', '', '', number_format($totalExpenses, 2, '.', '')];

            return \App\Services\ReportExportService::downloadCsv("expenses_report_{$startDate}_to_{$endDate}.csv", $columns, $rows);
        }

        return view('reports.expenses', compact('expenses', 'startDate', 'endDate', 'totalExpenses', 'categoryBreakdown'));
    }
}
