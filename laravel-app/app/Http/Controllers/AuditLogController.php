<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $module = $request->input('module');
        $action = $request->input('action');

        $query = AuditLog::with(['user', 'branch']);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        if (!empty($module)) {
            $query->where('module', $module);
        }

        if (!empty($action)) {
            $query->where('action', 'like', "%{$action}%");
        }

        $logs = $query->latest()->paginate(30)->withQueryString();

        return view('audit_logs.index', compact('logs', 'module', 'action'));
    }
}
