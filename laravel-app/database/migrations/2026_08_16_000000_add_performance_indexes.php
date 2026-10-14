<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private function addIndexSafely(string $tableName, array $columns, string $indexName): void
    {
        try {
            Schema::table($tableName, function (Blueprint $table) use ($columns, $indexName) {
                $table->index($columns, $indexName);
            });
        } catch (\Throwable $e) {
            // Index already exists or duplicate key error; ignore safely
        }
    }

    private function dropIndexSafely(string $tableName, string $indexName): void
    {
        try {
            Schema::table($tableName, function (Blueprint $table) use ($indexName) {
                $table->dropIndex($indexName);
            });
        } catch (\Throwable $e) {
            // Ignore if index doesn't exist
        }
    }

    public function up(): void
    {
        $this->addIndexSafely('orders', ['branch_id', 'order_status'], 'idx_orders_branch_status');
        $this->addIndexSafely('orders', ['branch_id', 'created_at'], 'idx_orders_branch_created');
        $this->addIndexSafely('orders', ['order_status', 'created_at'], 'idx_orders_status_created');

        $this->addIndexSafely('order_items', ['order_id', 'kitchen_status'], 'idx_order_items_order_kitchen');
        $this->addIndexSafely('order_items', ['menu_item_id'], 'idx_order_items_menu_item');

        $this->addIndexSafely('expenses', ['branch_id', 'expense_date'], 'idx_expenses_branch_date');

        $this->addIndexSafely('purchases', ['branch_id', 'purchase_date'], 'idx_purchases_branch_date');

        $this->addIndexSafely('menu_items', ['branch_id', 'category_id', 'status', 'is_available'], 'idx_menu_items_lookup');

        $this->addIndexSafely('tables', ['branch_id', 'hall_id', 'status'], 'idx_tables_lookup');

        $this->addIndexSafely('main_store_stocks', ['branch_id', 'inventory_item_id'], 'idx_main_stocks_lookup');

        $this->addIndexSafely('kitchen_store_stocks', ['branch_id', 'inventory_item_id'], 'idx_kitchen_stocks_lookup');
    }

    public function down(): void
    {
        $this->dropIndexSafely('orders', 'idx_orders_branch_status');
        $this->dropIndexSafely('orders', 'idx_orders_branch_created');
        $this->dropIndexSafely('orders', 'idx_orders_status_created');

        $this->dropIndexSafely('order_items', 'idx_order_items_order_kitchen');
        $this->dropIndexSafely('order_items', 'idx_order_items_menu_item');

        $this->dropIndexSafely('expenses', 'idx_expenses_branch_date');

        $this->dropIndexSafely('purchases', 'idx_purchases_branch_date');

        $this->dropIndexSafely('menu_items', 'idx_menu_items_lookup');

        $this->dropIndexSafely('tables', 'idx_tables_lookup');

        $this->dropIndexSafely('main_store_stocks', 'idx_main_stocks_lookup');

        $this->dropIndexSafely('kitchen_store_stocks', 'idx_kitchen_stocks_lookup');
    }
};
