<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Goods Received Note (GRN) - {{ $purchase->po_number }}</title>
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
        .divider {
            border-bottom: 1px dashed #666;
            margin: 8px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        th, td {
            padding: 3px 0;
        }
    </style>
</head>
<body onload="window.print()">

    <div class="no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Print Goods Received Note (GRN)</button>
    </div>

    <div class="text-center">
        <h2 style="margin: 0; font-size: 16px; font-weight: 900;">{{ strtoupper($name) }}</h2>
        <div style="font-size: 11px; color: #444;">{{ $address }}</div>
        <div style="font-size: 11px; color: #444;">Tel: {{ $phone1 }}</div>
        <div class="divider"></div>
        <h3 style="margin: 4px 0; font-size: 14px; font-weight: 800; letter-spacing: 0.5px;">GOODS RECEIVED NOTE (GRN)</h3>
        <div style="font-size: 11px; font-weight: bold; color: #333;">INWARD STORE PURCHASE</div>
    </div>

    <div class="divider"></div>

    <div>
        <div><span class="bold">PO #:</span> {{ $purchase->po_number }}</div>
        <div><span class="bold">Vendor Inv #:</span> {{ $purchase->invoice_number ?? 'N/A' }}</div>
        <div><span class="bold">Supplier:</span> {{ $purchase->vendor->name ?? 'N/A' }}</div>
        <div><span class="bold">Supplier Tel:</span> {{ $purchase->vendor->phone ?? 'N/A' }}</div>
        <div><span class="bold">Date:</span> {{ \Carbon\Carbon::parse($purchase->purchase_date)->format('d-M-Y') }}</div>
        <div><span class="bold">Store:</span> MAIN WAREHOUSE</div>
        <div><span class="bold">Logged By:</span> {{ $purchase->addedBy->name ?? 'System' }}</div>
        <div><span class="bold">Payment:</span> {{ strtoupper($purchase->payment_status) }}</div>
    </div>

    <div class="divider"></div>

    <table>
        <thead>
            <tr style="border-bottom: 1px solid #111;">
                <th class="text-left">ITEM</th>
                <th class="text-center">QTY</th>
                <th class="text-right">RATE</th>
                <th class="text-right">TOTAL</th>
            </tr>
        </thead>
        <tbody>
            @foreach($purchase->items as $item)
            <tr>
                <td class="text-left bold">{{ $item->item->item_name ?? 'Raw Item' }}</td>
                <td class="text-center">{{ (float)$item->quantity }} {{ $item->item->unit ?? '' }}</td>
                <td class="text-right">{{ number_format($item->unit_cost, 2) }}</td>
                <td class="text-right bold">{{ number_format($item->total_cost, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="divider"></div>

    <table>
        <tr>
            <td class="bold" style="font-size: 13px;">GRAND TOTAL:</td>
            <td class="text-right bold" style="font-size: 14px;">Rs. {{ number_format($purchase->total_amount, 2) }}</td>
        </tr>
    </table>

    @if($purchase->notes)
    <div style="margin-top: 6px; font-size: 10px; color: #555;">
        <span class="bold">Notes:</span> {{ $purchase->notes }}
    </div>
    @endif

    <div class="divider"></div>

    <div style="margin-top: 15px; font-size: 10px;">
        <div style="display: flex; justify-content: space-between; margin-top: 25px;">
            <div style="border-top: 1px solid #666; width: 45%; text-align: center; padding-top: 3px;">Receiver Sign</div>
            <div style="border-top: 1px solid #666; width: 45%; text-align: center; padding-top: 3px;">Store Incharge</div>
        </div>
    </div>

    <div class="text-center" style="margin-top: 15px; font-size: 9px; color: #777;">
        Printed: {{ now()->format('d-M-Y h:i:s A') }}
    </div>

</body>
</html>
