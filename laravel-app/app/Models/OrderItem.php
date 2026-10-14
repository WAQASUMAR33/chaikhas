<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'menu_item_id',
        'dish_id',
        'item_name',
        'price',
        'quantity',
        'cancelled_quantity',
        'total_amount',
        'kitchen_status',
        'is_cancel',
        'notes',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function menuItem()
    {
        return $this->belongsTo(MenuItem::class);
    }
}
