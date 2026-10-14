<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'name')) {
                $table->string('name')->nullable()->after('id');
            }
            if (!Schema::hasColumn('users', 'email')) {
                $table->string('email')->nullable()->after('username');
            }
        });

        DB::statement("ALTER TABLE users MODIFY fullname VARCHAR(255) NULL");
        DB::statement("ALTER TABLE users MODIFY role VARCHAR(100) DEFAULT 'branch_admin'");
        DB::statement("ALTER TABLE users MODIFY status VARCHAR(50) DEFAULT 'Active'");
        DB::statement("ALTER TABLE users MODIFY token VARCHAR(255) NULL");
        DB::statement("ALTER TABLE users MODIFY terminal INT NULL DEFAULT 1");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reversal needed
    }
};
