<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'item_name',
        'sku',
        'category',
        'unit',
        'default_purchase_price',
        'min_stock_alert',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function mainStoreStock()
    {
        return $this->hasOne(MainStoreStock::class);
    }

    public function kitchenStoreStocks()
    {
        return $this->hasMany(KitchenStoreStock::class);
    }

    public function activityLogs()
    {
        return $this->hasMany(InventoryActivityLog::class);
    }
}
