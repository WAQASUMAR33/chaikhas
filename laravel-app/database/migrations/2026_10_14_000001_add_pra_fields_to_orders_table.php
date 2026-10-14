<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'pra_invoice_number')) {
                $table->string('pra_invoice_number')->nullable()->after('payment_mode');
            }
            if (!Schema::hasColumn('orders', 'pra_qr_code')) {
                $table->text('pra_qr_code')->nullable()->after('pra_invoice_number');
            }
            if (!Schema::hasColumn('orders', 'pra_status')) {
                $table->string('pra_status')->nullable()->after('pra_qr_code');
            }
            if (!Schema::hasColumn('orders', 'pra_response')) {
                $table->text('pra_response')->nullable()->after('pra_status');
            }
            if (!Schema::hasColumn('orders', 'pra_sent_at')) {
                $table->timestamp('pra_sent_at')->nullable()->after('pra_response');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $cols = ['pra_invoice_number', 'pra_qr_code', 'pra_status', 'pra_response', 'pra_sent_at'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('orders', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
