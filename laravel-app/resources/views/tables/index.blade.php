@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ 
    modalOpen: false, 
    editMode: false, 
    form: { 
        id: '', 
        branch_id: '{{ $branches->first()->id ?? '' }}', 
        hall_id: '{{ $halls->first()->id ?? '' }}', 
        table_number: '', 
        capacity: 4, 
        status: 'Available' 
    },
    openCreate() {
        this.editMode = false;
        this.form = { 
            id: '', 
            branch_id: '{{ $branches->first()->id ?? '' }}', 
            hall_id: '{{ $halls->first()->id ?? '' }}', 
            table_number: '', 
            capacity: 4, 
            status: 'Available' 
        };
        this.modalOpen = true;
    },
    openEdit(t) {
        this.editMode = true;
        this.form = {
            id: t.id,
            branch_id: t.branch_id || '',
            hall_id: t.hall_id || '',
            table_number: t.table_number || '',
            capacity: t.capacity || 4,
            status: t.status || 'Available'
        };
        this.modalOpen = true;
    },
    submitForm() {
        const form = document.createElement('form');
        form.method = 'POST';
        form.style.display = 'none';

        if (this.editMode) {
            form.action = '/tables/' + this.form.id;
        } else {
            form.action = '/tables';
        }

        const token = document.querySelector('input[name=_token]').value;
        const addField = (name, value) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            form.appendChild(input);
        };

        addField('_token', token);
        if (this.editMode) {
            addField('_method', 'PUT');
        }
        addField('branch_id', this.form.branch_id);
        addField('hall_id', this.form.hall_id);
        addField('table_number', this.form.table_number);
        addField('capacity', this.form.capacity);
        addField('status', this.form.status);

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

    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Table Seating Arrangement</h1>
            <p class="text-slate-500 text-sm font-medium">Manage tables, capacities, and real-time seating availability</p>
        </div>
        <div class="flex gap-3">
            <a href="{{ route('halls.index') }}" class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">Halls Config</a>
            <button @click="openCreate()"
                    class="px-5 py-2.5 rounded-xl bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition">
                + Add New Table
            </button>
        </div>
    </div>

    <!-- Visual Table Status Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        @foreach($tables as $t)
        <div class="bg-white rounded-2xl border-2 p-4 shadow-sm flex flex-col justify-between
            {{ $t->status === 'Available' ? 'border-emerald-500/30 bg-emerald-50/20' : '' }}
            {{ $t->status === 'Running' ? 'border-amber-500/40 bg-amber-50/30' : '' }}
            {{ $t->status === 'Reserved' ? 'border-purple-500/30 bg-purple-50/20' : '' }}
            {{ $t->status === 'Maintenance' ? 'border-rose-500/30 bg-rose-50/20' : '' }}">
            
            <div class="flex items-center justify-between">
                <span class="font-black text-slate-900 text-lg">{{ $t->table_number }}</span>
                <span class="w-3 h-3 rounded-full 
                    {{ $t->status === 'Available' ? 'bg-emerald-500' : '' }}
                    {{ $t->status === 'Running' ? 'bg-amber-500 animate-ping' : '' }}
                    {{ $t->status === 'Reserved' ? 'bg-purple-500' : '' }}
                    {{ $t->status === 'Maintenance' ? 'bg-rose-500' : '' }}"></span>
            </div>

            <div class="mt-3">
                <span class="block text-xs text-slate-500 font-bold">{{ $t->hall->name ?? 'Hall' }}</span>
                <span class="block text-xs text-slate-400 font-semibold mt-0.5">Capacity: {{ $t->capacity }}</span>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase
                    {{ $t->status === 'Available' ? 'bg-emerald-100 text-emerald-800' : '' }}
                    {{ $t->status === 'Running' ? 'bg-amber-100 text-amber-800' : '' }}
                    {{ $t->status === 'Reserved' ? 'bg-purple-100 text-purple-800' : '' }}
                    {{ $t->status === 'Maintenance' ? 'bg-rose-100 text-rose-800' : '' }}">
                    {{ $t->status }}
                </span>

                <div class="flex items-center gap-2">
                    <button @click='openEdit(@json($t))'
                            class="text-xs font-bold text-slate-600 hover:text-orange-600">
                        Edit
                    </button>
                    <form method="POST" action="{{ route('tables.destroy', $t->id) }}" class="inline-block" onsubmit="return confirm('Delete table?')">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="text-xs font-bold text-rose-500 hover:text-rose-700">&times;</button>
                    </form>
                </div>
            </div>
        </div>
        @endforeach
    </div>

    <!-- Modal Dialog -->
    <div x-show="modalOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4" @click.away="modalOpen = false">
            <h2 class="text-xl font-extrabold text-slate-900" x-text="editMode ? 'Edit Table' : 'Add New Table'"></h2>
            <form id="tableForm" method="POST" class="space-y-4" @submit.prevent="submitForm()">
                @csrf

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Branch *</label>
                        <select name="branch_id" x-model="form.branch_id" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">
                            @foreach($branches as $b)
                            <option value="{{ $b->id }}">{{ $b->branch_name ?? $b->name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Hall *</label>
                        <select name="hall_id" x-model="form.hall_id" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">
                            @foreach($halls as $h)
                            <option value="{{ $h->id }}">{{ $h->name }}</option>
                            @endforeach
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Table Number *</label>
                        <input type="text" name="table_number" x-model="form.table_number" placeholder="e.g. T-01" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Capacity</label>
                        <input type="number" name="capacity" x-model="form.capacity" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Table Status</label>
                    <select name="status" x-model="form.status" class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">
                        <option value="Available">Available</option>
                        <option value="Running">Running (Occupied)</option>
                        <option value="Reserved">Reserved</option>
                        <option value="Maintenance">Maintenance</option>
                    </select>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" @click="modalOpen = false" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancel</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-[#026897] text-white font-bold text-xs shadow-md">Save Table</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
