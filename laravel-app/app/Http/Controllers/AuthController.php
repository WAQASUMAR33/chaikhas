<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function showLogin()
    {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }
        return view('auth.login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
        ]);

        $loginInput = $credentials['login'];

        // Find user by username (or email if column exists)
        $query = \App\Models\User::where('username', $loginInput);
        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'email')) {
            $query->orWhere('email', $loginInput);
        }
        $user = $query->first();

        if ($user && \Illuminate\Support\Facades\Hash::check($credentials['password'], $user->password)) {
            if ($user->status !== 'Active') {
                return back()->withErrors(['login' => 'Your account is deactivated.']);
            }

            \Illuminate\Support\Facades\Auth::login($user, $request->boolean('remember'));
            $request->session()->regenerate();

            return redirect()->intended(route('dashboard'));
        }

        return back()->withErrors([
            'login' => 'The provided credentials do not match our records.',
        ])->onlyInput('login');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('login');
    }
}
