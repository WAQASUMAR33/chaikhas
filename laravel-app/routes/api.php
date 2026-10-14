<?php

use App\Http\Controllers\Api\LegacyApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes for Restaurant POS & Operations
| Supporting exact legacy endpoint URLs matching d:\restuarent\api and d:\restuarent\pos
|--------------------------------------------------------------------------
*/

// Auth
Route::match(['get', 'post'], '/login.php', [LegacyApiController::class, 'login']);
Route::match(['get', 'post'], '/login', [LegacyApiController::class, 'login']);

// Halls & Tables
Route::match(['get', 'post'], '/get_halls.php', [LegacyApiController::class, 'getHalls']);
Route::match(['get', 'post'], '/get_halls', [LegacyApiController::class, 'getHalls']);
Route::match(['get', 'post'], '/get_tables.php', [LegacyApiController::class, 'getTables']);
Route::match(['get', 'post'], '/get_tables', [LegacyApiController::class, 'getTables']);
Route::match(['get', 'post'], '/table_management.php', [LegacyApiController::class, 'tableManagement']);

// Menu Catalog & Dishes
Route::match(['get', 'post'], '/get_categories.php', [LegacyApiController::class, 'getCategories']);
Route::match(['get', 'post'], '/get_categories', [LegacyApiController::class, 'getCategories']);
Route::match(['get', 'post'], '/get_products.php', [LegacyApiController::class, 'getProducts']);
Route::match(['get', 'post'], '/get_products', [LegacyApiController::class, 'getProducts']);
Route::match(['get', 'post'], '/get_dishes.php', [LegacyApiController::class, 'getProducts']);

// Order Creation & POS
Route::match(['get', 'post'], '/create_order_with_kitchen.php', [LegacyApiController::class, 'createOrder']);
Route::match(['get', 'post'], '/upload_order.php', [LegacyApiController::class, 'createOrder']);
Route::match(['get', 'post'], '/create_order', [LegacyApiController::class, 'createOrder']);

// Branch Management
Route::match(['get', 'post'], '/branch_management.php', [LegacyApiController::class, 'branchManagement']);

// POS Expenses & Day End
Route::match(['get', 'post'], '/get_expences.php', [LegacyApiController::class, 'getExpenses']);
Route::match(['get', 'post'], '/upload_expences.php', [LegacyApiController::class, 'saveExpense']);
Route::match(['get', 'post'], '/save_dayend.php', [LegacyApiController::class, 'saveDayEnd']);
Route::match(['get', 'post'], '/get_dayend_data.php', [LegacyApiController::class, 'saveDayEnd']);

// Menu Sales API
Route::match(['get', 'post'], '/get_menu_sales.php', [LegacyApiController::class, 'getMenuSales']);
Route::match(['get', 'post'], '/get_menu_sales', [LegacyApiController::class, 'getMenuSales']);

// Multi-Node Webhook Database Sync API
Route::post('/webhooks/db-sync', [\App\Http\Controllers\Api\WebhookSyncApiController::class, 'handleIncoming']);
Route::match(['get', 'post'], '/webhooks/ping', function () {
    return response()->json([
        'success' => true,
        'message' => 'Node webhook listener is online',
        'node_id' => \App\Services\WebhookSync\SyncContext::getNodeId(),
        'server_time' => now()->toIso8601String(),
    ]);
});

