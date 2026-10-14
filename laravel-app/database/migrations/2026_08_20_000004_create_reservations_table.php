<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('reservations')) {
            Schema::create('reservations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('branch_id')->index();
                $table->unsignedBigInteger('table_id')->nullable()->index();
                $table->string('customer_name');
                $table->string('customer_phone');
                $table->date('reservation_date');
                $table->string('time_slot');
                $table->integer('guest_count')->default(1);
                $table->decimal('deposit_amount', 10, 2)->default(0);
                $table->enum('status', ['Pending', 'Confirmed', 'Seated', 'Cancelled'])->default('Confirmed');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['branch_id', 'reservation_date', 'status'], 'idx_reservations_lookup');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
