<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('settings')) {
            Schema::create('settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique();
                $table->text('value')->nullable();
                $table->timestamps();
            });

            // Default settings
            DB::table('settings')->insert([
                ['key' => 'service_charge_percentage', 'value' => '5', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'restaurant_name', 'value' => 'Chai Khas Restaurant', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'currency_symbol', 'value' => 'PKR', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
