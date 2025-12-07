# Backend Requirements for Sales Reports and Sales List

## Overview
All dashboard pages (super-admin and branch-admin) now support filtering sales reports by date periods: **Daily**, **Weekly**, **Monthly**, **Custom Date Range**, and **All Time**.

## Affected Pages
1. **Sales Report Page** (`/dashboard/super-admin/sales-report` and `/dashboard/branch-admin/sales-report`)
2. **Sales List Page** (`/dashboard/super-admin/sales` and `/dashboard/branch-admin/sales`)
3. **Menu Sales Page** (`/dashboard/super-admin/menu-sales` and `/dashboard/branch-admin/menu-sales`)

---

## 1. Sales Report API

### Endpoint
`api/get_sales_report.php`

### Request Method
**POST** (preferred for complex parameters)

### Parameters

#### Base Parameters (Always Sent)
- `branch_id` (number, optional): Branch ID
  - For super-admin: Optional (if not provided, returns all branches)
  - For branch-admin: **REQUIRED** (must be included)

#### Date Filter Parameters

**1. Daily Report**
```
start_date: "YYYY-MM-DD" (selected date or today)
end_date: "YYYY-MM-DD" (same as start_date)
```

**2. Weekly Report**
```
start_date: "YYYY-MM-DD" (Monday of current week)
end_date: "YYYY-MM-DD" (Sunday of current week)
```

**3. Monthly Report**
```
start_date: "YYYY-MM-DD" (first day of selected month, e.g., "2024-01-01")
end_date: "YYYY-MM-DD" (last day of selected month, e.g., "2024-01-31")
```

**4. Custom Date Range**
```
start_date: "YYYY-MM-DD" (user-selected start date)
end_date: "YYYY-MM-DD" (user-selected end date)
```

**5. All Time (No Date Filter)**
- No `start_date` or `end_date` parameters sent
- Backend should return all sales regardless of date

#### Additional Parameters
- `include_credit` (boolean, optional): Explicitly request credit sales to be included (default: true)

### Expected Response Format

```json
{
  "success": true,
  "data": [
    {
      "order_id": 123,
      "bill_id": 456,
      "branch_id": 1,
      "branch_name": "Main Branch",
      "created_at": "2024-01-15 10:30:00",
      "order_type": "Dine In",
      "table_id": 5,
      "table_number": "T-5",
      "hall_id": 1,
      "hall_name": "Main Hall",
      "order_taker_name": "John Doe",
      "bill_amount": 1000.00,
      "g_total_amount": 1000.00,
      "service_charge": 100.00,
      "discount_amount": 50.00,
      "net_total": 1050.00,
      "net_total_amount": 1050.00,
      "grand_total": 1050.00,
      "payment_mode": "Cash",
      "payment_method": "Cash",
      "payment_status": "Paid",
      "is_credit": false,
      "customer_id": null,
      "customer_name": null,
      "bill_by_name": "Admin"
    }
  ]
}
```

### Alternative Response Formats (All Supported)

**Format 1: Direct Array**
```json
{
  "success": true,
  "data": [...]
}
```

**Format 2: Nested Array**
```json
{
  "success": true,
  "data": {
    "data": [...]
  }
}
```

**Format 3: Sales Key**
```json
{
  "success": true,
  "data": {
    "sales": [...]
  }
}
```

### SQL Query Example

```sql
-- For date range filtering
SELECT 
  o.order_id,
  b.bill_id,
  o.branch_id,
  b.branch_name,
  o.created_at,
  o.order_type,
  o.table_id,
  t.table_number,
  h.hall_id,
  h.hall_name,
  u.full_name as order_taker_name,
  b.grand_total as bill_amount,
  b.grand_total as g_total_amount,
  b.service_charge,
  b.discount_amount,
  b.net_total_amount as net_total,
  b.net_total_amount,
  b.grand_total,
  b.payment_mode,
  b.payment_method,
  b.payment_status,
  b.is_credit,
  b.customer_id,
  c.customer_name,
  u2.full_name as bill_by_name
FROM orders o
LEFT JOIN bills b ON o.order_id = b.order_id
LEFT JOIN branches br ON o.branch_id = br.branch_id
LEFT JOIN tables t ON o.table_id = t.table_id
LEFT JOIN halls h ON o.hall_id = h.hall_id
LEFT JOIN users u ON o.order_taker_id = u.user_id
LEFT JOIN users u2 ON b.bill_by = u2.user_id
LEFT JOIN customers c ON b.customer_id = c.customer_id
WHERE 1=1
  AND (:branch_id IS NULL OR o.branch_id = :branch_id)
  AND (:start_date IS NULL OR DATE(o.created_at) >= :start_date)
  AND (:end_date IS NULL OR DATE(o.created_at) <= :end_date)
  AND b.payment_status IN ('Paid', 'Credit', 'Unpaid') -- Include all payment statuses
ORDER BY o.created_at DESC
```

---

## 2. Sales List API

### Endpoint
`api/get_sales.php`

### Request Method
**POST** (preferred)

### Parameters

#### Base Parameters (Always Sent)
- `terminal` (string/number): Terminal ID
- `period` (string): Period filter - 'daily', 'weekly', 'monthly', 'custom', or 'all'

#### Branch Filter
- `branch_id` (number, optional): Branch ID
  - For super-admin: Optional (if not provided, fetches for all branches)
  - For branch-admin: **REQUIRED** (must be included)

#### Date Filter Parameters

**1. Daily Period**
```
period: "daily"
after_closing_date: "YYYY-MM-DD HH:MM:SS" (optional, last dayend closing_date_time)
```

**2. Weekly Period**
```
period: "weekly"
from_date: "YYYY-MM-DD" (Monday of current week)
to_date: "YYYY-MM-DD" (Sunday of current week)
```

**3. Monthly Period**
```
period: "monthly"
from_date: "YYYY-MM-DD" (first day of month)
to_date: "YYYY-MM-DD" (last day of month)
```

**4. Custom Period**
```
period: "custom"
from_date: "YYYY-MM-DD" (user-selected start date)
to_date: "YYYY-MM-DD" (user-selected end date)
```

**5. All Time**
```
period: "all"
(no date parameters)
```

### Expected Response Format

The API should return aggregated sales data grouped by period:

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "date_period": "2024-01-15",
      "period": "2024-01-15",
      "total_sales": 5000.00,
      "total_revenue": 5000.00,
      "revenue": 5000.00,
      "total_orders": 25,
      "orders_count": 25,
      "count": 25,
      "branch_id": 1,
      "branch_name": "Main Branch"
    }
  ]
}
```

### Alternative Response Formats

**Format 1: Direct Array**
```json
{
  "success": true,
  "data": [...]
}
```

**Format 2: Nested Array**
```json
{
  "success": true,
  "data": {
    "data": [...]
  }
}
```

**Format 3: Sales Key**
```json
{
  "success": true,
  "data": {
    "sales": [...]
  }
}
```

### SQL Query Example

```sql
-- For daily/weekly/monthly periods
SELECT 
  DATE(o.created_at) as date,
  DATE(o.created_at) as date_period,
  DATE(o.created_at) as period,
  SUM(b.net_total_amount) as total_sales,
  SUM(b.net_total_amount) as total_revenue,
  SUM(b.net_total_amount) as revenue,
  COUNT(DISTINCT o.order_id) as total_orders,
  COUNT(DISTINCT o.order_id) as orders_count,
  COUNT(DISTINCT o.order_id) as count,
  o.branch_id,
  br.branch_name
FROM orders o
LEFT JOIN bills b ON o.order_id = b.order_id
LEFT JOIN branches br ON o.branch_id = br.branch_id
WHERE 1=1
  AND (:branch_id IS NULL OR o.branch_id = :branch_id)
  AND (:period = 'all' OR (
    (:period = 'daily' AND DATE(o.created_at) = CURDATE())
    OR (:period = 'weekly' AND DATE(o.created_at) >= :from_date AND DATE(o.created_at) <= :to_date)
    OR (:period = 'monthly' AND DATE(o.created_at) >= :from_date AND DATE(o.created_at) <= :to_date)
    OR (:period = 'custom' AND DATE(o.created_at) >= :from_date AND DATE(o.created_at) <= :to_date)
  ))
  AND (:after_closing_date IS NULL OR o.created_at > :after_closing_date)
  AND b.payment_status IN ('Paid', 'Credit')
GROUP BY DATE(o.created_at), o.branch_id
ORDER BY date DESC
```

---

## 3. Menu Sales API

### Endpoint
`api/get_menu_sales.php`

### Request Method
**POST**

### Parameters

#### Base Parameters (Always Sent)
- `terminal` (string/number): Terminal ID
- `period` (string): Period filter - 'daily', 'weekly', or 'monthly'

#### Branch Filter
- `branch_id` (number, optional): Branch ID
  - For super-admin: Optional
  - For branch-admin: **REQUIRED**

#### Date Filter Parameters

**1. Daily Period**
```
period: "daily"
date: "YYYY-MM-DD" (today's date, e.g., "2024-01-15")
from_date: "YYYY-MM-DD" (same as date)
to_date: "YYYY-MM-DD" (same as date)
after_closing_date: "YYYY-MM-DD HH:MM:SS" (optional, last dayend closing_date_time)
```

**2. Weekly Period**
```
period: "weekly"
from_date: "YYYY-MM-DD" (Monday of current week, e.g., "2024-01-08")
to_date: "YYYY-MM-DD" (Sunday of current week, e.g., "2024-01-14")
```

**3. Monthly Period**
```
period: "monthly"
from_date: "YYYY-MM-DD" (first day of current month, e.g., "2024-01-01")
to_date: "YYYY-MM-DD" (last day of current month, e.g., "2024-01-31")
```

**Important Notes:**
- The API should use `date`, `from_date`, and `to_date` parameters to filter menu sales by date
- For daily period, all three date parameters are sent (date, from_date, to_date) with the same value
- For weekly and monthly periods, `from_date` and `to_date` define the date range
- The `after_closing_date` parameter (if provided) should be used to filter out sales before the last dayend
- If the API doesn't receive date parameters, it should still work with just the `period` parameter (backward compatibility)

### Expected Response Format

```json
{
  "success": true,
  "data": [
    {
      "dish_id": 1,
      "id": 1,
      "name": "Chicken Biryani",
      "category": "Main Course",
      "category_id": 2,
      "quantity_sold": 50,
      "total_revenue": 5000.00
    }
  ]
}
```

### Important Implementation Notes

**Menu Sales Aggregation:**
- Menu sales should be aggregated from `order_items` table (or similar) based on completed orders
- Only include items from orders that have `order_status = 'completed'` or have bills generated
- For daily period, filter by `DATE(order.created_at) = :date` or use `from_date` and `to_date` parameters
- Group by `dish_id` or `menu_id` and sum quantities and revenues
- Include category information from menu/dish table

**Date Filtering:**
- When `date`, `from_date`, or `to_date` parameters are provided, use them to filter orders
- Use `DATE()` function in SQL to compare dates (ignores time component)
- For daily period with `after_closing_date`, only include orders created after the dayend closing time

**Example SQL Query Structure:**
```sql
SELECT 
    oi.dish_id,
    m.name,
    m.category,
    SUM(oi.quantity) as quantity_sold,
    SUM(oi.price * oi.quantity) as total_revenue
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.order_id
INNER JOIN menu m ON oi.dish_id = m.dish_id
WHERE o.order_status = 'completed'
  AND DATE(o.created_at) >= :from_date
  AND DATE(o.created_at) <= :to_date
  AND (:branch_id IS NULL OR o.branch_id = :branch_id)
GROUP BY oi.dish_id, m.name, m.category
ORDER BY total_revenue DESC
```

---

## Common Issues and Fixes

### Issue 1: Sales List Page Not Showing Data

**Possible Causes:**
1. API returns data in unexpected format
2. API uses wrong column name (e.g., `orders.sts` instead of `order_status`)
3. API doesn't handle date filtering correctly
4. Empty response when no data exists

**Backend Fixes Required:**

1. **Fix Column Name Issue:**
   - Replace `orders.sts` with `orders.order_status` or `o.order_status`
   - Update all SQL queries to use correct column names

2. **Ensure Proper Response Format:**
   ```php
   // Always return success: true with data array
   $response = [
       'success' => true,
       'data' => $salesData // Array of sales records
   ];
   echo json_encode($response);
   ```

3. **Handle Empty Results:**
   ```php
   // If no data found, return empty array, not null
   if (empty($salesData)) {
       $response = [
           'success' => true,
           'data' => []
       ];
   }
   ```

4. **Date Filtering:**
   ```php
   // Always use DATE() function for date comparisons
   $sql = "WHERE DATE(created_at) >= :from_date AND DATE(created_at) <= :to_date";
   ```

### Issue 2: Database Column Errors

**Common Error:**
```
Unknown column 'orders.sts' in 'where clause'
```

**Fix:**
- Replace all instances of `orders.sts` with `orders.order_status` or `o.order_status`
- Check all SQL queries in:
  - `api/get_sales.php`
  - `api/get_sales_report.php`
  - `api/get_menu_sales.php`

---

## Testing Checklist

### Sales Report API (`api/get_sales_report.php`)
1. ✅ Test with daily filter (single date)
2. ✅ Test with weekly filter (date range)
3. ✅ Test with monthly filter (date range)
4. ✅ Test with custom date range
5. ✅ Test with all time (no date filter)
6. ✅ Test with branch_id filter (super-admin)
7. ✅ Test without branch_id (super-admin - all branches)
8. ✅ Test with branch_id (branch-admin - required)
9. ✅ Verify credit sales are included
10. ✅ Verify all payment statuses are included

### Sales List API (`api/get_sales.php`)
1. ✅ Test with daily period
2. ✅ Test with weekly period
3. ✅ Test with monthly period
4. ✅ Test with custom period (date range)
5. ✅ Test with all time period
6. ✅ Test with branch_id filter
7. ✅ Test with after_closing_date for daily period
8. ✅ Verify response format matches expected structure
9. ✅ Verify empty array returned when no data (not null or error)

### Menu Sales API (`api/get_menu_sales.php`)
1. ✅ Test with daily period (with date, from_date, to_date parameters)
2. ✅ Test with weekly period (with from_date, to_date parameters)
3. ✅ Test with monthly period (with from_date, to_date parameters)
4. ✅ Test with branch_id filter
5. ✅ Test with after_closing_date for daily period
6. ✅ Verify API uses date parameters to filter menu sales correctly
7. ✅ Verify response format matches expected structure
8. ✅ Verify empty array returned when no data (not null or error)

---

## Response Format Standards

### Success with Data
```json
{
  "success": true,
  "data": [...]
}
```

### Success with No Data
```json
{
  "success": true,
  "data": []
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error information"
}
```

---

## Important Notes

1. **Date Format**: Always use `YYYY-MM-DD` format for dates
2. **Date Comparison**: Use `DATE()` function in SQL to compare dates (ignores time)
3. **Branch Filtering**: 
   - Super-admin can omit `branch_id` to get all branches
   - Branch-admin **MUST** include `branch_id` (enforced on frontend)
4. **Empty Results**: Return empty array `[]`, not `null` or missing `data` field
5. **Column Names**: Use `order_status` not `sts`, use `created_at` not `date` (though both should be supported)
6. **Credit Sales**: Always include credit sales in reports (use `is_credit` flag or `payment_status = 'Credit'`)

---

## Quick Fix Checklist for Backend Developer

- [ ] Update `api/get_sales.php` to handle all period types (daily/weekly/monthly/custom/all)
- [ ] Fix column name `orders.sts` → `orders.order_status` in all queries
- [ ] Ensure `api/get_sales_report.php` accepts `start_date` and `end_date` parameters
- [ ] Make `start_date` and `end_date` optional (for "all time" filter)
- [ ] Update `api/get_menu_sales.php` to accept and use `date`, `from_date`, and `to_date` parameters
- [ ] Ensure `api/get_menu_sales.php` filters menu sales by date range when date parameters are provided
- [ ] Return empty array `[]` instead of `null` when no data found
- [ ] Always return `success: true` with `data` array (even if empty)
- [ ] Support multiple response formats (direct array, nested array, sales key)
- [ ] Include credit sales in all reports
- [ ] Use `DATE()` function for date comparisons in SQL
- [ ] Test with branch_id filter and without branch_id filter

