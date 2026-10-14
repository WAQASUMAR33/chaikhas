<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('categories', 'image')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->string('image')->nullable()->after('description');
            });
        }

        if (!Schema::hasColumn('menu_items', 'image')) {
            Schema::table('menu_items', function (Blueprint $table) {
                $table->string('image')->nullable()->after('description');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('categories', 'image')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->dropColumn('image');
            });
        }

        if (Schema::hasColumn('menu_items', 'image')) {
            Schema::table('menu_items', function (Blueprint $table) {
                $table->dropColumn('image');
            });
        }
    }
};
