<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SyncNode extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'node_url',
        'secret_token',
        'branch_id',
        'sync_models',
        'status',
        'last_ping_status',
        'last_ping_at',
        'last_synced_at',
        'last_error',
    ];

    protected $casts = [
        'sync_models' => 'array',
        'last_ping_at' => 'datetime',
        'last_synced_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(WebhookLog::class, 'node_id');
    }

    public function shouldSync(string $modelName): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        if (empty($this->sync_models) || in_array('*', $this->sync_models)) {
            return true;
        }

        return in_array($modelName, $this->sync_models);
    }
}
