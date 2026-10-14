<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Table extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'hall_id',
        'table_number',
        'capacity',
        'status',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function hall()
    {
        return $this->belongsTo(Hall::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
