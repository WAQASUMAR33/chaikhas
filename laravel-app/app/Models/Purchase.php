<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'vendor_id',
        'user_id',
        'po_number',
        'invoice_number',
        'purchase_date',
        'total_amount',
        'payment_status',
        'notes',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }

    public function addedBy()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function items()
    {
        return $this->hasMany(PurchaseItem::class);
    }
}
