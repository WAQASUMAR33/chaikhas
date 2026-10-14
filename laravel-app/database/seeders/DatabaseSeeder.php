<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Hall;
use App\Models\MenuItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Main Branch
        $branch = Branch::create([
            'branch_name' => 'Chai Khas Main',
            'branch_code' => 'CK-MAIN',
            'address' => 'Main Boulevard, Gulberg III, Lahore',
            'phone' => '+92-300-1234567',
            'email' => 'main@chaikhas.com',
            'status' => 'Active',
        ]);

        // 2. Create Users for each role
        $columns = \Illuminate\Support\Facades\Schema::getColumnListing('users');
        $nameCol = in_array('fullname', $columns) ? 'fullname' : 'name';

        User::updateOrCreate(
            ['username' => 'theitxprts@gmail.com'],
            [
                $nameCol => 'Super Admin',
                'name' => 'Super Admin',
                'email' => 'theitxprts@gmail.com',
                'password' => Hash::make('786Ninja@'),
                'role' => 'super_admin',
                'branch_id' => null,
                'status' => 'Active',
            ]
        );

        User::create([
            'name' => 'Branch Admin',
            'username' => 'branchadmin',
            'email' => 'branch@chaikhas.com',
            'password' => Hash::make('branch123'),
            'role' => 'branch_admin',
            'branch_id' => $branch->id,
            'status' => 'Active',
        ]);

        User::create([
            'name' => 'Order Taker',
            'username' => 'ordertaker',
            'email' => 'order@chaikhas.com',
            'password' => Hash::make('order123'),
            'role' => 'order_taker',
            'branch_id' => $branch->id,
            'status' => 'Active',
        ]);

        User::create([
            'name' => 'Kitchen Staff',
            'username' => 'kitchen',
            'email' => 'kitchen@chaikhas.com',
            'password' => Hash::make('kitchen123'),
            'role' => 'kitchen',
            'branch_id' => $branch->id,
            'status' => 'Active',
        ]);

        User::create([
            'name' => 'Accountant Staff',
            'username' => 'accountant',
            'email' => 'accountant@chaikhas.com',
            'password' => Hash::make('acc123'),
            'role' => 'accountant',
            'branch_id' => $branch->id,
            'status' => 'Active',
        ]);

        // 3. Create Hall & Tables
        $hall = Hall::create([
            'branch_id' => $branch->id,
            'name' => 'Main Dining Hall',
            'capacity' => 50,
            'status' => 'Active',
        ]);

        for ($i = 1; $i <= 8; $i++) {
            Table::create([
                'branch_id' => $branch->id,
                'hall_id' => $hall->id,
                'table_number' => "T-0{$i}",
                'capacity' => 4,
                'status' => 'Available',
            ]);
        }

        // 4. Create Categories & Menu Items
        $catTea = Category::create([
            'branch_id' => $branch->id,
            'name' => 'Special Teas',
            'description' => 'Hot brewed traditional teas',
            'status' => 'Active',
        ]);

        $catSnacks = Category::create([
            'branch_id' => $branch->id,
            'name' => 'Snacks & Parathas',
            'description' => 'Crispy snacks and stuffed parathas',
            'status' => 'Active',
        ]);

        MenuItem::create([
            'branch_id' => $branch->id,
            'category_id' => $catTea->id,
            'name' => 'Karak Chai',
            'price' => 150.00,
            'description' => 'Rich spiced milk tea',
            'is_available' => true,
            'status' => 'Active',
        ]);

        MenuItem::create([
            'branch_id' => $branch->id,
            'category_id' => $catTea->id,
            'name' => 'Elaichi Chai',
            'price' => 180.00,
            'description' => 'Cardamom infused tea',
            'is_available' => true,
            'status' => 'Active',
        ]);

        MenuItem::create([
            'branch_id' => $branch->id,
            'category_id' => $catSnacks->id,
            'name' => 'Chicken Cheese Paratha',
            'price' => 380.00,
            'description' => 'Crispy paratha filled with chicken and melted cheese',
            'is_available' => true,
            'status' => 'Active',
        ]);

        MenuItem::create([
            'branch_id' => $branch->id,
            'category_id' => $catSnacks->id,
            'name' => 'Aloo Paratha',
            'price' => 220.00,
            'description' => 'Traditional spiced potato paratha',
            'is_available' => true,
            'status' => 'Active',
        ]);
    }
}
