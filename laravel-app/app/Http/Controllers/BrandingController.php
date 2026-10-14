<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BrandingController extends Controller
{
    public function index()
    {
        $logo = Setting::get('restaurant_logo');
        $name = Setting::get('restaurant_name', 'Chai Khas Restaurant');
        $slogan = Setting::get('restaurant_slogan', 'Taste of Royalty & Tradition');
        $address = Setting::get('restaurant_address', 'Main Boulevard, Gulberg III, Lahore');
        $phone1 = Setting::get('restaurant_phone1', '+92-300-1234567');
        $phone2 = Setting::get('restaurant_phone2', '+92-321-9876543');
        $notes = Setting::get('branding_notes', 'STRN / NTN # 1234567-8 • Thank you for dining with us!');
        $brandColor = Setting::get('brand_color', '#026897');

        return view('branding.index', compact('logo', 'name', 'slogan', 'address', 'phone1', 'phone2', 'notes', 'brandColor'));
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'restaurant_name' => 'required|string|max:255',
            'restaurant_slogan' => 'nullable|string|max:255',
            'restaurant_address' => 'nullable|string|max:500',
            'restaurant_phone1' => 'nullable|string|max:50',
            'restaurant_phone2' => 'nullable|string|max:50',
            'branding_notes' => 'nullable|string|max:1000',
            'brand_color' => 'nullable|string|max:20',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,webp,svg|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            $oldLogo = Setting::get('restaurant_logo');
            if ($oldLogo) {
                if (Storage::disk('public')->exists($oldLogo)) {
                    Storage::disk('public')->delete($oldLogo);
                }
                if (file_exists(public_path('storage/' . $oldLogo))) {
                    @unlink(public_path('storage/' . $oldLogo));
                }
            }

            // Ensure destination directories exist
            $storageDir = storage_path('app/public/branding');
            if (!file_exists($storageDir)) {
                @mkdir($storageDir, 0755, true);
            }
            $publicDir = public_path('storage/branding');
            if (!file_exists($publicDir)) {
                @mkdir($publicDir, 0755, true);
            }

            $logoPath = $request->file('logo')->store('branding', 'public');

            // Mirror upload to public/storage for shared hosting environments without symlinks
            try {
                @copy(storage_path('app/public/' . $logoPath), public_path('storage/' . $logoPath));
            } catch (\Exception $e) {
                // Silently ignore if symlink already maps to the same target file
            }

            Setting::set('restaurant_logo', $logoPath);
        }

        Setting::set('restaurant_name', $validated['restaurant_name']);
        Setting::set('restaurant_slogan', $validated['restaurant_slogan'] ?? '');
        Setting::set('restaurant_address', $validated['restaurant_address'] ?? '');
        Setting::set('restaurant_phone1', $validated['restaurant_phone1'] ?? '');
        Setting::set('restaurant_phone2', $validated['restaurant_phone2'] ?? '');
        Setting::set('branding_notes', $validated['branding_notes'] ?? '');
        if (!empty($request->brand_color)) { Setting::set('brand_color', $request->brand_color); }

        return redirect()->route('branding.index')->with('success', 'Restaurant branding and identity updated successfully!');
    }
}
