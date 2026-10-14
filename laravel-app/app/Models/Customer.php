<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'loyalty_points',
    ];

    public function ledgers()
    {
        return $this->hasMany(CustomerLedger::class);
    }
}
