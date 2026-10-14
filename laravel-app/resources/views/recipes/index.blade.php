@extends('layouts.app')

@section('content')
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Recipe Bill of Materials (BOM)</h1>
            <p class="text-slate-500 text-sm font-medium">Configure raw ingredient recipes for menu items to automate stock deduction upon sales</p>
        </div>
    </div>

    <!-- Dish Selector Form -->
    <div class="bg-white p-5 border border-slate-200 shadow-sm">
        <form method="GET" action="{{ route('recipes.index') }}" class="flex items-end gap-4">
            <div class="flex-1">
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Select Menu Item / Dish</label>
                <select name="menu_item_id" onchange="this.form.submit()" class="w-full px-4 py-2 border border-slate-300 text-sm font-bold text-slate-800">
                    <option value="">-- Choose Menu Item --</option>
                    @foreach($menuItems as $item)
                        <option value="{{ $item->id }}" {{ (string)$menuItemId === (string)$item->id ? 'selected' : '' }}>
                            {{ $item->name }} ({{ number_format($item->price, 2) }})
                        </option>
                    @endforeach
                </select>
            </div>
            <button type="submit" class="px-5 py-2 bg-slate-900 text-white font-bold text-sm shadow-md hover:bg-slate-800">Load Recipe</button>
        </form>
    </div>

    @if($selectedMenuItem)
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Add / Edit Ingredients Form -->
        <div class="lg:col-span-1 bg-white p-5 border border-slate-200 shadow-sm">
            <h3 class="text-base font-bold text-slate-900 mb-3">Add Ingredient to Recipe</h3>
            <form method="POST" action="{{ route('recipes.store') }}" class="space-y-4">
                @csrf
                <input type="hidden" name="menu_item_id" value="{{ $selectedMenuItem->id }}">

                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Raw Inventory Ingredient</label>
                    <select name="ingredients[0][inventory_item_id]" required class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
                        <option value="">-- Select Inventory Item --</option>
                        @foreach($inventoryItems as $inv)
                            <option value="{{ $inv->id }}">{{ $inv->item_name }} (Unit: {{ $inv->unit }})</option>
                        @endforeach
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Qty per Portion</label>
                        <input type="number" step="0.0001" name="ingredients[0][quantity_required]" required placeholder="0.250" class="w-full px-3 py-2 border border-slate-300 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Unit</label>
                        <input type="text" name="ingredients[0][unit]" required value="Kg" placeholder="Kg / Ltr / Pcs" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
                    </div>
                </div>

                <button type="submit" class="w-full py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition">
                    + Save Recipe Line
                </button>
            </form>
        </div>

        <!-- Ingredient List Table -->
        <div class="lg:col-span-2 bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 bg-slate-50 border-b border-slate-200">
                <h3 class="font-extrabold text-slate-900 text-base">Configured Ingredients for {{ $selectedMenuItem->name }}</h3>
            </div>
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-400 bg-slate-100/50">
                        <th class="py-3 px-4">Raw Ingredient</th>
                        <th class="py-3 px-4">Qty per Dish</th>
                        <th class="py-3 px-4">Unit</th>
                        <th class="py-3 px-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($recipes as $rec)
                    <tr>
                        <td class="py-3 px-4 font-extrabold text-slate-900">{{ $rec->inventoryItem->item_name ?? 'Unknown' }}</td>
                        <td class="py-3 px-4 font-bold text-orange-600">{{ number_format($rec->quantity_required, 4) }}</td>
                        <td class="py-3 px-4">{{ $rec->unit }}</td>
                        <td class="py-3 px-4 text-right">
                            <form method="POST" action="{{ route('recipes.destroy', $rec->id) }}" onsubmit="return confirm('Remove ingredient from recipe?')">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="text-xs font-bold text-rose-600 hover:underline">Remove</button>
                            </form>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="4" class="py-8 text-center text-slate-400 font-medium">No ingredients added to this dish recipe yet. Select an ingredient above to configure.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
    @endif
</div>
@endsection
