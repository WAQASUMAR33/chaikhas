<?php

namespace App\Services\WebhookSync;

class SyncContext
{
    /**
     * Flag indicating whether current execution is applying an incoming sync.
     * Prevents infinite recursive webhook loops across nodes.
     */
    public static bool $isSyncing = false;

    /**
     * Get unique identifier for this node.
     */
    public static function getNodeId(): string
    {
        return config('app.node_id', env('NODE_IDENTIFIER', 'node-' . substr(md5(gethostname() . config('app.key')), 0, 8)));
    }

    /**
     * Execute a callback within sync context (suppresses outgoing webhooks).
     */
    public static function runWithoutBroadcasting(callable $callback)
    {
        $previousState = static::$isSyncing;
        static::$isSyncing = true;
        try {
            return $callback();
        } finally {
            static::$isSyncing = $previousState;
        }
    }
}
