@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="purchaseForm()">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Log Main Store Purchase Order</h1>
            <p class="text-slate-500 text-sm font-medium">Record raw inventory inward receipts directly into Main Store stock</p>
        </div>
        <a href="{{ route('purchases.index') }}" class="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm">
            ← Back to Purchases
        </a>
    </div>

    <form method="POST" action="{{ route('purchases.store') }}" class="space-y-6">
        @csrf
        <input type="hidden" name="branch_id" value="{{ $branchId }}">

        <!-- Purchase Info -->
        <div class="bg-white p-6 border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Vendor / Supplier *</label>
                <select name="vendor_id" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-800">
                    <option value="">-- Choose Vendor --</option>
                    @foreach($vendors as $vendor)
                        <option value="{{ $vendor->id }}">{{ $vendor->name }} ({{ $vendor->phone ?? 'No Phone' }})</option>
                    @endforeach
                </select>
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Purchase Date *</label>
                <input type="date" name="purchase_date" value="{{ date('Y-m-d') }}" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Invoice Number (Optional)</label>
                <input type="text" name="invoice_number" placeholder="INV-89102" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Payment Status *</label>
                <select name="payment_status" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                </select>
            </div>
        </div>

        <!-- Items Table -->
        <div class="bg-white border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-base font-extrabold text-slate-900">Purchase Order Line Items</h3>
                <button type="button" @click="addItem()" class="px-4 py-1.5 bg-slate-900 text-white font-bold text-xs">+ Add Raw Item Line</button>
            </div>

            <div class="space-y-3">
                <template x-for="(line, index) in items" :key="index">
                    <div class="grid grid-cols-12 gap-3 items-center bg-slate-50 p-3 border border-slate-200">
                        <div class="col-span-5">
                            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Select Raw Material / Ingredient *</label>
                            <select :name="'items[' + index + '][inventory_item_id]'" x-model="line.inventory_item_id" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white">
                                <option value="">-- Select Inventory Item --</option>
                                @foreach($inventoryItems as $raw)
                                    <option value="{{ $raw->id }}">{{ $raw->item_name }} (Unit: {{ $raw->unit }})</option>
                                @endforeach
                            </select>
                        </div>

                        <div class="col-span-3">
                            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Quantity Received *</label>
                            <input type="number" step="0.01" :name="'items[' + index + '][quantity]'" x-model.number="line.quantity" placeholder="Qty" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white">
                        </div>

                        <div class="col-span-3">
                            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Unit Cost  *</label>
                            <input type="number" step="0.01" :name="'items[' + index + '][unit_cost]'" x-model.number="line.unit_cost" placeholder="Unit Price" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white">
                        </div>

                        <div class="col-span-1 text-right pt-4">
                            <button type="button" @click="removeItem(index)" class="text-rose-600 font-extrabold text-sm p-1">✕</button>
                        </div>
                    </div>
                </template>
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                    <span class="text-xs font-bold text-slate-500 uppercase">Estimated Grand Total:</span>
                    <span class="text-xl font-black text-emerald-600 ml-2"><span x-text="calculateTotal().toFixed(2)"></span></span>
                </div>

                <button type="submit" class="px-6 py-3 bg-[#026897] hover:bg-[#01547b] text-white font-extrabold text-sm shadow-md">
                    Submit & Receive into Main Store
                </button>
            </div>
        </div>
    </form>
</div>

<script>
function purchaseForm() {
    return {
        items: [
            { inventory_item_id: '', quantity: 1, unit_cost: 0 }
        ],
        addItem() {
            this.items.push({ inventory_item_id: '', quantity: 1, unit_cost: 0 });
        },
        removeItem(index) {
            if (this.items.length > 1) {
                this.items.splice(index, 1);
            }
        },
        calculateTotal() {
            return this.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0);
        }
    }
}
</script>
@endsection
