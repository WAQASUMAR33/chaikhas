<?php

namespace App\Services\WebhookSync;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Customer;
use App\Models\CustomerLedger;
use App\Models\DayEnd;
use App\Models\Expense;
use App\Models\Hall;
use App\Models\InventoryItem;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Reservation;
use App\Models\Rider;
use App\Models\Setting;
use App\Models\SyncNode;
use App\Models\Table;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorLedger;
use App\Models\WebhookLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WebhookReceiver
{
    /**
     * Map model names to their fully qualified class names.
     */
    protected static array $modelMap = [
        'Order' => Order::class,
        'OrderItem' => OrderItem::class,
        'MenuItem' => MenuItem::class,
        'Category' => Category::class,
        'Table' => Table::class,
        'Hall' => Hall::class,
        'Branch' => Branch::class,
        'InventoryItem' => InventoryItem::class,
        'Expense' => Expense::class,
        'Customer' => Customer::class,
        'CustomerLedger' => CustomerLedger::class,
        'Vendor' => Vendor::class,
        'VendorLedger' => VendorLedger::class,
        'Reservation' => Reservation::class,
        'Rider' => Rider::class,
        'DayEnd' => DayEnd::class,
        'Setting' => Setting::class,
        'User' => User::class,
    ];

    /**
     * Process an incoming database webhook payload.
     */
    public static function handle(array $payload, ?string $signature, ?string $sourceNode): array
    {
        $syncId = $payload['sync_id'] ?? null;
        $event = $payload['event'] ?? null;
        $modelName = $payload['model'] ?? null;
        $modelId = $payload['model_id'] ?? null;
        $data = $payload['data'] ?? [];

        if (!$syncId || !$event) {
            return [
                'success' => false,
                'message' => 'Invalid webhook payload structure',
                'code' => 400,
            ];
        }

        // Handle ping health check
        if ($event === 'ping') {
            return [
                'success' => true,
                'message' => 'Node ping received and acknowledged',
                'node_id' => SyncContext::getNodeId(),
                'server_time' => now()->toIso8601String(),
                'code' => 200,
            ];
        }

        // Verify HMAC signature against matching node secret or global secret
        $isValidSignature = static::verifySignature($payload, $signature, $sourceNode);
        if (!$isValidSignature) {
            Log::warning("Incoming webhook signature verification failed from {$sourceNode}");
            return [
                'success' => false,
                'message' => 'Invalid or missing webhook signature',
                'code' => 401,
            ];
        }

        // Idempotency check: if this sync_id was already successfully applied, return OK
        $existingLog = WebhookLog::where('sync_id', $syncId)
            ->where('direction', 'incoming')
            ->where('status', 'success')
            ->first();

        if ($existingLog) {
            return [
                'success' => true,
                'message' => 'Payload already applied (idempotent)',
                'sync_id' => $syncId,
                'code' => 200,
            ];
        }

        // Resolve Model Class
        $modelClass = static::$modelMap[$modelName] ?? null;
        if (!$modelClass || !class_exists($modelClass)) {
            return [
                'success' => false,
                'message' => "Unsupported sync model: {$modelName}",
                'code' => 422,
            ];
        }

        // Execute in safe SyncContext (prevents outgoing echo / loop)
        return SyncContext::runWithoutBroadcasting(function () use ($syncId, $event, $modelClass, $modelName, $modelId, $data, $payload, $sourceNode) {
            DB::beginTransaction();
            try {
                if ($event === 'deleted') {
                    $deleted = $modelClass::where('id', $modelId)->delete();
                    $actionTaken = 'deleted';
                } elseif ($event === 'created' || $event === 'updated') {
                    // Update or create record with provided attributes
                    if (isset($data['id'])) {
                        $model = $modelClass::firstOrNew(['id' => $data['id']]);
                    } else {
                        $model = new $modelClass();
                    }

                    // Fill attributes safely (only columns that exist in the target table)
                    $tableColumns = \Illuminate\Support\Facades\Schema::getColumnListing($model->getTable());
                    $filteredData = array_intersect_key($data, array_flip($tableColumns));

                    $model->forceFill($filteredData);
                    $model->save();
                    $actionTaken = $model->wasRecentlyCreated ? 'created' : 'updated';
                } else {
                    $actionTaken = 'ignored';
                }

                DB::commit();

                // Log successful incoming webhook
                WebhookLog::create([
                    'sync_id' => $syncId,
                    'direction' => 'incoming',
                    'event' => $event,
                    'model_name' => $modelName,
                    'model_id' => $modelId,
                    'payload' => $payload,
                    'http_status' => 200,
                    'status' => 'success',
                ]);

                return [
                    'success' => true,
                    'message' => "Live change applied successfully ({$actionTaken})",
                    'model' => $modelName,
                    'id' => $modelId,
                    'action' => $actionTaken,
                    'code' => 200,
                ];
            } catch (\Throwable $e) {
                DB::rollBack();

                WebhookLog::create([
                    'sync_id' => $syncId,
                    'direction' => 'incoming',
                    'event' => $event,
                    'model_name' => $modelName,
                    'model_id' => $modelId,
                    'payload' => $payload,
                    'http_status' => 500,
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                ]);

                Log::error("Failed to apply incoming webhook for {$modelName} #{$modelId}: " . $e->getMessage());

                return [
                    'success' => false,
                    'message' => 'Failed to apply change: ' . $e->getMessage(),
                    'code' => 500,
                ];
            }
        });
    }

    /**
     * Verify HMAC-SHA256 signature against any active node's secret token.
     */
    protected static function verifySignature(array $payload, ?string $signature, ?string $sourceNode): bool
    {
        if (empty($signature)) {
            return false;
        }

        $rawJson = json_encode($payload);

        // 1. Try global configured webhook secret
        $globalSecret = env('WEBHOOK_SECRET_KEY');
        if ($globalSecret && hash_equals(hash_hmac('sha256', $rawJson, $globalSecret), $signature)) {
            return true;
        }

        // 2. Try tokens from registered active SyncNodes
        $tokens = SyncNode::where('status', 'active')->pluck('secret_token');
        foreach ($tokens as $token) {
            if ($token && hash_equals(hash_hmac('sha256', $rawJson, $token), $signature)) {
                return true;
            }
        }

        return false;
    }
}
