<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'table_id',
        'customer_name',
        'customer_phone',
        'reservation_date',
        'time_slot',
        'guest_count',
        'deposit_amount',
        'status',
        'notes'
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function table()
    {
        return $this->belongsTo(Table::class, 'table_id');
    }
}
