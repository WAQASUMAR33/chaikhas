# Sales Report System Setup Guide

This guide explains how to set up and use the sales report system for both Super Admin and Branch Admin dashboards.

## Overview

The sales report system allows you to:
- Generate monthly sales reports
- Super Admin can view reports from all branches with branch filter
- Branch Admin can only view reports for their own branch
- Print reports in A4 Landscape format
- Reports include all order details with proper formatting

## Features

### Report Attributes
- Order ID
- Created At
- Order Type
- Hall
- Table
- Order Taker Name
- Bill Amount
- Service Charge
- Discount
- Net Total
- Payment Mode
- Bill By
- Last Update

### Print Features
- A4 Landscape format
- Logo on left top (placeholder - replace with your logo)
- Branch name and address in center top
- Report number on right top
- Headers repeat on all pages
- Page numbering (Page X of Y) at bottom
- Professional table formatting

## Database Requirements

The sales report uses existing tables:
- `orders` - Order information
- `bills` - Bill/Invoice information
- `branches` - Branch information
- `halls` - Hall information
- `tables` - Table information
- `users` - User information (for order taker and bill by)

**No database changes are required** - the system uses existing tables.

## PHP API File Setup

### File Created:

**`api/get_sales_report.php`** - Fetches sales report data
- POST request
- Parameters:
  - `start_date` (required) - Start date in YYYY-MM-DD format
  - `end_date` (required) - End date in YYYY-MM-DD format
  - `branch_id` (optional) - Filter by branch_id. If null or not provided, returns all branches

### API Endpoint:

```
POST /api/get_sales_report.php
Content-Type: application/json

{
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "branch_id": 1  // Optional: omit for all branches
}
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "order_id": 1,
      "created_at": "2024-01-15 10:30:00",
      "order_type": "Dine In",
      "branch_name": "Main Branch",
      "hall_name": "Hall 1",
      "table_number": "T-01",
      "order_taker_name": "John Doe",
      "bill_amount": 5000.00,
      "service_charge": 500.00,
      "discount_amount": 0.00,
      "net_total": 5500.00,
      "payment_mode": "Cash",
      "bill_by_name": "Jane Smith",
      "updated_at": "2024-01-15 11:00:00"
    }
  ],
  "count": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

## Frontend Pages

### Branch Admin Sales Report Page
**Location:** `app/dashboard/branch-admin/sales-report/page.jsx`

**Features:**
- Monthly report selection
- Generate report button
- Print functionality
- Shows only current branch's sales
- Summary cards with totals

### Super Admin Sales Report Page
**Location:** `app/dashboard/super-admin/sales-report/page.jsx`

**Features:**
- Monthly report selection
- Branch filter dropdown
- Generate report button
- Print functionality
- Shows sales from all branches or filtered branch
- Summary cards with totals

## Usage Instructions

### For Branch Admin:

1. **Navigate to Sales Report:**
   - Go to Dashboard → Sales Report

2. **Select Month:**
   - Use the month picker to select the month you want to generate a report for
   - Default is current month

3. **Generate Report:**
   - Click "Generate Report" button
   - Wait for the report to load
   - Report will show all completed orders for your branch in the selected month

4. **Print Report:**
   - After generating the report, click "Print Report" button
   - The print dialog will open
   - Select your printer and print settings
   - Report will be printed in A4 Landscape format

### For Super Admin:

1. **Navigate to Sales Report:**
   - Go to Dashboard → Sales Report

2. **Select Month:**
   - Use the month picker to select the month

3. **Filter by Branch (Optional):**
   - Use the branch dropdown to filter by specific branch
   - Select "All Branches" to see all branches' sales

4. **Generate Report:**
   - Click "Generate Report" button
   - Report will show sales based on your filters

5. **Print Report:**
   - Click "Print Report" button
   - Report will be printed with proper formatting

## Print Format Details

### Header (Repeats on all pages):
- **Left:** Logo placeholder (replace with your logo image)
- **Center:** Branch name and address
- **Right:** Report number and generation date

### Table Columns:
1. Order ID
2. Created At
3. Order Type
4. Hall
5. Table
6. Order Taker
7. Bill Amount
8. Service Charge
9. Discount
10. Net Total
11. Payment Mode
12. Bill By
13. Last Update

### Footer:
- Page numbers (Page X of Y) at bottom center of each page

### Page Settings:
- **Size:** A4 Landscape
- **Margins:** 1.5cm top/bottom, 1cm left/right
- **Headers:** Repeat on all pages
- **Page Breaks:** Automatic, avoiding row splits

## Customizing the Logo

To add your logo to the report:

1. Place your logo image in the `public` folder (e.g., `public/logo.png`)
2. Update the print view in both report pages:

```jsx
<div style={{ width: '20%' }}>
  <img 
    src="/logo.png" 
    alt="Logo" 
    style={{ 
      width: '80px', 
      height: '80px',
      objectFit: 'contain'
    }} 
  />
</div>
```

Replace the placeholder div with the img tag above.

## Troubleshooting

### Issue: "No data found" or empty report
**Solution:**
- Check if there are completed orders (with bills) in the selected month
- Verify the date range is correct
- Check database connection

### Issue: Print preview shows blank pages
**Solution:**
- Make sure you've generated the report first
- Check browser print settings
- Try a different browser

### Issue: Headers not repeating on all pages
**Solution:**
- This is a browser-specific feature
- Works best in Chrome/Edge
- Some browsers may not support CSS page headers

### Issue: Page numbers not showing
**Solution:**
- Page numbers use CSS page counters
- Some browsers may not support this
- Check browser compatibility

### Issue: API returns error
**Solution:**
- Verify `get_sales_report.php` is in the `api` folder
- Check database connection in `config.php`
- Verify all required tables exist
- Check that orders have associated bills

## Database Query Details

The report query joins:
- `orders` (main table)
- `branches` (for branch name)
- `halls` (for hall name)
- `tables` (for table number)
- `users` (for order taker name)
- `bills` (for bill details)
- `users` (for bill by name)

**Important:** Only orders with completed bills are included in the report.

## Testing

1. **Test Report Generation:**
   - Select a month with known orders
   - Generate report
   - Verify data is correct

2. **Test Print:**
   - Generate a report
   - Click print
   - Check print preview
   - Verify formatting is correct

3. **Test Branch Filter (Super Admin):**
   - Select "All Branches"
   - Generate report
   - Select specific branch
   - Generate report again
   - Verify filtering works

## Notes

- Reports only include orders that have been billed (completed orders)
- Dates are formatted according to locale settings
- Amounts are displayed in PKR format
- Report numbers are auto-generated based on timestamp
- Large reports may take time to generate and print

