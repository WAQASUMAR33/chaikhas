<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        $serviceChargePct = Setting::get('service_charge_percentage', 5);
        $restaurantName = Setting::get('restaurant_name', 'Chai Khas');
        $currencySymbol = Setting::get('currency_symbol', '₨');
        $defaultLanguage = Setting::get('default_language', 'en');
        $defaultCurrency = Setting::get('default_currency', 'PKR');

        return view('settings.index', compact('serviceChargePct', 'restaurantName', 'currencySymbol', 'defaultLanguage', 'defaultCurrency'));
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'service_charge_percentage' => 'required|numeric|min:0|max:100',
            'restaurant_name' => 'nullable|string|max:255',
            'currency_symbol' => 'nullable|string|max:20',
            'default_language' => 'nullable|string|in:en,ar,fr,it',
            'default_currency' => 'nullable|string|in:PKR,USD,EUR,GBP,SAR,AED',
        ]);

        Setting::set('service_charge_percentage', $validated['service_charge_percentage']);
        
        if (isset($validated['restaurant_name'])) {
            Setting::set('restaurant_name', $validated['restaurant_name']);
        }
        
        if (isset($validated['currency_symbol'])) {
            Setting::set('currency_symbol', $validated['currency_symbol']);
        }

        if (isset($validated['default_language'])) {
            Setting::set('default_language', $validated['default_language']);
        }

        if (isset($validated['default_currency'])) {
            Setting::set('default_currency', $validated['default_currency']);
        }

        return redirect()->route('settings.index')->with('success', 'Restaurant settings updated successfully!');
    }
}
