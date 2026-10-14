<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix categories table
        DB::statement("ALTER TABLE categories MODIFY kitchen_id INT NULL DEFAULT NULL");
        DB::statement("ALTER TABLE categories MODIFY terminal INT NULL DEFAULT 1");
        DB::statement("ALTER TABLE categories MODIFY branch_id INT NULL DEFAULT NULL");

        // Fix menu_items table
        DB::statement("ALTER TABLE menu_items MODIFY category_id INT NULL DEFAULT NULL");
        DB::statement("ALTER TABLE menu_items MODIFY barcode VARCHAR(50) NULL DEFAULT NULL");
        DB::statement("ALTER TABLE menu_items MODIFY discount INT NULL DEFAULT 0");
        DB::statement("ALTER TABLE menu_items MODIFY terminal INT NULL DEFAULT 1");
        DB::statement("ALTER TABLE menu_items MODIFY branch_id INT NULL DEFAULT NULL");

        // Fix order_items table menu_item_id nullability
        DB::statement("ALTER TABLE order_items MODIFY menu_item_id BIGINT UNSIGNED NULL DEFAULT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reversal needed
    }
};
