<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Vendors / Suppliers
        Schema::create('vendors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('status')->default('Active');
            $table->timestamps();
        });

        // 2. Inventory Items Catalog (Raw Materials & Ingredients)
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('item_name');
            $table->string('sku')->nullable();
            $table->string('unit')->default('kg'); // kg, liter, pc, pack, bag, etc.
            $table->decimal('min_stock_alert', 12, 2)->default(5.00);
            $table->timestamps();
        });

        // 3. Main Store Stock
        Schema::create('main_store_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('inventory_item_id')->constrained()->onDelete('cascade');
            $table->decimal('quantity', 12, 2)->default(0.00);
            $table->decimal('avg_unit_cost', 12, 2)->default(0.00);
            $table->timestamps();
        });

        // 4. Kitchen Store Stock (per kitchen/station)
        Schema::create('kitchen_store_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('kitchen_name')->default('Main Kitchen');
            $table->foreignId('inventory_item_id')->constrained()->onDelete('cascade');
            $table->decimal('quantity', 12, 2)->default(0.00);
            $table->timestamps();
        });

        // 5. Purchases (Main Store Inward Orders from Vendors)
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('vendor_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // added_by
            $table->string('po_number')->unique();
            $table->string('invoice_number')->nullable();
            $table->date('purchase_date');
            $table->decimal('total_amount', 12, 2)->default(0.00);
            $table->string('payment_status')->default('Paid'); // Paid, Unpaid, Partial
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 6. Purchase Line Items
        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->onDelete('cascade');
            $table->foreignId('inventory_item_id')->constrained()->onDelete('cascade');
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_cost', 12, 2);
            $table->decimal('total_cost', 12, 2);
            $table->timestamps();
        });

        // 7. Stock Transfers & Returns (Main Store <-> Kitchen Store)
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // added_by
            $table->string('type'); // TRANSFER_TO_KITCHEN, RETURN_TO_MAIN
            $table->string('kitchen_name')->default('Main Kitchen');
            $table->foreignId('inventory_item_id')->constrained()->onDelete('cascade');
            $table->decimal('quantity', 12, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 8. Comprehensive Inventory Audit & Activity Logs
        Schema::create('inventory_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // added_by
            $table->string('action_type'); // PURCHASE, TRANSFER_TO_KITCHEN, RETURN_TO_MAIN, ADJUSTMENT
            $table->foreignId('inventory_item_id')->constrained()->onDelete('cascade');
            $table->string('kitchen_name')->nullable();
            $table->string('store_type'); // MAIN_STORE, KITCHEN_STORE
            $table->decimal('quantity_change', 12, 2);
            $table->decimal('previous_qty', 12, 2)->default(0.00);
            $table->decimal('new_qty', 12, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_activity_logs');
        Schema::dropIfExists('stock_transfers');
        Schema::dropIfExists('purchase_items');
        Schema::dropIfExists('purchases');
        Schema::dropIfExists('kitchen_store_stocks');
        Schema::dropIfExists('main_store_stocks');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('vendors');
    }
};
