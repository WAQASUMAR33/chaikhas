<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MainStoreStock extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'inventory_item_id',
        'quantity',
        'avg_unit_cost',
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
