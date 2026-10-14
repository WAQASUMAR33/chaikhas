<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('attendances')) {
            Schema::create('attendances', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->index();
                $table->unsignedBigInteger('branch_id')->index();
                $table->date('date');
                $table->time('clock_in')->nullable();
                $table->time('clock_out')->nullable();
                $table->enum('status', ['Present', 'Absent', 'Late', 'Leave'])->default('Present');
                $table->string('notes')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'date'], 'uniq_user_attendance_date');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
