<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - {{ $order->order_number }}</title>
    <style>
        @media print {
            @page {
                margin: 0;
                size: 80mm auto;
            }
            body {
                margin: 0;
                padding: 10px;
            }
            .no-print {
                display: none !important;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            width: 78mm;
            margin: 0 auto;
            padding: 12px 10px;
            color: #111;
            background: #fff;
            font-size: 12px;
            line-height: 1.4;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: 700; }
        .extrabold { font-weight: 800; }
        
        .logo {
            max-width: 140px;
            max-height: 140px;
            border-radius: 50%;
            margin: 0 auto 8px auto;
            display: block;
            object-fit: contain;
        }
        .btn-print {
            display: block;
            width: 100%;
            padding: 10px;
            background: #000;
            color: #fff;
            text-align: center;
            font-weight: bold;
            text-decoration: none;
            margin-bottom: 15px;
            cursor: pointer;
            border: none;
            font-size: 13px;
        }
        .divider-line {
            border-bottom: 1px solid #bbb;
            margin: 8px 0;
        }
        .divider-dashed {
            border-bottom: 1px dashed #777;
            margin: 10px 0;
        }
        .order-badge {
            display: inline-block;
            border: 1px solid #333;
            border-radius: 4px;
            padding: 2px 10px;
            font-size: 11px;
            font-weight: bold;
            margin: 4px 0;
        }
        table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0;
        }
        table.items-table th {
            font-size: 11px;
            font-weight: 700;
            padding: 4px 0;
            border-bottom: 1px solid #444;
            text-transform: uppercase;
        }
        table.items-table td {
            padding: 5px 0;
            font-size: 11px;
            vertical-align: top;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3px 0;
            font-size: 12px;
        }
        .net-amount-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            font-size: 14px;
            font-weight: 800;
            border-top: 1.5px solid #222;
            border-bottom: 1.5px solid #222;
            margin: 6px 0;
        }
        .footer-small {
            font-size: 9px;
            color: #444;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()" class="btn-print">🖨️ Print Thermal Receipt</button>
    </div>

    <!-- Header Section -->
    <div class="text-center">
        @if(!empty($logo))
            <img src="{{ asset('storage/' . $logo) }}" alt="Logo" class="logo">
        @endif
        <div class="extrabold" style="font-size: 17px; tracking: -0.5px;">{{ $name }}</div>
        @if(!empty($slogan))
            <div style="font-size: 10px; color: #444; margin-top: 1px;">{{ $slogan }}</div>
        @endif
        @if(!empty($address))
            <div style="font-size: 10px; color: #555; margin-top: 2px;">{{ $address }}</div>
        @endif
        @if(!empty($phone1) || !empty($phone2))
            <div style="font-size: 10px; color: #555;">
                @if(!empty($phone1)) Ph: {{ $phone1 }} @endif
                @if(!empty($phone2)) | {{ $phone2 }} @endif
            </div>
        @endif
    </div>

    <div class="divider-line"></div>

    <!-- Order Metadata Section (Centered) -->
    <div class="text-center" style="font-size: 11px;">
        <div><strong>Date:</strong> {{ $order->created_at->format('d/m/Y, h:i a') }}</div>
        <div><strong>Order #:</strong> {{ $order->order_number }}</div>
        <div class="order-badge">{{ $order->order_type }}</div>
        @if($order->table)
            <div><strong>Table:</strong> {{ $order->table->table_number }} @if($order->hall) ({{ $order->hall->name ?? $order->hall->hall_name }}) @endif</div>
        @endif
        @if($order->orderTaker)
            <div><strong>Order Taker:</strong> {{ $order->orderTaker->name }}</div>
        @endif
    </div>

    <div class="divider-line"></div>

    <!-- Item Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th class="text-left" style="width: 40%;">ITEM</th>
                <th class="text-right" style="width: 24%;">PRICE</th>
                <th class="text-center" style="width: 14%;">QTY</th>
                <th class="text-right" style="width: 22%;">TOTAL</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->items as $item)
            <tr>
                <td class="text-left" style="padding-right: 4px;">
                    <span class="bold">{{ $item->item_name }}</span>
                </td>
                <td class="text-right" style="font-size: 11px;">
                    {{ number_format($item->price, 0) }}
                </td>
                <td class="text-center bold" style="font-size: 11px;">
                    {{ $item->quantity }}
                </td>
                <td class="text-right bold" style="font-size: 11px;">
                    {{ number_format($item->total_amount, 2) }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="divider-line" style="margin-top: 2px;"></div>

    <!-- Bill Amounts & Calculation Section -->
    <div style="margin-top: 4px;">
        <div class="summary-row">
            <span>Bill amount:</span>
            <span class="bold">{{ currency_symbol() }} {{ number_format($order->subtotal, 2) }}</span>
        </div>

        @if($order->order_type === 'Dine In' && $order->service_charge > 0)
        <div class="summary-row">
            <span>Service charges ({{ $serviceChargePct }}% of bill):</span>
            <span class="bold">+ {{ currency_symbol() }} {{ number_format($order->service_charge, 2) }}</span>
        </div>
        @endif

        @if($order->discount_amount > 0)
        <div class="summary-row">
            <span>Discount @if($order->discount_type === 'percentage' && $order->discount_value > 0)({{ (float)$order->discount_value }}%)@endif:</span>
            <span class="bold">- {{ currency_symbol() }} {{ number_format($order->discount_amount, 2) }}</span>
        </div>
        @endif

        <div class="net-amount-row">
            <span>Net amount:</span>
            <span>{{ currency_symbol() }} {{ number_format($order->net_total, 2) }}</span>
        </div>
    </div>

    <!-- Payment Mode & Bill ID -->
    <div style="margin-top: 8px; font-size: 11px;">
        <div class="summary-row">
            <span>Payment Method:</span>
            <span class="bold">{{ $order->payment_mode ?? 'Cash' }}</span>
        </div>
        <div class="summary-row">
            <span>Bill ID:</span>
            <span>#{{ $order->id }}</span>
        </div>
    </div>

    @if(!empty($order->pra_invoice_number) || (\App\Services\PRAService::isEnabled() && !empty($praConfig['pos_id'])))
    <div class="divider-dashed"></div>
    <!-- Punjab Revenue Authority (PRA) Fiscal Box -->
    <div style="border: 1.5px dashed #222; padding: 6px 8px; margin: 8px 0; text-align: center; border-radius: 4px;">
        <div class="bold" style="font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;">
            🏛️ Punjab Revenue Authority (PRA)
        </div>
        <div style="font-size: 9px; color: #333; margin-top: 1px;">
            Punjab Sales Tax on Services • PRA / IMS Verified
        </div>

        @if(!empty($order->pra_invoice_number))
        <div style="margin-top: 4px; font-size: 11px; font-weight: 800; font-family: monospace;">
            PRA Inv: {{ $order->pra_invoice_number }}
        </div>
        @endif

        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 3px;">
            <span>POS ID: <strong>{{ $praConfig['pos_id'] ?? '109824' }}</strong></span>
            <span>NTN: <strong>{{ $praConfig['ntn'] ?? '7845129-3' }}</strong></span>
        </div>

        @php
            $taxRate = \App\Services\PRAService::getEffectiveTaxRate($order);
            $taxAmt = round(($order->net_total * $taxRate) / (100 + $taxRate), 2);
        @endphp
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
            <span>PST Rate ({{ $taxRate }}%):</span>
            <strong>{{ currency_symbol() }} {{ number_format($taxAmt, 2) }}</strong>
        </div>

        <!-- Rendered PRA Thermal QR Code -->
        @php
            $qrCodeText = $order->pra_qr_code ?: ('PRA:' . ($order->pra_invoice_number ?: $order->order_number) . '|POS:' . ($praConfig['pos_id'] ?? '') . '|TOT:' . $order->net_total);
            $qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=115x115&data=' . urlencode($qrCodeText);
        @endphp
        <div style="margin: 6px auto 3px auto; display: inline-block;">
            <img src="{{ $qrUrl }}" alt="PRA QR Code" style="width: 105px; height: 105px; display: block; margin: 0 auto;" />
            <div style="font-size: 8px; color: #555; margin-top: 2px; font-weight: 700;">SCAN WITH PRA TAX ASAN APP</div>
        </div>
    </div>
    @endif

    <div class="divider-dashed"></div>

    <!-- Footer Thank You Section -->
    <div class="text-center" style="margin-top: 6px;">
        <div class="extrabold" style="font-size: 14px; letter-spacing: 2px;">THANK YOU</div>
        <div style="font-size: 10px; color: #444; margin-top: 3px; font-style: italic;">
            {{ $notes ?? 'Thank you for dining with us!' }}
        </div>
    </div>

    <!-- Small Footer Information -->
    <div class="footer-small">
        <div class="summary-row" style="font-size: 9px; color: #555; padding: 2px 0;">
            <span>bill generated by : {{ $order->user->name ?? Auth::user()->name ?? 'Admin' }}</span>
            <span style="font-weight: 700; text-transform: uppercase;">Developed by RAPIDTECHPRO</span>
        </div>
    </div>

    <!-- Direct Thermal Print Script -->
    <script>
        window.addEventListener('DOMContentLoaded', function() {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('autoprint') === '1' || window.self !== window.top) {
                setTimeout(function() {
                    window.print();
                }, 300);
            }
        });
    </script>
</body>
</html>
