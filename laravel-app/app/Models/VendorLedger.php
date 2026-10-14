<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VendorLedger extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_id',
        'branch_id',
        'purchase_id',
        'type',
        'amount',
        'balance',
        'payment_method',
        'notes'
    ];

    public function vendor()
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function purchase()
    {
        return $this->belongsTo(Purchase::class, 'purchase_id');
    }
}
