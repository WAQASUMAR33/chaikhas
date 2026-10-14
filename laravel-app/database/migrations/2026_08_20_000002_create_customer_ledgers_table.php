<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('customer_ledgers')) {
            Schema::create('customer_ledgers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('customer_id')->index();
                $table->unsignedBigInteger('branch_id')->nullable()->index();
                $table->unsignedBigInteger('order_id')->nullable()->index();
                $table->enum('type', ['debit', 'credit']);
                $table->decimal('amount', 12, 2);
                $table->decimal('balance', 12, 2);
                $table->string('description')->nullable();
                $table->string('reference_no')->nullable();
                $table->timestamps();

                $table->index(['customer_id', 'branch_id'], 'idx_customer_ledgers_lookup');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_ledgers');
    }
};
