<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('vendor_ledgers')) {
            Schema::create('vendor_ledgers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('vendor_id')->index();
                $table->unsignedBigInteger('branch_id')->nullable()->index();
                $table->unsignedBigInteger('purchase_id')->nullable()->index();
                $table->enum('type', ['bill', 'payment']);
                $table->decimal('amount', 12, 2);
                $table->decimal('balance', 12, 2);
                $table->string('payment_method')->nullable();
                $table->string('notes')->nullable();
                $table->timestamps();

                $table->index(['vendor_id', 'branch_id'], 'idx_vendor_ledgers_lookup');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_ledgers');
    }
};
