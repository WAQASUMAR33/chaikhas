<?php

namespace App\Http\Controllers;

use App\Services\CurrencyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class LocalizationController extends Controller
{
    /**
     * Supported locales with display names and flags
     */
    public static array $supportedLocales = [
        'en' => [
            'code' => 'en',
            'name' => 'English',
            'native' => 'English',
            'flag' => '🇬🇧',
            'dir' => 'ltr',
        ],
        'ar' => [
            'code' => 'ar',
            'name' => 'Arabic',
            'native' => 'العربية',
            'flag' => '🇸🇦',
            'dir' => 'rtl',
        ],
        'fr' => [
            'code' => 'fr',
            'name' => 'French',
            'native' => 'Français',
            'flag' => '🇫🇷',
            'dir' => 'ltr',
        ],
        'it' => [
            'code' => 'it',
            'name' => 'Italian',
            'native' => 'Italiano',
            'flag' => '🇮🇹',
            'dir' => 'ltr',
        ],
    ];

    /**
     * Switch active application locale
     */
    public function setLocale(string $locale): RedirectResponse
    {
        $locale = strtolower(trim($locale));

        if (array_key_exists($locale, self::$supportedLocales)) {
            Session::put('locale', $locale);
            app()->setLocale($locale);
        }

        return redirect()->back();
    }

    /**
     * Switch active currency
     */
    public function setCurrency(string $currency): RedirectResponse
    {
        $currency = strtoupper(trim($currency));

        if (CurrencyService::setCurrency($currency)) {
            // Currency successfully saved in session
        }

        return redirect()->back();
    }
}
