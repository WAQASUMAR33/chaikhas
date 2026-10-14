<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - {{ $order->order_number }}</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace;
            width: 80mm;
            margin: 0 auto;
            padding: 10px;
            color: #000;
            background: #fff;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .border-top { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
        .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { font-size: 12px; text-align: left; padding: 2px 0; }
        .total-row { font-size: 14px; font-weight: bold; }
        @media print {
            body { width: 100%; padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body onload="window.print()">

    <div class="no-print" style="margin-bottom: 15px; text-align: center;">
        <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; cursor: pointer;">Print Thermal Receipt</button>
    </div>

    <div class="text-center border-bottom">
        <h2 style="margin: 0;">{{ strtoupper(\App\Models\Setting::get('restaurant_name', 'RAPIDTECHPRO')) }}</h2>
        <p style="margin: 2px 0; font-size: 11px;">{{ $order->branch->branch_name ?? 'Main Branch' }}</p>
        <p style="margin: 2px 0; font-size: 10px;">{{ $order->branch->address ?? '' }}</p>
        <p style="margin: 2px 0; font-size: 10px;">Tel: {{ $order->branch->phone ?? '' }}</p>
    </div>

    <div style="font-size: 11px; margin: 8px 0;">
        <div>Order #: <strong>{{ $order->order_number }}</strong></div>
        <div>Type: <strong>{{ $order->order_type }}</strong></div>
        @if($order->table)
        <div>Table: <strong>{{ $order->table->table_number }}</strong></div>
        @endif
        <div>Date: {{ $order->created_at->format('d/m/Y h:i A') }}</div>
        <div>Served By: {{ $order->user->name ?? 'Staff' }}</div>
    </div>

    <table class="border-top border-bottom">
        <thead>
            <tr>
                <th>Item</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->items as $item)
            <tr>
                <td>{{ $item->item_name }}</td>
                <td class="text-center">{{ $item->quantity }}</td>
                <td class="text-right">{{ number_format($item->price, 0) }}</td>
                <td class="text-right">{{ number_format($item->total_amount, 0) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div style="font-size: 12px; margin-top: 5px;" class="border-bottom">
        <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>{{ number_format($order->subtotal, 2) }}</span>
        </div>
        @if($order->discount_amount > 0)
        <div style="display: flex; justify-content: space-between;">
            <span>Discount @if($order->discount_type === 'percentage' && $order->discount_value > 0)({{ (float)$order->discount_value }}%)@endif:</span>
            <span>- {{ number_format($order->discount_amount, 2) }}</span>
        </div>
        @endif
        <div style="display: flex; justify-content: space-between;" class="total-row">
            <span>NET TOTAL:</span>
            <span>{{ number_format($order->net_total, 2) }}</span>
        </div>
    </div>

    <div class="text-center" style="margin-top: 15px; font-size: 11px;">
        <p style="margin: 2px 0;">Thank you for dining with us!</p>
        <p style="margin: 2px 0; font-weight: bold;">Software by Chai Khas Systems</p>
    </div>

</body>
</html>
