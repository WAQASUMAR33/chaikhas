<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('riders')) {
            Schema::create('riders', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('branch_id')->nullable()->index();
                $table->string('name');
                $table->string('phone');
                $table->string('vehicle_no')->nullable();
                $table->enum('status', ['Active', 'Inactive', 'On Delivery'])->default('Active');
                $table->timestamps();
            });
        }

        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'rider_id')) {
                $table->unsignedBigInteger('rider_id')->nullable()->after('table_id')->index();
            }
            if (!Schema::hasColumn('orders', 'delivery_status')) {
                $table->enum('delivery_status', ['Pending', 'Assigned', 'Out for Delivery', 'Delivered'])->nullable()->after('order_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'rider_id')) {
                $table->dropColumn('rider_id');
            }
            if (Schema::hasColumn('orders', 'delivery_status')) {
                $table->dropColumn('delivery_status');
            }
        });
        Schema::dropIfExists('riders');
    }
};
