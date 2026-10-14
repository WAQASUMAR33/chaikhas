<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'sync_id',
        'node_id',
        'direction',
        'event',
        'model_name',
        'model_id',
        'payload',
        'http_status',
        'status',
        'error_message',
        'attempt',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function node(): BelongsTo
    {
        return $this->belongsTo(SyncNode::class, 'node_id');
    }
}
