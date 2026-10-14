<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (!Schema::hasColumn('customers', 'loyalty_points')) {
                $table->integer('loyalty_points')->default(0)->after('phone');
            }
            if (!Schema::hasColumn('customers', 'credit_limit')) {
                $table->decimal('credit_limit', 12, 2)->default(0)->after('loyalty_points');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'points_earned')) {
                $table->integer('points_earned')->default(0)->after('net_total');
            }
            if (!Schema::hasColumn('orders', 'points_redeemed')) {
                $table->integer('points_redeemed')->default(0)->after('points_earned');
            }
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'loyalty_points')) {
                $table->dropColumn('loyalty_points');
            }
            if (Schema::hasColumn('customers', 'credit_limit')) {
                $table->dropColumn('credit_limit');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'points_earned')) {
                $table->dropColumn('points_earned');
            }
            if (Schema::hasColumn('orders', 'points_redeemed')) {
                $table->dropColumn('points_redeemed');
            }
        });
    }
};
