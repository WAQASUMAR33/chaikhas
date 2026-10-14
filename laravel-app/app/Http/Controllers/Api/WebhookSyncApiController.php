<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WebhookSync\WebhookReceiver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookSyncApiController extends Controller
{
    /**
     * Handle incoming database sync webhook from remote nodes.
     */
    public function handleIncoming(Request $request): JsonResponse
    {
        $payload = $request->all();
        $signature = $request->header('X-Webhook-Signature');
        $sourceNode = $request->header('X-Webhook-Source-Node');

        $result = WebhookReceiver::handle($payload, $signature, $sourceNode);

        return response()->json($result, $result['code'] ?? 200);
    }
}
