<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Kitchen extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'name',
        'code',
        'printer_id',
        'status',
        'description',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function printer()
    {
        return $this->belongsTo(Printer::class);
    }

    public function storeStocks()
    {
        return $this->hasMany(KitchenStoreStock::class, 'kitchen_name', 'name');
    }
}
