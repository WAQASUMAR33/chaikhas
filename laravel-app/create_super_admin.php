<?php

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$username = 'superadmin';
$password = 'admin123';
$fullname = 'Super Admin';
$role = 'super_admin';

// Check if user table uses 'name' or 'fullname'
$columns = \Illuminate\Support\Facades\Schema::getColumnListing('users');
$nameColumn = in_array('fullname', $columns) ? 'fullname' : 'name';

$existingUser = DB::table('users')->where('username', $username)->first();

if ($existingUser) {
    DB::table('users')->where('id', $existingUser->id)->update([
        $nameColumn => $fullname,
        'password' => Hash::make($password),
        'role' => $role,
        'status' => 'Active',
        'updated_at' => now(),
    ]);
    echo "========================================\n";
    echo " SUCCESS: Super Admin Updated!\n";
    echo "========================================\n";
} else {
    $insertData = [
        'username' => $username,
        $nameColumn => $fullname,
        'password' => Hash::make($password),
        'role' => $role,
        'status' => 'Active',
        'created_at' => now(),
        'updated_at' => now(),
    ];
    
    if (in_array('email', $columns)) {
        $insertData['email'] = 'admin@chaikhas.com';
    }
    
    DB::table('users')->insert($insertData);
    echo "========================================\n";
    echo " SUCCESS: Super Admin Created!\n";
    echo "========================================\n";
}

echo "Login Username : {$username}\n";
echo "Login Password : {$password}\n";
echo "Role           : {$role}\n";
echo "========================================\n";
