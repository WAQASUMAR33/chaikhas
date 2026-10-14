<?php

use App\Services\CurrencyService;

if (!function_exists('currency_symbol')) {
    function currency_symbol(?string $code = null): string {
        return CurrencyService::getSymbol($code);
    }
}

if (!function_exists('format_currency')) {
    function format_currency($amount, ?string $code = null, bool $convert = false): string {
        return CurrencyService::format($amount, $code, $convert);
    }
}
