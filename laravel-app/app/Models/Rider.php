<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Rider extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'name',
        'phone',
        'vehicle_no',
        'status'
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'rider_id');
    }
}
