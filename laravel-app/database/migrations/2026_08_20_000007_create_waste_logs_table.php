<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('waste_logs')) {
            Schema::create('waste_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('branch_id')->index();
                $table->enum('store_type', ['Main Store', 'Kitchen Store'])->default('Main Store');
                $table->unsignedBigInteger('inventory_item_id')->index();
                $table->decimal('quantity', 10, 4);
                $table->decimal('cost_price', 10, 2);
                $table->decimal('total_loss', 10, 2);
                $table->string('reason');
                $table->unsignedBigInteger('logged_by')->nullable()->index();
                $table->timestamps();

                $table->index(['branch_id', 'store_type'], 'idx_waste_logs_lookup');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('waste_logs');
    }
};
