<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('day_ends', function (Blueprint $table) {
            $table->decimal('gross_sales', 12, 2)->default(0)->after('opening_cash');
            $table->decimal('total_discount', 12, 2)->default(0)->after('gross_sales');
            $table->decimal('total_service_charges', 12, 2)->default(0)->after('total_discount');
            $table->decimal('total_tax', 12, 2)->default(0)->after('total_service_charges');

            $table->decimal('cash_sales', 12, 2)->default(0)->after('total_sales');
            $table->decimal('card_sales', 12, 2)->default(0)->after('cash_sales');
            $table->decimal('online_sales', 12, 2)->default(0)->after('card_sales');
            $table->decimal('other_sales', 12, 2)->default(0)->after('online_sales');

            $table->integer('total_orders')->default(0)->after('other_sales');
            $table->integer('completed_orders')->default(0)->after('total_orders');
            $table->integer('cancelled_orders')->default(0)->after('completed_orders');

            $table->decimal('dine_in_sales', 12, 2)->default(0)->after('cancelled_orders');
            $table->integer('dine_in_count')->default(0)->after('dine_in_sales');
            $table->decimal('takeaway_sales', 12, 2)->default(0)->after('dine_in_count');
            $table->integer('takeaway_count')->default(0)->after('takeaway_sales');
            $table->decimal('delivery_sales', 12, 2)->default(0)->after('takeaway_count');
            $table->integer('delivery_count')->default(0)->after('delivery_sales');

            $table->decimal('expected_cash', 12, 2)->default(0)->after('total_expenses');
            $table->decimal('actual_cash', 12, 2)->default(0)->after('expected_cash');
            $table->decimal('cash_difference', 12, 2)->default(0)->after('actual_cash');

            $table->json('details')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('day_ends', function (Blueprint $table) {
            $table->dropColumn([
                'gross_sales',
                'total_discount',
                'total_service_charges',
                'total_tax',
                'cash_sales',
                'card_sales',
                'online_sales',
                'other_sales',
                'total_orders',
                'completed_orders',
                'cancelled_orders',
                'dine_in_sales',
                'dine_in_count',
                'takeaway_sales',
                'takeaway_count',
                'delivery_sales',
                'delivery_count',
                'expected_cash',
                'actual_cash',
                'cash_difference',
                'details',
            ]);
        });
    }
};
