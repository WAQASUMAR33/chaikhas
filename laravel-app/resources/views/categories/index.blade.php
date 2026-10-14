@extends('layouts.app')

@section('content')
<style>
    select, select option {
        color: #0f172a !important;
        background-color: #ffffff !important;
    }
</style>

<script>
window.compressImageFile = function(file, maxWidth = 800, maxHeight = 800, quality = 0.82) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            return resolve({ file, previewUrl: file ? URL.createObjectURL(file) : null, width: 0, height: 0 });
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, width);
                canvas.height = Math.max(1, height);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        return resolve({ file, previewUrl: URL.createObjectURL(file), width, height });
                    }
                    const cleanName = (file.name || 'image').replace(/\.[^/.]+$/, "") + ".webp";
                    const compressedFile = new File([blob], cleanName, {
                        type: "image/webp",
                        lastModified: Date.now()
                    });
                    resolve({
                        file: compressedFile,
                        previewUrl: URL.createObjectURL(blob),
                        width: canvas.width,
                        height: canvas.height
                    });
                }, 'image/webp', quality);
            };
            img.onerror = () => reject(new Error('Failed to load image for compression'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });
};
</script>

<div class="space-y-6" x-data="{ 
    modalOpen: false, 
    editMode: false, 
    isSubmitting: false,
    isCompressing: false,
    imagePreview: null,
    compressionInfo: '',
    removeImage: false,
    searchQuery: '{{ request('search', '') }}',
    selectedStatus: '{{ request('status', '') }}',
    form: { 
        id: '', 
        branch_id: '', 
        kitchen_id: '',
        name: '', 
        description: '', 
        status: 'Active',
        image: null
    },
    matchesFilter(name, desc, status) {
        const q = this.searchQuery.toLowerCase().trim();
        const statusMatches = !this.selectedStatus || String(status) === String(this.selectedStatus);
        const nameMatches = !q || name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
        return statusMatches && nameMatches;
    },
    openEdit(cat) {
        this.editMode = true;
        this.form = {
            id: cat.id,
            branch_id: cat.branch_id || '',
            kitchen_id: cat.kitchen_id || '',
            name: cat.name || '',
            description: cat.description || '',
            status: cat.status || 'Active',
            image: cat.image || null
        };
        this.imagePreview = cat.image ? ('/storage/' + cat.image) : null;
        this.compressionInfo = cat.image ? 'Current stored image' : '';
        this.removeImage = false;
        if (this.$refs.catImageInput) {
            this.$refs.catImageInput.value = '';
        }
        this.modalOpen = true;
    },
    openCreate() {
        this.editMode = false;
        this.form = { 
            id: '', 
            branch_id: '', 
            kitchen_id: '',
            name: '', 
            description: '', 
            status: 'Active',
            image: null
        };
        this.imagePreview = null;
        this.compressionInfo = '';
        this.removeImage = false;
        if (this.$refs.catImageInput) {
            this.$refs.catImageInput.value = '';
        }
        this.modalOpen = true;
    },
    clearImage() {
        this.imagePreview = null;
        this.compressionInfo = '';
        this.removeImage = true;
        if (this.$refs.catImageInput) {
            this.$refs.catImageInput.value = '';
        }
    },
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
            event.target.value = '';
            return;
        }

        this.isCompressing = true;
        this.removeImage = false;

        try {
            const originalSizeKB = (file.size / 1024).toFixed(1);
            const compressed = await window.compressImageFile(file, 800, 800, 0.82);
            
            if (window.DataTransfer) {
                const dt = new DataTransfer();
                dt.items.add(compressed.file);
                event.target.files = dt.files;
            }

            this.imagePreview = compressed.previewUrl;
            const compressedSizeKB = (compressed.file.size / 1024).toFixed(1);
            const savedPct = Math.max(0, Math.round((1 - (compressed.file.size / file.size)) * 100));
            this.compressionInfo = `Compressed: ${originalSizeKB}KB → ${compressedSizeKB}KB (${savedPct}% smaller WebP)`;
        } catch (err) {
            console.error('Compression error:', err);
            this.imagePreview = URL.createObjectURL(file);
            this.compressionInfo = `Original: ${(file.size / 1024).toFixed(1)}KB`;
        } finally {
            this.isCompressing = false;
        }
    }
}">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Menu Categories</h1>
            <p class="text-slate-500 text-sm font-medium">Organize dishes into menu categories and link kitchen station printers</p>
        </div>
        <div class="flex gap-3">
            <a href="{{ route('menu.index') }}" class="px-4 py-2.5 rounded-none border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm transition">Dishes List</a>
            <button @click="openCreate()"
                    class="px-5 py-2.5 rounded-none bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-sm transition cursor-pointer">
                + Add New Category
            </button>
        </div>
    </div>

    <!-- Flash Notifications -->
    @if(session('success'))
    <div class="p-4 rounded-none bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold shadow-xs flex items-center justify-between">
        <span>{{ session('success') }}</span>
        <button onclick="this.parentElement.remove()" class="text-emerald-600 hover:text-emerald-900 font-extrabold">✕</button>
    </div>
    @endif
    @if(session('error'))
    <div class="p-4 rounded-none bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold shadow-xs flex items-center justify-between">
        <span>{{ session('error') }}</span>
        <button onclick="this.parentElement.remove()" class="text-rose-600 hover:text-rose-900 font-extrabold">✕</button>
    </div>
    @endif
    @if($errors->any())
    <div class="p-4 rounded-none bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold shadow-xs">
        <ul class="list-disc pl-5 space-y-1">
            @foreach($errors->all() as $err)
                <li>{{ $err }}</li>
            @endforeach
        </ul>
    </div>
    @endif

    <!-- Search & Filter Bar -->
    <div class="bg-white p-4 rounded-none border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="flex-1 w-full relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </div>
            <input type="text" x-model="searchQuery" placeholder="Search categories by name or description..." 
                   class="w-full pl-10 pr-4 py-2.5 rounded-none border border-slate-300 text-sm font-semibold text-slate-900 bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-[#026897] focus:border-[#026897] transition">
        </div>

        <!-- Status Filter -->
        <div class="w-full md:w-56 flex items-center gap-2">
            <label class="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Status:</label>
            <select x-model="selectedStatus" class="w-full px-4 py-2.5 rounded-none border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:ring-1 focus:ring-[#026897] focus:border-[#026897]">
                <option value="" class="font-bold text-slate-900">All Statuses</option>
                <option value="Active" class="font-bold text-slate-900">Active</option>
                <option value="Inactive" class="font-bold text-slate-900">Inactive</option>
            </select>
        </div>

        <!-- Reset Button -->
        <button x-show="searchQuery !== '' || selectedStatus !== ''" 
                @click="searchQuery = ''; selectedStatus = ''"
                class="px-3.5 py-2.5 rounded-none bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer">
            Clear Filters
        </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-none border border-slate-200 shadow-xs overflow-hidden">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 bg-slate-50">
                    <th class="py-3.5 px-6">Category</th>
                    <th class="py-3.5 px-6">Description</th>
                    <th class="py-3.5 px-6">Branch</th>
                    <th class="py-3.5 px-6">Attached Kitchen</th>
                    <th class="py-3.5 px-6">Status</th>
                    <th class="py-3.5 px-6 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 text-sm font-medium text-slate-700">
                @foreach($categories as $cat)
                <tr x-show="matchesFilter(@js($cat->name), @js($cat->description ?? ''), '{{ $cat->status }}')" 
                    class="hover:bg-slate-50 transition">
                    <td class="py-4 px-6">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
                                @if($cat->image)
                                    <img src="{{ asset('storage/' . $cat->image) }}" alt="{{ $cat->name }}" class="w-full h-full object-cover">
                                @else
                                    <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                    </svg>
                                @endif
                            </div>
                            <div>
                                <span class="font-extrabold text-slate-900 block">{{ $cat->name }}</span>
                                <span class="text-xs font-semibold text-slate-400">#{{ $cat->id }}</span>
                            </div>
                        </div>
                    </td>
                    <td class="py-4 px-6 text-slate-500">{{ $cat->description ?? '-' }}</td>
                    <td class="py-4 px-6 font-semibold">{{ $cat->branch->branch_name ?? $cat->branch->name ?? 'Global' }}</td>
                    <td class="py-4 px-6 font-semibold">
                        @if($cat->kitchen)
                            <div>
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase bg-sky-50 text-[#026897] border border-sky-200">
                                    <span>👨‍🍳</span>
                                    <span>{{ $cat->kitchen->name }}</span>
                                </span>
                                @if(!empty($cat->kitchen->printer_ip))
                                    <div class="text-[10px] text-emerald-700 font-mono font-bold mt-0.5">
                                        🖨️ {{ $cat->kitchen->printer_ip }}:{{ $cat->kitchen->printer_port ?: 9100 }}
                                    </div>
                                @else
                                    <div class="text-[10px] text-slate-400 mt-0.5">No printer IP set</div>
                                @endif
                            </div>
                        @else
                            <span class="text-xs text-slate-400 italic">None (Unassigned)</span>
                        @endif
                    </td>
                    <td class="py-4 px-6">
                        <span class="px-2.5 py-1 text-xs font-bold border {{ $cat->status === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300' }}">
                            {{ $cat->status }}
                        </span>
                    </td>
                    <td class="py-4 px-6 text-right space-x-2">
                        <button @click='openEdit(@json($cat))'
                                class="text-xs font-bold text-slate-700 hover:text-white hover:bg-[#026897] bg-white px-3.5 py-1.5 rounded-none border border-slate-300 transition cursor-pointer">
                            Edit
                        </button>
                        <form method="POST" action="{{ route('categories.destroy', $cat->id) }}" class="inline-block" onsubmit="return confirm('Delete category?')">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 bg-white px-3 py-1.5 rounded-none border border-rose-300 transition cursor-pointer">Delete</button>
                        </form>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @if($categories->hasPages())
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            {{ $categories->links() }}
        </div>
        @endif
    </div>

    <!-- Modal Dialog -->
    <div x-show="modalOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-none border border-slate-300 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" @click.away="modalOpen = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                <h2 class="text-xl font-extrabold text-slate-900" x-text="editMode ? 'Edit Category' : 'Add New Category'"></h2>
                <button type="button" @click="modalOpen = false" class="text-slate-400 hover:text-slate-700 font-black text-lg">✕</button>
            </div>

            <form id="categoryForm" 
                  :action="editMode ? ('{{ url('categories') }}/' + form.id) : '{{ route('categories.store') }}'" 
                  method="POST" 
                  enctype="multipart/form-data" 
                  class="space-y-4"
                  @submit="isSubmitting = true">
                @csrf
                <template x-if="editMode">
                    <input type="hidden" name="_method" value="PUT">
                </template>

                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Category Name *</label>
                    <input type="text" name="name" x-model="form.name" required class="w-full px-4 py-2 rounded-none border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:ring-1 focus:ring-[#026897] focus:border-[#026897]">
                </div>

                <!-- Category Image Upload (Optional with Auto Compression) -->
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Category Image <span class="text-slate-400 font-normal lowercase">(optional • auto-compressed)</span>
                    </label>
                    <div class="border-2 border-dashed border-slate-200 hover:border-[#026897] rounded-none p-3 bg-slate-50/60 transition">
                        <input type="file" 
                               name="image" 
                               accept="image/*" 
                               x-ref="catImageInput" 
                               @change="handleImageUpload($event)" 
                               class="hidden">
                        <input type="hidden" name="remove_image" :value="removeImage ? '1' : '0'">

                        <div class="flex items-center gap-4">
                            <!-- Thumbnail Preview -->
                            <div class="w-16 h-16 rounded-none bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-xs">
                                <template x-if="imagePreview">
                                    <img :src="imagePreview" alt="Category Preview" class="w-full h-full object-cover">
                                </template>
                                <template x-if="!imagePreview">
                                    <div class="text-center p-1 text-slate-300">
                                        <svg class="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                        </svg>
                                        <span class="text-[9px] font-bold text-slate-400 block mt-0.5">No Image</span>
                                    </div>
                                </template>
                                <template x-if="isCompressing">
                                    <div class="absolute inset-0 bg-white/85 backdrop-blur-xs flex items-center justify-center">
                                        <span class="animate-spin rounded-full h-4 w-4 border-2 border-[#026897] border-t-transparent"></span>
                                    </div>
                                </template>
                            </div>

                            <!-- Controls -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <button type="button" 
                                            @click="$refs.catImageInput.click()" 
                                            class="px-3 py-1.5 rounded-none bg-white border border-slate-300 hover:border-[#026897] text-slate-700 hover:text-[#026897] text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                                        </svg>
                                        <span x-text="imagePreview ? 'Change Image' : 'Choose Image'"></span>
                                    </button>
                                    <template x-if="imagePreview">
                                        <button type="button" 
                                                @click="clearImage()" 
                                                class="px-2.5 py-1.5 rounded-none bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-800 text-xs font-bold transition cursor-pointer">
                                            Remove
                                        </button>
                                    </template>
                                </div>
                                <p class="text-[11px] text-slate-400 font-medium mt-1 truncate" x-text="compressionInfo || 'JPG, PNG, WEBP (auto-compressed to WebP)'"></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Description</label>
                    <textarea name="description" x-model="form.description" rows="2" class="w-full px-4 py-2 rounded-none border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:ring-1 focus:ring-[#026897] focus:border-[#026897]"></textarea>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Branch</label>
                        <select name="branch_id" x-model="form.branch_id" class="w-full px-4 py-2 rounded-none border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:text-slate-900 focus:ring-1 focus:ring-[#026897] focus:border-[#026897]">
                            <option value="" class="text-slate-900 bg-white font-bold">Global / All Branches</option>
                            @foreach($branches as $b)
                            <option value="{{ $b->id }}" class="text-slate-900 bg-white font-bold">{{ $b->branch_name ?? $b->name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Attached Kitchen Station</label>
                        <select name="kitchen_id" x-model="form.kitchen_id" class="w-full px-4 py-2 rounded-none border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:text-slate-900 focus:ring-1 focus:ring-[#026897] focus:border-[#026897]">
                            <option value="" class="text-slate-900 bg-white font-bold">Unassigned / None</option>
                            @foreach($kitchens as $k)
                            <option value="{{ $k->id }}" class="text-slate-900 bg-white font-bold">{{ $k->name }} ({{ $k->printer_ip ? $k->printer_ip . ':' . ($k->printer_port ?? 9100) : 'No Printer' }})</option>
                            @endforeach
                        </select>
                        <p class="text-[10px] text-slate-400 mt-0.5">Dishes route to this kitchen station's printer</p>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Status *</label>
                    <select name="status" x-model="form.status" class="w-full px-4 py-2 rounded-none border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:text-slate-900 focus:ring-1 focus:ring-[#026897] focus:border-[#026897]">
                        <option value="Active" class="text-slate-900 bg-white font-bold">Active</option>
                        <option value="Inactive" class="text-slate-900 bg-white font-bold">Inactive</option>
                    </select>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button type="button" @click="modalOpen = false" class="px-4 py-2 rounded-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">Cancel</button>
                    <button type="submit" 
                            :disabled="isSubmitting || isCompressing"
                            class="px-5 py-2 rounded-none bg-[#026897] hover:bg-[#01547b] text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                        <template x-if="isSubmitting">
                            <span class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                        </template>
                        <span x-text="editMode ? 'Update Category' : 'Save Category'"></span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
