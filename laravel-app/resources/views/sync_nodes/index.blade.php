@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{
    showAddModal: false,
    editNode: null,
    viewPayload: null,
    pingingNodeId: null,
    pingMessage: '',
    pingSuccess: false,
    copyEndpoint() {
        navigator.clipboard.writeText('{{ url('/api/webhooks/db-sync') }}');
        alert('Incoming webhook endpoint copied to clipboard!');
    },
    async pingNode(nodeId, url) {
        this.pingingNodeId = nodeId;
        this.pingMessage = '';
        try {
            let res = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': '{{ csrf_token() }}',
                    'Accept': 'application/json'
                }
            });
            let data = await res.json();
            this.pingSuccess = data.success;
            this.pingMessage = data.message;
            setTimeout(() => { location.reload(); }, 1500);
        } catch (e) {
            this.pingSuccess = false;
            this.pingMessage = 'Network error or timeout connecting to node.';
        } finally {
            this.pingingNodeId = null;
        }
    }
}">

    <!-- Alert Messages -->
    @if(session('success'))
        <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-sm shadow-2xs">
            <span class="flex items-center gap-2">
                <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                {{ session('success') }}
            </span>
            <button @click="$el.parentElement.remove()" class="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
        </div>
    @endif
    @if(session('error'))
        <div class="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-sm shadow-2xs">
            <span class="flex items-center gap-2">
                <svg class="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                {{ session('error') }}
            </span>
            <button @click="$el.parentElement.remove()" class="text-rose-600 hover:text-rose-900 font-bold">✕</button>
        </div>
    @endif

    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <div>
                    <h1 class="text-xl font-extrabold text-slate-900 tracking-tight">Multi-Node Database Webhook Sync</h1>
                    <p class="text-xs text-slate-500 font-medium">Replicate live database changes automatically across local POS terminals, branch nodes, and cloud servers.</p>
                </div>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-semibold border border-slate-200">
                    Node ID: <strong class="text-purple-700">{{ $currentNodeId }}</strong>
                </span>
                <span class="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-mono font-semibold border border-purple-200 flex items-center gap-1.5">
                    <span>Webhook Receiver:</span>
                    <code class="text-slate-800">{{ url('/api/webhooks/db-sync') }}</code>
                    <button @click="copyEndpoint()" class="hover:text-purple-900 cursor-pointer ml-1" title="Copy endpoint">
                        📋
                    </button>
                </span>
            </div>
        </div>
        <div class="flex items-center gap-2.5">
            <button @click="showAddModal = true" class="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>Add Node Destination</span>
            </button>
        </div>
    </div>

    <!-- Live Ping Banner Alert -->
    <template x-if="pingMessage">
        <div :class="pingSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'" class="p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-2xs">
            <span x-text="pingMessage"></span>
            <button @click="pingMessage = ''" class="font-bold">✕</button>
        </div>
    </template>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Nodes</div>
            <div class="mt-1 text-2xl font-black text-slate-800">{{ $stats['total_nodes'] }}</div>
            <div class="text-[11px] text-slate-500 mt-1">Configured endpoints</div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Nodes</div>
            <div class="mt-1 text-2xl font-black text-emerald-600">{{ $stats['active_nodes'] }}</div>
            <div class="text-[11px] text-emerald-700 mt-1">Listening for DB events</div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Dispatches</div>
            <div class="mt-1 text-2xl font-black text-indigo-600">{{ number_format($stats['total_dispatches']) }}</div>
            <div class="text-[11px] text-slate-500 mt-1">Live webhook packets</div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Success Rate</div>
            <div class="mt-1 text-2xl font-black text-purple-600">{{ $stats['success_rate'] }}%</div>
            <div class="text-[11px] text-slate-500 mt-1">Transmission reliability</div>
        </div>
    </div>

    <!-- Registered Nodes Section -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 class="font-bold text-sm text-slate-800">Connected Nodes & Webhook Targets</h2>
            <span class="text-xs text-slate-400 font-medium">{{ $nodes->count() }} Registered</span>
        </div>

        @if($nodes->isEmpty())
            <div class="p-12 text-center">
                <div class="w-12 h-12 rounded-full bg-purple-50 text-purple-600 mx-auto flex items-center justify-center mb-3">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <h3 class="text-sm font-bold text-slate-800">No Sync Nodes Registered</h3>
                <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">Add other branch servers or POS terminals to begin broadcasting live database changes (Orders, Menu, Tables, Inventory, Customers) across all nodes.</p>
                <button @click="showAddModal = true" class="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition">
                    + Register First Node
                </button>
            </div>
        @else
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                        <tr>
                            <th class="px-6 py-3">Node Name & Target</th>
                            <th class="px-4 py-3">Branch</th>
                            <th class="px-4 py-3">Status & Health</th>
                            <th class="px-4 py-3">Models Filter</th>
                            <th class="px-4 py-3">Last Sync</th>
                            <th class="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                        @foreach($nodes as $node)
                        <tr class="hover:bg-slate-50/70 transition">
                            <td class="px-6 py-4">
                                <div class="font-bold text-slate-900 text-sm">{{ $node->name }}</div>
                                <div class="font-mono text-[11px] text-slate-500 truncate max-w-xs mt-0.5" title="{{ $node->node_url }}">
                                    {{ $node->node_url }}
                                </div>
                                @if($node->last_error)
                                    <div class="mt-1 text-[11px] text-rose-600 font-mono truncate max-w-xs" title="{{ $node->last_error }}">
                                        ⚠️ {{ $node->last_error }}
                                    </div>
                                @endif
                            </td>
                            <td class="px-4 py-4">
                                @if($node->branch)
                                    <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                                        {{ $node->branch->branch_name }}
                                    </span>
                                @else
                                    <span class="text-slate-400 text-xs">All Branches</span>
                                @endif
                            </td>
                            <td class="px-4 py-4">
                                <div class="flex items-center gap-2">
                                    @if($node->status === 'active')
                                        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Active
                                        </span>
                                    @else
                                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                            Inactive
                                        </span>
                                    @endif

                                    @if($node->last_ping_status === 'online')
                                        <span class="text-[11px] text-emerald-600 font-semibold" title="Last checked {{ $node->last_ping_at?->diffForHumans() }}">
                                            ● Online
                                        </span>
                                    @elseif($node->last_ping_status)
                                        <span class="text-[11px] text-rose-600 font-semibold" title="Last checked {{ $node->last_ping_at?->diffForHumans() }}">
                                            ● {{ ucfirst($node->last_ping_status) }}
                                        </span>
                                    @endif
                                </div>
                            </td>
                            <td class="px-4 py-4">
                                @if(empty($node->sync_models) || in_array('*', $node->sync_models))
                                    <span class="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-extrabold uppercase">
                                        All Models (*)
                                    </span>
                                @else
                                    <span class="text-xs text-slate-600 font-mono">
                                        {{ count($node->sync_models) }} models
                                    </span>
                                @endif
                            </td>
                            <td class="px-4 py-4 text-xs text-slate-500">
                                @if($node->last_synced_at)
                                    <div>{{ $node->last_synced_at->diffForHumans() }}</div>
                                    <div class="text-[10px] text-slate-400">{{ $node->last_synced_at->format('M d, H:i') }}</div>
                                @else
                                    <span class="text-slate-400">Never</span>
                                @endif
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-1.5">
                                    <!-- Test Ping Button -->
                                    <button @click="pingNode({{ $node->id }}, '{{ route('sync-nodes.ping', $node) }}')"
                                            :disabled="pingingNodeId === {{ $node->id }}"
                                            class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                            title="Send Ping Test">
                                        <span x-show="pingingNodeId !== {{ $node->id }}">⚡ Ping</span>
                                        <span x-show="pingingNodeId === {{ $node->id }}">Testing...</span>
                                    </button>

                                    <!-- Edit Button -->
                                    <button @click="editNode = {{ json_encode($node) }}" class="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition" title="Edit">
                                        ✏️
                                    </button>

                                    <!-- Delete Button -->
                                    <form action="{{ route('sync-nodes.destroy', $node) }}" method="POST" onsubmit="return confirm('Remove this sync node destination?');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" title="Delete">
                                            🗑️
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif
    </div>

    <!-- Live Webhook Activity Logs Table -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
                <h2 class="font-bold text-sm text-slate-800">Live Database Webhook Sync Logs</h2>
                <p class="text-xs text-slate-400">Real-time audit trail of outgoing dispatches and incoming applied changes.</p>
            </div>
            <button onclick="location.reload()" class="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition">
                ↻ Refresh
            </button>
        </div>

        @if($logs->isEmpty())
            <div class="p-8 text-center text-xs text-slate-400 font-semibold">
                No webhook events recorded yet. Changes will appear here automatically when orders, menu items, or inventory records are modified.
            </div>
        @else
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                        <tr>
                            <th class="px-6 py-3">Time</th>
                            <th class="px-4 py-3">Direction</th>
                            <th class="px-4 py-3">Event & Target Model</th>
                            <th class="px-4 py-3">Destination / Node</th>
                            <th class="px-4 py-3">HTTP Status</th>
                            <th class="px-4 py-3">Result</th>
                            <th class="px-6 py-3 text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium text-slate-700 font-mono">
                        @foreach($logs as $log)
                        <tr class="hover:bg-slate-50/70 transition">
                            <td class="px-6 py-3 text-slate-500 text-[11px]">
                                {{ $log->created_at->format('H:i:s') }}
                                <span class="text-slate-400 block text-[10px]">{{ $log->created_at->diffForHumans() }}</span>
                            </td>
                            <td class="px-4 py-3">
                                @if($log->direction === 'outgoing')
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        ⬆ OUTGOING
                                    </span>
                                @else
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        ⬇ INCOMING
                                    </span>
                                @endif
                            </td>
                            <td class="px-4 py-3">
                                <span class="font-bold text-slate-900">{{ $log->model_name }}</span>
                                <span class="text-slate-500">#{{ $log->model_id }}</span>
                                <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ml-1 {{ $log->event === 'created' ? 'bg-emerald-100 text-emerald-800' : ($log->event === 'updated' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800') }}">
                                    {{ strtoupper($log->event) }}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-slate-600 text-xs font-sans">
                                {{ $log->node->name ?? 'Incoming' }}
                            </td>
                            <td class="px-4 py-3">
                                @if($log->http_status)
                                    <span class="font-bold {{ $log->http_status >= 200 && $log->http_status < 300 ? 'text-emerald-600' : 'text-rose-600' }}">
                                        {{ $log->http_status }}
                                    </span>
                                @else
                                    <span class="text-slate-400">-</span>
                                @endif
                            </td>
                            <td class="px-4 py-3">
                                @if($log->status === 'success')
                                    <span class="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                                        ✓ Success
                                    </span>
                                @else
                                    <span class="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]" title="{{ $log->error_message }}">
                                        ✕ Failed
                                    </span>
                                @endif
                            </td>
                            <td class="px-6 py-3 text-right font-sans">
                                <div class="flex items-center justify-end gap-1.5">
                                    <button @click="viewPayload = {{ json_encode($log->payload) }}" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition cursor-pointer">
                                        Payload
                                    </button>
                                    @if($log->status === 'failed' && $log->direction === 'outgoing' && $log->node)
                                        <form action="{{ route('webhook-logs.retry', $log) }}" method="POST">
                                            @csrf
                                            <button type="submit" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-bold transition cursor-pointer" title="Retry dispatch">
                                                Retry
                                            </button>
                                        </form>
                                    @endif
                                </div>
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            <div class="p-4 border-t border-slate-100">
                {{ $logs->links() }}
            </div>
        @endif
    </div>

    <!-- Add Node Modal -->
    <div x-show="showAddModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" x-cloak>
        <div @click.away="showAddModal = false" class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 class="font-bold text-base text-slate-800">Add New Sync Node Destination</h3>
                <button @click="showAddModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form action="{{ route('sync-nodes.store') }}" method="POST" class="mt-4 space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Node Name *</label>
                    <input type="text" name="name" required placeholder="e.g. Branch 2 Main POS Server" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Node Webhook Endpoint URL *</label>
                    <input type="url" name="node_url" required placeholder="e.g. http://192.168.1.50:8000/api/webhooks/db-sync" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                    <p class="text-[10px] text-slate-400 mt-1">Target server must accept POST requests at this URL.</p>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Secret Token (HMAC Authentication)</label>
                    <input type="text" name="secret_token" placeholder="Leave blank to generate automatic 48-char secure token" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Associated Branch</label>
                        <select name="branch_id" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                            <option value="">All Branches</option>
                            @foreach($branches as $b)
                                <option value="{{ $b->id }}">{{ $b->branch_name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Status</label>
                        <select name="status" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                            <option value="active">Active (Listening)</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button type="button" @click="showAddModal = false" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition">
                        Cancel
                    </button>
                    <button type="submit" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                        Save Node
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Node Modal -->
    <div x-show="editNode" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" x-cloak>
        <div @click.away="editNode = null" class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 class="font-bold text-base text-slate-800">Edit Sync Node</h3>
                <button @click="editNode = null" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form :action="'/sync-nodes/' + (editNode ? editNode.id : '')" method="POST" class="mt-4 space-y-4">
                @csrf
                @method('PUT')
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Node Name *</label>
                    <input type="text" name="name" x-model="editNode.name" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Node Webhook Endpoint URL *</label>
                    <input type="url" name="node_url" x-model="editNode.node_url" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Secret Token</label>
                    <input type="text" name="secret_token" x-model="editNode.secret_token" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Associated Branch</label>
                        <select name="branch_id" x-model="editNode.branch_id" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                            <option value="">All Branches</option>
                            @foreach($branches as $b)
                                <option value="{{ $b->id }}">{{ $b->branch_name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Status</label>
                        <select name="status" x-model="editNode.status" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                            <option value="active">Active (Listening)</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button type="button" @click="editNode = null" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition">
                        Cancel
                    </button>
                    <button type="submit" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                        Update Node
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- View Payload Modal -->
    <div x-show="viewPayload" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" x-cloak>
        <div @click.away="viewPayload = null" class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[80vh] flex flex-col">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="font-bold text-sm text-slate-800">Webhook JSON Payload</h3>
                <button @click="viewPayload = null" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <div class="mt-4 flex-1 overflow-auto bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono">
                <pre x-text="JSON.stringify(viewPayload, null, 2)"></pre>
            </div>
            <div class="pt-4 mt-2 border-t border-slate-100 flex justify-end">
                <button @click="viewPayload = null" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold">
                    Close
                </button>
            </div>
        </div>
    </div>
</div>
@endsection
