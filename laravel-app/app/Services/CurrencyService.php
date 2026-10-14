<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Session;

class CurrencyService
{
    /**
     * Supported currencies configuration
     */
    public static array $currencies = [
        'PKR' => [
            'code' => 'PKR',
            'symbol' => '₨',
            'name' => 'Pakistani Rupee',
            'native' => 'روپیہ',
            'rate' => 1.0,
            'format' => 'symbol_first', // e.g. ₨ 100.00
        ],
        'USD' => [
            'code' => 'USD',
            'symbol' => '$',
            'name' => 'US Dollar',
            'native' => 'US Dollar',
            'rate' => 0.0036,
            'format' => 'symbol_first', // e.g. $ 100.00
        ],
        'EUR' => [
            'code' => 'EUR',
            'symbol' => '€',
            'name' => 'Euro',
            'native' => 'Euro',
            'rate' => 0.0033,
            'format' => 'symbol_first', // e.g. € 100.00
        ],
        'GBP' => [
            'code' => 'GBP',
            'symbol' => '£',
            'name' => 'British Pound',
            'native' => 'British Pound',
            'rate' => 0.0028,
            'format' => 'symbol_first', // e.g. £ 100.00
        ],
        'SAR' => [
            'code' => 'SAR',
            'symbol' => '﷼',
            'name' => 'Saudi Riyal',
            'native' => 'ريال سعودي',
            'rate' => 0.0135,
            'format' => 'symbol_first', // e.g. ﷼ 100.00
        ],
        'AED' => [
            'code' => 'AED',
            'symbol' => 'د.إ',
            'name' => 'UAE Dirham',
            'native' => 'درهم إماراتي',
            'rate' => 0.0132,
            'format' => 'symbol_first', // e.g. د.إ 100.00
        ],
    ];

    /**
     * Get all supported currencies
     */
    public static function getSupportedCurrencies(): array
    {
        return self::$currencies;
    }

    /**
     * Get active currency code from session, setting or fallback
     */
    public static function getCurrentCurrency(): string
    {
        if (Session::has('currency')) {
            $curr = Session::get('currency');
            if (isset(self::$currencies[$curr])) {
                return $curr;
            }
        }

        try {
            $default = Setting::get('default_currency', 'PKR');
            if (isset(self::$currencies[$default])) {
                return $default;
            }
        } catch (\Throwable $e) {
            // Setting table not available
        }

        return 'PKR';
    }

    /**
     * Set current currency into session
     */
    public static function setCurrency(string $code): bool
    {
        $code = strtoupper(trim($code));
        if (isset(self::$currencies[$code])) {
            Session::put('currency', $code);
            return true;
        }
        return false;
    }

    /**
     * Get symbol for active or specified currency
     */
    public static function getSymbol(?string $code = null): string
    {
        $code = $code ? strtoupper($code) : self::getCurrentCurrency();
        return self::$currencies[$code]['symbol'] ?? '₨';
    }

    /**
     * Get currency rate relative to base PKR
     */
    public static function getRate(?string $code = null): float
    {
        $code = $code ? strtoupper($code) : self::getCurrentCurrency();
        
        // Allow custom rate from settings if defined
        try {
            $customRate = Setting::get("currency_rate_{$code}");
            if ($customRate && is_numeric($customRate)) {
                return (float) $customRate;
            }
        } catch (\Throwable $e) {}

        return (float) (self::$currencies[$code]['rate'] ?? 1.0);
    }

    /**
     * Convert amount between currencies
     */
    public static function convert(float $amount, ?string $toCode = null, string $fromCode = 'PKR'): float
    {
        $toCode = $toCode ? strtoupper($toCode) : self::getCurrentCurrency();
        if ($toCode === $fromCode) {
            return $amount;
        }

        // Convert from PKR base
        $toRate = self::getRate($toCode);
        return round($amount * $toRate, 2);
    }

    /**
     * Format price with currency symbol
     *
     * @param float|int|string|null $amount
     * @param string|null $code
     * @param bool $convert If true, multiplies by currency rate
     * @return string
     */
    public static function format($amount, ?string $code = null, bool $convert = false): string
    {
        $num = (float) ($amount ?? 0);
        $code = $code ? strtoupper($code) : self::getCurrentCurrency();
        $symbol = self::getSymbol($code);

        if ($convert && $code !== 'PKR') {
            $num = self::convert($num, $code);
        }

        return $symbol . ' ' . number_format($num, 2);
    }
}
