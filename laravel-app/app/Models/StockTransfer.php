<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockTransfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'user_id',
        'type',
        'kitchen_name',
        'inventory_item_id',
        'quantity',
        'notes',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function addedBy()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function item()
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}
