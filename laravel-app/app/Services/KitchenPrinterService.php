<?php

namespace App\Services;

use App\Models\Kitchen;
use App\Models\Order;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Log;

class KitchenPrinterService
{
    /**
     * Dispatch KOT tickets for an order to respective kitchen station printers.
     */
    public static function printOrderKOT(Order $order): array
    {
        $order->loadMissing([
            'items.menuItem.category.kitchen',
            'branch',
            'table.hall',
            'orderTaker',
            'user'
        ]);

        $kitchenGroups = [];
        $unassignedItems = [];

        foreach ($order->items as $item) {
            if ($item->quantity <= 0) continue;

            $kitchen = $item->menuItem?->category?->kitchen;

            if ($kitchen) {
                $kitchenGroups[$kitchen->id]['kitchen'] = $kitchen;
                $kitchenGroups[$kitchen->id]['items'][] = $item;
            } else {
                $unassignedItems[] = $item;
            }
        }

        // If there are items with no specific kitchen assigned, route to first active kitchen in branch or fallback
        if (!empty($unassignedItems)) {
            $defaultKitchen = Kitchen::where('branch_id', $order->branch_id)
                ->where('status', 'Active')
                ->first() ?: Kitchen::where('status', 'Active')->first();

            if ($defaultKitchen) {
                $kitchenGroups[$defaultKitchen->id]['kitchen'] = $defaultKitchen;
                if (!isset($kitchenGroups[$defaultKitchen->id]['items'])) {
                    $kitchenGroups[$defaultKitchen->id]['items'] = [];
                }
                $kitchenGroups[$defaultKitchen->id]['items'] = array_merge(
                    $kitchenGroups[$defaultKitchen->id]['items'],
                    $unassignedItems
                );
            }
        }

        $results = [];

        foreach ($kitchenGroups as $kitchenId => $group) {
            $kitchen = $group['kitchen'];
            $items = $group['items'];

            $res = static::sendKOTToPrinter($order, $kitchen, $items);
            $results[] = $res;
        }

        return $results;
    }

    /**
     * Build ESC/POS raw ticket & transmit to Network Printer IP:Port.
     */
    public static function sendKOTToPrinter(Order $order, Kitchen $kitchen, array $items): array
    {
        $ip = trim((string)$kitchen->printer_ip);
        $port = (int)($kitchen->printer_port ?: 9100);

        if (empty($ip)) {
            return [
                'kitchen_id' => $kitchen->id,
                'kitchen_name' => $kitchen->name,
                'ip' => null,
                'port' => null,
                'status' => 'no_ip',
                'success' => false,
                'message' => "Kitchen '{$kitchen->name}' has no Printer IP configured.",
            ];
        }

        $rawEscPos = static::buildEscPosKOT($order, $kitchen, $items);

        // Attempt TCP Socket Connection with 2 second timeout
        $errno = 0;
        $errstr = '';
        $fp = @fsockopen($ip, $port, $errno, $errstr, 2);

        if ($fp) {
            fwrite($fp, $rawEscPos);
            fflush($fp);
            fclose($fp);

            AuditLog::log('Kitchen KOT Printed', 'Orders', null, [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'kitchen' => $kitchen->name,
                'printer_ip' => "{$ip}:{$port}",
            ]);

            return [
                'kitchen_id' => $kitchen->id,
                'kitchen_name' => $kitchen->name,
                'ip' => $ip,
                'port' => $port,
                'status' => 'sent',
                'success' => true,
                'message' => "KOT successfully sent to {$kitchen->name} printer ({$ip}:{$port}).",
            ];
        } else {
            Log::warning("Kitchen KOT printer unreachable at {$ip}:{$port} for order #{$order->order_number}: {$errstr}");

            return [
                'kitchen_id' => $kitchen->id,
                'kitchen_name' => $kitchen->name,
                'ip' => $ip,
                'port' => $port,
                'status' => 'offline',
                'success' => false,
                'message' => "Printer offline at {$ip}:{$port} ({$errstr}). Order saved safely.",
            ];
        }
    }

    /**
     * Test printer connection by sending a diagnostic slip.
     */
    public static function testPrinter(Kitchen $kitchen): array
    {
        $ip = trim((string)$kitchen->printer_ip);
        $port = (int)($kitchen->printer_port ?: 9100);

        if (empty($ip)) {
            return [
                'success' => false,
                'message' => "Please enter a valid Printer IP address (e.g. 192.168.1.100).",
            ];
        }

        $now = now()->format('d-M-Y h:i:s A');

        // ESC/POS Commands
        $init = "\x1B\x40";           // Init printer
        $center = "\x1B\x61\x01";     // Center alignment
        $left = "\x1B\x61\x00";       // Left alignment
        $boldOn = "\x1B\x45\x01";     // Bold on
        $boldOff = "\x1B\x45\x00";    // Bold off
        $doubleH = "\x1D\x21\x11";    // Double width & height
        $normal = "\x1D\x21\x00";     // Normal text size
        $cut = "\x1D\x56\x41\x03";    // Paper cut with feed

        $payload = $init . $center;
        $payload .= $doubleH . $boldOn . "KITCHEN PRINTER TEST\n" . $normal . $boldOff;
        $payload .= "================================\n";
        $payload .= $boldOn . "Station: " . strtoupper($kitchen->name) . "\n" . $boldOff;
        $payload .= "IP: {$ip}  |  Port: {$port}\n";
        $payload .= "Status: NETWORK CONNECTED OK\n";
        $payload .= "Date/Time: {$now}\n";
        $payload .= "================================\n";
        $payload .= $center . "READY FOR KITCHEN KOT TICKETS\n\n\n\n";
        $payload .= $cut;

        $errno = 0;
        $errstr = '';
        $fp = @fsockopen($ip, $port, $errno, $errstr, 2.5);

        if ($fp) {
            fwrite($fp, $payload);
            fflush($fp);
            fclose($fp);

            return [
                'success' => true,
                'message' => "✓ Successfully connected & test slip sent to {$kitchen->name} printer ({$ip}:{$port})!",
            ];
        }

        return [
            'success' => false,
            'message' => "Could not reach printer at {$ip}:{$port}. Error: " . ($errstr ?: 'Connection timed out. Check IP and network cables.'),
        ];
    }

    /**
     * Generate standard ESC/POS bytes for a KOT ticket.
     */
    public static function buildEscPosKOT(Order $order, Kitchen $kitchen, array $items): string
    {
        $init = "\x1B\x40";           // Initialize
        $center = "\x1B\x61\x01";     // Align center
        $left = "\x1B\x61\x00";       // Align left
        $right = "\x1B\x61\x02";      // Align right
        $boldOn = "\x1B\x45\x01";     // Bold on
        $boldOff = "\x1B\x45\x00";    // Bold off
        $double = "\x1D\x21\x11";     // Double width & height
        $doubleH = "\x1D\x21\x01";    // Double height
        $normal = "\x1D\x21\x00";     // Normal size
        $cut = "\x1D\x56\x41\x03";    // Cut paper

        $dt = $order->created_at ? $order->created_at->format('d/m/Y h:i A') : now()->format('d/m/Y h:i A');
        $tableName = $order->table ? ($order->table->table_number . ($order->hall ? " (" . ($order->hall->name ?? $order->hall->hall_name) . ")" : "")) : "N/A";
        $serverName = $order->orderTaker->name ?? $order->user->name ?? 'POS Terminal';

        $out = $init . $center;
        $out .= $double . $boldOn . "*** K. O. T. ***\n" . $normal . $boldOff;
        $out .= $boldOn . "STATION: " . strtoupper($kitchen->name) . "\n" . $boldOff;
        $out .= "------------------------------------------------\n";

        $out .= $left;
        $out .= $boldOn . "ORDER #: " . $order->order_number . $boldOff . "\n";
        $out .= "TYPE   : " . strtoupper($order->order_type) . "  |  TABLE: " . $tableName . "\n";
        $out .= "WAITER : " . $serverName . "\n";
        $out .= "TIME   : " . $dt . "\n";
        if (!empty($order->customer_name)) {
            $out .= "GUEST  : " . $order->customer_name . "\n";
        }
        $out .= "------------------------------------------------\n";

        // Table Header
        $out .= $boldOn . sprintf("%-6s %-32s %-8s\n", "QTY", "DISH / ITEM", "STATUS") . $boldOff;
        $out .= "------------------------------------------------\n";

        foreach ($items as $item) {
            $qtyStr = "[" . $item->quantity . "]";
            $nameStr = substr($item->item_name, 0, 30);
            $out .= $doubleH . $boldOn . sprintf("%-6s %s\n", $qtyStr, $nameStr) . $normal . $boldOff;

            if (!empty($item->kitchen_notes)) {
                $out .= "       >> NOTE: " . $item->kitchen_notes . "\n";
            }
        }

        $out .= "------------------------------------------------\n";

        if (!empty($order->comments)) {
            $out .= $boldOn . "SPECIAL INSTRUCTIONS:\n" . $boldOff;
            $out .= $order->comments . "\n";
            $out .= "------------------------------------------------\n";
        }

        $out .= $center . "\n\n\n\n";
        $out .= $cut;

        return $out;
    }
}
