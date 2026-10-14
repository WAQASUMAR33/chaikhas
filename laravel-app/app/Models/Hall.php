<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Hall extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'name',
        'capacity',
        'status',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function tables()
    {
        return $this->hasMany(Table::class);
    }
}
