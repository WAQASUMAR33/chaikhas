@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ showCreateVendorModal: false, editVendor: null }">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Vendor & Supplier Management</h1>
            <p class="text-slate-500 text-sm font-medium">Manage raw material suppliers, contact details, and vendor accounts</p>
        </div>
        <button @click="showCreateVendorModal = true" class="px-5 py-2.5 bg-[#026897] hover:bg-[#01547b] text-white font-bold text-sm shadow-md transition">
            + Add New Vendor
        </button>
    </div>

    <!-- Vendors Table -->
    <div class="bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                        <th class="py-4 px-6">Vendor Name</th>
                        <th class="py-4 px-6">Contact Person</th>
                        <th class="py-4 px-6">Phone</th>
                        <th class="py-4 px-6">Email / Address</th>
                        <th class="py-4 px-6">Status</th>
                        <th class="py-4 px-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    @forelse($vendors as $vendor)
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6 font-extrabold text-slate-900">{{ $vendor->name }}</td>
                        <td class="py-4 px-6 font-semibold text-slate-800">{{ $vendor->contact_person ?? '-' }}</td>
                        <td class="py-4 px-6 font-bold text-slate-900">{{ $vendor->phone ?? '-' }}</td>
                        <td class="py-4 px-6 text-xs text-slate-500">
                            <div>{{ $vendor->email ?? '' }}</div>
                            <div class="truncate max-w-xs text-slate-400">{{ $vendor->address ?? '' }}</div>
                        </td>
                        <td class="py-4 px-6">
                            <span class="px-2.5 py-1 text-xs font-bold {{ $vendor->status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800' }}">
                                {{ $vendor->status }}
                            </span>
                        </td>
                        <td class="py-4 px-6 text-right space-x-2">
                            <button @click="editVendor = {{ json_encode($vendor) }}" class="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 px-3 py-1.5 border border-slate-200">Edit</button>
                            <form method="POST" action="{{ route('vendors.destroy', $vendor->id) }}" class="inline" onsubmit="return confirm('Delete vendor?')">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-3 py-1.5 border border-rose-200">Delete</button>
                            </form>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colSpan="6" class="py-12 text-center text-slate-400 font-medium">No vendors registered yet.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-slate-100">
            {{ $vendors->links() }}
        </div>
    </div>

    <!-- Create Vendor Modal -->
    <div x-show="showCreateVendorModal" x-cloak class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4" @click.away="showCreateVendorModal = false">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-base font-extrabold text-slate-900">Add New Vendor</h3>
                <button @click="showCreateVendorModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form method="POST" action="{{ route('vendors.store') }}" class="space-y-4">
                @csrf
                <input type="hidden" name="branch_id" value="{{ Auth::user()->branch_id ?? 1 }}">
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Vendor Name *</label>
                    <input type="text" name="name" required class="w-full px-3 py-2 border border-slate-300 text-sm font-bold">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Contact Person</label>
                        <input type="text" name="contact_person" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Phone Number</label>
                        <input type="text" name="phone" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Email</label>
                    <input type="email" name="email" class="w-full px-3 py-2 border border-slate-300 text-sm font-medium">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Address</label>
                    <textarea name="address" rows="2" class="w-full p-2 border border-slate-300 text-xs font-medium"></textarea>
                </div>
                <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" @click="showCreateVendorModal = false" class="px-4 py-2 border border-slate-200 text-xs font-bold">Cancel</button>
                    <button type="submit" class="px-5 py-2 bg-[#026897] text-white text-xs font-extrabold shadow-md">Save Vendor</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
