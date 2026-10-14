<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'branch_id',
        'hall_id',
        'table_id',
        'user_id',
        'order_taker_id',
        'customer_name',
        'customer_phone',
        'order_type',
        'order_status',
        'subtotal',
        'service_charge',
        'discount_amount',
        'discount_type',
        'discount_value',
        'net_total',
        'payment_status',
        'payment_mode',
        'comments',
        'pra_invoice_number',
        'pra_qr_code',
        'pra_status',
        'pra_response',
        'pra_sent_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'service_charge' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'discount_value' => 'decimal:2',
        'net_total' => 'decimal:2',
        'pra_sent_at' => 'datetime',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function hall()
    {
        return $this->belongsTo(Hall::class);
    }

    public function table()
    {
        return $this->belongsTo(Table::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function orderTaker()
    {
        return $this->belongsTo(User::class, 'order_taker_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
