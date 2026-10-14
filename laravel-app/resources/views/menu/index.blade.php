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

window.MENU_INVENTORY_ITEMS = @json($inventoryItems);
window.DISHES_MAP = @json($menuItems->keyBy('id'));

window.menuManagementApp = function(initialCategory, rawProducts) {
    return {
        modalOpen: false,
        editMode: false,
        isSubmitting: false,
        isCompressing: false,
        imagePreview: null,
        compressionInfo: '',
        removeImage: false,
        searchQuery: '{{ request('search', '') }}',
        selectedCategory: '{{ request('category_id', '') }}',
        selectedStatus: '{{ request('status', '') }}',
        availableRawProducts: rawProducts || [],
        dishIngredients: [],
        productSearch: '',
        productDropdownOpen: false,
        selectedProductId: '',
        selectedProductName: '',
        selectedQuantity: 1,
        selectedUnit: 'PCS',
        form: {
            id: '',
            branch_id: '',
            category_id: initialCategory || '',
            name: '',
            barcode: '',
            price: 100,
            description: '',
            discount: 0,
            is_available: true,
            is_frequent: true,
            status: 'Active',
            image: null
        },
        normalizeUnit(raw) {
            if (!raw) return 'PCS';
            const u = String(raw).trim().toUpperCase();
            if (u === 'KG' || u.includes('KILO') || u.includes('KG')) return 'KG';
            if (u === 'PCS' || u === 'PC' || u.includes('PIECE') || u.includes('PCS')) return 'PCS';
            if (u.includes('LIT') || u.includes('LTR')) return 'Litre';
            if (u.includes('GM') || u.includes('GRAM')) return 'Grams';
            return u === 'KG' ? 'KG' : 'PCS';
        },
        filteredRawProducts() {
            const q = (this.productSearch || '').toLowerCase().trim();
            if (!q) return this.availableRawProducts;
            return this.availableRawProducts.filter(p => 
                (p.item_name && p.item_name.toLowerCase().includes(q)) ||
                String(p.id).includes(q) ||
                (p.sku && p.sku.toLowerCase().includes(q))
            );
        },
        selectProduct(p) {
            this.selectedProductId = p.id;
            this.selectedProductName = p.item_name;
            this.productSearch = p.item_name;
            this.selectedUnit = this.normalizeUnit(p.unit);
            this.productDropdownOpen = false;
        },
        clearProductSelection() {
            this.selectedProductId = '';
            this.selectedProductName = '';
            this.productSearch = '';
            this.selectedQuantity = 1;
            this.selectedUnit = 'PCS';
            this.productDropdownOpen = false;
        },
        matchesFilter(name, desc, catId, status) {
            const q = this.searchQuery.toLowerCase().trim();
            const catMatches = !this.selectedCategory || String(catId) === String(this.selectedCategory);
            const statusMatches = !this.selectedStatus || String(status) === String(this.selectedStatus);
            const nameMatches = !q || name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
            return catMatches && statusMatches && nameMatches;
        },
        addIngredient() {
            if (!this.selectedProductId) {
                alert('Please search and select a raw product from the list.');
                return;
            }
            const item = this.availableRawProducts.find(p => String(p.id) === String(this.selectedProductId));
            if (!item) return;

            const qty = parseFloat(this.selectedQuantity) || 1;
            const unit = this.normalizeUnit(this.selectedUnit || item.unit);

            const existing = this.dishIngredients.find(i => String(i.product_id) === String(item.id));
            if (existing) {
                existing.quantity = Math.round((parseFloat(existing.quantity) + qty) * 1000) / 1000;
                existing.unit = unit;
            } else {
                this.dishIngredients.push({
                    product_id: item.id,
                    product_name: item.item_name,
                    quantity: qty,
                    unit: unit
                });
            }

            this.clearProductSelection();
        },
        removeIngredient(index) {
            this.dishIngredients.splice(index, 1);
        },
        openEdit(item) {
            if (!item) return;
            this.editMode = true;
            this.form = {
                id: item.id,
                branch_id: item.branch_id || '',
                category_id: item.category_id || '',
                name: item.name || '',
                barcode: item.barcode || '',
                price: item.price || 0,
                description: item.description || '',
                discount: item.discount || 0,
                is_available: Boolean(item.is_available),
                is_frequent: Boolean(item.is_frequent),
                status: item.status || 'Active',
                image: item.image || null
            };
            this.imagePreview = item.image ? ('/storage/' + item.image) : null;
            this.compressionInfo = item.image ? 'Current stored image' : '';
            this.removeImage = false;
            if (this.$refs.imageInput) {
                this.$refs.imageInput.value = '';
            }

            // Populate dish raw ingredients
            this.dishIngredients = (item.recipes || []).map(r => ({
                product_id: r.inventory_item_id,
                product_name: r.inventory_item ? r.inventory_item.item_name : ('Product #' + r.inventory_item_id),
                quantity: parseFloat(r.quantity_required) || 1,
                unit: this.normalizeUnit(r.unit || (r.inventory_item ? r.inventory_item.unit : 'PCS'))
            }));

            this.clearProductSelection();
            this.modalOpen = true;
        },
        openCreate() {
            this.editMode = false;
            this.form = {
                id: '',
                branch_id: '',
                category_id: initialCategory || '',
                name: '',
                barcode: '',
                price: 100,
                description: '',
                discount: 0,
                is_available: true,
                is_frequent: true,
                status: 'Active',
                image: null
            };
            this.imagePreview = null;
            this.compressionInfo = '';
            this.removeImage = false;
            if (this.$refs.imageInput) {
                this.$refs.imageInput.value = '';
            }
            this.dishIngredients = [];
            this.clearProductSelection();
            this.modalOpen = true;
        },
        clearImage() {
            this.imagePreview = null;
            this.compressionInfo = '';
            this.removeImage = true;
            if (this.$refs.imageInput) {
                this.$refs.imageInput.value = '';
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
    };
};
</script>

<div class="space-y-6" x-data="menuManagementApp('{{ $categories->first()->id ?? '' }}', window.MENU_INVENTORY_ITEMS)">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Menu Catalog & Recipe Ingredients</h1>
            <p class="text-slate-500 text-sm font-medium">Manage dishes, raw product recipes / bill of materials, prices, and availability</p>
        </div>
        <div class="flex gap-3">
            <a href="{{ route('categories.index') }}" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition">Categories</a>
            <button @click="openCreate()"
                    class="px-5 py-2.5 rounded-xl bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                <span>Add New Dish</span>
            </button>
        </div>
    </div>

    <!-- Flash Messages -->
    @if(session('success'))
    <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold shadow-sm flex items-center justify-between">
        <span>{{ session('success') }}</span>
        <button onclick="this.parentElement.remove()" class="text-emerald-600 hover:text-emerald-900 font-extrabold">✕</button>
    </div>
    @endif
    @if(session('error'))
    <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold shadow-sm flex items-center justify-between">
        <span>{{ session('error') }}</span>
        <button onclick="this.parentElement.remove()" class="text-rose-600 hover:text-rose-900 font-extrabold">✕</button>
    </div>
    @endif
    @if($errors->any())
    <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold shadow-sm">
        <ul class="list-disc pl-5 space-y-1">
            @foreach($errors->all() as $err)
                <li>{{ $err }}</li>
            @endforeach
        </ul>
    </div>
    @endif

    <!-- Filter & Search Bar -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Dish Name Search Field -->
        <div class="flex-1 w-full relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </div>
            <input type="text" x-model="searchQuery" placeholder="Search menu dishes by name or description..." 
                   class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#026897] transition">
        </div>

        <!-- Category Dropdown Filter -->
        <div class="w-full md:w-64 flex items-center gap-2">
            <label class="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Category:</label>
            <select x-model="selectedCategory" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#026897]">
                <option value="" class="font-bold text-slate-900">All Categories ({{ $categories->count() }})</option>
                @foreach($categories as $c)
                <option value="{{ $c->id }}" class="font-bold text-slate-900">{{ $c->name }}</option>
                @endforeach
            </select>
        </div>

        <!-- Status Filter -->
        <div class="w-full md:w-48 flex items-center gap-2">
            <label class="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Status:</label>
            <select x-model="selectedStatus" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#026897]">
                <option value="" class="font-bold text-slate-900">All Statuses</option>
                <option value="Active" class="font-bold text-slate-900">Active</option>
                <option value="Inactive" class="font-bold text-slate-900">Inactive</option>
            </select>
        </div>

        <!-- Reset Button -->
        <button x-show="searchQuery !== '' || selectedCategory !== '' || selectedStatus !== ''" 
                @click="searchQuery = ''; selectedCategory = ''; selectedStatus = ''"
                class="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer">
            Clear Filters
        </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[1100px]">
            <thead>
                <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                    <th class="py-4 px-4">Dish & Ingredients</th>
                    <th class="py-4 px-4">Category</th>
                    <th class="py-4 px-4">Barcode</th>
                    <th class="py-4 px-4">Price</th>
                    <th class="py-4 px-4">Discount</th>
                    <th class="py-4 px-4">Branch</th>
                    <th class="py-4 px-4">Available</th>
                    <th class="py-4 px-4">Frequent</th>
                    <th class="py-4 px-4">Status</th>
                    <th class="py-4 px-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                @foreach($menuItems as $m)
                <tr x-show="matchesFilter(@js($m->name), @js($m->description ?? ''), '{{ $m->category_id }}', '{{ $m->status }}')" 
                    class="hover:bg-slate-50/50 transition">
                    <td class="py-3 px-4">
                        <div class="flex items-start gap-3">
                            <div class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs mt-0.5">
                                @if($m->image)
                                    <img src="{{ asset('storage/' . $m->image) }}" alt="{{ $m->name }}" class="w-full h-full object-cover">
                                @else
                                    <svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                @endif
                            </div>
                            <div>
                                <div class="font-extrabold text-slate-900 leading-snug">{{ $m->name }}</div>
                                <div class="text-xs font-semibold text-slate-400">#{{ $m->id }}</div>
                                @if($m->description)
                                    <div class="text-xs text-slate-400 truncate max-w-[220px]">{{ $m->description }}</div>
                                @endif

                                <!-- Raw Products / Recipe Ingredients Badge -->
                                @if($m->recipes && $m->recipes->isNotEmpty())
                                    <div class="mt-1.5 flex flex-wrap items-center gap-1">
                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-50 text-[#026897] border border-sky-100">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                            </svg>
                                            {{ $m->recipes->count() }} Raw {{ Str::plural('Product', $m->recipes->count()) }}
                                        </span>
                                        @foreach($m->recipes->take(2) as $r)
                                            <span class="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[130px]" title="{{ $r->inventoryItem->item_name ?? 'Product' }}: {{ $r->quantity_required }} {{ $r->unit }}">
                                                {{ $r->inventoryItem->item_name ?? 'Product' }} ({{ $r->quantity_required }} {{ $r->unit }})
                                            </span>
                                        @endforeach
                                        @if($m->recipes->count() > 2)
                                            <span class="text-[10px] text-slate-400 font-bold self-center">+{{ $m->recipes->count() - 2 }} more</span>
                                        @endif
                                    </div>
                                @else
                                    <div class="mt-1 text-[11px] text-slate-400 italic">No raw products linked</div>
                                @endif
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-4 font-bold text-orange-600 whitespace-nowrap">{{ $m->category->name ?? '-' }}</td>
                    <td class="py-3 px-4 text-slate-500 font-mono text-xs">{{ $m->barcode ?? '-' }}</td>
                    <td class="py-3 px-4 font-black text-slate-900 whitespace-nowrap">{{ number_format($m->price, 2) }}</td>
                    <td class="py-3 px-4 font-bold text-slate-600">{{ $m->discount ?? 0 }}%</td>
                    <td class="py-3 px-4 font-semibold whitespace-nowrap">{{ $m->branch->branch_name ?? $m->branch->name ?? 'Global' }}</td>
                    <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold {{ $m->is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800' }}">
                            {{ $m->is_available ? 'Yes' : 'No' }}
                        </span>
                    </td>
                    <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold {{ $m->is_frequent ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500' }}">
                            {{ $m->is_frequent ? 'Yes' : 'No' }}
                        </span>
                    </td>
                    <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold {{ $m->status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800' }}">
                            {{ $m->status }}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-right whitespace-nowrap space-x-1">
                        <button type="button" 
                                @click="openEdit(window.DISHES_MAP[{{ $m->id }}])"
                                class="text-xs font-bold text-slate-700 hover:text-orange-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer">
                            Edit
                        </button>
                        <form method="POST" action="{{ route('menu.destroy', $m->id) }}" class="inline-block" onsubmit="return confirm('Delete dish?')">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition cursor-pointer">Delete</button>
                        </form>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @if($menuItems->hasPages())
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            {{ $menuItems->links() }}
        </div>
        @endif
    </div>

    <!-- Modal Dialog for Create & Edit (Split 2 Columns) -->
    <div x-show="modalOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-md max-w-5xl w-full shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden" 
             @click.away="modalOpen = false">
            
            <!-- Modal Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex-shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-md bg-[#026897] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-base font-extrabold text-slate-900 tracking-tight" x-text="editMode ? 'Edit Dish & Recipe BOM' : 'Add New Dish & Recipe BOM'"></h2>
                        <p class="text-xs text-slate-500 font-medium">Split view: Dish profile on the left, raw products recipe ingredients on the right</p>
                    </div>
                </div>
                <button type="button" @click="modalOpen = false" class="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer font-bold text-sm">✕</button>
            </div>

            <!-- Modal Form with 2 Sides -->
            <form id="menuForm" 
                  :action="editMode ? ('{{ url('menu') }}/' + form.id) : '{{ route('menu.store') }}'" 
                  method="POST" 
                  enctype="multipart/form-data" 
                  class="flex flex-col flex-1 overflow-hidden"
                  @submit="isSubmitting = true">
                @csrf
                <template x-if="editMode">
                    <input type="hidden" name="_method" value="PUT">
                </template>

                <!-- Hidden inputs for Raw Products / Ingredients (synced into recipes table) -->
                <template x-for="(ing, idx) in dishIngredients" :key="idx">
                    <div>
                        <input type="hidden" :name="'ingredients[' + idx + '][product_id]'" :value="ing.product_id">
                        <input type="hidden" :name="'ingredients[' + idx + '][product_name]'" :value="ing.product_name">
                        <input type="hidden" :name="'ingredients[' + idx + '][quantity]'" :value="ing.quantity">
                        <input type="hidden" :name="'ingredients[' + idx + '][unit]'" :value="ing.unit">
                    </div>
                </template>

                <!-- Two-Column Layout Container -->
                <div class="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    
                    <!-- LEFT COLUMN: Dish Details -->
                    <div class="p-6 space-y-4 bg-white">
                        <div class="flex items-center gap-2 pb-2 border-b border-slate-200">
                            <span class="px-2 py-0.5 rounded-md bg-sky-100 text-[#026897] font-extrabold text-xs">1</span>
                            <h3 class="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Dish Details</h3>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Category *</label>
                                <select name="category_id" x-model="form.category_id" class="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-semibold bg-white text-slate-900 focus:border-[#026897] focus:ring-1 focus:ring-[#026897]">
                                    <option value="" class="text-slate-900 bg-white font-bold">Unassigned / None</option>
                                    @foreach($categories as $c)
                                    <option value="{{ $c->id }}" class="text-slate-900 bg-white font-bold">{{ $c->name }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Price *</label>
                                <input type="number" step="0.01" name="price" x-model="form.price" required class="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:border-[#026897] focus:ring-1 focus:ring-[#026897]">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Dish Name *</label>
                                <input type="text" name="name" x-model="form.name" required class="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:border-[#026897] focus:ring-1 focus:ring-[#026897]">
                            </div>
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Barcode</label>
                                <input type="text" name="barcode" x-model="form.barcode" class="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:border-[#026897] focus:ring-1 focus:ring-[#026897]" placeholder="e.g. 1234567890">
                            </div>
                        </div>

                        <!-- Dish Image Upload (Optional with Auto Compression) -->
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                                Dish Image <span class="text-slate-400 font-normal lowercase">(optional • auto-compressed)</span>
                            </label>
                            <div class="border-2 border-dashed border-slate-200 hover:border-[#026897] rounded-md p-3 bg-slate-50/60 transition">
                                <input type="file" 
                                       name="image" 
                                       accept="image/*" 
                                       x-ref="imageInput" 
                                       @change="handleImageUpload($event)" 
                                       class="hidden">
                                <input type="hidden" name="remove_image" :value="removeImage ? '1' : '0'">

                                <div class="flex items-center gap-4">
                                    <!-- Thumbnail Preview -->
                                    <div class="w-16 h-16 rounded-md bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-xs">
                                        <template x-if="imagePreview">
                                            <img :src="imagePreview" alt="Dish Preview" class="w-full h-full object-cover">
                                        </template>
                                        <template x-if="!imagePreview">
                                            <div class="text-center p-1 text-slate-300">
                                                <svg class="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
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
                                                    @click="$refs.imageInput.click()" 
                                                    class="px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:border-[#026897] text-slate-700 hover:text-[#026897] text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                                                </svg>
                                                <span x-text="imagePreview ? 'Change Image' : 'Choose Image'"></span>
                                            </button>
                                            <template x-if="imagePreview">
                                                <button type="button" 
                                                        @click="clearImage()" 
                                                        class="px-2.5 py-1.5 rounded-md bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-800 text-xs font-bold transition cursor-pointer">
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
                            <textarea name="description" x-model="form.description" rows="2" class="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:border-[#026897] focus:ring-1 focus:ring-[#026897]" placeholder="Briefly describe dish ingredients and flavor..."></textarea>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Branch</label>
                                <select name="branch_id" x-model="form.branch_id" class="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-semibold bg-white text-slate-900 focus:border-[#026897] focus:ring-1 focus:ring-[#026897]">
                                    <option value="" class="text-slate-900 bg-white font-bold">Global / All Branches</option>
                                    @foreach($branches as $b)
                                    <option value="{{ $b->id }}" class="text-slate-900 bg-white font-bold">{{ $b->branch_name ?? $b->name }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Discount (%)</label>
                                <input type="number" name="discount" x-model="form.discount" min="0" max="100" class="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:border-[#026897] focus:ring-1 focus:ring-[#026897]">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4 pt-1">
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Status</label>
                                <select name="status" x-model="form.status" class="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-semibold bg-white text-slate-900 focus:border-[#026897] focus:ring-1 focus:ring-[#026897]">
                                    <option value="Active" class="text-slate-900 bg-white font-bold">Active</option>
                                    <option value="Inactive" class="text-slate-900 bg-white font-bold">Inactive</option>
                                </select>
                            </div>
                            <div class="flex flex-col justify-end">
                                <div class="flex items-center gap-4 py-2">
                                    <div class="flex items-center gap-2">
                                        <input type="checkbox" name="is_available" id="is_avail" x-model="form.is_available" value="1" class="w-4 h-4 rounded text-[#026897]">
                                        <label for="is_avail" class="text-xs font-bold text-slate-700 cursor-pointer">Available</label>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <input type="checkbox" name="is_frequent" id="is_freq" x-model="form.is_frequent" value="1" class="w-4 h-4 rounded text-[#026897]">
                                        <label for="is_freq" class="text-xs font-bold text-slate-700 cursor-pointer">Frequent Item</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: Raw Products Included (Recipe BOM) -->
                    <div class="p-6 space-y-4 bg-slate-50/60 flex flex-col justify-between">
                        <div class="space-y-4">
                            <!-- Section Header -->
                            <div class="flex items-center justify-between pb-2 border-b border-slate-200">
                                <div class="flex items-center gap-2">
                                    <span class="px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 font-extrabold text-xs">2</span>
                                    <h3 class="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Raw Products Included</h3>
                                </div>
                                <span class="text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-300 shadow-xs" 
                                      x-text="dishIngredients.length + ' ' + (dishIngredients.length === 1 ? 'Product' : 'Products')"></span>
                            </div>

                            <!-- Add Raw Product Card -->
                            <div class="bg-white p-3.5 rounded-md border border-slate-200 shadow-xs space-y-3">
                                <!-- Filterable Raw Product Searchable Dropdown -->
                                <div class="relative" @click.away="productDropdownOpen = false">
                                    <label class="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">
                                        Select Raw Product (Inventory Item)
                                    </label>
                                    
                                    <div class="relative">
                                        <div class="flex items-center w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus-within:ring-1 focus-within:ring-[#026897] focus-within:border-[#026897] transition shadow-xs">
                                            <svg class="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                            </svg>
                                            <input type="text" 
                                                   x-model="productSearch" 
                                                   @focus="productDropdownOpen = true" 
                                                   @input="productDropdownOpen = true; selectedProductId = ''"
                                                   placeholder="Type to filter raw products (e.g. Cheese, Dough, Sauce)..."
                                                   class="w-full text-xs font-bold text-slate-900 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-400 placeholder:font-normal">
                                            
                                            <template x-if="productSearch || selectedProductId">
                                                <button type="button" 
                                                        @click="clearProductSelection()" 
                                                        class="text-slate-400 hover:text-rose-500 font-black text-xs px-1 cursor-pointer" 
                                                        title="Clear">
                                                    ✕
                                                </button>
                                            </template>
                                            
                                            <button type="button" 
                                                    @click="productDropdownOpen = !productDropdownOpen" 
                                                    class="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
                                                <svg class="w-4 h-4 transition-transform" :class="productDropdownOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                </svg>
                                            </button>
                                        </div>

                                        <!-- Dropdown List of Filtered Items -->
                                        <div x-show="productDropdownOpen" 
                                             x-cloak
                                             x-transition:enter="transition ease-out duration-100"
                                             x-transition:enter-start="opacity-0 scale-95"
                                             x-transition:enter-end="opacity-100 scale-100"
                                             x-transition:leave="transition ease-in duration-75"
                                             x-transition:leave-start="opacity-100 scale-100"
                                             x-transition:leave-end="opacity-0 scale-95"
                                             class="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-white rounded-md border border-slate-300 shadow-xl divide-y divide-slate-100">
                                            <template x-for="p in filteredRawProducts()" :key="p.id">
                                                <div @click="selectProduct(p)" 
                                                     class="px-3.5 py-2.5 hover:bg-sky-50/80 cursor-pointer flex items-center justify-between transition group"
                                                     :class="String(selectedProductId) === String(p.id) ? 'bg-sky-50/90 font-black' : ''">
                                                    <div class="flex items-center gap-2 min-w-0">
                                                        <span class="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold" x-text="'#' + p.id"></span>
                                                        <span class="text-xs text-slate-800 group-hover:text-[#026897] truncate" x-text="p.item_name"></span>
                                                    </div>
                                                    <div class="flex items-center gap-2 flex-shrink-0">
                                                        <span class="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-extrabold uppercase" 
                                                              x-text="normalizeUnit(p.unit)"></span>
                                                        <template x-if="String(selectedProductId) === String(p.id)">
                                                            <svg class="w-4 h-4 text-[#026897]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                              </svg>
                                                        </template>
                                                    </div>
                                                </div>
                                            </template>
                                            <template x-if="filteredRawProducts().length === 0">
                                                <div class="px-4 py-4 text-center text-xs text-slate-400 font-medium">
                                                    No raw products matching "<span class="font-bold text-slate-600" x-text="productSearch"></span>"
                                                </div>
                                            </template>
                                        </div>
                                    </div>
                                </div>

                                <!-- Spacious Row for Quantity, Unit and Add Button -->
                                <div style="display: flex; gap: 10px; align-items: flex-end;">
                                    <div style="flex: 1; min-width: 0;">
                                        <label class="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">Quantity *</label>
                                        <input type="number" 
                                               step="0.001" 
                                               min="0.001" 
                                               x-model.number="selectedQuantity" 
                                               placeholder="e.g. 1"
                                               style="width: 100%; height: 38px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; font-weight: 700; color: #0f172a; background: #fff; box-sizing: border-box;">
                                    </div>
                                    <div style="width: 130px; flex-shrink: 0;">
                                        <label class="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">Unit</label>
                                        <select x-model="selectedUnit" 
                                                style="width: 100%; height: 38px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; font-weight: 700; color: #0f172a; background: #fff; box-sizing: border-box; cursor: pointer;">
                                            <option value="PCS">PCS</option>
                                            <option value="KG">KG</option>
                                            <option value="Grams">Grams</option>
                                            <option value="Litre">Litre</option>
                                        </select>
                                    </div>
                                    <div style="flex-shrink: 0;">
                                        <button type="button" 
                                                @click="addIngredient()" 
                                                style="height: 38px; padding: 0 18px; border-radius: 4px; background-color: #026897; color: #ffffff; font-size: 13px; font-weight: 700; border: none; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                                            <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                                            </svg>
                                            <span>Add</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- List of Raw Products -->
                            <div class="space-y-2">
                                <div class="flex items-center justify-between text-xs font-bold text-slate-600 uppercase px-1">
                                    <span>Included Products List</span>
                                    <span class="text-[10px] text-slate-400 font-semibold lowercase">quantities editable below</span>
                                </div>

                                <!-- Empty State -->
                                <template x-if="dishIngredients.length === 0">
                                    <div class="p-6 text-center border-2 border-dashed border-slate-200 rounded-md bg-white">
                                        <div class="w-9 h-9 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                            </svg>
                                        </div>
                                        <div class="text-xs font-extrabold text-slate-700">No Raw Products Added Yet</div>
                                        <div class="text-[11px] text-slate-400 mt-0.5">Select a raw item above and click "+ Add" to link it to this dish recipe.</div>
                                    </div>
                                </template>

                                <!-- Table / List of Added Products -->
                                <template x-if="dishIngredients.length > 0">
                                    <div style="border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #fff; max-height: 220px; overflow-y: auto;">
                                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
                                            <thead>
                                                <tr style="background-color: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                                                    <th style="padding: 8px 10px; width: 55px;">ID</th>
                                                    <th style="padding: 8px 10px;">Product Name</th>
                                                    <th style="padding: 8px 10px; width: 85px; text-align: center;">Quantity</th>
                                                    <th style="padding: 8px 10px; width: 100px; text-align: center;">Unit</th>
                                                    <th style="padding: 8px 10px; width: 40px; text-align: center;">Del</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <template x-for="(ing, idx) in dishIngredients" :key="idx">
                                                    <tr style="border-bottom: 1px solid #f1f5f9;">
                                                        <td style="padding: 8px 10px;">
                                                            <span style="background-color: #f1f5f9; color: #334155; font-family: monospace; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px;" x-text="'#' + ing.product_id"></span>
                                                        </td>
                                                        <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;" x-text="ing.product_name"></td>
                                                        <td style="padding: 8px 10px; text-align: center;">
                                                            <input type="number" 
                                                                   step="0.001" 
                                                                   min="0.001" 
                                                                   x-model.number="ing.quantity" 
                                                                   style="width: 70px; text-align: center; font-weight: 700; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; color: #0f172a; background: #fff;">
                                                        </td>
                                                        <td style="padding: 8px 10px; text-align: center;">
                                                            <select x-model="ing.unit" 
                                                                    style="width: 90px; font-weight: 700; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; color: #0f172a; background: #fff; cursor: pointer;">
                                                                <option value="PCS">PCS</option>
                                                                <option value="KG">KG</option>
                                                                <option value="Grams">Grams</option>
                                                                <option value="Litre">Litre</option>
                                                            </select>
                                                        </td>
                                                        <td style="padding: 8px 10px; text-align: center;">
                                                            <button type="button" 
                                                                    @click="removeIngredient(idx)" 
                                                                    title="Remove raw product from recipe"
                                                                    style="color: #ef4444; background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 800; padding: 4px 8px; border-radius: 4px;">
                                                                ✕
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </template>
                                            </tbody>
                                        </table>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Mini Recipe Summary -->
                        <div class="pt-2">
                            <div class="px-3.5 py-2.5 rounded-md bg-slate-100 border border-slate-200 text-xs flex items-center justify-between text-slate-700">
                                <span class="font-bold">Inventory Consumption:</span>
                                <span class="font-bold text-[#026897]" x-text="dishIngredients.length + ' raw items deducted per dish order'"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
                    <div class="text-xs text-slate-600 font-semibold">
                        <span class="font-bold text-slate-900" x-text="dishIngredients.length"></span> raw product(s) linked in recipe
                    </div>
                    <div class="flex items-center gap-2.5">
                        <button type="button" @click="modalOpen = false" class="px-4 py-2 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer shadow-xs">
                            Cancel
                        </button>
                        <button type="submit" 
                                :disabled="isSubmitting || isCompressing"
                                class="px-5 py-2 rounded-md bg-[#026897] hover:bg-[#01547b] text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
                            <template x-if="isSubmitting">
                                <span class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                            </template>
                            <span x-text="editMode ? 'Update Dish & Recipe' : 'Save Dish & Recipe'"></span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
