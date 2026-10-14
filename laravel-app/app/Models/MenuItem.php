<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class MenuItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'category_id',
        'name',
        'barcode',
        'price',
        'description',
        'image',
        'is_available',
        'is_frequent',
        'discount',
        'terminal',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_available' => 'boolean',
        'price' => 'decimal:2',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (Auth::check()) {
                $model->created_by = Auth::id();
                $model->updated_by = Auth::id();
            }
        });

        static::updating(function ($model) {
            if (Auth::check()) {
                $model->updated_by = Auth::id();
            }
        });

        static::saved(function () {
            \App\Services\MasterDataCache::clearAll();
        });

        static::deleted(function () {
            \App\Services\MasterDataCache::clearAll();
        });
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function recipes()
    {
        return $this->hasMany(Recipe::class, 'menu_item_id')->with('inventoryItem');
    }
}
