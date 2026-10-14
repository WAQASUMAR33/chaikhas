<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryActivityLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'branch_id',
        'user_id',
        'action_type',
        'inventory_item_id',
        'kitchen_name',
        'store_type',
        'quantity_change',
        'previous_qty',
        'new_qty',
        'notes',
        'created_at',
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
