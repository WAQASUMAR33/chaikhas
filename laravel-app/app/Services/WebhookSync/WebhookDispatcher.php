<?php

namespace App\Services\WebhookSync;

use App\Models\SyncNode;
use App\Models\WebhookLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WebhookDispatcher
{
    /**
     * Dispatch database change to all active sync nodes.
     */
    public static function dispatchModelChange(Model $model, string $event): void
    {
        // Prevent infinite loops when applying incoming sync
        if (SyncContext::$isSyncing) {
            return;
        }

        $modelName = class_basename($model);

        // Fetch all active nodes
        try {
            $nodes = SyncNode::where('status', 'active')->get();
        } catch (\Throwable $e) {
            return;
        }

        if ($nodes->isEmpty()) {
            return;
        }

        $syncId = (string) Str::uuid();
        $sourceNode = SyncContext::getNodeId();

        $payload = [
            'sync_id' => $syncId,
            'event' => $event, // created, updated, deleted
            'model' => $modelName,
            'model_id' => $model->getKey(),
            'data' => $event === 'deleted' ? ['id' => $model->getKey()] : $model->getAttributes(),
            'source_node' => $sourceNode,
            'timestamp' => now()->toIso8601String(),
        ];

        foreach ($nodes as $node) {
            if (!$node->shouldSync($modelName)) {
                continue;
            }

            static::sendToNode($node, $payload);
        }
    }

    /**
     * Send payload to a specific node with HMAC signature.
     */
    public static function sendToNode(SyncNode $node, array $payload): array
    {
        // Prevent deadlock when node_url is the same local server instance running single-threaded php artisan serve
        $currentHost = request()->getHttpHost();
        $nodeHost = parse_url($node->node_url, PHP_URL_HOST);
        $nodePort = parse_url($node->node_url, PHP_URL_PORT);
        $nodeAuthority = $nodePort ? "{$nodeHost}:{$nodePort}" : $nodeHost;

        if ($nodeAuthority === $currentHost || 
            ($nodeHost === '127.0.0.1' && str_contains($currentHost, '127.0.0.1')) || 
            ($nodeHost === 'localhost' && str_contains($currentHost, 'localhost')) ||
            (str_contains($node->node_url, '127.0.0.1:8000') && str_contains($currentHost, '8000'))) {
            return [
                'success' => true,
                'status' => 200,
                'message' => 'Skipped self loopback webhook to prevent single-threaded server deadlock.',
            ];
        }

        $jsonPayload = json_encode($payload);
        $signature = hash_hmac('sha256', $jsonPayload, $node->secret_token);

        $log = WebhookLog::create([
            'sync_id' => $payload['sync_id'],
            'node_id' => $node->id,
            'direction' => 'outgoing',
            'event' => $payload['event'],
            'model_name' => $payload['model'],
            'model_id' => $payload['model_id'] ?? null,
            'payload' => $payload,
            'status' => 'pending',
            'attempt' => 1,
        ]);

        try {
            $response = Http::timeout(4)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'X-Webhook-Signature' => $signature,
                    'X-Webhook-Source-Node' => $payload['source_node'],
                    'X-Webhook-Sync-Id' => $payload['sync_id'],
                    'X-Webhook-Model' => $payload['model'],
                    'X-Webhook-Event' => $payload['event'],
                ])
                ->post($node->node_url, $payload);

            $httpStatus = $response->status();
            $isSuccess = $response->successful();

            $log->update([
                'http_status' => $httpStatus,
                'status' => $isSuccess ? 'success' : 'failed',
                'error_message' => $isSuccess ? null : Str::limit($response->body(), 500),
            ]);

            if ($isSuccess) {
                $node->update([
                    'last_synced_at' => now(),
                    'last_ping_status' => 'online',
                    'last_ping_at' => now(),
                    'last_error' => null,
                ]);
            } else {
                $node->update([
                    'last_error' => 'HTTP ' . $httpStatus . ': ' . Str::limit($response->body(), 200),
                ]);
            }

            return [
                'success' => $isSuccess,
                'status' => $httpStatus,
                'body' => $response->json() ?? $response->body(),
            ];
        } catch (\Throwable $e) {
            $log->update([
                'http_status' => null,
                'status' => 'failed',
                'error_message' => Str::limit($e->getMessage(), 500),
            ]);

            $node->update([
                'last_error' => Str::limit($e->getMessage(), 200),
                'last_ping_status' => 'unreachable',
                'last_ping_at' => now(),
            ]);

            Log::warning("Webhook sync failed to node {$node->name} ({$node->node_url}): " . $e->getMessage());

            return [
                'success' => false,
                'status' => 0,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Send ping / health check to node.
     */
    public static function pingNode(SyncNode $node): array
    {
        $payload = [
            'sync_id' => (string) Str::uuid(),
            'event' => 'ping',
            'model' => 'System',
            'model_id' => 0,
            'data' => [
                'sender' => SyncContext::getNodeId(),
                'message' => 'Node connection ping test',
                'time' => now()->toIso8601String(),
            ],
            'source_node' => SyncContext::getNodeId(),
            'timestamp' => now()->toIso8601String(),
        ];

        return static::sendToNode($node, $payload);
    }
}
