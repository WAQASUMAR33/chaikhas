<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_name',
        'branch_code',
        'address',
        'phone',
        'email',
        'status',
    ];

    public function getNameAttribute()
    {
        return $this->attributes['branch_name'] ?? $this->attributes['name'] ?? '';
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function halls()
    {
        return $this->hasMany(Hall::class);
    }

    public function tables()
    {
        return $this->hasMany(Table::class);
    }

    public function categories()
    {
        return $this->hasMany(Category::class);
    }

    public function menuItems()
    {
        return $this->hasMany(MenuItem::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
