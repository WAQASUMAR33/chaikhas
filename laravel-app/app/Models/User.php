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
            'recipes' => 'Recipe BOM & Formulas',
            'purchases' => 'Main Store Purchases',
            'vendors' => 'Vendors & Suppliers',
            'vendor_ledgers' => 'Vendor Accounts Payable',
            'customer_ledgers' => 'Customer Khata Accounts',
            'reservations' => 'Table Reservations & Bookings',
            'riders' => 'Delivery Riders & Fleet Dispatch',
            'waste_logs' => 'Waste & Spoilage Logs',
            'attendances' => 'Staff Attendance Register',
            'halls_tables' => 'Halls & Tables Setup',
            'menu_catalog' => 'Menu Catalog & Categories',
            'expenses' => 'Daily Expenses',
            'dayend' => 'Day End Reconciliation',
            'reports' => 'All Reports & Analytics Suite',
            'pra_settings' => 'PRA Invoicing & Tax Management',
            'audit_logs' => 'Security Audit Trail Logs',
            'branches' => 'Branch Management',
            'users' => 'User Accounts & Roles',
            'sync_nodes' => 'Multi-Node Database Sync',
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
                'reservations' => $all['reservations'],
            ],

            // 2. Kitchen Staff
            'kitchen_staff' => [
                'kitchen_kds' => $all['kitchen_kds'],
                'kitchen_setup' => $all['kitchen_setup'],
                'orders' => $all['orders'],
                'recipes' => $all['recipes'],
                'waste_logs' => $all['waste_logs'],
            ],
            'kitchen' => [
                'kitchen_kds' => $all['kitchen_kds'],
                'kitchen_setup' => $all['kitchen_setup'],
                'orders' => $all['orders'],
                'recipes' => $all['recipes'],
                'waste_logs' => $all['waste_logs'],
            ],

            // 3. Store and Inventory Management
            'store_manager' => [
                'inventory_products' => $all['inventory_products'],
                'inventory_stock' => $all['inventory_stock'],
                'inventory_transfers' => $all['inventory_transfers'],
                'recipes' => $all['recipes'],
                'waste_logs' => $all['waste_logs'],
                'purchases' => $all['purchases'],
                'vendors' => $all['vendors'],
                'vendor_ledgers' => $all['vendor_ledgers'],
            ],
            'inventory' => [
                'inventory_products' => $all['inventory_products'],
                'inventory_stock' => $all['inventory_stock'],
                'inventory_transfers' => $all['inventory_transfers'],
                'recipes' => $all['recipes'],
                'waste_logs' => $all['waste_logs'],
                'purchases' => $all['purchases'],
                'vendors' => $all['vendors'],
                'vendor_ledgers' => $all['vendor_ledgers'],
            ],

            // 4. Accountant
            'accountant' => [
                'orders' => $all['orders'],
                'expenses' => $all['expenses'],
                'dayend' => $all['dayend'],
                'reports' => $all['reports'],
                'purchases' => $all['purchases'],
                'vendors' => $all['vendors'],
                'vendor_ledgers' => $all['vendor_ledgers'],
                'customer_ledgers' => $all['customer_ledgers'],
                'pra_settings' => $all['pra_settings'],
            ],

            // 5. Cashier
            'cashier' => [
                'pos' => $all['pos'],
                'orders' => $all['orders'],
                'dayend' => $all['dayend'],
                'expenses' => $all['expenses'],
                'customer_ledgers' => $all['customer_ledgers'],
                'reservations' => $all['reservations'],
                'riders' => $all['riders'],
            ],

            // 6. Branch Administrator (Branch-level operational control)
            'admin' => $all,
            'branch_admin' => $all,

            // 7. Super Admin (Full access to all system modules)
            'super_admin' => $all,
        ];
    }
}
