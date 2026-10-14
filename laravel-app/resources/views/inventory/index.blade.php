@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ activeTab: 'main_store', showTransferModal: false, showReturnModal: false, showNewItemModal: false }">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Store & Kitchen Stock Management</h1>
            <p class="text-slate-500 text-sm font-medium">Manage Main Store stock, Kitchen-wise stock, stock transfers & stock returns</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
            <a href="{{ route('inventory.logs') }}" class="px-4 py-2.5 bg-slate-900 text-white font-bold text-sm shadow-sm hover:bg-slate-800 transition">
                📋 Audit Activity Logs
            </a>
            <button @click="showTransferModal = true" class="px-4 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition">
                ➡️ Transfer to Kitchen
            </button>
            <button @click="showReturnModal = true" class="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md transition">
                ↩️ Stock Return to Main
            </button>
            <button @click="showNewItemModal = true" class="px-4 py-2.5 bg-slate-100 text-slate-800 font-bold text-sm hover:bg-slate-200 transition">
                + Register Raw Item
            </button>
        </div>
    </div>

    <!-- Store Tabs -->
    <div class="border-b border-slate-200 flex gap-4">
        <button @click="activeTab = 'main_store'"
                :class="activeTab === 'main_store' ? 'border-b-2 border-orange-600 text-orange-600 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-bold'"
                class="py-3 px-2 text-sm transition">
            📦 Main Store Stock
        </button>
        <button @click="activeTab = 'kitchen_store'"
                :class="activeTab === 'kitchen_store' ? 'border-b-2 border-orange-600 text-orange-600 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-bold'"
                class="py-3 px-2 text-sm transition">
            🍳 Kitchen Store Stock (Kitchen-Wise)
        </button>
    </div>

    <!-- Tab 1: Main Store Stock Table -->
    <div x-show="activeTab === 'main_store'" class="bg-white border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                        <th class="py-4 px-6">Raw Item Name</th>
                        <th class="py-4 px-6">SKU / Code</th>
                        <th class="py-4 px-6">Unit</th>
                        <th class="py-4 px-6">Main Store Balance</th>
                        <th class="py-4 px-6">Avg Unit Cost</th>
                        <th class="py-4 px-6">Alert Level</th>
                        <th class="py-4 px-6 text-right">Quick Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($mainStoreStocks as $stock)
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6 font-extrabold text-slate-900">{{ $stock->item->item_name ?? '-' }}</td>
                        <td class="py-4 px-6 text-slate-500 font-mono text-xs">{{ $stock->item->sku ?? '-' }}</td>
                        <td class="py-4 px-6 font-bold text-slate-700">{{ $stock->item->unit ?? 'kg' }}</td>
                        <td class="py-4 px-6 font-black text-slate-900 text-base">
                            {{ number_format($stock->quantity, 2) }} {{ $stock->item->unit ?? '' }}
                        </td>
                        <td class="py-4 px-6 font-extrabold text-slate-900">{{ number_format($stock->avg_unit_cost, 2) }}</td>
                        <td class="py-4 px-6">
                            @if($stock->quantity <= ($stock->item->min_stock_alert ?? 5))
                                <span class="px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-800">Low Stock Alert!</span>
                            @else
                                <span class="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800">Optimal</span>
                            @endif
                        </td>
                        <td class="py-4 px-6 text-right">
                            <button @click="showTransferModal = true" class="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 border border-orange-200">Transfer →</button>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="7" class="py-12 text-center text-slate-400 font-medium">No items registered in Main Store.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <!-- Tab 2: Kitchen Store Stock Table (Kitchen-Wise) -->
    <div x-show="activeTab === 'kitchen_store'" x-cloak class="bg-white border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                        <th class="py-4 px-6">Kitchen / Station Name</th>
                        <th class="py-4 px-6">Raw Item Name</th>
                        <th class="py-4 px-6">Unit</th>
                        <th class="py-4 px-6">Kitchen Store Balance</th>
                        <th class="py-4 px-6 text-right">Quick Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($kitchenStoreStocks as $kStock)
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6 font-extrabold text-slate-900">
                            <span class="px-2.5 py-1 bg-slate-900 text-white text-xs font-bold">{{ $kStock->kitchen_name }}</span>
                        </td>
                        <td class="py-4 px-6 font-extrabold text-slate-900">{{ $kStock->item->item_name ?? '-' }}</td>
                        <td class="py-4 px-6 font-bold text-slate-700">{{ $kStock->item->unit ?? 'kg' }}</td>
                        <td class="py-4 px-6 font-black text-orange-600 text-base">
                            {{ number_format($kStock->quantity, 2) }} {{ $kStock->item->unit ?? '' }}
                        </td>
                        <td class="py-4 px-6 text-right">
                            <button @click="showReturnModal = true" class="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 border border-amber-200">Return to Main ↩️</button>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="5" class="py-12 text-center text-slate-400 font-medium">No stock currently issued to Kitchen Stores.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <!-- Transfer Stock to Kitchen Modal -->
    <div x-show="showTransferModal" x-cloak class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4" @click.away="showTransferModal = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-base font-extrabold text-slate-900">➡️ Transfer Stock (Main Store → Kitchen)</h3>
                <button @click="showTransferModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form method="POST" action="{{ route('inventory.transfer') }}" class="space-y-4">
                @csrf
                <input type="hidden" name="branch_id" value="{{ $branchId }}">
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Target Kitchen / Station *</label>
                    <input type="text" name="kitchen_name" value="Main Kitchen" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Select Raw Material *</label>
                    <select name="inventory_item_id" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white">
                        <option value="">-- Select Item --</option>
                        @foreach($inventoryItems as $raw)
                            <option value="{{ $raw->id }}">{{ $raw->item_name }} (Unit: {{ $raw->unit }})</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Quantity to Issue *</label>
                    <input type="number" step="0.01" name="quantity" required placeholder="0.00" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Notes / Remarks</label>
                    <textarea name="notes" rows="2" placeholder="Daily morning issue..." class="w-full p-2 border border-slate-300 text-xs font-medium"></textarea>
                </div>
                <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" @click="showTransferModal = false" class="px-4 py-2 border border-slate-200 text-xs font-bold">Cancel</button>
                    <button type="submit" class="px-5 py-2 bg-[#026897] text-white text-xs font-extrabold shadow-md">Confirm Transfer</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Stock Return from Kitchen to Main Store Modal -->
    <div x-show="showReturnModal" x-cloak class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4" @click.away="showReturnModal = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-base font-extrabold text-slate-900">↩️ Stock Return (Kitchen → Main Store)</h3>
                <button @click="showReturnModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form method="POST" action="{{ route('inventory.return') }}" class="space-y-4">
                @csrf
                <input type="hidden" name="branch_id" value="{{ $branchId }}">
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Returning Kitchen / Station *</label>
                    <input type="text" name="kitchen_name" value="Main Kitchen" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Select Raw Material *</label>
                    <select name="inventory_item_id" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white">
                        <option value="">-- Select Item --</option>
                        @foreach($inventoryItems as $raw)
                            <option value="{{ $raw->id }}">{{ $raw->item_name }} (Unit: {{ $raw->unit }})</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Quantity Returning *</label>
                    <input type="number" step="0.01" name="quantity" required placeholder="0.00" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Reason / Return Notes</label>
                    <textarea name="notes" rows="2" placeholder="Unused shift balance returned..." class="w-full p-2 border border-slate-300 text-xs font-medium"></textarea>
                </div>
                <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" @click="showReturnModal = false" class="px-4 py-2 border border-slate-200 text-xs font-bold">Cancel</button>
                    <button type="submit" class="px-5 py-2 bg-amber-600 text-white text-xs font-extrabold shadow-md">Confirm Stock Return</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Register New Item Modal -->
    <div x-show="showNewItemModal" x-cloak class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4" @click.away="showNewItemModal = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-base font-extrabold text-slate-900">Register Raw Material / Ingredient</h3>
                <button @click="showNewItemModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form method="POST" action="{{ route('inventory.item.store') }}" class="space-y-4">
                @csrf
                <input type="hidden" name="branch_id" value="{{ $branchId }}">
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Raw Material Name *</label>
                    <input type="text" name="item_name" placeholder="Tea Leaves, Milk, Sugar, Flour, Chicken..." required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Unit of Measure *</label>
                        <select name="unit" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                            <option value="kg">kg (Kilogram)</option>
                            <option value="liter">liter (Litre)</option>
                            <option value="pc">pc (Piece)</option>
                            <option value="pack">pack (Pack)</option>
                            <option value="bag">bag (Bag)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Min Alert Level</label>
                        <input type="number" step="0.01" name="min_stock_alert" value="5.00" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">SKU / Code (Optional)</label>
                    <input type="text" name="sku" placeholder="RAW-TEA-01" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
                </div>
                <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" @click="showNewItemModal = false" class="px-4 py-2 border border-slate-200 text-xs font-bold">Cancel</button>
                    <button type="submit" class="px-5 py-2 bg-slate-900 text-white text-xs font-extrabold shadow-md">Register Item</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
