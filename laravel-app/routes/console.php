<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('make:superadmin {username=superadmin} {password=admin123} {--email=admin@chaikhas.com} {--name=Super Admin}', function () {
    $username = $this->argument('username');
    $password = $this->argument('password');
    $email = $this->option('email');
    $name = $this->option('name');

    $columns = \Illuminate\Support\Facades\Schema::getColumnListing('users');
    $nameCol = in_array('fullname', $columns) ? 'fullname' : 'name';

    $userData = [
        'password' => \Illuminate\Support\Facades\Hash::make($password),
        'role' => 'super_admin',
        'status' => 'Active',
        'branch_id' => null,
    ];

    if ($nameCol) {
        $userData[$nameCol] = $name;
    }
    if (in_array('name', $columns)) {
        $userData['name'] = $name;
    }
    if (in_array('email', $columns)) {
        $userData['email'] = $email;
    }

    $user = \App\Models\User::updateOrCreate(
        ['username' => $username],
        $userData
    );

    $this->info("Super Admin account created/updated successfully!");
    $this->table(
        ['ID', 'Username', 'Email', 'Role', 'Status', 'Password'],
        [[$user->id, $user->username, $user->email, $user->role, $user->status, $password]]
    );
})->purpose('Create or reset a Super Admin account credentials');

Artisan::command('sync:logs', function () {
    $logs = \App\Models\WebhookLog::with('node')->latest()->take(10)->get();
    $headers = ['ID', 'Direction', 'Event', 'Model', 'ID', 'Status', 'HTTP', 'Node', 'Time'];
    $rows = $logs->map(function ($l) {
        return [
            $l->id,
            $l->direction,
            $l->event,
            $l->model_name,
            $l->model_id,
            $l->status,
            $l->http_status ?? '-',
            $l->node->name ?? 'Incoming',
            $l->created_at->format('H:i:s'),
        ];
    });
    $this->table($headers, $rows);
})->purpose('Show latest webhook database sync logs');

