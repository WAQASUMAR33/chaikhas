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
    // State
    items: @js($categories->items()),
    pagination: {
        current_page: {{ $categories->currentPage() }},
        last_page: {{ $categories->lastPage() }},
        per_page: {{ $categories->perPage() }},
        total: {{ $categories->total() }},
        from: {{ $categories->firstItem() ?? 0 }},
        to: {{ $categories->lastItem() ?? 0 }},
        links: @js($categories->linkCollection())
    },
    stats: @js($stats ?? [
        'total' => $categories->total(),
        'active' => 0,
        'inactive' => 0,
        'attached_kitchen' => 0
    ]),
    isLoading: false,
    searchQuery: '{{ request('search', '') }}',
    selectedStatus: '{{ request('status', '') }}',
    perPage: 10,
    searchTimeout: null,

    // Modal & Form State
    modalOpen: false, 
    editMode: false, 
    isSubmitting: false,
    isCompressing: false,
    imagePreview: null,
    compressionInfo: '',
    removeImage: false,
    modalError: null,
    form: { 
        id: '', 
        branch_id: '', 
        kitchen_id: '',
        name: '', 
        description: '', 
        status: 'Active',
        image: null
    },

    // Delete Confirmation
    deleteModalOpen: false,
    itemToDelete: null,
    isDeleting: false,

    // Toast Notification
    toast: {
        show: false,
        type: 'success', // 'success' or 'error'
        message: '',
        timer: null
    },

    showToast(message, type = 'success') {
        this.toast.message = message;
        this.toast.type = type;
        this.toast.show = true;
        clearTimeout(this.toast.timer);
        this.toast.timer = setTimeout(() => {
            this.toast.show = false;
        }, 4000);
    },

    // Debounced Search
    onSearchInput() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.fetchCategories(1);
        }, 320);
    },

    // Core AJAX Data Fetching (No Page Reload)
    async fetchCategories(page = 1) {
        if (page < 1 || (this.pagination.last_page && page > this.pagination.last_page)) return;
        
        this.isLoading = true;

        const params = new URLSearchParams();
        params.append('page', page);
        params.append('per_page', this.perPage);
        params.append('ajax', '1');

        if (this.searchQuery.trim() !== '') {
            params.append('search', this.searchQuery.trim());
        }
        if (this.selectedStatus !== '') {
            params.append('status', this.selectedStatus);
        }

        try {
            const url = '{{ route('categories.index') }}?' + params.toString();
            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!res.ok) throw new Error('HTTP error ' + res.status);
            const data = await res.json();

            if (data.success && data.categories) {
                this.items = data.categories.data || [];
                this.pagination = {
                    current_page: data.categories.current_page,
                    last_page: data.categories.last_page,
                    per_page: data.categories.per_page,
                    total: data.categories.total,
                    from: data.categories.from || 0,
                    to: data.categories.to || 0,
                    links: data.categories.links || []
                };

                if (data.stats) {
                    this.stats = data.stats;
                }

                // Update URL history state seamlessly without page reload
                const cleanParams = new URLSearchParams(params);
                cleanParams.delete('ajax');
                const newRelativePathQuery = window.location.pathname + '?' + cleanParams.toString();
                window.history.replaceState(null, '', newRelativePathQuery);
            }
        } catch (err) {
            console.error('Fetch categories error:', err);
            this.showToast('Failed to load categories. Please try again.', 'error');
        } finally {
            this.isLoading = false;
        }
    },

    openCreate() {
        this.editMode = false;
        this.modalError = null;
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

    openEdit(cat) {
        this.editMode = true;
        this.modalError = null;
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
    },

    // Save/Update via AJAX
    async submitCategory() {
        if (!this.form.name || this.form.name.trim() === '') {
            this.modalError = 'Category name is required.';
            return;
        }

        this.isSubmitting = true;
        this.modalError = null;

        try {
            const formElem = document.getElementById('categoryForm');
            const formData = new FormData(formElem);

            const url = this.editMode 
                ? ('{{ url('categories') }}/' + this.form.id)
                : '{{ route('categories.store') }}';

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.errors) {
                    const firstKey = Object.keys(data.errors)[0];
                    this.modalError = data.errors[firstKey][0] || 'Validation error.';
                } else {
                    this.modalError = data.message || 'Failed to save category.';
                }
                return;
            }

            this.modalOpen = false;
            this.showToast(data.message || (this.editMode ? 'Category updated.' : 'Category created.'));
            // Refresh current page data asynchronously
            await this.fetchCategories(this.pagination.current_page || 1);
        } catch (err) {
            console.error('Submit category error:', err);
            this.modalError = 'An unexpected error occurred. Please try again.';
        } finally {
            this.isSubmitting = false;
        }
    },

    // Delete Confirmation & AJAX Deletion
    confirmDelete(cat) {
        this.itemToDelete = cat;
        this.deleteModalOpen = true;
    },

    async executeDelete() {
        if (!this.itemToDelete) return;
        this.isDeleting = true;

        try {
            const url = '{{ url('categories') }}/' + this.itemToDelete.id;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': '{{ csrf_token() }}',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ _method: 'DELETE' })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to delete category.');
            }

            this.deleteModalOpen = false;
            this.showToast(data.message || 'Category deleted successfully.');

            // If current page is now empty and not page 1, go back one page
            const targetPage = (this.items.length === 1 && this.pagination.current_page > 1) 
                ? (this.pagination.current_page - 1) 
                : this.pagination.current_page;

            await this.fetchCategories(targetPage);
        } catch (err) {
            console.error('Delete error:', err);
            this.showToast(err.message || 'Could not delete category.', 'error');
        } finally {
            this.isDeleting = false;
            this.itemToDelete = null;
        }
    }
}">

    <!-- Toast Notification (Top Right) -->
    <div x-show="toast.show" 
         x-cloak 
         x-transition:enter="transition ease-out duration-200"
         x-transition:enter-start="opacity-0 translate-y-2"
         x-transition:enter-end="opacity-100 translate-y-0"
         x-transition:leave="transition ease-in duration-150"
         x-transition:leave-start="opacity-100 translate-y-0"
         x-transition:leave-end="opacity-0 translate-y-2"
         class="fixed top-5 right-5 z-50 max-w-md w-full shadow-lg border p-4 flex items-center gap-3"
         :class="toast.type === 'success' ? 'bg-emerald-900 text-white border-emerald-700' : 'bg-rose-900 text-white border-rose-700'">
        <div class="text-xl font-black">
            <template x-if="toast.type === 'success'"><span>✓</span></template>
            <template x-if="toast.type === 'error'"><span>✕</span></template>
        </div>
        <div class="flex-1 text-sm font-bold" x-text="toast.message"></div>
        <button type="button" @click="toast.show = false" class="text-white/80 hover:text-white font-bold text-sm">✕</button>
    </div>

    <!-- Top Summary Metric Cards (Zero Radius Square Design) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Total Categories -->
        <div class="bg-white p-4 border border-slate-300 shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Categories</p>
                <h3 class="text-2xl font-black text-slate-900 mt-1" x-text="stats.total">0</h3>
            </div>
            <div class="w-10 h-10 border border-sky-300 bg-sky-50 text-[#026897] flex items-center justify-center font-black text-lg">
                📁
            </div>
        </div>

        <!-- Active Categories -->
        <div class="bg-white p-4 border border-slate-300 shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Active Categories</p>
                <h3 class="text-2xl font-black text-emerald-900 mt-1" x-text="stats.active">0</h3>
            </div>
            <div class="w-10 h-10 border border-emerald-300 bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-lg">
                ✓
            </div>
        </div>

        <!-- Inactive Categories -->
        <div class="bg-white p-4 border border-slate-300 shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Inactive Categories</p>
                <h3 class="text-2xl font-black text-rose-900 mt-1" x-text="stats.inactive">0</h3>
            </div>
            <div class="w-10 h-10 border border-rose-300 bg-rose-50 text-rose-700 flex items-center justify-center font-black text-lg">
                ✕
            </div>
        </div>

        <!-- Kitchens Attached -->
        <div class="bg-white p-4 border border-slate-300 shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Attached Kitchens</p>
                <h3 class="text-2xl font-black text-indigo-900 mt-1" x-text="stats.attached_kitchen">0</h3>
            </div>
            <div class="w-10 h-10 border border-indigo-300 bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-lg">
                👨‍🍳
            </div>
        </div>
    </div>

    <!-- Header Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Menu Categories</h1>
            <p class="text-slate-500 text-xs font-semibold mt-0.5">Organize dishes into menu categories and link kitchen station printers</p>
        </div>
        <div class="flex gap-2">
            <a href="{{ route('kitchens.index') }}" class="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wide transition flex items-center gap-1.5">
                <span>🖨️</span> Kitchen Printers
            </a>
            <a href="{{ route('menu.index') }}" class="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wide transition flex items-center gap-1.5">
                <span>🍽️</span> Dishes List
            </a>
            <button @click="openCreate()"
                    class="px-5 py-2 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-xs uppercase tracking-wide shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                <span>+</span> Add New Category
            </button>
        </div>
    </div>

    <!-- Search & Filter Bar (Real-time AJAX) -->
    <div class="bg-white p-4 border border-slate-300 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="flex-1 w-full relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </div>
            <input type="text" 
                   x-model="searchQuery" 
                   @input="onSearchInput()"
                   placeholder="Type to search categories by name or description (live AJAX)..." 
                   class="w-full pl-9 pr-8 py-2 border border-slate-300 text-xs font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#026897] transition outline-none">
            
            <button x-show="searchQuery !== ''" 
                    @click="searchQuery = ''; fetchCategories(1)" 
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 text-xs font-black">
                ✕
            </button>
        </div>

        <!-- Status Filter -->
        <div class="w-full md:w-52 flex items-center gap-2">
            <label class="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap">Status:</label>
            <select x-model="selectedStatus" 
                    @change="fetchCategories(1)" 
                    class="w-full px-3 py-2 border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:border-[#026897] outline-none">
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
            </select>
        </div>

        <!-- Per Page Filter -->
        <div class="w-full md:w-40 flex items-center gap-2">
            <label class="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap">Show:</label>
            <select x-model="perPage" 
                    @change="fetchCategories(1)" 
                    class="w-full px-3 py-2 border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:border-[#026897] outline-none">
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
            </select>
        </div>

        <!-- Refresh Button -->
        <button type="button" 
                @click="fetchCategories(pagination.current_page)" 
                :disabled="isLoading"
                title="Refresh Category List"
                class="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
            <span :class="isLoading ? 'animate-spin' : ''">🔄</span>
            <span class="hidden md:inline">Refresh</span>
        </button>
    </div>

    <!-- Table Container with AJAX Loading State -->
    <div class="bg-white border border-slate-300 shadow-xs relative overflow-hidden">
        <!-- Top Loading Progress Bar -->
        <div x-show="isLoading" class="absolute top-0 left-0 right-0 h-1 bg-[#026897] animate-pulse z-20"></div>

        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100/80">
                        <th class="py-3 px-5">Category</th>
                        <th class="py-3 px-5">Description</th>
                        <th class="py-3 px-5">Branch</th>
                        <th class="py-3 px-5">Attached Kitchen & Printer</th>
                        <th class="py-3 px-5">Status</th>
                        <th class="py-3 px-5 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 text-xs font-medium text-slate-800">
                    <!-- Loaded Items Loop -->
                    <template x-for="cat in items" :key="cat.id">
                        <tr class="hover:bg-slate-50/80 transition">
                            <!-- Category Name + Thumbnail -->
                            <td class="py-3.5 px-5">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 bg-slate-100 border border-slate-300 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
                                        <template x-if="cat.image">
                                            <img :src="'/storage/' + cat.image" :alt="cat.name" class="w-full h-full object-cover">
                                        </template>
                                        <template x-if="!cat.image">
                                            <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                            </svg>
                                        </template>
                                    </div>
                                    <div>
                                        <span class="font-bold text-slate-900 block" x-text="cat.name"></span>
                                        <span class="text-[10px] font-mono text-slate-400" x-text="'ID #' + cat.id"></span>
                                    </div>
                                </div>
                            </td>

                            <!-- Description -->
                            <td class="py-3.5 px-5 text-slate-600 max-w-xs truncate" x-text="cat.description || '-'"></td>

                            <!-- Branch -->
                            <td class="py-3.5 px-5 font-semibold text-slate-700">
                                <span x-text="cat.branch ? (cat.branch.branch_name || cat.branch.name) : 'Global / All'"></span>
                            </td>

                            <!-- Attached Kitchen & Printer Details -->
                            <td class="py-3.5 px-5">
                                <template x-if="cat.kitchen">
                                    <div>
                                        <div class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-black uppercase bg-sky-50 text-[#026897] border border-sky-300">
                                            <span>👨‍🍳</span>
                                            <span x-text="cat.kitchen.name"></span>
                                        </div>
                                        <div class="mt-1">
                                            <template x-if="cat.kitchen.printer_ip">
                                                <span class="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.2">
                                                    <span>🖨️</span>
                                                    <span x-text="cat.kitchen.printer_ip + ':' + (cat.kitchen.printer_port || 9100)"></span>
                                                </span>
                                            </template>
                                            <template x-if="!cat.kitchen.printer_ip">
                                                <span class="text-[10px] text-amber-700 font-semibold italic">No Printer IP</span>
                                            </template>
                                        </div>
                                    </div>
                                </template>
                                <template x-if="!cat.kitchen">
                                    <span class="text-xs text-slate-400 italic">None (Unassigned)</span>
                                </template>
                            </td>

                            <!-- Status -->
                            <td class="py-3.5 px-5">
                                <span class="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border"
                                      :class="cat.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'"
                                      x-text="cat.status">
                                </span>
                            </td>

                            <!-- Actions -->
                            <td class="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                                <button type="button" 
                                        @click="openEdit(cat)"
                                        class="text-xs font-bold text-slate-700 hover:text-white hover:bg-[#026897] bg-white px-3 py-1.5 border border-slate-300 transition cursor-pointer">
                                    Edit
                                </button>
                                <button type="button" 
                                        @click="confirmDelete(cat)"
                                        class="text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 bg-white px-3 py-1.5 border border-rose-300 transition cursor-pointer">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    </template>

                    <!-- Empty State -->
                    <template x-if="!isLoading && items.length === 0">
                        <tr>
                            <td colspan="6" class="py-12 px-6 text-center">
                                <div class="max-w-sm mx-auto text-center space-y-2">
                                    <div class="text-3xl">📁</div>
                                    <h4 class="text-base font-black text-slate-900">No categories found</h4>
                                    <p class="text-xs text-slate-500">No categories match your search or filter criteria. Try resetting filters or adding a new category.</p>
                                    <div class="pt-2">
                                        <button type="button" @click="searchQuery = ''; selectedStatus = ''; fetchCategories(1)" class="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700">
                                            Reset Filters
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <!-- AJAX Pagination Footer (No Page Reload) -->
        <div class="px-5 py-3.5 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <!-- Counter -->
            <div class="text-slate-600 font-semibold">
                Showing <span class="font-bold text-slate-900" x-text="pagination.from"></span> to 
                <span class="font-bold text-slate-900" x-text="pagination.to"></span> of 
                <span class="font-bold text-slate-900" x-text="pagination.total"></span> categories
            </div>

            <!-- Page Buttons -->
            <div class="flex items-center gap-1" x-show="pagination.last_page > 1">
                <!-- First Page -->
                <button type="button" 
                        @click="fetchCategories(1)"
                        :disabled="pagination.current_page <= 1 || isLoading"
                        class="px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition">
                    «
                </button>

                <!-- Previous Page -->
                <button type="button" 
                        @click="fetchCategories(pagination.current_page - 1)"
                        :disabled="pagination.current_page <= 1 || isLoading"
                        class="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition">
                    Previous
                </button>

                <!-- Page Number Loop -->
                <template x-for="p in pagination.last_page" :key="p">
                    <template x-if="p === 1 || p === pagination.last_page || (p >= pagination.current_page - 2 && p <= pagination.current_page + 2)">
                        <button type="button" 
                                @click="fetchCategories(p)"
                                :disabled="isLoading"
                                :class="p === pagination.current_page ? 'bg-[#026897] text-white border-[#026897]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'"
                                class="px-3 py-1.5 border font-bold text-xs transition"
                                x-text="p">
                        </button>
                    </template>
                </template>

                <!-- Next Page -->
                <button type="button" 
                        @click="fetchCategories(pagination.current_page + 1)"
                        :disabled="pagination.current_page >= pagination.last_page || isLoading"
                        class="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition">
                    Next
                </button>

                <!-- Last Page -->
                <button type="button" 
                        @click="fetchCategories(pagination.last_page)"
                        :disabled="pagination.current_page >= pagination.last_page || isLoading"
                        class="px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition">
                    »
                </button>
            </div>
        </div>
    </div>

    <!-- Category Add / Edit Modal (Zero Radius Square Design & AJAX Submit) -->
    <div x-show="modalOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white border border-slate-300 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto" @click.away="modalOpen = false">
            <!-- Modal Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                    <h2 class="text-lg font-black text-slate-900" x-text="editMode ? 'Edit Menu Category' : 'Add New Category'"></h2>
                    <p class="text-[11px] text-slate-500 font-semibold">Configure category details and link a kitchen printer</p>
                </div>
                <button type="button" @click="modalOpen = false" class="text-slate-400 hover:text-slate-700 font-black text-lg p-1">✕</button>
            </div>

            <!-- Modal Inline Error Message -->
            <template x-if="modalError">
                <div class="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-between">
                    <span x-text="modalError"></span>
                    <button type="button" @click="modalError = null" class="font-black text-rose-600">✕</button>
                </div>
            </template>

            <!-- Form -->
            <form id="categoryForm" @submit.prevent="submitCategory()" class="space-y-4">
                @csrf
                <template x-if="editMode">
                    <input type="hidden" name="_method" value="PUT">
                </template>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Category Name *</label>
                    <input type="text" 
                           name="name" 
                           x-model="form.name" 
                           required 
                           placeholder="e.g. Starters, Main Course, Fast Food..."
                           class="w-full px-3 py-2 border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:border-[#026897] outline-none">
                </div>

                <!-- Category Image Upload with Auto Compression -->
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Category Image <span class="text-slate-400 font-normal lowercase">(optional • auto-compressed to WebP)</span>
                    </label>
                    <div class="border-2 border-dashed border-slate-300 hover:border-[#026897] p-3 bg-slate-50/60 transition">
                        <input type="file" 
                               name="image" 
                               accept="image/*" 
                               x-ref="catImageInput" 
                               @change="handleImageUpload($event)" 
                               class="hidden">
                        <input type="hidden" name="remove_image" :value="removeImage ? '1' : '0'">

                        <div class="flex items-center gap-3">
                            <!-- Thumbnail Preview -->
                            <div class="w-14 h-14 bg-white border border-slate-300 overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-xs">
                                <template x-if="imagePreview">
                                    <img :src="imagePreview" alt="Category Preview" class="w-full h-full object-cover">
                                </template>
                                <template x-if="!imagePreview">
                                    <div class="text-center p-1 text-slate-300">
                                        <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                        </svg>
                                        <span class="text-[8px] font-bold text-slate-400 block mt-0.5">No Image</span>
                                    </div>
                                </template>
                                <template x-if="isCompressing">
                                    <div class="absolute inset-0 bg-white/85 flex items-center justify-center">
                                        <span class="animate-spin rounded-full h-4 w-4 border-2 border-[#026897] border-t-transparent"></span>
                                    </div>
                                </template>
                            </div>

                            <!-- Controls -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <button type="button" 
                                            @click="$refs.catImageInput.click()" 
                                            class="px-3 py-1.5 bg-white border border-slate-300 hover:border-[#026897] text-slate-700 hover:text-[#026897] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                                        </svg>
                                        <span x-text="imagePreview ? 'Change Image' : 'Choose Image'"></span>
                                    </button>
                                    <template x-if="imagePreview">
                                        <button type="button" 
                                                @click="clearImage()" 
                                                class="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-800 text-xs font-bold transition cursor-pointer">
                                            Remove
                                        </button>
                                    </template>
                                </div>
                                <p class="text-[10px] text-slate-400 font-medium mt-1 truncate" x-text="compressionInfo || 'JPG, PNG, WEBP (auto-compressed)'"></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Description</label>
                    <textarea name="description" 
                              x-model="form.description" 
                              rows="2" 
                              placeholder="Optional short description..."
                              class="w-full px-3 py-2 border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:border-[#026897] outline-none"></textarea>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Branch</label>
                        <select name="branch_id" 
                                x-model="form.branch_id" 
                                class="w-full px-3 py-2 border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:border-[#026897] outline-none">
                            <option value="">Global / All Branches</option>
                            @foreach($branches as $b)
                            <option value="{{ $b->id }}">{{ $b->branch_name ?? $b->name }}</option>
                            @endforeach
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Attached Kitchen Station</label>
                        <select name="kitchen_id" 
                                x-model="form.kitchen_id" 
                                class="w-full px-3 py-2 border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:border-[#026897] outline-none">
                            <option value="">Unassigned / None</option>
                            @foreach($kitchens as $k)
                            <option value="{{ $k->id }}">
                                {{ $k->name }} ({{ $k->printer_ip ? $k->printer_ip . ':' . ($k->printer_port ?? 9100) : 'No Printer' }})
                            </option>
                            @endforeach
                        </select>
                        <p class="text-[10px] text-slate-400 mt-0.5">Dishes route to this kitchen station's printer</p>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Status *</label>
                    <select name="status" 
                            x-model="form.status" 
                            class="w-full px-3 py-2 border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:border-[#026897] outline-none">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
                    <button type="button" @click="modalOpen = false" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase cursor-pointer">
                        Cancel
                    </button>
                    <button type="submit" 
                            :disabled="isSubmitting || isCompressing"
                            class="px-5 py-2 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-xs uppercase tracking-wide shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                        <template x-if="isSubmitting">
                            <span class="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                        </template>
                        <span x-text="editMode ? 'Update Category' : 'Save Category'"></span>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Delete Confirmation Modal (Zero Radius Square Design) -->
    <div x-show="deleteModalOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white border border-slate-300 max-w-sm w-full p-5 shadow-2xl space-y-3" @click.away="deleteModalOpen = false">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 border border-rose-300 bg-rose-50 text-rose-700 flex items-center justify-center font-black text-lg flex-shrink-0">
                    ✕
                </div>
                <div>
                    <h3 class="text-sm font-black text-slate-900">Delete Category?</h3>
                    <p class="text-xs text-slate-500 mt-0.5">Dishes linked to this category will be unassigned.</p>
                </div>
            </div>

            <div class="p-3 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                Are you sure you want to delete <span class="font-bold text-slate-900" x-text="itemToDelete ? itemToDelete.name : ''"></span>?
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" @click="deleteModalOpen = false" class="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs">
                    Cancel
                </button>
                <button type="button" 
                        @click="executeDelete()" 
                        :disabled="isDeleting"
                        class="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5">
                    <template x-if="isDeleting">
                        <span class="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                    </template>
                    <span>Delete Now</span>
                </button>
            </div>
        </div>
    </div>

</div>
@endsection
