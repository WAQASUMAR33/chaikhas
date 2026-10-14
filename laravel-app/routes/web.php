<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\BrandingController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DayEndController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\HallController;
use App\Http\Controllers\KitchenController;
use App\Http\Controllers\KitchenManagementController;
use App\Http\Controllers\MenuItemController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\LocalizationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PRASettingController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\TableController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VendorController;
use Illuminate\Support\Facades\Route;

// Localization & Currency Switchers
Route::get('/set-locale/{locale}', [LocalizationController::class, 'setLocale'])->name('locale.set');
Route::get('/set-currency/{currency}', [LocalizationController::class, 'setCurrency'])->name('currency.set');

// Redirect root to dashboard/login
Route::get('/', function () {
    return redirect()->route('dashboard');
});

// Authentication Routes
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Authenticated Routes
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Settings & Branding
    Route::get('/settings', [SettingController::class, 'index'])->name('settings.index');
    Route::post('/settings', [SettingController::class, 'update'])->name('settings.update');
    Route::get('/branding', [BrandingController::class, 'index'])->name('branding.index');
    Route::post('/branding', [BrandingController::class, 'update'])->name('branding.update');

    // PRA (Punjab Revenue Authority) Invoicing Management
    Route::get('/pra-settings', [PRASettingController::class, 'index'])->name('settings.pra.index');
    Route::post('/pra-settings', [PRASettingController::class, 'update'])->name('settings.pra.update');
    Route::post('/pra-settings/toggle', [PRASettingController::class, 'toggle'])->name('settings.pra.toggle');
    Route::post('/pra-settings/test-connection', [PRASettingController::class, 'testConnection'])->name('settings.pra.test');
    Route::post('/pra-settings/retry/{order}', [PRASettingController::class, 'retryInvoice'])->name('settings.pra.retry');

    // POS & Orders
    Route::get('/orders/create', [OrderController::class, 'create'])->name('orders.create');
    Route::post('/orders', [OrderController::class, 'store'])->name('orders.store');
    Route::post('/orders/merge', [OrderController::class, 'mergeOrders'])->name('orders.merge');
    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus'])->name('orders.updateStatus');
    Route::post('/orders/{order}/billing', [OrderController::class, 'updateBilling'])->name('orders.updateBilling');
    Route::post('/orders/{order}/pay', [OrderController::class, 'processPayment'])->name('orders.processPayment');
    Route::get('/orders/{order}/receipt', [OrderController::class, 'printReceipt'])->name('orders.receipt');
    Route::post('/orders/{order}/kot', [OrderController::class, 'reprintKOT'])->name('orders.reprintKOT');

    // Kitchen Display System & Station Management
    Route::get('/kitchen', [KitchenController::class, 'index'])->name('kitchen.index');
    Route::patch('/kitchen/item/{item}/status', [KitchenController::class, 'updateItemStatus'])->name('kitchen.item.status');
    Route::resource('kitchens', KitchenManagementController::class)->except(['create', 'edit', 'show']);
    Route::post('/kitchens/{kitchen}/test-printer', [KitchenManagementController::class, 'testPrinter'])->name('kitchens.testPrinter');

    // Halls & Tables Management
    Route::resource('halls', HallController::class)->except(['create', 'edit', 'show']);
    Route::resource('tables', TableController::class)->except(['create', 'edit', 'show']);

    // Menu Categories & Items
    Route::resource('categories', CategoryController::class)->except(['create', 'edit', 'show']);
    Route::resource('menu', MenuItemController::class)->except(['create', 'edit', 'show']);

    // Expenses & Day End
    Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
    Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy'])->name('expenses.destroy');

    Route::get('/dayend', [DayEndController::class, 'index'])->name('dayend.index');
    Route::get('/dayend/preview', [DayEndController::class, 'preview'])->name('dayend.preview');
    Route::post('/dayend', [DayEndController::class, 'store'])->name('dayend.store');
    Route::get('/dayend/{dayend}', [DayEndController::class, 'show'])->name('dayend.show');
    Route::get('/dayend/{dayend}/print', [DayEndController::class, 'printZReport'])->name('dayend.print');

    // Reports & Analytics Suite
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/reports/sales', [ReportController::class, 'sales'])->name('reports.sales');
    Route::get('/reports/menu-sales', [ReportController::class, 'menuSales'])->name('reports.menu-sales');
    Route::get('/reports/inventory', [ReportController::class, 'inventoryReport'])->name('reports.inventory');
    Route::get('/reports/purchases', [ReportController::class, 'purchasesReport'])->name('reports.purchases');
    Route::get('/reports/expenses', [ReportController::class, 'expensesReport'])->name('reports.expenses');

    // Vendors Management
    Route::resource('vendors', VendorController::class)->except(['create', 'edit', 'show']);

    // Purchases & Inward Orders (Main Store)
    Route::get('/purchases', [PurchaseController::class, 'index'])->name('purchases.index');
    Route::get('/purchases/create', [PurchaseController::class, 'create'])->name('purchases.create');
    Route::post('/purchases', [PurchaseController::class, 'store'])->name('purchases.store');

    // Main Store & Kitchen Store Stock Management
    Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::get('/inventory/products', [InventoryController::class, 'products'])->name('inventory.products');
    Route::post('/inventory/products', [InventoryController::class, 'storeProduct'])->name('inventory.products.store');
    Route::put('/inventory/products/{product}', [InventoryController::class, 'updateProduct'])->name('inventory.products.update');
    Route::delete('/inventory/products/{product}', [InventoryController::class, 'destroyProduct'])->name('inventory.products.destroy');
    Route::post('/inventory/item', [InventoryController::class, 'createItem'])->name('inventory.item.store');
    Route::post('/inventory/transfer', [InventoryController::class, 'transferToKitchen'])->name('inventory.transfer');
    Route::post('/inventory/return', [InventoryController::class, 'returnToMainStore'])->name('inventory.return');
    Route::get('/inventory/logs', [InventoryController::class, 'activityLogs'])->name('inventory.logs');

    // Recipe BOM
    Route::get('/recipes', [\App\Http\Controllers\RecipeController::class, 'index'])->name('recipes.index');
    Route::post('/recipes', [\App\Http\Controllers\RecipeController::class, 'store'])->name('recipes.store');
    Route::delete('/recipes/{id}', [\App\Http\Controllers\RecipeController::class, 'destroy'])->name('recipes.destroy');

    // Customer Ledgers & Khata Credit Accounts
    Route::get('/customer-ledgers', [\App\Http\Controllers\CustomerLedgerController::class, 'index'])->name('customer-ledgers.index');
    Route::post('/customer-ledgers/payment', [\App\Http\Controllers\CustomerLedgerController::class, 'storePayment'])->name('customer-ledgers.payment');

    // Vendor Accounts Payable Ledgers
    Route::get('/vendor-ledgers', [\App\Http\Controllers\VendorLedgerController::class, 'index'])->name('vendor-ledgers.index');
    Route::post('/vendor-ledgers/voucher', [\App\Http\Controllers\VendorLedgerController::class, 'storeVoucher'])->name('vendor-ledgers.voucher');

    // Table Reservations & Bookings
    Route::get('/reservations', [\App\Http\Controllers\ReservationController::class, 'index'])->name('reservations.index');
    Route::post('/reservations', [\App\Http\Controllers\ReservationController::class, 'store'])->name('reservations.store');
    Route::patch('/reservations/{id}/status', [\App\Http\Controllers\ReservationController::class, 'updateStatus'])->name('reservations.updateStatus');

    // Delivery Riders & Dispatch Tracking
    Route::get('/riders', [\App\Http\Controllers\RiderController::class, 'index'])->name('riders.index');
    Route::post('/riders', [\App\Http\Controllers\RiderController::class, 'store'])->name('riders.store');
    Route::post('/orders/{order}/assign-rider', [\App\Http\Controllers\RiderController::class, 'assignOrder'])->name('orders.assignRider');

    // Waste, Damage & Spoilage Logs
    Route::get('/waste-logs', [\App\Http\Controllers\WasteLogController::class, 'index'])->name('waste-logs.index');
    Route::post('/waste-logs', [\App\Http\Controllers\WasteLogController::class, 'store'])->name('waste-logs.store');

    // Staff Attendance Register
    Route::get('/attendances', [\App\Http\Controllers\AttendanceController::class, 'index'])->name('attendances.index');
    Route::post('/attendances', [\App\Http\Controllers\AttendanceController::class, 'store'])->name('attendances.store');

    // Security Audit Trail Logs
    Route::get('/audit-logs', [\App\Http\Controllers\AuditLogController::class, 'index'])->name('audit-logs.index');

    // Super Admin Routes (Branch & User Management)
    Route::resource('branches', BranchController::class)->except(['create', 'edit', 'show']);
    Route::resource('users', UserController::class)->except(['create', 'edit']);

    // Multi-Node Webhook Database Sync & Nodes Management
    Route::get('/sync-nodes', [\App\Http\Controllers\SyncNodeController::class, 'index'])->name('sync-nodes.index');
    Route::post('/sync-nodes', [\App\Http\Controllers\SyncNodeController::class, 'store'])->name('sync-nodes.store');
    Route::put('/sync-nodes/{syncNode}', [\App\Http\Controllers\SyncNodeController::class, 'update'])->name('sync-nodes.update');
    Route::delete('/sync-nodes/{syncNode}', [\App\Http\Controllers\SyncNodeController::class, 'destroy'])->name('sync-nodes.destroy');
    Route::post('/sync-nodes/{syncNode}/ping', [\App\Http\Controllers\SyncNodeController::class, 'ping'])->name('sync-nodes.ping');
    Route::post('/webhook-logs/{webhookLog}/retry', [\App\Http\Controllers\SyncNodeController::class, 'retryLog'])->name('webhook-logs.retry');
});

// Fallback route to serve uploaded storage files on live server hosting when symlink is missing
Route::get('/storage/{path}', function ($path) {
    $filePath = storage_path('app/public/' . $path);
    if (!file_exists($filePath)) {
        $filePath = public_path('storage/' . $path);
        if (!file_exists($filePath)) {
            abort(404);
        }
    }
    $type = mime_content_type($filePath) ?: 'image/png';
    return response()->file($filePath, ['Content-Type' => $type]);
})->where('path', '.*');

// Web helper route to trigger storage link on Hostinger Shared Hosting without SSH
Route::get('/create-storage-link', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('storage:link');
        return '<h2 style="color:green;font-family:sans-serif;">✓ Storage link created successfully on Hostinger!</h2>';
    } catch (\Throwable $e) {
        return '<h2 style="color:red;font-family:sans-serif;">Error: ' . $e->getMessage() . '</h2>';
    }
});

