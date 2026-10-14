<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('order_payments')) {
            Schema::create('order_payments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('order_id')->index();
                $table->string('payment_method')->default('Cash');
                $table->decimal('amount', 10, 2);
                $table->string('reference_no')->nullable();
                $table->timestamps();

                $table->index(['order_id', 'payment_method'], 'idx_order_payments_lookup');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('order_payments');
    }
};
