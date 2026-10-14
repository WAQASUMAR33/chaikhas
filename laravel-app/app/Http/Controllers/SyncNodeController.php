<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\SyncNode;
use App\Models\WebhookLog;
use App\Services\WebhookSync\SyncContext;
use App\Services\WebhookSync\WebhookDispatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SyncNodeController extends Controller
{
    /**
     * Display listing of sync nodes and recent logs.
     */
    public function index(Request $request)
    {
        $nodes = SyncNode::with('branch')
            ->withCount(['logs as successful_logs_count' => function ($q) {
                $q->where('status', 'success');
            }])
            ->withCount(['logs as failed_logs_count' => function ($q) {
                $q->where('status', 'failed');
            }])
            ->latest()
            ->get();

        $logs = WebhookLog::with('node')
            ->latest()
            ->paginate(25);

        $branches = Branch::all();
        $currentNodeId = SyncContext::getNodeId();

        $stats = [
            'total_nodes' => $nodes->count(),
            'active_nodes' => $nodes->where('status', 'active')->count(),
            'total_dispatches' => WebhookLog::count(),
            'success_rate' => WebhookLog::count() > 0 
                ? round((WebhookLog::where('status', 'success')->count() / WebhookLog::count()) * 100, 1) 
                : 100,
        ];

        return view('sync_nodes.index', compact('nodes', 'logs', 'branches', 'currentNodeId', 'stats'));
    }

    /**
     * Store a newly created sync node.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'node_url' => 'required|url|max:255',
            'secret_token' => 'nullable|string|max:128',
            'branch_id' => 'nullable|exists:branches,id',
            'sync_models' => 'nullable|array',
            'status' => 'required|in:active,inactive',
        ]);

        if (empty($validated['secret_token'])) {
            $validated['secret_token'] = Str::random(48);
        }

        if (empty($validated['sync_models'])) {
            $validated['sync_models'] = ['*'];
        }

        SyncNode::create($validated);

        return redirect()->route('sync-nodes.index')
            ->with('success', 'Sync Node added successfully.');
    }

    /**
     * Update an existing sync node.
     */
    public function update(Request $request, SyncNode $syncNode)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'node_url' => 'required|url|max:255',
            'secret_token' => 'nullable|string|max:128',
            'branch_id' => 'nullable|exists:branches,id',
            'sync_models' => 'nullable|array',
            'status' => 'required|in:active,inactive',
        ]);

        if (!empty($validated['secret_token'])) {
            $syncNode->secret_token = $validated['secret_token'];
        }

        $syncNode->name = $validated['name'];
        $syncNode->node_url = $validated['node_url'];
        $syncNode->branch_id = $validated['branch_id'];
        $syncNode->sync_models = $validated['sync_models'] ?? ['*'];
        $syncNode->status = $validated['status'];
        $syncNode->save();

        return redirect()->route('sync-nodes.index')
            ->with('success', 'Sync Node updated successfully.');
    }

    /**
     * Delete a sync node.
     */
    public function destroy(SyncNode $syncNode)
    {
        $syncNode->delete();

        return redirect()->route('sync-nodes.index')
            ->with('success', 'Sync Node deleted successfully.');
    }

    /**
     * Test ping connectivity to a node.
     */
    public function ping(SyncNode $syncNode)
    {
        $result = WebhookDispatcher::pingNode($syncNode);

        if ($result['success']) {
            return response()->json([
                'success' => true,
                'message' => 'Node connection successful! Response: ' . json_encode($result['body']),
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Node ping failed: ' . ($result['error'] ?? 'HTTP ' . $result['status']),
        ], 500);
    }

    /**
     * Retry a failed webhook log.
     */
    public function retryLog(WebhookLog $webhookLog)
    {
        if ($webhookLog->direction !== 'outgoing' || !$webhookLog->node) {
            return back()->with('error', 'Cannot retry incoming or orphaned webhook.');
        }

        $result = WebhookDispatcher::sendToNode($webhookLog->node, $webhookLog->payload);

        if ($result['success']) {
            return back()->with('success', 'Webhook re-dispatched successfully.');
        }

        return back()->with('error', 'Webhook re-dispatch failed: ' . ($result['error'] ?? 'HTTP ' . $result['status']));
    }
}
