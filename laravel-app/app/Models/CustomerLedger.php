<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerLedger extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'branch_id',
        'order_id',
        'type',
        'amount',
        'balance',
        'description',
        'reference_no'
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
