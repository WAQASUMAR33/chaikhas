@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ 
    showCreateModal: false, 
    editKitchen: null,
    testingPrinterId: null,
    testMessage: null,
    testSuccess: false,
    async runTestPrint(kitchenId) {
        this.testingPrinterId = kitchenId;
        this.testMessage = null;
        try {
            const res = await fetch('/kitchens/' + kitchenId + '/test-printer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': '{{ csrf_token() }}',
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();
            this.testSuccess = data.success;
            this.testMessage = data.message;
        } catch (e) {
            this.testSuccess = false;
            this.testMessage = 'Network error while testing printer: ' + e.message;
        } finally {
            this.testingPrinterId = null;
        }
    },
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
            input.value = value !== null && value !== undefined ? value : '';
            form.appendChild(input);
        };

        addField('_token', token);
        addField('_method', 'PUT');
        addField('name', this.editKitchen.name);
        addField('code', this.editKitchen.code);
        addField('status', this.editKitchen.status);
        addField('printer_ip', this.editKitchen.printer_ip);
        addField('printer_port', this.editKitchen.printer_port || 9100);
        addField('printer_id', this.editKitchen.printer_id);
        addField('description', this.editKitchen.description);

        document.body.appendChild(form);
        form.submit();
    }
}">

    <!-- Flash Notifications -->
    @if(session('success'))
    <div class="p-4 bg-emerald-50 border-l-4 border-emerald-600 border border-slate-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs">
        <span class="flex items-center gap-2">
            <span class="text-base text-emerald-700">✓</span>
            <span>{{ session('success') }}</span>
        </span>
        <button @click="$el.parentElement.remove()" class="text-emerald-800 hover:text-emerald-950 font-black cursor-pointer">✕</button>
    </div>
    @endif

    @if(session('error'))
    <div class="p-4 bg-rose-50 border-l-4 border-rose-600 border border-slate-300 text-rose-900 text-xs font-bold flex items-center justify-between shadow-xs">
        <span class="flex items-center gap-2">
            <span class="text-base text-rose-700">⚠️</span>
            <span>{{ session('error') }}</span>
        </span>
        <button @click="$el.parentElement.remove()" class="text-rose-800 hover:text-rose-950 font-black cursor-pointer">✕</button>
    </div>
    @endif

    <!-- Inline Test Print Toast/Alert -->
    <template x-if="testMessage">
        <div class="p-4 text-xs font-bold border-l-4 border border-slate-300 flex items-center justify-between shadow-xs"
             :class="testSuccess ? 'bg-emerald-50 border-l-emerald-600 text-emerald-900' : 'bg-rose-50 border-l-rose-600 text-rose-900'">
            <span class="flex items-center gap-2">
                <span x-text="testSuccess ? '✓' : '⚠️'"></span>
                <span x-text="testMessage"></span>
            </span>
            <button @click="testMessage = null" class="font-black cursor-pointer">✕</button>
        </div>
    </template>

    <!-- Header Section (Crisp Square Design) -->
    <div class="bg-white border border-slate-300 border-t-4 border-t-[#026897] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-xl font-black text-slate-900 uppercase tracking-tight">Kitchen Stations & Printer Setup</h1>
            <p class="text-xs text-slate-500 font-medium mt-1">Configure kitchen stations, assign thermal network printer IP/port, and route dishes via menu categories.</p>
        </div>
        <div class="flex items-center gap-3">
            <a href="{{ route('kitchen.index') }}" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider transition border-none shadow-xs">
                👨‍🍳 Kitchen Display (KDS)
            </a>
            <button @click="showCreateModal = true" class="px-5 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-black text-xs uppercase tracking-wider transition border-none shadow-xs cursor-pointer">
                + Create Kitchen Station
            </button>
        </div>
    </div>

    <!-- Kitchens Table (Crisp Sharp Borders) -->
    <div class="bg-white border border-slate-300 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-300 text-[11px] font-black uppercase tracking-wider text-slate-600 bg-slate-50">
                        <th class="py-3.5 px-5 border-r border-slate-200">Kitchen Station Name</th>
                        <th class="py-3.5 px-5 border-r border-slate-200">Station Code</th>
                        <th class="py-3.5 px-5 border-r border-slate-200">Network Printer Setup</th>
                        <th class="py-3.5 px-5 border-r border-slate-200">Attached Categories</th>
                        <th class="py-3.5 px-5 text-center border-r border-slate-200">Status</th>
                        <th class="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 text-xs">
                    @forelse($kitchens as $kitchen)
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="py-4 px-5 font-black text-slate-900 text-sm border-r border-slate-100">
                            {{ $kitchen->name }}
                            @if(!empty($kitchen->description))
                                <div class="text-[11px] text-slate-400 font-normal mt-0.5">{{ $kitchen->description }}</div>
                            @endif
                        </td>
                        <td class="py-4 px-5 border-r border-slate-100">
                            <span class="px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                {{ $kitchen->code ?? 'KITCHEN-' . $kitchen->id }}
                            </span>
                        </td>
                        <td class="py-4 px-5 border-r border-slate-100">
                            @if(!empty($kitchen->printer_ip))
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span class="font-mono font-black text-slate-800 text-xs">
                                        {{ $kitchen->printer_ip }}:{{ $kitchen->printer_port ?: 9100 }}
                                    </span>
                                </div>
                                <div class="text-[10px] text-emerald-700 font-bold mt-0.5 uppercase tracking-wider">
                                    Network Thermal Printer
                                </div>
                            @else
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-slate-300"></span>
                                    <span class="text-xs text-slate-400 font-medium">No Printer IP Set</span>
                                </div>
                                <div class="text-[10px] text-slate-400">Click Edit to configure IP:Port</div>
                            @endif
                        </td>
                        <td class="py-4 px-5 border-r border-slate-100">
                            @if($kitchen->categories && $kitchen->categories->count() > 0)
                                <div class="flex flex-wrap gap-1">
                                    @foreach($kitchen->categories as $c)
                                        <span class="px-2 py-0.5 bg-sky-50 text-[#026897] border border-sky-200 font-bold text-[10px] uppercase">
                                            {{ $c->name }}
                                        </span>
                                    @endforeach
                                </div>
                                <div class="text-[10px] text-slate-400 mt-1 font-semibold">{{ $kitchen->categories->count() }} categories linked</div>
                            @else
                                <span class="text-xs text-slate-400 italic font-medium">No categories attached yet</span>
                            @endif
                        </td>
                        <td class="py-4 px-5 text-center border-r border-slate-100">
                            <span class="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase border {{ $kitchen->status === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300' }}">
                                {{ $kitchen->status }}
                            </span>
                        </td>
                        <td class="py-4 px-5 text-right space-x-2 whitespace-nowrap">
                            @if(!empty($kitchen->printer_ip))
                                <button type="button"
                                        @click="runTestPrint({{ $kitchen->id }})"
                                        :disabled="testingPrinterId === {{ $kitchen->id }}"
                                        class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider transition cursor-pointer border-none shadow-2xs disabled:opacity-50 inline-flex items-center gap-1">
                                    <span x-show="testingPrinterId === {{ $kitchen->id }}" class="animate-spin text-white">⚙️</span>
                                    <span>🖨️ Test Print</span>
                                </button>
                            @endif

                            <button type="button"
                                    @click="editKitchen = {{ json_encode($kitchen) }}" 
                                    class="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 border border-slate-300 transition cursor-pointer">
                                Edit
                            </button>

                            <form method="POST" action="{{ route('kitchens.destroy', $kitchen->id) }}" class="inline" onsubmit="return confirm('Delete this kitchen station?')">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 border border-rose-300 transition cursor-pointer">
                                    Delete
                                </button>
                            </form>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="6" class="py-12 text-center text-slate-400 font-medium">No kitchen stations configured yet.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 bg-slate-50 border-t border-slate-200">
            {{ $kitchens->links() }}
        </div>
    </div>

    <!-- Create Kitchen Station Modal (Crisp Zero Radius) -->
    <div x-show="showCreateModal" x-cloak class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white max-w-lg w-full border border-slate-300 shadow-2xl p-6 space-y-4" @click.away="showCreateModal = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 class="text-base font-black text-slate-900 uppercase tracking-tight">Create Kitchen Station</h3>
                <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-700 font-black text-base cursor-pointer">✕</button>
            </div>

            <form method="POST" action="{{ route('kitchens.store') }}" class="space-y-4">
                @csrf
                <input type="hidden" name="branch_id" value="{{ Auth::user()->branch_id ?? 1 }}">

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Kitchen Station Name <span class="text-rose-600">*</span>
                    </label>
                    <input type="text" name="name" placeholder="e.g. BBQ & Grill, Chinese Counter, Bar & Chai..." required 
                           class="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Station Code / Short ID</label>
                        <input type="text" name="code" placeholder="e.g. K-BBQ" 
                               class="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Status <span class="text-rose-600">*</span>
                        </label>
                        <select name="status" required class="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <!-- Network Thermal Printer Setup Box -->
                <div class="p-4 bg-slate-50 border border-slate-300 space-y-3">
                    <div class="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span class="text-base">🖨️</span>
                        <div>
                            <div class="text-xs font-black uppercase tracking-wider text-slate-900">Kitchen Network Printer Setup</div>
                            <div class="text-[10px] text-slate-500 font-medium">Automatic KOT printing over LAN network socket</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div class="sm:col-span-2">
                            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Printer IP Address
                            </label>
                            <input type="text" name="printer_ip" placeholder="e.g. 192.168.1.100" 
                                   class="w-full px-3 py-2 bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                                TCP Port
                            </label>
                            <input type="number" name="printer_port" value="9100" placeholder="9100" 
                                   class="w-full px-3 py-2 bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                        </div>
                    </div>
                    <p class="text-[10px] text-slate-500 leading-snug">
                        Standard thermal receipt printers use port <strong>9100</strong>. When orders containing this kitchen's categories are saved, the KOT will automatically transmit here.
                    </p>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Description / Station Notes</label>
                    <textarea name="description" rows="2" placeholder="Station for grills, kebabs, tandoor items..." 
                              class="w-full p-2.5 bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs"></textarea>
                </div>

                <div class="pt-3 border-t border-slate-200 flex justify-end gap-3">
                    <button type="button" @click="showCreateModal = false" class="px-4 py-2 border border-slate-300 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                        Cancel
                    </button>
                    <button type="submit" class="px-6 py-2 bg-[#026897] hover:bg-[#01547b] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer border-none shadow-sm">
                        Create Station
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Kitchen Station Modal (Crisp Zero Radius) -->
    <template x-if="editKitchen">
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div class="bg-white max-w-lg w-full border border-slate-300 shadow-2xl p-6 space-y-4" @click.away="editKitchen = null">
                <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 class="text-base font-black text-slate-900 uppercase tracking-tight">Edit Kitchen Station & Printer</h3>
                    <button @click="editKitchen = null" class="text-slate-400 hover:text-slate-700 font-black text-base cursor-pointer">✕</button>
                </div>

                <form method="POST" @submit.prevent="submitEdit()" class="space-y-4">
                    @csrf
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Kitchen Station Name <span class="text-rose-600">*</span>
                        </label>
                        <input type="text" name="name" x-model="editKitchen.name" required 
                               class="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Station Code / Short ID</label>
                            <input type="text" name="code" x-model="editKitchen.code" 
                                   class="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Status <span class="text-rose-600">*</span>
                            </label>
                            <select name="status" x-model="editKitchen.status" required 
                                    class="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <!-- Network Thermal Printer Setup Box -->
                    <div class="p-4 bg-slate-50 border border-slate-300 space-y-3">
                        <div class="flex items-center gap-2 border-b border-slate-200 pb-2">
                            <span class="text-base">🖨️</span>
                            <div>
                                <div class="text-xs font-black uppercase tracking-wider text-slate-900">Kitchen Network Printer Setup</div>
                                <div class="text-[10px] text-slate-500 font-medium">Automatic KOT printing over LAN network socket</div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div class="sm:col-span-2">
                                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                                    Printer IP Address
                                </label>
                                <input type="text" name="printer_ip" x-model="editKitchen.printer_ip" placeholder="e.g. 192.168.1.100" 
                                       class="w-full px-3 py-2 bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                                    TCP Port
                                </label>
                                <input type="number" name="printer_port" x-model="editKitchen.printer_port" placeholder="9100" 
                                       class="w-full px-3 py-2 bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs">
                            </div>
                        </div>
                        <p class="text-[10px] text-slate-500 leading-snug">
                            Set raw TCP socket IP address & port for the thermal printer assigned to this kitchen.
                        </p>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Description / Notes</label>
                        <textarea name="description" x-model="editKitchen.description" rows="2" 
                                  class="w-full p-2.5 bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:border-[#026897] focus:outline-none transition shadow-2xs"></textarea>
                    </div>

                    <div class="pt-3 border-t border-slate-200 flex justify-end gap-3">
                        <button type="button" @click="editKitchen = null" class="px-4 py-2 border border-slate-300 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                            Cancel
                        </button>
                        <button type="submit" class="px-6 py-2 bg-[#026897] hover:bg-[#01547b] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer border-none shadow-sm">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </template>
</div>
@endsection
