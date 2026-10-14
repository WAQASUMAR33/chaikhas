<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kitchens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('code')->nullable();
            $table->foreignId('printer_id')->nullable()->constrained()->onDelete('set null');
            $table->string('status')->default('Active');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Seed default kitchens if branch exists
        $firstBranch = \Illuminate\Support\Facades\DB::table('branches')->first();
        if ($firstBranch) {
            \Illuminate\Support\Facades\DB::table('kitchens')->insert([
                ['branch_id' => $firstBranch->id, 'name' => 'Main Kitchen', 'code' => 'K-MAIN', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
                ['branch_id' => $firstBranch->id, 'name' => 'BBQ & Grill Station', 'code' => 'K-BBQ', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
                ['branch_id' => $firstBranch->id, 'name' => 'Beverages & Chai Bar', 'code' => 'K-BAR', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('kitchens');
    }
};
