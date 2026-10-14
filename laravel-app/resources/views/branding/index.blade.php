@extends('layouts.app')

@section('content')
<div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Restaurant Branding & Identity</h1>
            <p class="text-slate-500 text-sm font-medium">Configure restaurant logo, slogan, address, contact numbers, and thermal receipt footer details</p>
        </div>
    </div>

    <!-- Success Flash Message -->
    @if(session('success'))
    <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
        <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        <span>{{ session('success') }}</span>
    </div>
    @endif

    <!-- Branding Form -->
    <div class="bg-white border border-slate-200/80 shadow-sm p-6 space-y-6">
        <form method="POST" action="{{ route('branding.update') }}" enctype="multipart/form-data" class="space-y-6">
            @csrf

            <!-- 1. Logo & Brand Name Header -->
            <div class="border-b border-slate-100 pb-4">
                <h3 class="text-base font-extrabold text-slate-900">Brand Logo & Tagline</h3>
                <p class="text-xs text-slate-500 font-semibold mt-0.5">Upload your official restaurant logo and slogan</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <!-- Logo Preview Box -->
                <div class="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 text-center space-y-3">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Current Logo</span>
                    <div class="w-32 h-32 bg-white border border-slate-200 flex items-center justify-center p-2 shadow-xs overflow-hidden" x-data="{ logoPreviewError: false }">
                        @if($logo)
                            <img src="{{ asset('storage/' . $logo) }}" alt="Logo" class="max-w-full max-h-full object-contain" x-show="!logoPreviewError" x-on:error="logoPreviewError = true">
                        @endif
                        <div x-show="logoPreviewError || {{ $logo ? 'false' : 'true' }}" class="text-center text-slate-400">
                            <span class="text-3xl">☕</span>
                            <span class="block text-[10px] font-bold mt-1">No Logo Uploaded</span>
                        </div>
                    </div>
                </div>

                <!-- Upload Control & Brand Name -->
                <div class="md:col-span-2 space-y-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Upload New Logo Image (JPEG, PNG, WEBP, SVG)
                        </label>
                        <input type="file" name="logo" accept="image/*" class="w-full text-xs font-bold text-slate-700 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-extrabold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 cursor-pointer">
                        <p class="text-[11px] text-slate-400 font-medium mt-1">Recommended size: Square 512x512px transparent PNG.</p>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Restaurant Name *
                        </label>
                        <input type="text" name="restaurant_name" value="{{ old('restaurant_name', $name) }}" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-sm font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0284c7] transition">
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Brand Theme Color *
                        </label>
                        <div class="flex items-center gap-3">
                            <input type="color" name="brand_color" value="{{ old('brand_color', $brandColor ?? '#026897') }}" class="w-12 h-10 p-1 bg-white border border-slate-200 rounded-lg cursor-pointer">
                            <input type="text" name="brand_color_text" readonly value="{{ old('brand_color', $brandColor ?? '#026897') }}" class="w-32 px-3 py-2 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 rounded-lg">
                            <span class="text-xs text-slate-400 font-semibold">Primary branding color applied across POS, KDS, & receipts.</span>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Slogan / Tagline
                        </label>
                        <input type="text" name="restaurant_slogan" value="{{ old('restaurant_slogan', $slogan) }}" placeholder="e.g. Taste of Royalty & Tradition" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0284c7] transition">
                    </div>
                </div>
            </div>

            <!-- 2. Address & Contact Phone Numbers -->
            <div class="border-t border-slate-100 pt-6 space-y-4">
                <div class="border-b border-slate-100 pb-3">
                    <h3 class="text-base font-extrabold text-slate-900">Location & Contact Numbers</h3>
                    <p class="text-xs text-slate-500 font-semibold mt-0.5">Physical address and phone lines printed on customer bills</p>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Physical Restaurant Address
                    </label>
                    <textarea name="restaurant_address" rows="2" placeholder="e.g. Main Boulevard, Gulberg III, Lahore, Pakistan" class="w-full p-3 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0284c7] transition">{{ old('restaurant_address', $address) }}</textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Phone Number 1 (Primary)
                        </label>
                        <input type="text" name="restaurant_phone1" value="{{ old('restaurant_phone1', $phone1) }}" placeholder="e.g. +92-300-1234567" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0284c7] transition">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Phone Number 2 (Secondary / WhatsApp)
                        </label>
                        <input type="text" name="restaurant_phone2" value="{{ old('restaurant_phone2', $phone2) }}" placeholder="e.g. +92-321-9876543" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0284c7] transition">
                    </div>
                </div>
            </div>

            <!-- 3. Others / Thermal Receipt Notes -->
            <div class="border-t border-slate-100 pt-6 space-y-4">
                <div class="border-b border-slate-100 pb-3">
                    <h3 class="text-base font-extrabold text-slate-900">Receipt Footer & Tax / STRN Information</h3>
                    <p class="text-xs text-slate-500 font-semibold mt-0.5">Custom footer message, NTN, STRN, or thank-you notes printed on receipts</p>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Others / Receipt Footer Text
                    </label>
                    <textarea name="branding_notes" rows="3" placeholder="e.g. STRN / NTN # 1234567-8 • Thank you for dining with us!" class="w-full p-3 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0284c7] transition">{{ old('branding_notes', $notes) }}</textarea>
                </div>
            </div>

            <div class="pt-4 border-t border-slate-100 flex justify-end">
                <button type="submit" class="px-6 py-3 bg-[#026897] hover:bg-[#01547b] text-white font-black text-sm shadow-md transition">
                    💾 Save Restaurant Branding & Settings
                </button>
            </div>
        </form>
    </div>
</div>
@endsection
