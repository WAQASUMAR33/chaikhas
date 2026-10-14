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
        DB::statement("ALTER TABLE orders MODIFY comments TEXT NULL");
        DB::statement("ALTER TABLE orders MODIFY customer_name VARCHAR(255) NULL");
        DB::statement("ALTER TABLE orders MODIFY customer_phone VARCHAR(255) NULL");
        DB::statement("ALTER TABLE orders MODIFY hall_id BIGINT UNSIGNED NULL");
        DB::statement("ALTER TABLE orders MODIFY table_id BIGINT UNSIGNED NULL");
        DB::statement("ALTER TABLE orders MODIFY user_id BIGINT UNSIGNED NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reversal required
    }
};
