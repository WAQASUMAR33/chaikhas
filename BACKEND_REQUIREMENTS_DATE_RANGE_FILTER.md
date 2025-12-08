# Backend Requirements for Date Range Filter

## Overview
The frontend has been updated to remove period filters (daily/weekly/monthly) and now only uses **custom date range** (from_date - to_date) for all sales and menu sales pages.

## Required Backend Changes

### 1. API: `api/get_sales.php`
**Current Behavior:** May accept `period` parameter (daily/weekly/monthly/custom) and optional date parameters.

**Required Changes:**
- **Remove dependency on `period` parameter** - The frontend will no longer send `period`.
- **Always require `from_date` and `to_date` parameters** - These will always be sent by the frontend.
- Filter sales data to include only records where the order/bill date is between `from_date` and `to_date` (inclusive).
- If `branch_id` is provided, filter by that branch as well.

**Example Request:**
```json
POST /api/get_sales.php
{
  "terminal": "terminal_id",
  "branch_id": 1,
  "from_date": "2024-01-01",
  "to_date": "2024-01-31"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "total_sales": 5000.00,
      "total_orders": 25,
      "average_order": 200.00
    }
  ]
}
```

---

### 2. API: `api/get_menu_sales.php`
**Current Behavior:** May accept `period` parameter (daily/weekly/monthly) and optional date parameters.

**Required Changes:**
- **Remove dependency on `period` parameter** - The frontend will no longer send `period`.
- **Always require `from_date` and `to_date` parameters** - These will always be sent by the frontend.
- Aggregate menu sales from `order_items` table where the order date is between `from_date` and `to_date` (inclusive).
- If `branch_id` is provided, filter by that branch as well.

**Example Request:**
```json
POST /api/get_menu_sales.php
{
  "terminal": "terminal_id",
  "branch_id": 1,
  "from_date": "2024-01-01",
  "to_date": "2024-01-31"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "dish_id": 1,
      "name": "Chicken Biryani",
      "category": "Main Course",
      "quantity_sold": 50,
      "total_revenue": 2500.00
    }
  ]
}
```

---
n
**Example Request:**
```json
POST /api/get_sales_report.php
{
  "terminal": "terminal_id",
  "branch_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "include_credit": true
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "order_id": 123,
      "bill_id": 456,
      "bill_amount": 5000.00,
      "net_total": 5000.00,
      "payment_method": "cash",
      "payment_status": "paid",
      "customer_id": null,
      "customer_name": null,
      "is_credit": false
    }
  ]
}
```

---

## Date Format
- All dates are in **YYYY-MM-DD** format (e.g., "2024-01-15").
- Dates are inclusive (both `from_date` and `to_date` should be included in the range).

## Backward Compatibility
- If `period` parameter is still sent (for backward compatibility), it can be ignored.
- The `from_date` and `to_date` parameters take precedence.

## Testing
1. Test with a single day range: `from_date = "2024-01-15"`, `to_date = "2024-01-15"`
2. Test with a week range: `from_date = "2024-01-01"`, `to_date = "2024-01-07"`
3. Test with a month range: `from_date = "2024-01-01"`, `to_date = "2024-01-31"`
4. Test with a custom range: `from_date = "2024-01-10"`, `to_date = "2024-01-20"`
5. Test with branch filtering: Include `branch_id` in the request.

---

## Summary
- **Remove `period` parameter dependency** from both APIs.
- **Always use `from_date` and `to_date`** for filtering.
- **Ensure date range filtering is inclusive** (include both start and end dates).
- **Maintain branch filtering** if `branch_id` is provided.

