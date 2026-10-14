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
        'total_sales',
        'total_expenses',
        'closing_cash',
        'closed_at',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'opening_cash' => 'decimal:2',
        'total_sales' => 'decimal:2',
        'total_expenses' => 'decimal:2',
        'closing_cash' => 'decimal:2',
        'closed_at' => 'datetime',
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
