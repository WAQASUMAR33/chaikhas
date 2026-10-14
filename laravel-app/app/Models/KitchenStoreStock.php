<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KitchenStoreStock extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'kitchen_name',
        'inventory_item_id',
        'quantity',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function item()
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}
