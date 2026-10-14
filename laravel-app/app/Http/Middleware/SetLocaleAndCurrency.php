<?php

namespace App\Http\Middleware;

use App\Http\Controllers\LocalizationController;
use App\Models\Setting;
use App\Services\CurrencyService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class SetLocaleAndCurrency
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Determine active locale
        $locale = Session::get('locale');

        if (!$locale || !array_key_exists($locale, LocalizationController::$supportedLocales)) {
            try {
                $locale = Setting::get('default_language', config('app.locale', 'en'));
            } catch (\Throwable $e) {
                $locale = config('app.locale', 'en');
            }

            if (!array_key_exists($locale, LocalizationController::$supportedLocales)) {
                $locale = 'en';
            }
        }

        App::setLocale($locale);

        // 2. Active currency
        $currencyCode = CurrencyService::getCurrentCurrency();
        $currencySymbol = CurrencyService::getSymbol($currencyCode);

        // 3. Share with all views
        $localeData = LocalizationController::$supportedLocales[$locale] ?? LocalizationController::$supportedLocales['en'];
        $isRtl = ($localeData['dir'] ?? 'ltr') === 'rtl';

        View::share('currentLocale', $locale);
        View::share('currentLocaleData', $localeData);
        View::share('isRtl', $isRtl);
        View::share('currentCurrency', $currencyCode);
        View::share('currencySymbol', $currencySymbol);
        View::share('supportedLocales', LocalizationController::$supportedLocales);
        View::share('supportedCurrencies', CurrencyService::getSupportedCurrencies());

        return $next($request);
    }
}
