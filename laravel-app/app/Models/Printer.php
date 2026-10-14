<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Printer extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'name',
        'ip_address',
        'port',
        'type',
        'status',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
