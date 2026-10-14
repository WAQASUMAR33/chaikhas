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
        Schema::create('sync_nodes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('node_url');
            $table->string('secret_token', 128);
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->json('sync_models')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->string('last_ping_status', 32)->nullable();
            $table->timestamp('last_ping_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();
        });

        Schema::create('webhook_logs', function (Blueprint $table) {
            $table->id();
            $table->string('sync_id', 64)->index();
            $table->foreignId('node_id')->nullable()->constrained('sync_nodes')->nullOnDelete();
            $table->enum('direction', ['outgoing', 'incoming'])->default('outgoing');
            $table->string('event', 32); // created, updated, deleted, ping
            $table->string('model_name', 64)->nullable();
            $table->unsignedBigInteger('model_id')->nullable();
            $table->longText('payload')->nullable();
            $table->integer('http_status')->nullable();
            $table->enum('status', ['success', 'failed', 'pending'])->default('pending');
            $table->text('error_message')->nullable();
            $table->integer('attempt')->default(1);
            $table->timestamps();

            $table->index(['model_name', 'model_id']);
            $table->index(['direction', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('webhook_logs');
        Schema::dropIfExists('sync_nodes');
    }
};
