<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'branch_id',
        'action',
        'module',
        'old_values',
        'new_values',
        'ip_address'
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public static function log(string $action, string $module, ?array $oldValues = null, ?array $newValues = null): self
    {
        return self::create([
            'user_id' => auth()->id(),
            'branch_id' => auth()->user()->branch_id ?? null,
            'action' => $action,
            'module' => $module,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip()
        ]);
    }
}
