@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ 
    modalOpen: false, 
    editMode: false, 
    form: { 
        id: '', 
        branch_id: '{{ $branches->first()->id ?? '' }}', 
        name: '', 
        capacity: 20, 
        status: 'Active' 
    },
    openCreate() {
        this.editMode = false;
        this.form = { 
            id: '', 
            branch_id: '{{ $branches->first()->id ?? '' }}', 
            name: '', 
            capacity: 20, 
            status: 'Active' 
        };
        this.modalOpen = true;
    },
    openEdit(h) {
        this.editMode = true;
        this.form = {
            id: h.id,
            branch_id: h.branch_id || '',
            name: h.name || '',
            capacity: h.capacity || 20,
            status: h.status || 'Active'
        };
        this.modalOpen = true;
    },
    submitForm() {
        const form = document.createElement('form');
        form.method = 'POST';
        form.style.display = 'none';

        if (this.editMode) {
            form.action = '/halls/' + this.form.id;
        } else {
            form.action = '/halls';
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
        addField('name', this.form.name);
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
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Halls & Dining Areas</h1>
            <p class="text-slate-500 text-sm font-medium">Configure restaurant sections and dining spaces</p>
        </div>
        <button @click="openCreate()"
                class="px-5 py-2.5 rounded-xl bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition">
            + Add New Hall
        </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                    <th class="py-4 px-6">Hall Name</th>
                    <th class="py-4 px-6">Branch</th>
                    <th class="py-4 px-6">Capacity</th>
                    <th class="py-4 px-6">Status</th>
                    <th class="py-4 px-6 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                @foreach($halls as $h)
                <tr class="hover:bg-slate-50/50 transition">
                    <td class="py-4 px-6 font-extrabold text-slate-900">{{ $h->name }}</td>
                    <td class="py-4 px-6 font-semibold">{{ $h->branch->branch_name ?? $h->branch->name ?? '-' }}</td>
                    <td class="py-4 px-6 font-bold">{{ $h->capacity }} Persons</td>
                    <td class="py-4 px-6">
                        <span class="px-2.5 py-1 rounded-full text-xs font-bold {{ $h->status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800' }}">
                            {{ $h->status }}
                        </span>
                    </td>
                    <td class="py-4 px-6 text-right space-x-2">
                        <button @click='openEdit(@json($h))'
                                class="text-xs font-bold text-slate-700 hover:text-orange-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                            Edit
                        </button>
                        <form method="POST" action="{{ route('halls.destroy', $h->id) }}" class="inline-block" onsubmit="return confirm('Delete this hall?')">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">Delete</button>
                        </form>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <!-- Modal Dialog -->
    <div x-show="modalOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4" @click.away="modalOpen = false">
            <h2 class="text-xl font-extrabold text-slate-900" x-text="editMode ? 'Edit Hall' : 'Add New Hall'"></h2>
            <form id="hallForm" method="POST" class="space-y-4" @submit.prevent="submitForm()">
                @csrf

                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Branch *</label>
                    <select name="branch_id" x-model="form.branch_id" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">
                        @foreach($branches as $b)
                        <option value="{{ $b->id }}">{{ $b->branch_name ?? $b->name }}</option>
                        @endforeach
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Hall Name *</label>
                    <input type="text" name="name" x-model="form.name" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Seating Capacity</label>
                        <input type="number" name="capacity" x-model="form.capacity" required class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Status</label>
                        <select name="status" x-model="form.status" class="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" @click="modalOpen = false" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancel</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-[#026897] text-white font-bold text-xs shadow-md">Save Hall</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
