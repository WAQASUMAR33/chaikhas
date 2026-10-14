@extends('layouts.app')

@section('content')
<style>
    select, select option {
        color: #0f172a !important;
        background-color: #ffffff !important;
    }
</style>

<script>
window.userManagementApp = function() {
    const roleMatrix = @json($rolePermissions);
    const allModules = @json($allModules);
    const defaultRole = 'order_taker';
    const defaultPerms = Object.keys(roleMatrix[defaultRole] || {});

    return {
        roleFilter: '{{ request()->input("role", "") }}',
        showCreateModal: {{ (isset($errors) && $errors->any() && !old('_method')) ? 'true' : 'false' }}, 
        showEditModal: false,
        editFormAction: '',
        roleMatrix: roleMatrix,
        allModules: allModules,
        createRole: defaultRole,
        createPermissions: defaultPerms,
        editUser: {
            id: null,
            name: '',
            username: '',
            email: '',
            role: defaultRole,
            branch_id: '',
            status: 'Active',
            permissions: []
        },
        toggleCreatePerm(key, checked) {
            if (checked) {
                if (!this.createPermissions.includes(key)) this.createPermissions.push(key);
            } else {
                this.createPermissions = this.createPermissions.filter(k => k !== key);
            }
        },
        toggleEditPerm(key, checked) {
            if (!Array.isArray(this.editUser.permissions)) {
                this.editUser.permissions = [];
            }
            if (checked) {
                if (!this.editUser.permissions.includes(key)) this.editUser.permissions.push(key);
            } else {
                this.editUser.permissions = this.editUser.permissions.filter(k => k !== key);
            }
        },
        onRoleChange(isEdit = false) {
            let role = isEdit ? this.editUser.role : this.createRole;
            let allowed = Object.keys(this.roleMatrix[role] || this.allModules);
            if (isEdit) {
                this.editUser.permissions = [...allowed];
            } else {
                this.createPermissions = [...allowed];
            }
        },
        openEdit(u) {
            let role = u.role || defaultRole;
            let allowed = Object.keys(this.roleMatrix[role] || this.allModules);
            let userPerms = Array.isArray(u.permissions) && u.permissions.length ? u.permissions : [...allowed];
            let validPerms = userPerms.filter(p => allowed.includes(p));

            this.editUser = {
                id: u.id,
                name: u.name || '',
                username: u.username || '',
                email: u.email || '',
                role: role,
                branch_id: u.branch_id || '',
                status: u.status || 'Active',
                permissions: validPerms.length ? validPerms : [...allowed]
            };
            this.editFormAction = '/users/' + u.id;
            this.showEditModal = true;
        }
    };
};
</script>

<div class="space-y-6" x-data="userManagementApp()">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">User Accounts & Role Permissions</h1>
            <p class="text-slate-500 text-sm font-medium">Manage order takers, cashiers, administrators, credentials, and granular permissions</p>
        </div>
        <button @click="showCreateModal = true" class="px-5 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition cursor-pointer">
            + Create New User Account
        </button>
    </div>

    @if(session('success'))
    <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-between">
        <span>{{ session('success') }}</span>
        <button @click="$el.parentElement.remove()" class="text-emerald-600 hover:text-emerald-900">&times;</button>
    </div>
    @endif

    @if(session('error'))
    <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center justify-between">
        <span>{{ session('error') }}</span>
        <button @click="$el.parentElement.remove()" class="text-rose-600 hover:text-rose-900">&times;</button>
    </div>
    @endif

    @if(isset($errors) && $errors->any())
    <div class="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm font-bold shadow-xs">
        <ul class="list-disc list-inside space-y-1">
            @foreach($errors->all() as $err)
                <li>{{ $err }}</li>
            @endforeach
        </ul>
    </div>
    @endif

    <!-- Role Filter Tabs & Shortcuts -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-slate-200/80 shadow-xs">
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button @click="roleFilter = ''"
                    :class="roleFilter === '' ? 'bg-[#026897] text-white shadow-xs font-extrabold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold'"
                    class="px-3.5 py-1.5 text-xs transition cursor-pointer">
                All Roles ({{ count($users) }})
            </button>
            <button @click="roleFilter = 'order_taker'"
                    :class="roleFilter === 'order_taker' ? 'bg-[#026897] text-white shadow-xs font-extrabold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold'"
                    class="px-3.5 py-1.5 text-xs transition cursor-pointer flex items-center gap-1.5">
                <span>🤵 Order Takers</span>
                <span class="px-2 py-0.5 text-[10px] font-black rounded-full" :class="roleFilter === 'order_taker' ? 'bg-white text-orange-600' : 'bg-amber-100 text-amber-800'">
                    {{ $users->where('role', 'order_taker')->count() }}
                </span>
            </button>
            <button @click="roleFilter = 'cashier'"
                    :class="roleFilter === 'cashier' ? 'bg-[#026897] text-white shadow-xs font-extrabold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold'"
                    class="px-3.5 py-1.5 text-xs transition cursor-pointer">
                Cashiers ({{ $users->where('role', 'cashier')->count() }})
            </button>
            <button @click="roleFilter = 'super_admin'"
                    :class="roleFilter === 'super_admin' ? 'bg-[#026897] text-white shadow-xs font-extrabold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold'"
                    class="px-3.5 py-1.5 text-xs transition cursor-pointer">
                Super Admins ({{ $users->where('role', 'super_admin')->count() }})
            </button>
        </div>
        <div class="text-xs font-semibold text-slate-500">
            Filtering by: <span class="font-extrabold text-orange-600 uppercase" x-text="roleFilter ? roleFilter.replace('_', ' ') : 'ALL USERS'"></span>
        </div>
    </div>

    <!-- Users Directory Table -->
    <div class="bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-50 text-slate-500 uppercase text-[11px] font-extrabold border-b border-slate-200 tracking-wider">
                        <th class="py-3.5 px-4">User Details</th>
                        <th class="py-3.5 px-4">Role & Access</th>
                        <th class="py-3.5 px-4">Assigned Branch</th>
                        <th class="py-3.5 px-4">Status</th>
                        <th class="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                    @forelse($users as $u)
                    <tr x-show="!roleFilter || '{{ $u->role }}' === roleFilter" class="hover:bg-slate-50/70 transition">
                        <td class="py-3.5 px-4">
                            <div class="font-bold text-slate-900">{{ $u->name }}</div>
                            <div class="text-xs text-slate-500 font-medium">@ {{ $u->username }} • {{ $u->email }}</div>
                        </td>
                        <td class="py-3.5 px-4">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                {{ ucfirst(str_replace('_', ' ', $u->role)) }}
                            </span>
                        </td>
                        <td class="py-3.5 px-4">
                            <span class="font-semibold text-slate-700 text-xs">
                                {{ $u->branch->branch_name ?? $u->branch->name ?? 'All Branches (Super Admin)' }}
                            </span>
                        </td>
                        <td class="py-3.5 px-4">
                            @if($u->status === 'Active')
                                <span class="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded">Active</span>
                            @else
                                <span class="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-600 rounded">Inactive</span>
                            @endif
                        </td>
                        <td class="py-3.5 px-4 text-right whitespace-nowrap">
                            <div class="inline-flex items-center justify-end gap-2">
                                <button type="button" @click='openEdit({{ json_encode([
                                    "id" => $u->id,
                                    "name" => $u->name,
                                    "username" => $u->username,
                                    "email" => $u->email,
                                    "role" => $u->role,
                                    "branch_id" => $u->branch_id,
                                    "status" => $u->status,
                                    "permissions" => $u->permissions ?? []
                                ], JSON_HEX_APOS | JSON_HEX_QUOT) }})' class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition cursor-pointer">
                                    Edit / Permissions
                                </button>

                                @if(auth()->check() && auth()->id() === $u->id)
                                    <span class="px-2.5 py-1.5 bg-slate-50 text-slate-400 font-semibold text-xs border border-slate-200 cursor-not-allowed" title="Cannot delete your current logged-in account">
                                        Self
                                    </span>
                                @else
                                    <form action="{{ route('users.destroy', $u->id) }}" method="POST" class="inline" onsubmit="return confirm('Are you sure you want to permanently delete user \'{{ addslashes($u->name ?: $u->username) }}\'? This action cannot be undone.');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold text-xs border border-rose-200 hover:border-rose-600 transition cursor-pointer">
                                            Delete
                                        </button>
                                    </form>
                                @endif
                            </div>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="5" class="py-8 text-center text-slate-500 font-medium text-sm">No user accounts found.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <!-- Create User Account Modal -->
    <div x-show="showCreateModal" x-cloak class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" @click.away="showCreateModal = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-base font-extrabold text-slate-900">Create User Account & Assign Module Permissions</h3>
                <button type="button" @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            
            <form method="POST" action="{{ route('users.store') }}" class="space-y-5">
                @csrf
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Full Name *</label>
                        <input type="text" name="name" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-900 bg-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Username *</label>
                        <input type="text" name="username" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-900 bg-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Email Address *</label>
                        <input type="email" name="email" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-900 bg-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Password *</label>
                        <input type="password" name="password" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-900 bg-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">User Role *</label>
                        <select name="role" x-model="createRole" @change="onRoleChange(false)" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:text-slate-900">
                            <option value="order_taker" class="text-slate-900 bg-white font-bold">Order Taker / Waiter</option>
                            <option value="kitchen_staff" class="text-slate-900 bg-white font-bold">Kitchen Staff</option>
                            <option value="store_manager" class="text-slate-900 bg-white font-bold">Store & Inventory Manager</option>
                            <option value="accountant" class="text-slate-900 bg-white font-bold">Accountant</option>
                            <option value="cashier" class="text-slate-900 bg-white font-bold">Cashier POS</option>
                            <option value="admin" class="text-slate-900 bg-white font-bold">Branch Administrator</option>
                            <option value="super_admin" class="text-slate-900 bg-white font-bold">Super Admin (Full System)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Assigned Branch</label>
                        <select name="branch_id" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:text-slate-900">
                            <option value="" class="text-slate-900 bg-white font-bold">All Branches (Super Admin)</option>
                            @foreach($branches as $b)
                                <option value="{{ $b->id }}" class="text-slate-900 bg-white font-bold">{{ $b->branch_name ?? $b->name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Account Status *</label>
                        <select name="status" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:text-slate-900">
                            <option value="Active" selected class="text-slate-900 bg-white font-bold">Active</option>
                            <option value="Inactive" class="text-slate-900 bg-white font-bold">Inactive</option>
                        </select>
                    </div>
                </div>

                <!-- Module Permissions Checkbox Grid (Shrunk dynamically by role) -->
                <div class="bg-slate-50 p-4 border border-slate-200 space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div>
                            <h4 class="text-xs font-extrabold uppercase text-slate-800 tracking-wider">Module Access Permissions</h4>
                            <p class="text-[11px] text-slate-500 font-semibold">
                                Shrunk to <strong class="text-[#026897]" x-text="Object.keys(roleMatrix[createRole] || allModules).length"></strong> allowed modules for: 
                                <span class="font-extrabold text-[#026897] uppercase" x-text="createRole.replace('_', ' ')"></span>
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" @click="createPermissions = Object.keys(roleMatrix[createRole] || allModules)" class="text-[11px] font-bold text-[#026897] hover:underline cursor-pointer">Select All</button>
                            <span class="text-slate-300">|</span>
                            <button type="button" @click="createPermissions = []" class="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer">Clear</button>
                        </div>
                    </div>

                    <template x-if="createRole === 'super_admin'">
                        <div class="p-2.5 bg-sky-50 border border-sky-200 text-xs text-sky-900 font-bold flex items-center gap-2">
                            <span>🛡️</span>
                            <span>Super Admin has unrestricted full system access to all modules and branches.</span>
                        </div>
                    </template>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-slate-800">
                        <template x-for="(label, key) in (roleMatrix[createRole] || allModules)" :key="key">
                            <label class="flex items-center gap-2.5 p-2 bg-white border border-slate-200/80 cursor-pointer hover:border-[#026897] transition-all">
                                <input type="checkbox" name="permissions[]" :value="key"
                                       :checked="createPermissions.includes(key)"
                                       @change="toggleCreatePerm(key, $event.target.checked)"
                                       class="w-4 h-4 text-[#026897] focus:ring-[#026897]">
                                <span x-text="label"></span>
                            </label>
                        </template>
                    </div>
                </div>

                <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" @click="showCreateModal = false" class="px-4 py-2 border border-slate-200 text-xs font-bold cursor-pointer">Cancel</button>
                    <button type="submit" class="px-5 py-2 bg-[#026897] text-white text-xs font-extrabold shadow-md cursor-pointer">Create Account</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit User & Permissions Modal -->
    <div x-show="showEditModal" x-cloak class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" @click.away="showEditModal = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-base font-extrabold text-slate-900">Edit User Credentials & Granular Permissions</h3>
                <button type="button" @click="showEditModal = false" class="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <form method="POST" :action="editFormAction" class="space-y-5">
                @csrf
                @method('PUT')

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Full Name *</label>
                        <input type="text" name="name" x-model="editUser.name" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-900 bg-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Username *</label>
                        <input type="text" name="username" x-model="editUser.username" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-900 bg-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Email Address *</label>
                        <input type="email" name="email" x-model="editUser.email" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold text-slate-900 bg-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">New Password (Optional)</label>
                        <input type="password" name="password" placeholder="Leave blank to keep current" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium text-slate-900 bg-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">User Role *</label>
                        <select name="role" x-model="editUser.role" @change="onRoleChange(true)" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:text-slate-900">
                            <option value="order_taker" class="text-slate-900 bg-white font-bold">Order Taker / Waiter</option>
                            <option value="kitchen_staff" class="text-slate-900 bg-white font-bold">Kitchen Staff</option>
                            <option value="store_manager" class="text-slate-900 bg-white font-bold">Store & Inventory Manager</option>
                            <option value="accountant" class="text-slate-900 bg-white font-bold">Accountant</option>
                            <option value="cashier" class="text-slate-900 bg-white font-bold">Cashier POS</option>
                            <option value="admin" class="text-slate-900 bg-white font-bold">Branch Administrator</option>
                            <option value="super_admin" class="text-slate-900 bg-white font-bold">Super Admin (Full System)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Assigned Branch</label>
                        <select name="branch_id" x-model="editUser.branch_id" class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:text-slate-900">
                            <option value="" class="text-slate-900 bg-white font-bold">All Branches (Super Admin)</option>
                            @foreach($branches as $b)
                                <option value="{{ $b->id }}" class="text-slate-900 bg-white font-bold">{{ $b->branch_name ?? $b->name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Account Status *</label>
                        <select name="status" x-model="editUser.status" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:text-slate-900">
                            <option value="Active" class="text-slate-900 bg-white font-bold">Active</option>
                            <option value="Inactive" class="text-slate-900 bg-white font-bold">Inactive</option>
                        </select>
                    </div>
                </div>

                <!-- Module Permissions Checkbox Grid (Shrunk dynamically by role) -->
                <div class="bg-slate-50 p-4 border border-slate-200 space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div>
                            <h4 class="text-xs font-extrabold uppercase text-slate-800 tracking-wider">Module Access Permissions</h4>
                            <p class="text-[11px] text-slate-500 font-semibold">
                                Shrunk to <strong class="text-[#026897]" x-text="Object.keys(roleMatrix[editUser.role] || allModules).length"></strong> allowed modules for: 
                                <span class="font-extrabold text-[#026897] uppercase" x-text="editUser.role ? editUser.role.replace('_', ' ') : ''"></span>
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" @click="editUser.permissions = Object.keys(roleMatrix[editUser.role] || allModules)" class="text-[11px] font-bold text-[#026897] hover:underline cursor-pointer">Select All</button>
                            <span class="text-slate-300">|</span>
                            <button type="button" @click="editUser.permissions = []" class="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer">Clear</button>
                        </div>
                    </div>

                    <template x-if="editUser.role === 'super_admin'">
                        <div class="p-2.5 bg-sky-50 border border-sky-200 text-xs text-sky-900 font-bold flex items-center gap-2">
                            <span>🛡️</span>
                            <span>Super Admin has unrestricted full system access to all modules and branches.</span>
                        </div>
                    </template>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-slate-800">
                        <template x-for="(label, key) in (roleMatrix[editUser.role] || allModules)" :key="key">
                            <label class="flex items-center gap-2.5 p-2 bg-white border border-slate-200/80 cursor-pointer hover:border-[#026897] transition-all">
                                <input type="checkbox" name="permissions[]" :value="key"
                                       :checked="editUser.role === 'super_admin' || (editUser.permissions && editUser.permissions.includes(key))"
                                       @change="toggleEditPerm(key, $event.target.checked)"
                                       class="w-4 h-4 text-[#026897] focus:ring-[#026897]">
                                <span x-text="label"></span>
                            </label>
                        </template>
                    </div>
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                        <template x-if="editUser.id && editUser.id !== {{ auth()->id() ?? 0 }}">
                            <button type="button" 
                                    @click="if(confirm('Are you sure you want to permanently delete user ' + (editUser.name || editUser.username) + '? This action cannot be undone.')) { $refs.modalDeleteForm.action = '/users/' + editUser.id; $refs.modalDeleteForm.submit(); }" 
                                    class="px-3.5 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold text-xs border border-rose-200 hover:border-rose-600 transition cursor-pointer">
                                Delete User
                            </button>
                        </template>
                    </div>
                    <div class="flex items-center gap-3">
                        <button type="button" @click="showEditModal = false" class="px-4 py-2 border border-slate-200 text-xs font-bold cursor-pointer">Cancel</button>
                        <button type="submit" class="px-5 py-2 bg-[#026897] text-white text-xs font-extrabold shadow-md cursor-pointer">Update User & Permissions</button>
                    </div>
                </div>
            </form>

            <!-- Hidden delete form for modal -->
            <form x-ref="modalDeleteForm" method="POST" class="hidden">
                @csrf
                @method('DELETE')
            </form>
        </div>
    </div>
</div>
@endsection
