@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ 
    showNewProductModal: false, 
    editProduct: null, 
    showTransferModal: false, 
    selectedItemForTransfer: null,
    submitEdit() {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/inventory/products/' + this.editProduct.id;
        form.style.display = 'none';

        const token = document.querySelector('input[name=_token]').value;
        const addField = (name, value) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value || '';
            form.appendChild(input);
        };

        addField('_token', token);
        addField('_method', 'PUT');
        addField('item_name', this.editProduct.item_name);
        addField('category', this.editProduct.category);
        addField('unit', this.editProduct.unit);
        addField('default_purchase_price', this.editProduct.default_purchase_price);
        addField('min_stock_alert', this.editProduct.min_stock_alert);
        addField('sku', this.editProduct.sku);

        document.body.appendChild(form);
        form.submit();
    }
}">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Purchasable Raw Products & Items</h1>
            <p class="text-slate-500 text-sm font-medium">Create & manage raw products to purchase, track Main Store stock, and monitor Kitchen Store balances</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
            <a href="{{ route('inventory.index') }}" class="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">
                📦 Stock Overview
            </a>
            <a href="{{ route('purchases.create') }}" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition">
                + Log Purchase Order
            </a>
            <button @click="showNewProductModal = true" class="px-5 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition">
                + Create Raw Product
            </button>
        </div>
    </div>

    <!-- Filters & Category Tabs -->
    <div class="bg-white p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            <a href="{{ route('inventory.products') }}" class="px-4 py-2 text-xs font-bold transition {{ !request('category') ? 'bg-[#026897] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200' }}">
                All Categories
            </a>
            @foreach($categories as $cat)
                <a href="{{ route('inventory.products', ['category' => $cat]) }}" class="px-4 py-2 text-xs font-bold transition {{ request('category') === $cat ? 'bg-[#026897] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200' }}">
                    {{ $cat }}
                </a>
            @endforeach
        </div>

        <form method="GET" action="{{ route('inventory.products') }}" class="w-full sm:w-64">
            <input type="text" name="search" value="{{ request('search') }}" placeholder="Search raw products..." class="w-full px-3 py-1.5 border border-slate-300 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0284c7]">
        </form>
    </div>

    <!-- Products Table -->
    <div class="bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                        <th class="py-4 px-6">Product Details</th>
                        <th class="py-4 px-6">Category</th>
                        <th class="py-4 px-6">Default Price</th>
                        <th class="py-4 px-6">Main Store Stock</th>
                        <th class="py-4 px-6">Kitchen Store Stock</th>
                        <th class="py-4 px-6">Min Alert</th>
                        <th class="py-4 px-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($products as $prod)
                    @php
                        $mainQty = $prod->mainStoreStock->quantity ?? 0;
                        $kitchenQty = $prod->kitchenStoreStocks->sum('quantity');
                        $totalAssetValue = ($mainQty + $kitchenQty) * ($prod->default_purchase_price ?? 0);
                    @endphp
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6">
                            <div class="font-extrabold text-slate-900 text-base">{{ $prod->item_name }}</div>
                            <div class="text-xs text-slate-400 font-mono">SKU: {{ $prod->sku ?? 'N/A' }} • Unit: {{ $prod->unit }}</div>
                        </td>
                        <td class="py-4 px-6">
                            <span class="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-800">{{ $prod->category ?? 'General' }}</span>
                        </td>
                        <td class="py-4 px-6 font-extrabold text-slate-900">
                            {{ number_format($prod->default_purchase_price, 2) }}
                        </td>
                        <td class="py-4 px-6">
                            <span class="font-black text-slate-900 text-base">{{ number_format($mainQty, 2) }}</span>
                            <span class="text-xs text-slate-500 font-bold ml-1">{{ $prod->unit }}</span>
                        </td>
                        <td class="py-4 px-6">
                            <span class="font-black text-orange-600 text-base">{{ number_format($kitchenQty, 2) }}</span>
                            <span class="text-xs text-slate-500 font-bold ml-1">{{ $prod->unit }}</span>
                            @if($prod->kitchenStoreStocks->count() > 0)
                                <div class="text-[10px] font-semibold text-slate-400 mt-0.5">
                                    @foreach($prod->kitchenStoreStocks as $kStock)
                                        {{ $kStock->kitchen_name }}: {{ number_format($kStock->quantity, 1) }} |
                                    @endforeach
                                </div>
                            @endif
                        </td>
                        <td class="py-4 px-6">
                            @if($mainQty <= $prod->min_stock_alert)
                                <span class="px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-800">⚠️ Low Stock ({{ number_format($prod->min_stock_alert, 1) }})</span>
                            @else
                                <span class="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800">OK (Min {{ number_format($prod->min_stock_alert, 1) }})</span>
                            @endif
                        </td>
                        <td class="py-4 px-6 text-right space-x-1.5">
                            <button @click="editProduct = {{ json_encode($prod) }}" class="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 border border-slate-200">Edit</button>
                            <form method="POST" action="{{ route('inventory.products.destroy', $prod->id) }}" class="inline" onsubmit="return confirm('Delete this product?')">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 border border-rose-200">Delete</button>
                            </form>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="7" class="py-12 text-center text-slate-400 font-medium">No purchasable raw products registered yet.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-slate-100">
            {{ $products->links() }}
        </div>
    </div>

    <!-- Create Raw Product Modal -->
    <div x-show="showNewProductModal" x-cloak class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4" @click.away="showNewProductModal = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-base font-extrabold text-slate-900">Create Purchasable Raw Product</h3>
                <button @click="showNewProductModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form method="POST" action="{{ route('inventory.products.store') }}" class="space-y-4">
                @csrf
                <input type="hidden" name="branch_id" value="{{ $branchId }}">
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Product / Ingredient Name *</label>
                    <input type="text" name="item_name" placeholder="Tea Leaves, Milk, Chicken, Mutton, Rice..." required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Category *</label>
                        <select name="category" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                            <option value="General">General</option>
                            <option value="Dairy">Dairy</option>
                            <option value="Meat & Poultry">Meat & Poultry</option>
                            <option value="Spices & Oils">Spices & Oils</option>
                            <option value="Beverages">Beverages</option>
                            <option value="Packaging">Packaging</option>
                            <option value="Dry Ration">Dry Ration</option>
                        </select>
                    </div>
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
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Default Price  *</label>
                        <input type="number" step="0.01" name="default_purchase_price" value="0.00" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Min Stock Alert *</label>
                        <input type="number" step="0.01" name="min_stock_alert" value="5.00" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">SKU / Item Code (Optional)</label>
                    <input type="text" name="sku" placeholder="RAW-001" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
                </div>
                <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" @click="showNewProductModal = false" class="px-4 py-2 border border-slate-200 text-xs font-bold">Cancel</button>
                    <button type="submit" class="px-5 py-2 bg-[#026897] text-white text-xs font-extrabold shadow-md">Create Product</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Product Modal -->
    <template x-if="editProduct">
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div class="bg-white max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4" @click.away="editProduct = null">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 class="text-base font-extrabold text-slate-900">Edit Purchasable Product</h3>
                    <button @click="editProduct = null" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                </div>
                <form method="POST" @submit.prevent="submitEdit()" class="space-y-4">
                    @csrf
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Product Name *</label>
                        <input type="text" name="item_name" x-model="editProduct.item_name" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Category *</label>
                            <input type="text" name="category" x-model="editProduct.category" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Unit of Measure *</label>
                            <input type="text" name="unit" x-model="editProduct.unit" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Default Price  *</label>
                            <input type="number" step="0.01" name="default_purchase_price" x-model="editProduct.default_purchase_price" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Min Stock Alert *</label>
                            <input type="number" step="0.01" name="min_stock_alert" x-model="editProduct.min_stock_alert" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">SKU / Item Code</label>
                        <input type="text" name="sku" x-model="editProduct.sku" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
                    </div>
                    <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" @click="editProduct = null" class="px-4 py-2 border border-slate-200 text-xs font-bold">Cancel</button>
                        <button type="submit" class="px-5 py-2 bg-[#026897] text-white text-xs font-extrabold shadow-md">Update Product</button>
                    </div>
                </form>
            </div>
        </div>
    </template>
</div>
@endsection
