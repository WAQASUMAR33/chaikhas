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
        Schema::table('order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items', 'kitchen_status')) {
                $table->string('kitchen_status', 50)->default('Pending')->after('total_amount');
            }
            if (!Schema::hasColumn('order_items', 'notes')) {
                $table->text('notes')->nullable()->after('kitchen_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasColumn('order_items', 'kitchen_status')) {
                $table->dropColumn('kitchen_status');
            }
            if (Schema::hasColumn('order_items', 'notes')) {
                $table->dropColumn('notes');
            }
        });
    }
};
