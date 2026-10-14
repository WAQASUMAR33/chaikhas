<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('order_items', 'cancelled_quantity')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->integer('cancelled_quantity')->default(0)->after('quantity');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('order_items', 'cancelled_quantity')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropColumn('cancelled_quantity');
            });
        }
    }
};
