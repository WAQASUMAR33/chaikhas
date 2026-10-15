<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function addIndexSafely(string $tableName, array $columns, string $indexName): void
    {
        try {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($columns, $indexName) {
                    $table->index($columns, $indexName);
                });
            }
        } catch (\Throwable $e) {
            // Index already exists or duplicate key error; ignore safely
        }
    }

    private function dropIndexSafely(string $tableName, string $indexName): void
    {
        try {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($indexName) {
                    $table->dropIndex($indexName);
                });
            }
        } catch (\Throwable $e) {
            // Ignore if index doesn't exist
        }
    }

    public function up(): void
    {
        $this->addIndexSafely('customers', ['phone'], 'idx_customers_phone');
        $this->addIndexSafely('orders', ['customer_phone'], 'idx_orders_customer_phone');
        $this->addIndexSafely('orders', ['rider_id'], 'idx_orders_rider_id');
        $this->addIndexSafely('customer_ledgers', ['customer_id', 'created_at'], 'idx_cust_ledgers_cust_date');
        $this->addIndexSafely('vendor_ledgers', ['vendor_id', 'created_at'], 'idx_vendor_ledgers_vend_date');
        $this->addIndexSafely('reservations', ['branch_id', 'reservation_date', 'status'], 'idx_reservations_lookup');
        $this->addIndexSafely('attendances', ['branch_id', 'date'], 'idx_attendances_branch_date');
        $this->addIndexSafely('recipes', ['menu_item_id'], 'idx_recipes_menu_item');
    }

    public function down(): void
    {
        $this->dropIndexSafely('customers', 'idx_customers_phone');
        $this->dropIndexSafely('orders', 'idx_orders_customer_phone');
        $this->dropIndexSafely('orders', 'idx_orders_rider_id');
        $this->dropIndexSafely('customer_ledgers', 'idx_cust_ledgers_cust_date');
        $this->dropIndexSafely('vendor_ledgers', 'idx_vendor_ledgers_vend_date');
        $this->dropIndexSafely('reservations', 'idx_reservations_lookup');
        $this->dropIndexSafely('attendances', 'idx_attendances_branch_date');
        $this->dropIndexSafely('recipes', 'idx_recipes_menu_item');
    }
};
