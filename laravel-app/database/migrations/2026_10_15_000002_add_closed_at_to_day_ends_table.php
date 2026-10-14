<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('day_ends', 'closed_at')) {
            Schema::table('day_ends', function (Blueprint $table) {
                $table->timestamp('closed_at')->nullable()->after('closing_cash');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('day_ends', 'closed_at')) {
            Schema::table('day_ends', function (Blueprint $table) {
                $table->dropColumn('closed_at');
            });
        }
    }
};
