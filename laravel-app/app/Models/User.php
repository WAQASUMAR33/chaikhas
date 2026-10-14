<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'fullname',
        'username',
        'email',
        'password',
        'role',
        'permissions',
        'branch_id',
        'phone',
        'status',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
        ];
    }

    public function hasPermission(string $module): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }

        // Check assigned permissions array
        $userPermissions = $this->permissions;
        if (!empty($userPermissions) && is_array($userPermissions)) {
            return in_array($module, $userPermissions);
        }

        // Default role permissions if permissions array is not set
        $matrix = static::rolePermissions();
        $allowed = array_keys($matrix[$this->role] ?? []);
        return in_array($module, $allowed);
    }

    /**
     * Complete list of all system modules
     */
    public static function allModules(): array
    {
        return [
            'pos' => 'Create Order / POS',
            'orders' => 'All Orders & Bills',
            'kitchen_kds' => 'Kitchen Display (KDS)',
            'kitchen_setup' => 'Kitchen Stations Setup',
            'inventory_products' => 'Purchasable Raw Products',
            'inventory_stock' => 'Main Store & Kitchen Store Stock',
            'inventory_transfers' => 'Stock Transfer & Return',
            'purchases' => 'Main Store Purchases',
            'vendors' => 'Vendors & Suppliers',
            'halls_tables' => 'Halls & Tables Setup',
            'menu_catalog' => 'Menu Catalog & Categories',
            'expenses' => 'Daily Expenses',
            'dayend' => 'Day End Reconciliation',
            'reports' => 'All Reports & Analytics Suite',
            'pra_settings' => 'PRA Invoicing & Tax Management',
            'branches' => 'Branch Management',
            'users' => 'User Accounts & Roles',
        ];
    }

    /**
     * Allowed & shrunk permissions matrix tailored per role
     */
    public static function rolePermissions(): array
    {
        $all = static::allModules();

        return [
            // 1. Order Taker / Waiter
            'order_taker' => [
                'pos' => $all['pos'],
                'orders' => $all['orders'],
                'halls_tables' => $all['halls_tables'],
            ],

            // 2. Kitchen Staff
            'kitchen_staff' => [
                'kitchen_kds' => $all['kitchen_kds'],
                'kitchen_setup' => $all['kitchen_setup'],
                'orders' => $all['orders'],
            ],
            'kitchen' => [
                'kitchen_kds' => $all['kitchen_kds'],
                'kitchen_setup' => $all['kitchen_setup'],
                'orders' => $all['orders'],
            ],

            // 3. Store and Inventory Management
            'store_manager' => [
                'inventory_products' => $all['inventory_products'],
                'inventory_stock' => $all['inventory_stock'],
                'inventory_transfers' => $all['inventory_transfers'],
                'purchases' => $all['purchases'],
                'vendors' => $all['vendors'],
            ],
            'inventory' => [
                'inventory_products' => $all['inventory_products'],
                'inventory_stock' => $all['inventory_stock'],
                'inventory_transfers' => $all['inventory_transfers'],
                'purchases' => $all['purchases'],
                'vendors' => $all['vendors'],
            ],

            // 4. Accountant
            'accountant' => [
                'orders' => $all['orders'],
                'expenses' => $all['expenses'],
                'dayend' => $all['dayend'],
                'reports' => $all['reports'],
                'purchases' => $all['purchases'],
                'vendors' => $all['vendors'],
                'pra_settings' => $all['pra_settings'],
            ],

            // 5. Cashier
            'cashier' => [
                'pos' => $all['pos'],
                'orders' => $all['orders'],
                'dayend' => $all['dayend'],
                'expenses' => $all['expenses'],
            ],

            // 6. Branch Administrator (Branch-level operational control)
            'admin' => [
                'pos' => $all['pos'],
                'orders' => $all['orders'],
                'kitchen_kds' => $all['kitchen_kds'],
                'kitchen_setup' => $all['kitchen_setup'],
                'inventory_products' => $all['inventory_products'],
                'inventory_stock' => $all['inventory_stock'],
                'inventory_transfers' => $all['inventory_transfers'],
                'purchases' => $all['purchases'],
                'vendors' => $all['vendors'],
                'halls_tables' => $all['halls_tables'],
                'menu_catalog' => $all['menu_catalog'],
                'expenses' => $all['expenses'],
                'dayend' => $all['dayend'],
                'reports' => $all['reports'],
                'pra_settings' => $all['pra_settings'],
                'users' => $all['users'],
            ],
            'branch_admin' => [
                'pos' => $all['pos'],
                'orders' => $all['orders'],
                'kitchen_kds' => $all['kitchen_kds'],
                'kitchen_setup' => $all['kitchen_setup'],
                'inventory_products' => $all['inventory_products'],
                'inventory_stock' => $all['inventory_stock'],
                'inventory_transfers' => $all['inventory_transfers'],
                'purchases' => $all['purchases'],
                'vendors' => $all['vendors'],
                'halls_tables' => $all['halls_tables'],
                'menu_catalog' => $all['menu_catalog'],
                'expenses' => $all['expenses'],
                'dayend' => $all['dayend'],
                'reports' => $all['reports'],
                'pra_settings' => $all['pra_settings'],
                'users' => $all['users'],
            ],

            // 7. Super Admin (Full access to all system modules)
            'super_admin' => $all,
        ];
    }
}
