<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->foreignId('hall_id')->nullable()->constrained('halls')->onDelete('set null');
            $table->foreignId('table_id')->nullable()->constrained('tables')->onDelete('set null');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->enum('order_type', ['Dine In', 'Take Away', 'Delivery'])->default('Dine In');
            $table->enum('order_status', ['Running', 'Preparing', 'Ready', 'Served', 'Completed', 'Cancelled'])->default('Running');
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('service_charge', 10, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('net_total', 10, 2)->default(0);
            $table->enum('payment_status', ['Unpaid', 'Paid', 'Refunded'])->default('Unpaid');
            $table->enum('payment_mode', ['Cash', 'Card', 'Online', 'Multiple'])->default('Cash');
            $table->text('comments')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
