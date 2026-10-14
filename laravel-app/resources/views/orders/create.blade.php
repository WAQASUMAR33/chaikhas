@extends('layouts.app')

@section('content')
<script>
window.posApp = function posApp() {
    return {
        branchId: {{ $branchId }},
        orderType: 'Dine In',
        selectedHall: '',
        selectedTable: '',
        selectedOrderTaker: '',
        selectedCategory: '',
        searchQuery: '',
        customerName: '',
        customerPhone: '',
        comments: '',
        loading: false,
        editingOrderId: null,
        editingOrderNumber: '',
        selectedRunningOrderId: '',
        showMergeModal: false,
        mergeSourceId: '',
        mergeTargetId: '',
        mergeLoading: false,
        cart: [],
        halls: @json($halls),
        tables: @json($tables),
        orderTakers: @json($orderTakers),
        categories: @json($categories),
        menuItems: @json($menuItems),
        runningOrders: @json($runningOrders),
        initialEditOrder: @json($initialEditOrder),
        showActiveOrdersDrawer: false,
        activeOrdersFilter: 'All',
        showOrderModal: false,
        modalOrder: null,
        cartDiscountType: 'fixed',
        cartDiscountValue: 0,
        modalDiscountType: 'fixed',
        modalDiscountValue: 0,
        modalDiscountInput: 0,
        modalPaymentMode: 'Cash',
        customerKhataInfo: null,
        redeemPointsInput: 0,
        modalLoading: false,
        modalActionLoading: false,
        showImages: (localStorage.getItem('pos_show_images') !== null) ? (localStorage.getItem('pos_show_images') === 'true') : true,

        toggleImages() {
            this.showImages = !this.showImages;
            localStorage.setItem('pos_show_images', this.showImages);
        },

        init() {
            if (this.initialEditOrder) {
                this.loadOrder(this.initialEditOrder);
            } else {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('order_type')) {
                    this.orderType = urlParams.get('order_type');
                }
                if (urlParams.get('hall_id')) {
                    this.selectedHall = urlParams.get('hall_id');
                }
                if (urlParams.get('table_id')) {
                    this.selectedTable = urlParams.get('table_id');
                    let foundTbl = this.tables.find(t => t.id == this.selectedTable);
                    if (foundTbl && !this.selectedHall) this.selectedHall = foundTbl.hall_id;
                }
                if (urlParams.get('order_taker_id')) {
                    this.selectedOrderTaker = urlParams.get('order_taker_id');
                } else if (@json(Auth::user()->role === 'order_taker')) {
                    this.selectedOrderTaker = {{ Auth::id() }};
                }
            }
        },

        get filteredRunningOrders() {
            if (this.activeOrdersFilter === 'All') return this.runningOrders;
            return this.runningOrders.filter(o => o.order_status === this.activeOrdersFilter);
        },

        get filteredTables() {
            if (!this.selectedHall) return [];
            return this.tables.filter(t => t.hall_id == this.selectedHall);
        },

        get filteredMenuItems() {
            return this.menuItems.filter(i => {
                let matchCat = !this.selectedCategory || i.category_id == this.selectedCategory;
                let matchSearch = !this.searchQuery || i.name.toLowerCase().includes(this.searchQuery.toLowerCase().trim());
                return matchCat && matchSearch;
            });
        },

        loadOrderById(id) {
            if (!id) {
                this.clearLoadedOrder();
                return;
            }
            let found = this.runningOrders.find(o => o.id == id);
            if (found) {
                this.loadOrder(found);
            }
        },

        loadOrder(order) {
            if (order.order_status === 'Bill Generated') {
                this.openOrderModal(order.id);
                return;
            }

            this.editingOrderId = order.id;
            this.editingOrderNumber = order.order_number;
            this.selectedRunningOrderId = order.id;
            this.orderType = order.order_type || 'Dine In';
            this.selectedTable = order.table_id || '';
            this.selectedOrderTaker = order.order_taker_id || '';
            if (order.hall_id) {
                this.selectedHall = order.hall_id;
            } else if (order.table_id) {
                let foundTbl = this.tables.find(t => t.id == order.table_id);
                if (foundTbl) this.selectedHall = foundTbl.hall_id;
            } else {
                this.selectedHall = '';
            }
            this.customerName = order.customer_name || '';
            this.customerPhone = order.customer_phone || '';
            this.comments = order.comments || '';
            this.cartDiscountType = order.discount_type || 'fixed';
            this.cartDiscountValue = parseFloat(order.discount_value !== null && order.discount_value !== undefined ? order.discount_value : (order.discount_amount || 0));

            // Load Items into Cart
            this.cart = (order.items || []).map(item => ({
                menu_item_id: item.menu_item_id,
                name: item.item_name,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity)
            }));
        },

        async openOrderModal(orderId) {
            if (!orderId) return;
            if (window.NProgress) NProgress.start();
            this.modalLoading = true;
            this.showOrderModal = true;
            try {
                const response = await fetch("/orders/" + orderId, {
                    headers: { "Accept": "application/json" }
                });
                const data = await response.json();
                if (data.success && data.order) {
                    this.modalOrder = data.order;
                    this.modalDiscountType = data.order.discount_type || 'fixed';
                    this.modalDiscountValue = parseFloat(data.order.discount_value !== null && data.order.discount_value !== undefined ? data.order.discount_value : (data.order.discount_amount || 0));
                    this.modalDiscountInput = parseFloat(data.order.discount_amount || 0);
                    this.modalPaymentMode = data.order.payment_mode || 'Cash';
                }
            } catch (e) {
                alert('Error loading order details.');
            } finally {
                this.modalLoading = false;
                if (window.NProgress) NProgress.done();
            }
        },

        async updateModalStatus(newStatus, event) {
            if (!this.modalOrder) return;

            if (newStatus === 'Cancelled') {
                let orderNo = this.modalOrder.order_number || '';
                if (!confirm("Are you sure you want to CANCEL Order #" + orderNo + "?\n\nThis will mark all items as CANCELLED and free the table.")) {
                    if (event && event.target) {
                        event.target.value = this.modalOrder.order_status;
                    }
                    return;
                }
            }

            if (window.NProgress) NProgress.start();
            this.modalActionLoading = true;
            try {
                const response = await fetch("/orders/" + this.modalOrder.id + "/status", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": "{{ csrf_token() }}",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ order_status: newStatus })
                });
                const data = await response.json();
                if (data.success && data.order) {
                    this.modalOrder = data.order;
                    this.updateRunningOrdersList(data.order);
                }
            } catch (e) {
                alert('Error updating status.');
            } finally {
                this.modalActionLoading = false;
                if (window.NProgress) NProgress.done();
            }
        },

        calculateModalDiscountAmount() {
            if (!this.modalOrder) return 0;
            let sub = parseFloat(this.modalOrder.subtotal || 0);
            let val = parseFloat(this.modalDiscountValue) || 0;
            if (this.modalDiscountType === 'percentage') {
                return Math.round((sub * val / 100) * 100) / 100;
            }
            return val;
        },

        async applyModalDiscount() {
            if (!this.modalOrder) return;
            if (window.NProgress) NProgress.start();
            this.modalActionLoading = true;
            try {
                const calculatedAmt = this.calculateModalDiscountAmount();
                const response = await fetch("/orders/" + this.modalOrder.id + "/billing", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": "{{ csrf_token() }}",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        discount_type: this.modalDiscountType,
                        discount_value: parseFloat(this.modalDiscountValue) || 0,
                        discount_amount: calculatedAmt
                    })
                });
                const data = await response.json();
                if (data.success && data.order) {
                    this.modalOrder = data.order;
                    this.modalDiscountType = data.order.discount_type || 'fixed';
                    this.modalDiscountValue = parseFloat(data.order.discount_value || 0);
                    this.modalDiscountInput = parseFloat(data.order.discount_amount || 0);
                    this.updateRunningOrdersList(data.order);
                }
            } catch (e) {
                alert('Error applying discount.');
            } finally {
                this.modalActionLoading = false;
                if (window.NProgress) NProgress.done();
            }
        },

        async lookupCustomer() {
            if (!this.customerPhone || this.customerPhone.trim().length < 4) {
                this.customerKhataInfo = null;
                return;
            }
            try {
                let res = await fetch('/customer-ledgers/lookup?phone=' + encodeURIComponent(this.customerPhone.trim()));
                let data = await res.json();
                if (data.success && data.customer) {
                    this.customerKhataInfo = data.customer;
                    if (!this.customerName) {
                        this.customerName = data.customer.name;
                    }
                } else {
                    this.customerKhataInfo = null;
                }
            } catch(e) {}
        },

        async processModalPayment() {
            if (!this.modalOrder) return;
            if (window.NProgress) NProgress.start();
            this.modalActionLoading = true;
            try {
                const response = await fetch("/orders/" + this.modalOrder.id + "/pay", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": "{{ csrf_token() }}",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ 
                        payment_mode: this.modalPaymentMode,
                        redeem_points: parseInt(this.redeemPointsInput) || 0
                    })
                });
                const data = await response.json();
                if (data.success && data.order) {
                    this.modalOrder = data.order;
                    this.updateRunningOrdersList(data.order);
                    this.clearLoadedOrder();
                }
            } catch (e) {
                alert('Error processing payment.');
            } finally {
                this.modalActionLoading = false;
                if (window.NProgress) NProgress.done();
            }
        },

        printModalReceipt(orderId) {
            let targetId = orderId || (this.modalOrder ? this.modalOrder.id : null);
            if (!targetId) return;

            let printUrl = "/orders/" + targetId + "/receipt?autoprint=1";
            let iframe = document.getElementById('receiptPrintIframe');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = 'receiptPrintIframe';
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0px';
                iframe.style.height = '0px';
                iframe.style.border = '0';
                iframe.style.visibility = 'hidden';
                document.body.appendChild(iframe);
            }
            iframe.src = printUrl;
        },

        updateRunningOrdersList(order) {
            let idx = this.runningOrders.findIndex(o => o.id === order.id);
            if (['Completed', 'Complete', 'Cancelled'].includes(order.order_status)) {
                if (idx !== -1) this.runningOrders.splice(idx, 1);
            } else {
                if (idx !== -1) {
                    this.runningOrders.splice(idx, 1, order);
                } else {
                    this.runningOrders.unshift(order);
                }
            }
        },

        clearLoadedOrder() {
            this.editingOrderId = null;
            this.editingOrderNumber = '';
            this.selectedRunningOrderId = '';
            this.selectedOrderTaker = '';
            this.customerName = '';
            this.customerPhone = '';
            this.comments = '';
            this.cartDiscountType = 'fixed';
            this.cartDiscountValue = 0;
            this.cart = [];
        },

        addToCart(item) {
            let existing = this.cart.find(c => c.menu_item_id === item.id);
            if (existing) {
                existing.quantity++;
            } else {
                this.cart.push({
                    menu_item_id: item.id,
                    name: item.name,
                    price: parseFloat(item.price),
                    quantity: 1
                });
            }
        },

        updateQty(index, delta) {
            let item = this.cart[index];
            if (!item) return;

            if (delta < 0 && item.quantity <= 1) {
                if (confirm('Do you really want to remove ' + item.name + '?')) {
                    this.cart.splice(index, 1);
                }
            } else {
                item.quantity += delta;
            }
        },

        removeItem(index) {
            let item = this.cart[index];
            if (!item) return;

            if (confirm('Do you really want to remove ' + item.name + '?')) {
                this.cart.splice(index, 1);
            }
        },

        calculateSubtotal() {
            return this.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        },

        calculateCartDiscountAmount() {
            let sub = this.calculateSubtotal();
            let val = parseFloat(this.cartDiscountValue) || 0;
            if (this.cartDiscountType === 'percentage') {
                return Math.round((sub * val / 100) * 100) / 100;
            }
            return val;
        },

        calculateCartServiceCharge() {
            if (this.orderType !== 'Dine In') return 0;
            let sub = this.calculateSubtotal();
            return Math.round((sub * 0.05) * 100) / 100;
        },

        calculateCartNetTotal() {
            let sub = this.calculateSubtotal();
            let sc = this.calculateCartServiceCharge();
            let disc = this.calculateCartDiscountAmount();
            return Math.max(0, Math.round((sub + sc - disc) * 100) / 100);
        },

        async executeMerge() {
            if (!this.mergeSourceId || !this.mergeTargetId) {
                alert('Please select both Source and Target running orders.');
                return;
            }

            if (this.mergeSourceId === this.mergeTargetId) {
                alert('Source and Target orders must be different.');
                return;
            }

            if (window.NProgress) NProgress.start();
            this.mergeLoading = true;

            try {
                const response = await fetch("{{ route('orders.merge') }}", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": "{{ csrf_token() }}",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        source_order_id: this.mergeSourceId,
                        target_order_id: this.mergeTargetId
                    })
                });

                const data = await response.json();

                if (data.success) {
                    alert(data.message || 'Orders merged successfully.');
                    window.location.href = "/orders/create?edit=" + data.target_order_id;
                } else {
                    alert(data.message || 'Error merging orders.');
                }
            } catch (e) {
                alert('Network error while merging orders.');
            } finally {
                this.mergeLoading = false;
                this.showMergeModal = false;
                if (window.NProgress) NProgress.done();
            }
        },

        async submitOrder() {
            if (this.orderType === 'Dine In') {
                if (!this.selectedHall || !this.selectedTable) {
                    alert('Please select Hall and Table for Dine In order.');
                    return;
                }
                if (!this.selectedOrderTaker) {
                    alert('Please select an Order Taker for this Dine In order.');
                    return;
                }
            }

            if (window.NProgress) NProgress.start();
            this.loading = true;

            try {
                const response = await fetch("{{ route('orders.store') }}", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": "{{ csrf_token() }}",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        order_id: this.editingOrderId,
                        branch_id: this.branchId,
                        order_type: this.orderType,
                        hall_id: this.selectedHall,
                        table_id: this.selectedTable,
                        order_taker_id: this.selectedOrderTaker,
                        customer_name: this.customerName,
                        customer_phone: this.customerPhone,
                        comments: this.comments,
                        discount_type: this.cartDiscountType,
                        discount_value: parseFloat(this.cartDiscountValue) || 0,
                        discount_amount: this.calculateCartDiscountAmount(),
                        items: this.cart
                    })
                });

                const data = await response.json();

                if (data.success) {
                    this.clearLoadedOrder();
                    await this.openOrderModal(data.order_id);
                } else {
                    alert(data.message || 'Error processing order.');
                }
            } catch (e) {
                alert('Network error while saving order.');
            } finally {
                this.loading = false;
                if (window.NProgress) NProgress.done();
            }
        }
    }
}
</script>

<div x-data="posApp()" class="space-y-3">
    
    <!-- POS Quick Action Header Bar (Sticky) -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 border-b border-slate-200/80 shadow-xs sticky top-0 z-20">
        <div class="flex items-center gap-3">
            <button @click="showActiveOrdersDrawer = true" class="px-4 py-2 bg-[#026897] hover:bg-[#01547b] text-white font-extrabold text-xs shadow-xs rounded-lg transition flex items-center gap-2 cursor-pointer">
                <span class="text-amber-400">⚡</span>
                <span>Running Bills & Active Orders</span>
                <span class="px-2.5 py-0.5 bg-[#0284c7] rounded-full text-[10px] text-white font-black" x-text="runningOrders.length + ' Active'"></span>
            </button>

            <template x-if="editingOrderId">
                <div class="flex items-center gap-2 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-md text-xs font-extrabold text-emerald-900">
                    <span>Editing Order #<span x-text="editingOrderNumber"></span></span>
                    <button @click="clearLoadedOrder()" class="text-slate-700 hover:bg-slate-200 px-1.5 py-0.5 rounded-sm transition">
                        ✖
                    </button>
                </div>
            </template>
        </div>

        <button @click="showMergeModal = true" class="px-4 py-2 bg-white hover:bg-sky-50 text-[#026897] border border-[#0284c7] font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer">
            🔀 Merge Two Bills
        </button>
    </div>

    <!-- POS Workspace Grid -->
    <div class="p-3 sm:p-4">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Left 7 Columns: Order Config & Item Catalog -->
        <div class="lg:col-span-7 space-y-4">
            
            <!-- Order Configuration Box -->
            <div class="bg-white p-4 border border-slate-200/80 shadow-sm space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Order Type *</label>
                        <select x-model="orderType" class="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
                            <option value="Dine In">Dine In</option>
                            <option value="Take Away">Take Away</option>
                            <option value="Delivery">Delivery</option>
                        </select>
                    </div>

                    <div x-show="orderType === 'Dine In'">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Select Hall *</label>
                        <select x-model="selectedHall" @change="selectedTable = ''" class="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
                            <option value="">Choose Hall</option>
                            <template x-for="hall in halls" :key="hall.id">
                                <option :value="hall.id" x-text="hall.name"></option>
                            </template>
                        </select>
                    </div>

                    <div x-show="orderType === 'Dine In'">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Select Table *</label>
                        <select x-model="selectedTable" class="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
                            <option value="">Choose Table</option>
                            <template x-for="table in filteredTables" :key="table.id">
                                <option :value="table.id"
                                        :style="table.id == selectedTable ? 'color: #d97706; font-weight: bold; background-color: #fef3c7;' : (table.status === 'Available' ? 'color: #059669; font-weight: bold; background-color: #ecfdf5;' : 'color: #dc2626; font-weight: bold; background-color: #fef2f2;')"
                                        x-text="(table.id == selectedTable ? '⭐ Current ' : (table.status === 'Available' ? '🟢 ' : '🔴 ')) + table.table_number + ' (' + (table.id == selectedTable ? 'Assigned' : table.status) + ')'">
                                </option>
                            </template>
                        </select>
                    </div>

                    <div x-show="orderType === 'Dine In'">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Order Taker *</label>
                        <select x-model="selectedOrderTaker" class="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
                            <option value="">Select Order Taker</option>
                            <template x-for="ot in orderTakers" :key="ot.id">
                                <option :value="ot.id" x-text="ot.name + (ot.role === 'order_taker' ? ' (Order Taker)' : '')"></option>
                            </template>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                        <input type="text" x-model="customerName" placeholder="Customer Name (Optional)" class="w-full px-4 py-2 border border-slate-200 text-sm font-medium">
                    </div>
                    <div>
                        <input type="text" x-model="customerPhone" @input.debounce.400ms="lookupCustomer()" placeholder="Customer Phone (Auto-search Khata)" class="w-full px-4 py-2 border border-slate-200 text-sm font-medium">
                    </div>
                </div>

                <!-- Customer Khata & Loyalty Badge -->
                <template x-if="customerKhataInfo">
                    <div class="p-2.5 bg-sky-50 border border-sky-200 text-xs flex flex-wrap items-center justify-between gap-2 rounded-none animate-in fade-in duration-150">
                        <div class="flex items-center gap-2">
                            <span class="font-black text-[#026897]">👤 <span x-text="customerKhataInfo.name"></span></span>
                            <span class="text-slate-400">•</span>
                            <span class="font-extrabold text-orange-600">🌟 <span x-text="customerKhataInfo.loyalty_points"></span> Loyalty Points</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-slate-600 font-bold">Khata Balance:</span>
                            <span class="font-black" :class="customerKhataInfo.current_balance > 0 ? 'text-rose-600' : 'text-emerald-700'" x-text="(window.__currencySymbol || '₨') + ' ' + parseFloat(customerKhataInfo.current_balance).toFixed(2)"></span>
                        </div>
                    </div>
                </template>
            </div>

            <!-- Item Search & Categories Bar -->
            <style>
            .category-scrollbar::-webkit-scrollbar {
                height: 6px;
            }
            .category-scrollbar::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 9999px;
            }
            .category-scrollbar::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 9999px;
            }
            .category-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #0284c7;
            }
            .category-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: #cbd5e1 #f1f5f9;
            }
            </style>
            <!-- Item Search & Categories Bar with Image Switch -->
            <div class="space-y-3">
                <div class="flex items-center gap-2.5">
                    <div class="relative flex-1">
                        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none text-sm">🔍</span>
                        <input type="text" x-model="searchQuery" placeholder="Search menu items by name..." 
                               class="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 shadow-xs font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
                        <template x-if="searchQuery">
                            <button @click="searchQuery = ''" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 text-xs font-extrabold cursor-pointer">
                                ✖ Clear
                            </button>
                        </template>
                    </div>

                    <!-- Switch Button: Show / Hide Images -->
                    <button type="button" 
                            @click="toggleImages()" 
                            class="px-3.5 py-2 rounded-lg border font-extrabold text-xs transition flex items-center gap-2.5 cursor-pointer shadow-xs select-none shrink-0"
                            :class="showImages ? 'bg-sky-50 border-[#0284c7] text-[#026897]' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'">
                        <span class="text-xs">📷</span>
                        <span x-text="showImages ? 'Images On' : 'Images Off'"></span>
                        <!-- Toggle Switch Pill -->
                        <div class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out p-0.5"
                             :class="showImages ? 'bg-[#026897]' : 'bg-slate-300'">
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out"
                                  :class="showImages ? 'translate-x-4' : 'translate-x-0'"></span>
                        </div>
                    </button>
                </div>

                <!-- Categories Tabs with Category Images -->
                <div class="flex items-center gap-2 overflow-x-auto pb-2 category-scrollbar"
                     @wheel.prevent="$el.scrollLeft += $event.deltaY">
                    <button @click="selectedCategory = ''"
                            :class="selectedCategory === '' ? 'bg-[#026897] text-white shadow-md' : 'bg-white text-slate-700 hover:bg-sky-50 border border-slate-200'"
                            class="px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition cursor-pointer shrink-0">
                        All Categories
                    </button>
                    <template x-for="cat in categories" :key="cat.id">
                        <button @click="selectedCategory = cat.id"
                                :class="selectedCategory === cat.id ? 'bg-[#026897] text-white shadow-md' : 'bg-white text-slate-700 hover:bg-sky-50 border border-slate-200'"
                                class="px-3.5 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-2">
                            <template x-if="showImages && cat.image">
                                <img :src="'/storage/' + cat.image" :alt="cat.name" class="w-5 h-5 rounded-md object-cover shadow-2xs border border-white/20">
                            </template>
                            <span x-text="cat.name"></span>
                        </button>
                    </template>
                </div>
            </div>

            <!-- Menu Items Grid with 5 Square-Sized Widgets per Row -->
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[640px] overflow-y-auto p-1">
                <template x-for="item in filteredMenuItems" :key="item.id">
                    <div @click="addToCart(item)" 
                         class="relative rounded-2xl border overflow-hidden shadow-xs hover:shadow-md hover:border-[#0284c7] transition duration-200 cursor-pointer flex flex-col justify-between group aspect-square p-3.5 select-none"
                         :class="(showImages && item.image) ? 'border-slate-800/40 text-white bg-slate-950' : 'bg-white border-slate-200/90 text-slate-900'"
                         style="aspect-ratio: 1 / 1;">

                        <!-- Slightly Blurred Background Image Layer (when image is present) -->
                        <div x-show="showImages && item.image" class="absolute inset-0 overflow-hidden pointer-events-none">
                            <img :src="item.image ? ('/storage/' + item.image) : ''"
                                 :alt="item.name"
                                 class="w-full h-full object-cover filter blur-[2px] scale-105 transition duration-300 group-hover:scale-110">
                            <!-- Dark gradient tint for strong foreground contrast -->
                            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/65 to-slate-950/50 group-hover:from-slate-950/95 transition"></div>
                        </div>

                        <!-- Foreground Header & Dish Details (Bold & Highly Visible) -->
                        <div class="relative z-10">
                            <h3 class="font-black text-sm leading-tight line-clamp-2"
                                :class="(showImages && item.image) ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]' : 'text-slate-900 group-hover:text-[#026897]'"
                                x-text="item.name"></h3>
                            <p class="text-xs mt-1 line-clamp-2 leading-relaxed"
                               :class="(showImages && item.image) ? 'text-slate-100/95 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]' : 'text-slate-500 font-medium'"
                               x-text="item.description || ''"></p>
                        </div>

                        <!-- Foreground Footer & Price Badge -->
                        <div class="relative z-10 mt-auto pt-2 flex items-center justify-between"
                             :class="(showImages && item.image) ? 'border-t border-white/25' : 'border-t border-slate-100'">
                            <span class="text-[10px] font-extrabold uppercase tracking-wider"
                                  :class="(showImages && item.image) ? 'text-white/90 drop-shadow-xs' : 'text-slate-400'">{{ __('Price') }}</span>
                            <span class="text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap"
                                  :class="(showImages && item.image) ? 'bg-[#0284c7] text-white shadow-md' : 'bg-[#0284c7] text-white'">
                                <span x-text="window.__currencySymbol || '₨'"></span> <span x-text="parseFloat(item.price).toFixed(2)"></span>
                            </span>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <!-- Right 5 Columns: Cart & Order Receipt Summary -->
        <div class="lg:col-span-5">
            <div class="bg-white border border-slate-200/80 shadow-lg p-6 flex flex-col h-full sticky top-4">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                        <h2 class="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                            <svg class="w-5 h-5 text-[#026897]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z"></path></svg>
                            {{ __('Current Order') }}
                        </h2>
                        <template x-if="editingOrderId">
                            <span class="text-xs font-bold text-amber-700">Updating Running Bill</span>
                        </template>
                    </div>
                    <span class="px-3 py-1 bg-sky-100 text-[#026897] text-xs font-bold" x-text="cart.length + ' Items'"></span>
                </div>

                <!-- Cart Items List -->
                <div class="flex-1 overflow-y-auto py-4 space-y-3 max-h-[380px]">
                    <template x-if="cart.length === 0">
                        <div class="text-center py-12 text-slate-400">
                            <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                            <p class="font-bold text-sm">{{ __('Cart is empty') }}</p>
                            <p class="text-xs text-slate-400">{{ __('Add items to get started') }}</p>
                        </div>
                    </template>

                    <template x-for="(cItem, index) in cart" :key="index">
                        <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80">
                            <div class="flex-1 pr-3">
                                <h4 class="font-bold text-slate-900 text-sm" x-text="cItem.name"></h4>
                                <span class="text-xs text-slate-500 font-semibold"><span x-text="window.__currencySymbol || '₨'"></span> <span x-text="cItem.price.toFixed(2)"></span></span>
                            </div>

                            <div class="flex items-center gap-3">
                                <div class="flex items-center border border-slate-300 bg-white">
                                    <button @click="updateQty(index, -1)" class="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100">-</button>
                                    <span class="w-8 text-center text-xs font-extrabold text-slate-900" x-text="cItem.quantity"></span>
                                    <button @click="updateQty(index, 1)" class="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100">+</button>
                                </div>
                                <span class="font-extrabold text-slate-900 text-sm w-20 text-right"><span x-text="window.__currencySymbol || '₨'"></span> <span x-text="(cItem.price * cItem.quantity).toFixed(2)"></span></span>
                                <button @click="removeItem(index)" class="text-rose-500 hover:text-rose-700 p-1">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                    </template>
                </div>

                <!-- Order Comments / Instructions -->
                <div class="pt-3 border-t border-slate-100">
                    <textarea x-model="comments" placeholder="Kitchen instructions or notes..." rows="2" class="w-full p-2 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0284c7] rounded-lg"></textarea>
                </div>

                <!-- Cart Discount Section -->
                <div class="pt-3 border-t border-slate-100 space-y-2">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                            🏷️ {{ __('Discount') }}
                        </label>
                        <!-- Mode Switcher Toggle -->
                        <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                            <button @click="cartDiscountType = 'fixed'" 
                                    :class="cartDiscountType === 'fixed' ? 'bg-white text-[#026897] shadow-xs' : 'text-slate-500 hover:text-slate-800'" 
                                    class="px-2 py-0.5 rounded-md transition">
                                <span x-text="window.__currencySymbol || '₨'"></span> Fixed
                            </button>
                            <button @click="cartDiscountType = 'percentage'" 
                                    :class="cartDiscountType === 'percentage' ? 'bg-white text-[#026897] shadow-xs' : 'text-slate-500 hover:text-slate-800'" 
                                    class="px-2 py-0.5 rounded-md transition">
                                % Percent
                            </button>
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <div class="relative flex-1">
                            <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs font-extrabold text-slate-400 pointer-events-none" x-text="cartDiscountType === 'fixed' ? (window.__currencySymbol || '₨') : '%'"></span>
                            <input type="number" :step="cartDiscountType === 'fixed' ? '0.01' : '0.1'" min="0" :max="cartDiscountType === 'percentage' ? '100' : ''" 
                                   x-model="cartDiscountValue" 
                                   :placeholder="cartDiscountType === 'fixed' ? '0.00' : '0 %'" 
                                   class="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0284c7]">
                        </div>
                        <template x-if="cartDiscountValue > 0">
                            <button @click="cartDiscountValue = 0" class="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition">
                                Clear
                            </button>
                        </template>
                    </div>
                </div>

                <!-- Totals Summary & Submit Button -->
                <div class="pt-3 border-t border-slate-100 space-y-2 text-xs font-bold text-slate-600">
                    <div class="flex items-center justify-between">
                        <span>{{ __('Subtotal') }}</span>
                        <span class="text-slate-900 font-extrabold"><span x-text="window.__currencySymbol || '₨'"></span> <span x-text="calculateSubtotal().toFixed(2)"></span></span>
                    </div>

                    <div class="flex items-center justify-between" x-show="orderType === 'Dine In'">
                        <span>Service Charge (5%)</span>
                        <span class="text-slate-900 font-extrabold">+ <span x-text="window.__currencySymbol || '₨'"></span> <span x-text="calculateCartServiceCharge().toFixed(2)"></span></span>
                    </div>

                    <div class="flex items-center justify-between text-rose-600" x-show="calculateCartDiscountAmount() > 0">
                        <span>{{ __('Discount') }} <span x-show="cartDiscountType === 'percentage'" x-text="'(' + cartDiscountValue + '%)'"></span></span>
                        <span class="font-extrabold">- <span x-text="window.__currencySymbol || '₨'"></span> <span x-text="calculateCartDiscountAmount().toFixed(2)"></span></span>
                    </div>

                    <div class="flex items-center justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                        <span>{{ __('Net Total') }}</span>
                        <span class="text-xl text-[#026897]"><span x-text="window.__currencySymbol || '₨'"></span> <span x-text="calculateCartNetTotal().toFixed(2)"></span></span>
                    </div>

                    <!-- Action buttons matching reference image (Add Comment / Discount) -->
                    <div class="grid grid-cols-2 gap-2 pt-1">
                        <button type="button" @click="comments = comments ? comments : 'Special note: '" class="py-2 px-3 bg-white hover:bg-sky-50 text-[#026897] border border-[#0284c7] rounded-lg text-xs font-bold text-center transition cursor-pointer">
                            Add a comment
                        </button>
                        <button type="button" @click="cartDiscountType = 'percentage'; cartDiscountValue = cartDiscountValue ? 0 : 5;" class="py-2 px-3 bg-white hover:bg-sky-50 text-[#026897] border border-[#0284c7] rounded-lg text-xs font-bold text-center transition cursor-pointer">
                            Bonus / Disc
                        </button>
                    </div>

                    <!-- Primary Pay / Submit Button -->
                    <button @click="submitOrder()"
                            :disabled="cart.length === 0 || loading"
                            :class="cart.length === 0 || loading ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-[#026897] hover:bg-[#01547b] text-white shadow-lg shadow-[#026897]/30'"
                            class="w-full py-3.5 font-black text-base transition flex items-center justify-center gap-2 rounded-xl mt-2 cursor-pointer">
                        <template x-if="loading">
                            <span class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                        </template>
                        <span x-text="editingOrderId ? ('{{ __('Order #') }} ' + editingOrderNumber) : ('{{ __('Pay Now') }}: ' + (window.__currencySymbol || '₨') + ' ' + calculateCartNetTotal().toFixed(2))"></span>
                    </button>
                </div>
            </div>
        </div>
    </div>
    </div>

    <!-- Merge Bills Modal -->
    <div x-show="showMergeModal" x-cloak class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5" @click.away="showMergeModal = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    🔀 Merge Two Running Bills
                </h3>
                <button @click="showMergeModal = false" class="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <p class="text-xs text-slate-500 font-medium">Select source order (transfer FROM) and target order (merge INTO). The source table will be released.</p>

            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Source Bill (Transfer FROM & Release Table) *</label>
                    <select x-model="mergeSourceId" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-800 bg-slate-50">
                        <option value="">-- Choose Source Running Order --</option>
                        <template x-for="rOrder in runningOrders" :key="'src-' + rOrder.id">
                            <option :value="rOrder.id" :disabled="mergeTargetId == rOrder.id" x-text="rOrder.order_number + ' | ' + rOrder.order_type + (rOrder.table ? ' (' + rOrder.table.table_number + ')' : '') + ' - ' + parseFloat(rOrder.net_total).toFixed(2)"></option>
                        </template>
                    </select>
                </div>

                <div class="text-center font-black text-amber-600 text-sm bg-amber-50 py-1 border border-amber-200">
                    ⬇ Transfer Items ⬇
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Target Bill (Merge INTO & Keep Table) *</label>
                    <select x-model="mergeTargetId" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-800 bg-slate-50">
                        <option value="">-- Choose Target Running Order --</option>
                        <template x-for="rOrder in runningOrders" :key="'tgt-' + rOrder.id">
                            <option :value="rOrder.id" :disabled="mergeSourceId == rOrder.id" x-text="rOrder.order_number + ' | ' + rOrder.order_type + (rOrder.table ? ' (' + rOrder.table.table_number + ')' : '') + ' - ' + parseFloat(rOrder.net_total).toFixed(2)"></option>
                        </template>
                    </select>
                </div>
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button @click="showMergeModal = false" class="px-4 py-2 border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100">Cancel</button>
                <button @click="executeMerge()" :disabled="!mergeSourceId || !mergeTargetId || mergeLoading" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md transition disabled:bg-slate-300">
                    <template x-if="mergeLoading">
                        <span class="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent inline-block mr-1"></span>
                    </template>
                    Confirm & Merge Bills
                </button>
            </div>
        </div>
    </div>

    <!-- Right-Side Active Orders & Running Bills Vertical Side-Drawer -->
    <div x-show="showActiveOrdersDrawer"
         x-transition:enter="transition ease-out duration-300 transform"
         x-transition:enter-start="translate-x-full rtl:-translate-x-full"
         x-transition:enter-end="translate-x-0"
         x-transition:leave="transition ease-in duration-200 transform"
         x-transition:leave-start="translate-x-0"
         x-transition:leave-end="translate-x-full rtl:-translate-x-full"
         x-cloak
         class="fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 z-50 w-full sm:w-96 md:w-[28rem] bg-[#f8fafc] border-l rtl:border-l-0 rtl:border-r border-slate-200 text-slate-800 shadow-2xl flex flex-col">
        
        <!-- Drawer Header (Ocean Blue Branding) -->
        <div class="p-4 bg-gradient-to-r from-[#0284c7] via-[#0275af] to-[#026897] text-white flex items-center justify-between shadow-md">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-amber-300 font-black text-sm shadow-xs">⚡</div>
                <div>
                    <h3 class="font-extrabold text-sm text-white tracking-tight flex items-center gap-2">
                        {{ __('Active Kitchen Orders') }} / {{ __('All Orders & Bills') }}
                        <span class="px-2 py-0.5 text-[10px] bg-white text-[#026897] font-black rounded-full shadow-xs" x-text="runningOrders.length + ' Active'"></span>
                    </h3>
                    <p class="text-[11px] text-sky-100 font-medium">View status, edit bill or process payment</p>
                </div>
            </div>
            <button @click="showActiveOrdersDrawer = false" class="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition cursor-pointer">
                ✕
            </button>
        </div>

        <!-- Status Filter Tabs -->
        <div class="p-3 bg-white border-b border-slate-200/90 flex items-center gap-2 shadow-2xs">
            <button @click="activeOrdersFilter = 'All'"
                    :class="activeOrdersFilter === 'All' ? 'bg-[#026897] text-white font-black shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-bold'"
                    class="px-3 py-1.5 text-xs rounded-lg transition cursor-pointer">
                All (<span x-text="runningOrders.length"></span>)
            </button>
            <button @click="activeOrdersFilter = 'Running'"
                    :class="activeOrdersFilter === 'Running' ? 'bg-sky-600 text-white font-black shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-bold'"
                    class="px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1 cursor-pointer">
                🔵 Running (<span x-text="runningOrders.filter(o => o.order_status === 'Running').length"></span>)
            </button>
            <button @click="activeOrdersFilter = 'Bill Generated'"
                    :class="activeOrdersFilter === 'Bill Generated' ? 'bg-amber-600 text-white font-black shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-bold'"
                    class="px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1 cursor-pointer">
                🟡 Bill Generated (<span x-text="runningOrders.filter(o => o.order_status === 'Bill Generated').length"></span>)
            </button>
        </div>

        <!-- Active Orders List Body -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
            <template x-for="rOrder in filteredRunningOrders" :key="'drawer-' + rOrder.id">
                <div class="p-4 bg-white border border-slate-200 hover:border-[#0284c7] hover:shadow-md rounded-xl space-y-3 transition group">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="font-black text-slate-900 text-sm" x-text="rOrder.order_number"></span>
                            <div class="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-2">
                                <span class="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold" x-text="rOrder.order_type"></span>
                                <template x-if="rOrder.table">
                                    <span class="text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded font-extrabold text-[11px]" x-text="'Table: ' + (rOrder.table.table_number.toString().replace(/^Table\s*/i, ''))"></span>
                                </template>
                            </div>
                        </div>

                        <!-- Bill Status Badge -->
                        <span :class="rOrder.order_status === 'Bill Generated' ? 'bg-amber-50 text-amber-800 border border-amber-300' : 'bg-sky-50 text-sky-800 border border-sky-300'"
                              class="px-2.5 py-1 text-[11px] font-black rounded-full flex items-center gap-1.5 shadow-2xs">
                            <span class="w-2 h-2 rounded-full" :class="rOrder.order_status === 'Bill Generated' ? 'bg-amber-500' : 'bg-sky-500 animate-pulse'"></span>
                            <span x-text="rOrder.order_status"></span>
                        </span>
                    </div>

                    <!-- Item Count & Amount -->
                    <div class="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 text-slate-600 font-bold">
                        <span class="text-slate-500 font-semibold"><span x-text="rOrder.items ? rOrder.items.length : 0"></span> Items</span>
                        <span class="text-base font-black text-slate-900">
                            <span x-text="window.__currencySymbol || '₨'"></span> <span x-text="parseFloat(rOrder.net_total).toFixed(2)"></span>
                        </span>
                    </div>

                    <!-- Actions -->
                    <div class="grid grid-cols-2 gap-2 pt-1">
                        <template x-if="rOrder.order_status === 'Running'">
                            <button @click="loadOrder(rOrder); showActiveOrdersDrawer = false" class="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-extrabold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer">
                                ✏️ Edit Bill
                            </button>
                        </template>
                        <template x-if="rOrder.order_status === 'Bill Generated'">
                            <button @click="openOrderModal(rOrder.id); showActiveOrdersDrawer = false" class="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-extrabold text-xs rounded-lg transition text-center flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer">
                                📄 View Bill
                            </button>
                        </template>
                        
                        <button @click="openOrderModal(rOrder.id); showActiveOrdersDrawer = false" class="py-2.5 px-3 bg-[#026897] hover:bg-[#01547b] text-white font-extrabold text-xs rounded-lg shadow-sm transition text-center flex items-center justify-center gap-1.5 cursor-pointer">
                            💳 Pay & Complete
                        </button>
                    </div>
                </div>
            </template>

            <template x-if="filteredRunningOrders.length === 0">
                <div class="text-center py-16 text-slate-400 space-y-2 bg-white rounded-xl border border-slate-200/80 p-8">
                    <span class="text-4xl block">🧾</span>
                    <p class="font-bold text-sm text-slate-700">No active orders matching status</p>
                    <p class="text-xs text-slate-400">Orders placed on POS will appear here live</p>
                </div>
            </template>
        </div>
    </div>

    <!-- Backdrop Overlay for Side Drawer -->
    <div x-show="showActiveOrdersDrawer" @click="showActiveOrdersDrawer = false" x-cloak class="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"></div>

    <!-- Order Summary & Billing Popup Modal -->
    <div x-show="showOrderModal" x-cloak class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white max-w-3xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[90vh] relative rounded-2xl" @click.away="showOrderModal = false">
            
            <!-- Top Animated Progress Bar while processing modal actions -->
            <div x-show="modalActionLoading" x-cloak class="absolute top-0 left-0 right-0 h-1.5 bg-orange-100 overflow-hidden rounded-t-2xl z-50">
                <div class="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 animate-pulse w-full"></div>
            </div>

            <!-- Loading State -->
            <template x-if="modalLoading">
                <div class="py-16 text-center space-y-3">
                    <div class="animate-spin rounded-full h-10 w-10 border-4 border-orange-600 border-t-transparent mx-auto"></div>
                    <p class="font-bold text-slate-600 text-sm">Loading Order Summary...</p>
                </div>
            </template>

            <template x-if="!modalLoading && modalOrder">
                <div class="space-y-6">
                    <!-- Modal Top Header Navigation Bar -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                            <button @click="showOrderModal = false" class="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1">
                                ← Back to POS
                            </button>
                            <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                                Order Summary: <span x-text="modalOrder.order_number"></span>
                            </h2>
                        </div>
                        <div class="flex items-center gap-3">
                            <button @click="printModalReceipt()" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2">
                                🖨️ Thermal Print Receipt
                            </button>
                            <button @click="showOrderModal = false" class="text-slate-400 hover:text-slate-600 text-lg font-bold p-1">✕</button>
                        </div>
                    </div>

                    <!-- Order Meta Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl items-center">
                        <div class="min-w-0">
                            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Order Type</span>
                            <span class="text-sm font-extrabold text-slate-900 truncate block" x-text="modalOrder.order_type"></span>
                        </div>
                        <div class="min-w-0">
                            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Table / Hall</span>
                            <span class="text-sm font-extrabold text-slate-900 truncate block" x-text="modalOrder.table ? ('Table #' + modalOrder.table.table_number) : 'N/A'"></span>
                        </div>
                        <div class="min-w-0">
                            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Order Taker</span>
                            <span class="text-sm font-extrabold text-slate-900 truncate block" x-text="modalOrder.order_taker ? modalOrder.order_taker.name : 'N/A'"></span>
                        </div>
                        <div class="min-w-0">
                            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Created At</span>
                            <span class="text-xs font-bold text-slate-800 truncate block" x-text="new Date(modalOrder.created_at).toLocaleString()"></span>
                        </div>
                        <div class="min-w-0 col-span-2 sm:col-span-1">
                            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Bill Status</span>
                            <select :value="modalOrder.order_status" @change="updateModalStatus($event.target.value, $event)" :disabled="modalActionLoading"
                                    class="mt-1 w-full max-w-full px-2.5 py-1.5 text-xs font-extrabold rounded-lg border focus:outline-none cursor-pointer shadow-xs transition disabled:opacity-50 truncate"
                                    :class="modalOrder.order_status === 'Running' ? 'bg-sky-50 text-sky-900 border-sky-300' : (modalOrder.order_status === 'Bill Generated' ? 'bg-amber-50 text-amber-900 border-amber-300' : (['Complete', 'Completed'].includes(modalOrder.order_status) ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-rose-50 text-rose-900 border-rose-300'))">
                                <option value="Running">🔵 Running</option>
                                <option value="Bill Generated">🟡 Bill Generated</option>
                                <option value="Completed">🟢 Completed</option>
                                <option value="Cancelled">🔴 Cancelled</option>
                            </select>
                        </div>
                    </div>

                    <!-- Line Items Table -->
                    <div class="space-y-2">
                        <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Line Items</h3>
                        <div class="overflow-x-auto border border-slate-100">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-400 bg-slate-50">
                                        <th class="py-2.5 px-3">Item Name</th>
                                        <th class="py-2.5 px-3 text-center">Unit Price</th>
                                        <th class="py-2.5 px-3 text-center">Qty</th>
                                        <th class="py-2.5 px-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-sm font-medium">
                                    <template x-for="item in (modalOrder.items || [])" :key="item.id">
                                        <tr class="border-b border-slate-100" :class="item.quantity == 0 ? 'bg-rose-50/60 text-slate-400 line-through' : 'text-slate-900'">
                                            <td class="py-3 px-3 font-extrabold">
                                                <div class="flex items-center gap-2">
                                                    <span x-text="item.item_name"></span>
                                                    <template x-if="item.cancelled_quantity > 0">
                                                        <span class="px-2 py-0.5 text-[10px] font-black bg-rose-100 text-rose-700 rounded-md border border-rose-200 no-underline" x-text="'(' + item.cancelled_quantity + ' Cancelled)'"></span>
                                                    </template>
                                                </div>
                                            </td>
                                            <td class="py-3 px-3 text-center text-slate-700"><span x-text="window.__currencySymbol || '₨'"></span> <span x-text="parseFloat(item.price).toFixed(2)"></span></td>
                                            <td class="py-3 px-3 text-center font-extrabold" x-text="item.quantity"></td>
                                            <td class="py-3 px-3 text-right font-black"><span x-text="window.__currencySymbol || '₨'"></span> <span x-text="parseFloat(item.total_amount).toFixed(2)"></span></td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Billing Summary & Discounts Grid -->
                    <div class="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <!-- Left: Apply Discount & Payment Form -->
                        <div class="space-y-4">
                            <!-- Discount Form -->
                            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                <div class="flex items-center justify-between">
                                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">{{ __('Discount') }}</label>
                                    
                                    <!-- Discount Type Toggle Buttons -->
                                    <div class="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
                                        <button @click="modalDiscountType = 'fixed'" 
                                                :class="modalDiscountType === 'fixed' ? 'bg-white text-[#026897] shadow-xs' : 'text-slate-600 hover:text-slate-900'" 
                                                class="px-2.5 py-1 rounded-md transition">
                                            <span x-text="window.__currencySymbol || '₨'"></span> Fixed Amount
                                        </button>
                                        <button @click="modalDiscountType = 'percentage'" 
                                                :class="modalDiscountType === 'percentage' ? 'bg-white text-[#026897] shadow-xs' : 'text-slate-600 hover:text-slate-900'" 
                                                class="px-2.5 py-1 rounded-md transition">
                                            % Percentage
                                        </button>
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <div class="flex gap-2">
                                        <div class="relative flex-1">
                                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-extrabold text-slate-400 pointer-events-none" x-text="modalDiscountType === 'fixed' ? (window.__currencySymbol || '₨') : '%'"></span>
                                            <input type="number" :step="modalDiscountType === 'fixed' ? '0.01' : '0.1'" min="0" :max="modalDiscountType === 'percentage' ? '100' : ''" 
                                                   x-model="modalDiscountValue" 
                                                   :placeholder="modalDiscountType === 'fixed' ? '0.00' : '0 %'" 
                                                   class="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
                                        </div>
                                        <button @click="applyModalDiscount()" :disabled="modalActionLoading" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                                            <template x-if="modalActionLoading">
                                                <span class="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent inline-block"></span>
                                            </template>
                                            <span x-text="modalActionLoading ? 'Applying...' : 'Apply Discount'"></span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Payment Form Box -->
                            <div class="p-4 bg-slate-50 border border-slate-200 space-y-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold uppercase tracking-wider text-slate-700">Payment Status</span>
                                    <template x-if="modalOrder.payment_status === 'Paid'">
                                        <span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase">
                                            ✅ Paid via <span x-text="modalOrder.payment_mode || 'Cash'"></span>
                                        </span>
                                    </template>
                                    <template x-if="modalOrder.payment_status !== 'Paid'">
                                        <span class="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-black uppercase">
                                            ❌ Unpaid
                                        </span>
                                    </template>
                                </div>

                                <template x-if="modalOrder.payment_status !== 'Paid'">
                                    <div class="space-y-3 pt-2">
                                        <div>
                                            <label class="block text-xs font-bold text-slate-600 mb-1">{{ __('Payment Method') }} *</label>
                                            <select x-model="modalPaymentMode" class="w-full px-3 py-2 bg-white border border-slate-300 text-sm font-bold text-slate-900 rounded-none">
                                                <option value="Cash">{{ __('Cash') }}</option>
                                                <option value="Card">{{ __('Card') }}</option>
                                                <option value="Online">{{ __('Online') }}</option>
                                                <option value="Khata Credit">📖 Khata Credit (Udhar)</option>
                                            </select>
                                        </div>

                                        <!-- Loyalty Points Redemption Input -->
                                        <template x-if="customerKhataInfo && customerKhataInfo.loyalty_points > 0">
                                            <div class="p-2.5 bg-amber-50 border border-amber-200 text-xs rounded-none space-y-1.5">
                                                <div class="flex items-center justify-between">
                                                    <span class="font-bold text-amber-900">🌟 Redeem Loyalty Points</span>
                                                    <span class="text-[11px] font-black text-amber-700" x-text="'Available: ' + customerKhataInfo.loyalty_points + ' pts'"></span>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <input type="number" min="0" :max="customerKhataInfo.loyalty_points" x-model="redeemPointsInput" placeholder="Points to redeem" class="w-full px-2.5 py-1 bg-white border border-amber-300 text-xs font-black text-slate-800 rounded-none">
                                                    <button type="button" @click="redeemPointsInput = customerKhataInfo.loyalty_points" class="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-none shrink-0">Max</button>
                                                </div>
                                            </div>
                                        </template>

                                        <button @click="processModalPayment()" :disabled="modalActionLoading" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 rounded-none">
                                            <template x-if="modalActionLoading">
                                                <span class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block"></span>
                                            </template>
                                            <span x-text="modalActionLoading ? 'Processing Payment...' : '💳 Process Payment & Mark Complete'"></span>
                                        </button>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Right: Totals Summary Card -->
                        <div class="p-5 bg-slate-50 border border-slate-200 space-y-3 text-sm font-bold text-slate-700">
                            <div class="flex justify-between">
                                <span>{{ __('Subtotal') }}</span>
                                <span class="font-extrabold text-slate-900"><span x-text="window.__currencySymbol || '₨'"></span> <span x-text="parseFloat(modalOrder.subtotal).toFixed(2)"></span></span>
                            </div>

                            <div class="flex justify-between text-slate-600" x-show="modalOrder.order_type === 'Dine In'">
                                <span>Dine-In Service Charge (5%)</span>
                                <span class="font-extrabold text-slate-900">+ <span x-text="window.__currencySymbol || '₨'"></span> <span x-text="parseFloat(modalOrder.service_charge || 0).toFixed(2)"></span></span>
                            </div>

                            <div class="flex justify-between text-slate-600">
                                <span>{{ __('Discount') }} <span x-show="modalOrder.discount_type === 'percentage' && modalOrder.discount_value > 0" x-text="'(' + parseFloat(modalOrder.discount_value) + '%)'"></span></span>
                                <span class="font-extrabold text-rose-600">- <span x-text="window.__currencySymbol || '₨'"></span> <span x-text="parseFloat(modalOrder.discount_amount || 0).toFixed(2)"></span></span>
                            </div>

                            <div class="pt-3 border-t border-slate-200 flex justify-between items-center text-base">
                                <span class="font-black text-slate-900">{{ __('Net Total') }}</span>
                                <span class="font-black text-[#026897] text-xl"><span x-text="window.__currencySymbol || '₨'"></span> <span x-text="parseFloat(modalOrder.net_total).toFixed(2)"></span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</div>
@endsection
