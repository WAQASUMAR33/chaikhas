<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WasteLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'store_type',
        'inventory_item_id',
        'quantity',
        'cost_price',
        'total_loss',
        'reason',
        'logged_by'
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    public function loggedBy()
    {
        return $this->belongsTo(User::class, 'logged_by');
    }
}
