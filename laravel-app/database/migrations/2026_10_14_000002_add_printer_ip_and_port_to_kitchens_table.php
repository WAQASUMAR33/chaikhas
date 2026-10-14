<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kitchens', function (Blueprint $table) {
            if (!Schema::hasColumn('kitchens', 'printer_ip')) {
                $table->string('printer_ip')->nullable()->after('printer_id');
            }
            if (!Schema::hasColumn('kitchens', 'printer_port')) {
                $table->integer('printer_port')->default(9100)->nullable()->after('printer_ip');
            }
        });
    }

    public function down(): void
    {
        Schema::table('kitchens', function (Blueprint $table) {
            if (Schema::hasColumn('kitchens', 'printer_ip')) {
                $table->dropColumn('printer_ip');
            }
            if (Schema::hasColumn('kitchens', 'printer_port')) {
                $table->dropColumn('printer_port');
            }
        });
    }
};
