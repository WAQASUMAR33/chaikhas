<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DayEnd extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'user_id',
        'date',
        'opening_cash',
        'gross_sales',
        'total_discount',
        'total_service_charges',
        'total_tax',
        'total_sales',
        'cash_sales',
        'card_sales',
        'online_sales',
        'other_sales',
        'total_orders',
        'completed_orders',
        'cancelled_orders',
        'dine_in_sales',
        'dine_in_count',
        'takeaway_sales',
        'takeaway_count',
        'delivery_sales',
        'delivery_count',
        'total_expenses',
        'expected_cash',
        'actual_cash',
        'cash_difference',
        'closing_cash',
        'closed_at',
        'notes',
        'status',
        'details',
    ];

    protected $casts = [
        'date' => 'date',
        'opening_cash' => 'decimal:2',
        'gross_sales' => 'decimal:2',
        'total_discount' => 'decimal:2',
        'total_service_charges' => 'decimal:2',
        'total_tax' => 'decimal:2',
        'total_sales' => 'decimal:2',
        'cash_sales' => 'decimal:2',
        'card_sales' => 'decimal:2',
        'online_sales' => 'decimal:2',
        'other_sales' => 'decimal:2',
        'dine_in_sales' => 'decimal:2',
        'takeaway_sales' => 'decimal:2',
        'delivery_sales' => 'decimal:2',
        'total_expenses' => 'decimal:2',
        'expected_cash' => 'decimal:2',
        'actual_cash' => 'decimal:2',
        'cash_difference' => 'decimal:2',
        'closing_cash' => 'decimal:2',
        'closed_at' => 'datetime',
        'details' => 'array',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
