<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Setting;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PRAService
{
    /**
     * Check if PRA Invoicing is enabled globally.
     */
    public static function isEnabled(): bool
    {
        return (string) Setting::get('pra_enabled', '0') === '1';
    }

    /**
     * Get all PRA configuration values.
     */
    public static function getConfig(): array
    {
        return [
            'enabled' => static::isEnabled(),
            'pos_id' => Setting::get('pra_pos_id', '109824'),
            'ntn' => Setting::get('pra_ntn', '7845129-3'),
            'auth_token' => Setting::get('pra_auth_token', ''),
            'api_url' => Setting::get('pra_api_url', 'https://ims.pra.punjab.gov.pk/api/Live/PostData'),
            'environment' => Setting::get('pra_environment', 'sandbox'), // sandbox or production
            'tax_mode' => Setting::get('pra_tax_mode', 'variable'), // 'variable' (5% card, 16% cash) or 'flat'
            'flat_tax_rate' => (float) Setting::get('pra_flat_tax_rate', 5.0),
            'cash_tax_rate' => (float) Setting::get('pra_cash_tax_rate', 16.0),
            'card_tax_rate' => (float) Setting::get('pra_card_tax_rate', 5.0),
            'auto_send_on_payment' => (string) Setting::get('pra_auto_send_on_payment', '1') === '1',
        ];
    }

    /**
     * Determine effective tax rate for an order based on payment mode & settings.
     */
    public static function getEffectiveTaxRate(Order $order): float
    {
        $config = static::getConfig();
        if ($config['tax_mode'] === 'flat') {
            return (float) $config['flat_tax_rate'];
        }

        $mode = strtolower((string) $order->payment_mode);
        if (str_contains($mode, 'card') || str_contains($mode, 'bank') || str_contains($mode, 'pos') || str_contains($mode, 'online')) {
            return (float) $config['card_tax_rate']; // Typically 5% for card
        }

        return (float) $config['cash_tax_rate']; // Typically 16% for cash
    }

    /**
     * Build standard PRA POS JSON payload for an order.
     */
    public static function buildPayload(Order $order): array
    {
        $config = static::getConfig();
        $taxRate = static::getEffectiveTaxRate($order);

        $order->loadMissing(['items.menuItem', 'branch']);

        // In PRA standards: TotalSaleValue is exclusive of tax, or net total breakdown
        $netTotal = (float) $order->net_total;
        $discount = (float) $order->discount_amount;
        $subtotal = (float) $order->subtotal;

        // Calculate tax portion from the total bill
        // If prices are inclusive: Tax = Total * (Rate / (100 + Rate))
        // If prices are exclusive: Tax = Total * (Rate / 100)
        // In Pakistani restaurants, bill net_total represents the total collected.
        $taxCharged = round(($netTotal * $taxRate) / (100 + $taxRate), 2);
        $saleValueWithoutTax = max(0, round($netTotal - $taxCharged, 2));

        $paymentModeCode = 1; // 1 = Cash
        $mode = strtolower((string) $order->payment_mode);
        if (str_contains($mode, 'card')) {
            $paymentModeCode = 2; // 2 = Card
        } elseif (str_contains($mode, 'credit') || str_contains($mode, 'khata')) {
            $paymentModeCode = 3; // 3 = Credit / Account
        } elseif (str_contains($mode, 'online') || str_contains($mode, 'wallet')) {
            $paymentModeCode = 4; // 4 = Digital Wallet / Mobile
        }

        $itemsPayload = [];
        $totalQty = 0;

        foreach ($order->items as $idx => $item) {
            if ($item->quantity <= 0) continue;
            $qty = (int) $item->quantity;
            $totalQty += $qty;

            $itemTotal = (float) $item->total_amount;
            $itemTax = round(($itemTotal * $taxRate) / (100 + $taxRate), 2);
            $itemSaleValue = max(0, round($itemTotal - $itemTax, 2));

            $itemsPayload[] = [
                'ItemCode' => (string) ($item->menu_item_id ?: ($idx + 1)),
                'ItemName' => (string) $item->item_name,
                'Quantity' => $qty,
                'TotalAmount' => $itemTotal,
                'SaleValue' => $itemSaleValue,
                'TaxCharged' => $itemTax,
                'TaxRate' => $taxRate,
                'Discount' => 0.0,
                'FurtherTax' => 0.0,
                'InvoiceType' => 1,
            ];
        }

        return [
            'InvoiceNumber' => $order->pra_invoice_number ?: '',
            'POSID' => (int) ($config['pos_id'] ?: 109824),
            'USIN' => (string) $order->order_number,
            'DateTime' => $order->created_at ? $order->created_at->format('Y-m-d H:i:s') : date('Y-m-d H:i:s'),
            'TotalQuantity' => $totalQty ?: 1,
            'TotalSaleValue' => $saleValueWithoutTax,
            'TotalTaxCharged' => $taxCharged,
            'TotalBillAmount' => $netTotal,
            'Discount' => $discount,
            'FurtherTax' => 0.0,
            'PaymentMode' => $paymentModeCode,
            'InvoiceType' => 1,
            'Items' => $itemsPayload,
        ];
    }

    /**
     * Transmit order invoice to Punjab Revenue Authority (PRA).
     */
    public static function sendInvoice(Order $order): array
    {
        if (!static::isEnabled()) {
            return [
                'success' => false,
                'status' => 'disabled',
                'message' => 'PRA Invoicing is currently switched OFF in Settings.',
            ];
        }

        $config = static::getConfig();
        $payload = static::buildPayload($order);

        // SANDBOX / SIMULATION MODE
        if ($config['environment'] === 'sandbox' || empty($config['auth_token'])) {
            $praInvoiceNo = 'PRA-' . date('Ymd') . '-' . str_pad($order->id, 6, '0', STR_PAD_LEFT) . '-' . strtoupper(substr(md5($order->order_number . time()), 0, 4));
            
            // Standard PRA QR code payload format:
            // InvoiceNumber,POSID,USIN,DateTime,TotalSaleValue,TotalTaxCharged,TotalBillAmount
            $qrPayload = sprintf(
                "PRA:%s|POS:%s|USIN:%s|DT:%s|VAL:%.2f|TAX:%.2f|TOT:%.2f|NTN:%s",
                $praInvoiceNo,
                $config['pos_id'],
                $order->order_number,
                $payload['DateTime'],
                $payload['TotalSaleValue'],
                $payload['TotalTaxCharged'],
                $payload['TotalBillAmount'],
                $config['ntn']
            );

            $simulatedResponse = [
                'status' => 'SUCCESS',
                'code' => '00',
                'message' => 'Invoice verified & recorded in PRA Punjab IMS (Sandbox Simulation)',
                'InvoiceNumber' => $praInvoiceNo,
                'POSID' => $config['pos_id'],
                'DateTime' => $payload['DateTime'],
                'environment' => 'sandbox',
            ];

            $order->update([
                'pra_invoice_number' => $praInvoiceNo,
                'pra_qr_code' => $qrPayload,
                'pra_status' => 'synced',
                'pra_response' => json_encode($simulatedResponse),
                'pra_sent_at' => now(),
            ]);

            AuditLog::log('PRA Invoice Generated (Sandbox)', 'Orders', null, [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'pra_invoice_number' => $praInvoiceNo,
            ]);

            return [
                'success' => true,
                'status' => 'synced',
                'invoice_number' => $praInvoiceNo,
                'qr_code' => $qrPayload,
                'message' => 'Invoice transmitted to PRA successfully (Sandbox Mode)!',
                'response' => $simulatedResponse,
            ];
        }

        // PRODUCTION MODE - Live HTTP API Call
        try {
            $response = Http::timeout(12)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $config['auth_token'],
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->post($config['api_url'], $payload);

            $resBody = $response->json();
            $rawBody = $response->body();

            if ($response->successful() && (!empty($resBody['InvoiceNumber']) || !empty($resBody['invoice_number']))) {
                $praInvoiceNo = $resBody['InvoiceNumber'] ?? $resBody['invoice_number'];
                $qrPayload = $resBody['QRCode'] ?? sprintf(
                    "PRA:%s|POS:%s|USIN:%s|DT:%s|VAL:%.2f|TAX:%.2f|TOT:%.2f|NTN:%s",
                    $praInvoiceNo,
                    $config['pos_id'],
                    $order->order_number,
                    $payload['DateTime'],
                    $payload['TotalSaleValue'],
                    $payload['TotalTaxCharged'],
                    $payload['TotalBillAmount'],
                    $config['ntn']
                );

                $order->update([
                    'pra_invoice_number' => $praInvoiceNo,
                    'pra_qr_code' => $qrPayload,
                    'pra_status' => 'synced',
                    'pra_response' => $rawBody,
                    'pra_sent_at' => now(),
                ]);

                AuditLog::log('PRA Invoice Transmitted', 'Orders', null, [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'pra_invoice_number' => $praInvoiceNo,
                ]);

                return [
                    'success' => true,
                    'status' => 'synced',
                    'invoice_number' => $praInvoiceNo,
                    'qr_code' => $qrPayload,
                    'message' => 'Invoice transmitted to PRA successfully!',
                    'response' => $resBody,
                ];
            } else {
                $order->update([
                    'pra_status' => 'failed',
                    'pra_response' => 'HTTP ' . $response->status() . ': ' . $rawBody,
                    'pra_sent_at' => now(),
                ]);

                Log::warning('PRA Invoice transmission returned error for Order #' . $order->order_number, [
                    'status' => $response->status(),
                    'body' => $rawBody,
                ]);

                return [
                    'success' => false,
                    'status' => 'failed',
                    'message' => 'PRA Gateway responded with error: ' . ($resBody['message'] ?? $rawBody),
                    'response' => $resBody,
                ];
            }
        } catch (\Throwable $e) {
            Log::error('PRA Invoice transmission failed with exception: ' . $e->getMessage());

            $order->update([
                'pra_status' => 'failed',
                'pra_response' => 'Exception: ' . $e->getMessage(),
                'pra_sent_at' => now(),
            ]);

            return [
                'success' => false,
                'status' => 'failed',
                'message' => 'Failed to reach PRA Gateway: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Test connection to PRA IMS Gateway.
     */
    public static function testConnection(): array
    {
        $config = static::getConfig();

        if ($config['environment'] === 'sandbox') {
            return [
                'success' => true,
                'status' => 'online',
                'mode' => 'sandbox',
                'message' => 'PRA Sandbox Gateway simulated connection active & operational.',
                'details' => [
                    'pos_id' => $config['pos_id'],
                    'ntn' => $config['ntn'],
                    'tax_mode' => $config['tax_mode'],
                    'cash_rate' => $config['cash_tax_rate'] . '%',
                    'card_rate' => $config['card_tax_rate'] . '%',
                ],
            ];
        }

        try {
            $testUrl = str_replace(['PostData', 'postdata'], ['Ping', 'ping'], $config['api_url']);
            $response = Http::timeout(8)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $config['auth_token'],
                    'Accept' => 'application/json',
                ])
                ->get($testUrl);

            return [
                'success' => $response->successful(),
                'status' => $response->successful() ? 'online' : 'error',
                'mode' => 'production',
                'message' => $response->successful() ? 'Successfully connected to PRA Live Gateway!' : 'PRA Gateway responded with status: ' . $response->status(),
                'http_status' => $response->status(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'status' => 'offline',
                'mode' => 'production',
                'message' => 'Could not connect to PRA Endpoint: ' . $e->getMessage(),
            ];
        }
    }
}
