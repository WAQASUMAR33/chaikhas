@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ 
    showCreateModal: false, 
    editKitchen: null,
    submitEdit() {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/kitchens/' + this.editKitchen.id;
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
        addField('name', this.editKitchen.name);
        addField('code', this.editKitchen.code);
        addField('status', this.editKitchen.status);
        addField('printer_id', this.editKitchen.printer_id);
        addField('description', this.editKitchen.description);

        document.body.appendChild(form);
        form.submit();
    }
}">

    @if(session('success'))
    <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-between">
        <span>{{ session('success') }}</span>
        <button @click="$el.parentElement.remove()" class="text-emerald-600 hover:text-emerald-900">&times;</button>
    </div>
    @endif

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Kitchen Stations Management</h1>
            <p class="text-slate-500 text-sm font-medium">Create & configure kitchen stations, barbecue counters, tandoor & beverage bars</p>
        </div>
        <div class="flex items-center gap-3">
            <a href="{{ route('kitchen.index') }}" class="px-4 py-2.5 bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition">
                👨‍🍳 Kitchen Display System (KDS)
            </a>
            <button @click="showCreateModal = true" class="px-5 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition">
                + Create New Kitchen Station
            </button>
        </div>
    </div>

    <!-- Kitchens Grid / Table -->
    <div class="bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                        <th class="py-4 px-6">Kitchen Station Name</th>
                        <th class="py-4 px-6">Code / ID</th>
                        <th class="py-4 px-6">Assigned Printer</th>
                        <th class="py-4 px-6">Description / Notes</th>
                        <th class="py-4 px-6">Status</th>
                        <th class="py-4 px-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($kitchens as $kitchen)
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6 font-extrabold text-slate-900 text-base">
                            {{ $kitchen->name }}
                        </td>
                        <td class="py-4 px-6">
                            <span class="px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 text-slate-800">
                                {{ $kitchen->code ?? 'KITCHEN-' . $kitchen->id }}
                            </span>
                        </td>
                        <td class="py-4 px-6 font-bold text-slate-800 text-xs">
                            🖨️ {{ $kitchen->printer->name ?? 'Default KOT Printer' }}
                        </td>
                        <td class="py-4 px-6 text-xs text-slate-500 max-w-xs">
                            {{ $kitchen->description ?? 'Main food preparation & cooking station' }}
                        </td>
                        <td class="py-4 px-6">
                            <span class="px-2.5 py-1 text-xs font-bold {{ $kitchen->status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800' }}">
                                {{ $kitchen->status }}
                            </span>
                        </td>
                        <td class="py-4 px-6 text-right space-x-2">
                            <button @click="editKitchen = {{ json_encode($kitchen) }}" class="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 border border-slate-200">Edit</button>
                            <form method="POST" action="{{ route('kitchens.destroy', $kitchen->id) }}" class="inline" onsubmit="return confirm('Delete this kitchen station?')">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 border border-rose-200">Delete</button>
                            </form>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="6" class="py-12 text-center text-slate-400 font-medium">No kitchen stations created yet.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-slate-100">
            {{ $kitchens->links() }}
        </div>
    </div>

    <!-- Create Kitchen Station Modal -->
    <div x-show="showCreateModal" x-cloak class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4" @click.away="showCreateModal = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-base font-extrabold text-slate-900">Create New Kitchen Station</h3>
                <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form method="POST" action="{{ route('kitchens.store') }}" class="space-y-4">
                @csrf
                <input type="hidden" name="branch_id" value="{{ Auth::user()->branch_id ?? 1 }}">
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Kitchen Station Name *</label>
                    <input type="text" name="name" placeholder="BBQ & Grill Station, Tandoor Counter, Beverages Bar..." required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Code / Short ID</label>
                        <input type="text" name="code" placeholder="K-BBQ" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Status *</label>
                        <select name="status" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Assigned KOT Printer (Optional)</label>
                    <select name="printer_id" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white">
                        <option value="">-- Default KOT Printer --</option>
                        @foreach($printers as $printer)
                            <option value="{{ $printer->id }}">{{ $printer->name }} ({{ $printer->connection_type }})</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Description / Notes</label>
                    <textarea name="description" rows="2" placeholder="Station for grills, kebabs, tikka, and BBQ items..." class="w-full p-2 border border-slate-300 text-xs font-medium"></textarea>
                </div>
                <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" @click="showCreateModal = false" class="px-4 py-2 border border-slate-200 text-xs font-bold">Cancel</button>
                    <button type="submit" class="px-5 py-2 bg-[#026897] text-white text-xs font-extrabold shadow-md">Create Kitchen</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Kitchen Station Modal -->
    <template x-if="editKitchen">
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div class="bg-white max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4" @click.away="editKitchen = null">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 class="text-base font-extrabold text-slate-900">Edit Kitchen Station</h3>
                    <button @click="editKitchen = null" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                </div>
                <form method="POST" @submit.prevent="submitEdit()" class="space-y-4">
                    @csrf
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Kitchen Station Name *</label>
                        <input type="text" name="name" x-model="editKitchen.name" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Code / Short ID</label>
                            <input type="text" name="code" x-model="editKitchen.code" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Status *</label>
                            <select name="status" x-model="editKitchen.status" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Assigned KOT Printer</label>
                        <select name="printer_id" x-model="editKitchen.printer_id" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white">
                            <option value="">-- Default KOT Printer --</option>
                            @foreach($printers as $printer)
                                <option value="{{ $printer->id }}">{{ $printer->name }} ({{ $printer->connection_type }})</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Description / Notes</label>
                        <textarea name="description" x-model="editKitchen.description" rows="2" class="w-full p-2 border border-slate-300 text-xs font-medium"></textarea>
                    </div>
                    <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" @click="editKitchen = null" class="px-4 py-2 border border-slate-200 text-xs font-bold">Cancel</button>
                        <button type="submit" class="px-5 py-2 bg-[#026897] text-white text-xs font-extrabold shadow-md">Update Kitchen</button>
                    </div>
                </form>
            </div>
        </div>
    </template>
</div>
@endsection
