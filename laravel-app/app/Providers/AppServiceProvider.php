<?php

namespace App\Providers;

use App\Services\CurrencyService;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

// Global helper functions
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

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        // Blade currency directive
        Blade::directive('currency', function ($expression) {
            return "<?php echo \App\Services\CurrencyService::format($expression); ?>";
        });

        // Multi-Node Webhook Database Sync Observers
        $syncableModels = [
            \App\Models\Order::class,
            \App\Models\OrderItem::class,
            \App\Models\MenuItem::class,
            \App\Models\Category::class,
            \App\Models\Table::class,
            \App\Models\Hall::class,
            \App\Models\Branch::class,
            \App\Models\InventoryItem::class,
            \App\Models\Expense::class,
            \App\Models\Customer::class,
            \App\Models\CustomerLedger::class,
            \App\Models\Vendor::class,
            \App\Models\VendorLedger::class,
            \App\Models\Reservation::class,
            \App\Models\Rider::class,
            \App\Models\DayEnd::class,
            \App\Models\Setting::class,
            \App\Models\User::class,
        ];

        foreach ($syncableModels as $modelClass) {
            if (class_exists($modelClass)) {
                $modelClass::observe(\App\Observers\DatabaseSyncObserver::class);
            }
        }
    }
}
