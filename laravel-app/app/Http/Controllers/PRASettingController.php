<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Setting;
use App\Models\AuditLog;
use App\Services\PRAService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PRASettingController extends Controller
{
    /**
     * Display PRA Management Settings Page.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user->hasPermission('pra_settings') && !$user->hasPermission('settings') && $user->role !== 'super_admin') {
            abort(403, 'Unauthorized access to PRA Management Settings.');
        }

        $config = PRAService::getConfig();

        // Recent orders with PRA status
        $recentOrders = Order::with(['branch', 'user'])
            ->latest()
            ->paginate(15);

        // PRA Statistics
        $totalSynced = Order::where('pra_status', 'synced')->count();
        $totalFailed = Order::where('pra_status', 'failed')->count();
        $totalOrders = Order::where('payment_status', 'Paid')->count();
        $syncedOrdersTotal = Order::where('pra_status', 'synced')->sum('net_total');

        return view('settings.pra', compact(
            'config',
            'recentOrders',
            'totalSynced',
            'totalFailed',
            'totalOrders',
            'syncedOrdersTotal'
        ));
    }

    /**
     * Update PRA Management Configuration.
     */
    public function update(Request $request)
    {
        $user = Auth::user();
        if (!$user->hasPermission('pra_settings') && !$user->hasPermission('settings') && $user->role !== 'super_admin') {
            abort(403, 'Unauthorized access to PRA Management Settings.');
        }

        $validated = $request->validate([
            'pra_enabled' => 'nullable|in:0,1,true,false,on',
            'pra_pos_id' => 'required|string|max:100',
            'pra_ntn' => 'required|string|max:50',
            'pra_auth_token' => 'nullable|string|max:500',
            'pra_api_url' => 'required|url|max:255',
            'pra_environment' => 'required|in:sandbox,production',
            'pra_tax_mode' => 'required|in:variable,flat',
            'pra_flat_tax_rate' => 'required|numeric|min:0|max:100',
            'pra_cash_tax_rate' => 'required|numeric|min:0|max:100',
            'pra_card_tax_rate' => 'required|numeric|min:0|max:100',
            'pra_auto_send_on_payment' => 'nullable|in:0,1,true,false,on',
        ]);

        $enabled = ($request->has('pra_enabled') && in_array($request->pra_enabled, ['1', 'true', 'on', 1])) ? '1' : '0';
        $autoSend = ($request->has('pra_auto_send_on_payment') && in_array($request->pra_auto_send_on_payment, ['1', 'true', 'on', 1])) ? '1' : '0';

        Setting::set('pra_enabled', $enabled);
        Setting::set('pra_pos_id', $validated['pra_pos_id']);
        Setting::set('pra_ntn', $validated['pra_ntn']);
        Setting::set('pra_auth_token', $validated['pra_auth_token'] ?? '');
        Setting::set('pra_api_url', $validated['pra_api_url']);
        Setting::set('pra_environment', $validated['pra_environment']);
        Setting::set('pra_tax_mode', $validated['pra_tax_mode']);
        Setting::set('pra_flat_tax_rate', $validated['pra_flat_tax_rate']);
        Setting::set('pra_cash_tax_rate', $validated['pra_cash_tax_rate']);
        Setting::set('pra_card_tax_rate', $validated['pra_card_tax_rate']);
        Setting::set('pra_auto_send_on_payment', $autoSend);

        AuditLog::log('Updated PRA Settings', 'Settings', null, [
            'pra_enabled' => $enabled,
            'pos_id' => $validated['pra_pos_id'],
            'environment' => $validated['pra_environment'],
        ]);

        return redirect()->route('settings.pra.index')->with('success', 'PRA Configuration & Tax Rules successfully updated!');
    }

    /**
     * Instant toggle switch for PRA Invoicing enabled / disabled.
     */
    public function toggle(Request $request)
    {
        $user = Auth::user();
        if (!$user->hasPermission('pra_settings') && !$user->hasPermission('settings') && $user->role !== 'super_admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $currentState = (string) Setting::get('pra_enabled', '0');
        $newState = ($currentState === '1') ? '0' : '1';

        Setting::set('pra_enabled', $newState);

        AuditLog::log('Toggled PRA Invoicing Switch', 'Settings', null, [
            'new_state' => $newState === '1' ? 'ENABLED' : 'DISABLED',
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'enabled' => $newState === '1',
                'message' => $newState === '1' 
                    ? 'PRA Invoicing is now ENABLED. Invoices will automatically transmit to Punjab Revenue Authority.' 
                    : 'PRA Invoicing is now DISABLED. Standard non-PRA billing is active.',
            ]);
        }

        return back()->with('success', $newState === '1' ? 'PRA Invoicing enabled successfully!' : 'PRA Invoicing disabled successfully!');
    }

    /**
     * Test connection to PRA IMS Gateway.
     */
    public function testConnection(Request $request)
    {
        $user = Auth::user();
        if (!$user->hasPermission('pra_settings') && !$user->hasPermission('settings') && $user->role !== 'super_admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $result = PRAService::testConnection();

        return response()->json($result);
    }

    /**
     * Manually transmit or retry sending an order to PRA.
     */
    public function retryInvoice(Request $request, Order $order)
    {
        $user = Auth::user();
        if (!$user->hasPermission('pra_settings') && !$user->hasPermission('orders') && $user->role !== 'super_admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $result = PRAService::sendInvoice($order);

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        if ($result['success']) {
            return back()->with('success', 'Order #' . $order->order_number . ' successfully synced with PRA. Invoice #: ' . ($result['invoice_number'] ?? ''));
        }

        return back()->with('error', 'PRA Sync Error: ' . ($result['message'] ?? 'Could not transmit invoice to PRA.'));
    }
}
