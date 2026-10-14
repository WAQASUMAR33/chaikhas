<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('permissions')->nullable()->after('role');
        });

        // Grant all permissions to existing users or default super_admin
        $allModules = [
            'pos', 'orders', 'kitchen_kds', 'kitchen_setup',
            'inventory_products', 'inventory_stock', 'inventory_transfers',
            'purchases', 'vendors', 'halls_tables', 'menu_catalog',
            'expenses', 'dayend', 'reports', 'branches', 'users'
        ];

        \Illuminate\Support\Facades\DB::table('users')->update([
            'permissions' => json_encode($allModules)
        ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('permissions');
        });
    }
};
