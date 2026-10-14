<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Day End Z-Report #{{ $dayend->id }} - {{ $dayend->date->format('Y-m-d') }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            font-size: 13px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            padding: 20px;
        }
        .receipt-container {
            max-width: 380px;
            margin: 0 auto;
            border: 1px solid #ddd;
            padding: 15px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
        }
        .double-divider {
            border-top: 2px dashed #000;
            margin: 10px 0;
        }
        .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
        }
        .table th, .table td {
            padding: 2px 0;
        }
        .badge-diff {
            font-weight: bold;
            padding: 1px 4px;
        }
        .diff-over { color: #047857; }
        .diff-short { color: #b91c1c; }
        .no-print {
            text-align: center;
            margin-bottom: 15px;
        }
        .btn-print {
            background: #026897;
            color: #fff;
            border: none;
            padding: 8px 16px;
            font-weight: bold;
            cursor: pointer;
            font-family: sans-serif;
            font-size: 13px;
        }
        @media print {
            .no-print { display: none; }
            body { padding: 0; }
            .receipt-container {
                border: none;
                max-width: 100%;
                width: 100%;
                padding: 0;
            }
        }
    </style>
</head>
<body>

    <div class="no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Print Z-Report Slip</button>
        <button class="btn-print" style="background: #475569;" onclick="window.close()">Close Window</button>
    </div>

    <div class="receipt-container">
        <!-- Header -->
        <div class="text-center">
            <h2 class="uppercase font-bold" style="font-size: 18px;">{{ $dayend->branch->branch_name ?? 'RESTAURANT KHAS' }}</h2>
            <p>{{ $dayend->branch->address ?? 'Main Branch' }}</p>
            <div class="double-divider"></div>
            <h3 class="font-bold" style="letter-spacing: 1px;">*** DAY END Z-REPORT ***</h3>
            <p class="font-bold">CLOSURE ID: #{{ str_pad($dayend->id, 5, '0', STR_PAD_LEFT) }}</p>
            <div class="divider"></div>
        </div>

        <!-- Meta -->
        <div class="row">
            <span>Closure Date:</span>
            <span class="font-bold">{{ $dayend->date->format('d-M-Y') }}</span>
        </div>
        <div class="row">
            <span>Closed At:</span>
            <span>{{ $dayend->closed_at ? $dayend->closed_at->format('h:i:s A') : $dayend->created_at->format('h:i:s A') }}</span>
        </div>
        <div class="row">
            <span>Register Manager:</span>
            <span class="font-bold">{{ $dayend->user->name ?? 'Staff' }}</span>
        </div>
        <div class="row">
            <span>Branch:</span>
            <span>{{ $dayend->branch->branch_name ?? 'Global' }}</span>
        </div>

        <div class="divider"></div>

        <!-- Sales Summary -->
        <div class="text-center font-bold uppercase" style="margin-bottom: 4px;">-- SALES BREAKDOWN --</div>
        <div class="row">
            <span>Gross Sales (Subtotal):</span>
            <span>{{ number_format($dayend->gross_sales, 2) }}</span>
        </div>
        <div class="row">
            <span>Total Discounts:</span>
            <span>-{{ number_format($dayend->total_discount, 2) }}</span>
        </div>
        <div class="row">
            <span>Service Charges:</span>
            <span>+{{ number_format($dayend->total_service_charges, 2) }}</span>
        </div>
        <div class="row">
            <span>Sales Tax / PRA:</span>
            <span>+{{ number_format($dayend->total_tax, 2) }}</span>
        </div>
        <div class="divider"></div>
        <div class="row font-bold" style="font-size: 15px;">
            <span>NET TOTAL SALES:</span>
            <span>{{ number_format($dayend->total_sales, 2) }}</span>
        </div>
        <div class="divider"></div>

        <!-- Payment Modes -->
        <div class="text-center font-bold uppercase" style="margin: 6px 0 4px 0;">-- PAYMENT MODES --</div>
        <div class="row">
            <span>Cash Sales:</span>
            <span class="font-bold">{{ number_format($dayend->cash_sales, 2) }}</span>
        </div>
        <div class="row">
            <span>Card Sales:</span>
            <span>{{ number_format($dayend->card_sales, 2) }}</span>
        </div>
        <div class="row">
            <span>Online / Digital:</span>
            <span>{{ number_format($dayend->online_sales, 2) }}</span>
        </div>
        @if($dayend->other_sales > 0)
        <div class="row">
            <span>Other / Split:</span>
            <span>{{ number_format($dayend->other_sales, 2) }}</span>
        </div>
        @endif

        <div class="divider"></div>

        <!-- Cash Drawer Reconciliation -->
        <div class="text-center font-bold uppercase" style="margin: 6px 0 4px 0;">-- CASH RECONCILIATION --</div>
        <div class="row">
            <span>Opening Till Float:</span>
            <span>{{ number_format($dayend->opening_cash, 2) }}</span>
        </div>
        <div class="row">
            <span>(+) Cash Sales In:</span>
            <span>{{ number_format($dayend->cash_sales, 2) }}</span>
        </div>
        <div class="row">
            <span>(-) Total Expenses Out:</span>
            <span>{{ number_format($dayend->total_expenses, 2) }}</span>
        </div>
        <div class="divider"></div>
        <div class="row font-bold">
            <span>EXPECTED TILL CASH:</span>
            <span>{{ number_format($dayend->expected_cash, 2) }}</span>
        </div>
        <div class="row font-bold">
            <span>ACTUAL COUNTED CASH:</span>
            <span>{{ number_format($dayend->actual_cash, 2) }}</span>
        </div>
        <div class="row font-bold">
            <span>DIFFERENCE / VARIANCE:</span>
            @if($dayend->cash_difference > 0)
                <span class="badge-diff diff-over">+{{ number_format($dayend->cash_difference, 2) }} (OVER)</span>
            @elseif($dayend->cash_difference < 0)
                <span class="badge-diff diff-short">{{ number_format($dayend->cash_difference, 2) }} (SHORT)</span>
            @else
                <span class="badge-diff font-bold">0.00 (BALANCED)</span>
            @endif
        </div>

        <div class="divider"></div>

        <!-- Order Statistics -->
        <div class="text-center font-bold uppercase" style="margin: 6px 0 4px 0;">-- ORDER TYPES & STATS --</div>
        <div class="row">
            <span>Total Orders:</span>
            <span class="font-bold">{{ $dayend->total_orders }}</span>
        </div>
        <div class="row">
            <span>Completed Orders:</span>
            <span>{{ $dayend->completed_orders }}</span>
        </div>
        <div class="row">
            <span>Cancelled Orders:</span>
            <span>{{ $dayend->cancelled_orders }}</span>
        </div>
        <div class="row">
            <span>Dine In ({{ $dayend->dine_in_count }} orders):</span>
            <span>{{ number_format($dayend->dine_in_sales, 2) }}</span>
        </div>
        <div class="row">
            <span>Takeaway ({{ $dayend->takeaway_count }} orders):</span>
            <span>{{ number_format($dayend->takeaway_sales, 2) }}</span>
        </div>
        <div class="row">
            <span>Delivery ({{ $dayend->delivery_count }} orders):</span>
            <span>{{ number_format($dayend->delivery_sales, 2) }}</span>
        </div>

        @php
            $details = $dayend->details ?? [];
            $topItems = $details['top_items'] ?? [];
            $categorySales = $details['category_sales'] ?? [];
            $expensesList = $details['expenses_list'] ?? [];
        @endphp

        <!-- Top Selling Items -->
        @if(!empty($topItems))
        <div class="divider"></div>
        <div class="text-center font-bold uppercase" style="margin: 6px 0 4px 0;">-- TOP SELLING ITEMS --</div>
        <table class="table">
            <thead>
                <tr style="border-bottom: 1px dotted #000; text-align: left;">
                    <th>Item</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($topItems as $item)
                <tr>
                    <td style="max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ $item['name'] }}</td>
                    <td class="text-right">{{ $item['quantity'] }}</td>
                    <td class="text-right">{{ number_format($item['total'], 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        <!-- Category Sales -->
        @if(!empty($categorySales))
        <div class="divider"></div>
        <div class="text-center font-bold uppercase" style="margin: 6px 0 4px 0;">-- CATEGORY SUMMARY --</div>
        <table class="table">
            <thead>
                <tr style="border-bottom: 1px dotted #000; text-align: left;">
                    <th>Category</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($categorySales as $cat)
                <tr>
                    <td>{{ $cat['name'] }}</td>
                    <td class="text-right">{{ $cat['quantity'] }}</td>
                    <td class="text-right">{{ number_format($cat['total'], 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        <!-- Expenses Itemized -->
        @if(!empty($expensesList))
        <div class="divider"></div>
        <div class="text-center font-bold uppercase" style="margin: 6px 0 4px 0;">-- EXPENSES RECORDED --</div>
        <table class="table">
            <thead>
                <tr style="border-bottom: 1px dotted #000; text-align: left;">
                    <th>Expense</th>
                    <th>Category</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($expensesList as $exp)
                <tr>
                    <td>{{ $exp['title'] }}</td>
                    <td>{{ $exp['category'] }}</td>
                    <td class="text-right">{{ number_format($exp['amount'], 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        @if($dayend->notes)
        <div class="divider"></div>
        <div>
            <span class="font-bold">Manager Notes:</span>
            <p style="margin-top: 2px;">{{ $dayend->notes }}</p>
        </div>
        @endif

        <div class="double-divider"></div>
        <div class="text-center">
            <p class="font-bold">*** END OF DAY RECONCILIATION ***</p>
            <p style="font-size: 11px; margin-top: 4px;">Verified and approved for shift audit.</p>
        </div>
    </div>

</body>
</html>
