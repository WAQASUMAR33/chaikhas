<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Get a setting value by key with optional fallback default.
     */
    public static function get(string $key, $default = null)
    {
        return \Illuminate\Support\Facades\Cache::remember("setting_{$key}", 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }

    /**
     * Set a setting key and value.
     */
    public static function set(string $key, $value): static
    {
        \Illuminate\Support\Facades\Cache::forget("setting_{$key}");
        return static::updateOrCreate(
            ['key' => $key],
            ['value' => (string) $value]
        );
    }
}
