<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('recipes')) {
            Schema::create('recipes', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('menu_item_id')->index();
                $table->unsignedBigInteger('inventory_item_id')->index();
                $table->decimal('quantity_required', 10, 4);
                $table->string('unit')->default('Units');
                $table->timestamps();

                $table->index(['menu_item_id', 'inventory_item_id'], 'idx_recipes_lookup');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('recipes');
    }
};
