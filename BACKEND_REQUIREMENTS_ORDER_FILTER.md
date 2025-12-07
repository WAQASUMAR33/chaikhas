# Backend Requirements for Order Filtering

## Overview
The accountant order page now supports filtering orders by date periods: **All Orders**, **Daily (Today)**, **Weekly (This Week)**, and **Custom Date Range**.

## API Endpoint
`api/order_management.php`

## Request Method
- **Preferred**: POST (better for complex parameters)
- **Fallback**: GET (if POST fails)

## Parameters Sent to Backend

### Base Parameters (Always Sent)
- `terminal` (string/number): Terminal ID

### Optional Parameters

#### Status Filter
- `status` (string): Order status filter
  - Only sent if status filter is not 'all'
  - Values: 'pending', 'preparing', 'ready', 'completed', 'cancelled', etc.

#### Date Filter Parameters

**1. All Orders (No Date Filter)**
- No date parameters sent
- Backend should return all orders

**2. Daily Filter (Today's Orders)**
```
date: "YYYY-MM-DD" (today's date)
from_date: "YYYY-MM-DD" (today's date)
to_date: "YYYY-MM-DD" (today's date)
```

**3. Weekly Filter (This Week's Orders)**
```
from_date: "YYYY-MM-DD" (Monday of current week)
to_date: "YYYY-MM-DD" (Sunday of current week)
```

**4. Custom Date Range**
```
from_date: "YYYY-MM-DD" (user-selected start date)
to_date: "YYYY-MM-DD" (user-selected end date)
```

**OR (Backward Compatibility - Single Date)**
```
date: "YYYY-MM-DD" (user-selected date)
from_date: "YYYY-MM-DD" (same as date)
to_date: "YYYY-MM-DD" (same as date)
```

## Expected Response Format

The backend should return orders in one of these formats:

### Format 1: Direct Array
```json
{
  "success": true,
  "data": [
    {
      "order_id": 123,
      "orderid": "ORD-123",
      "order_status": "Pending",
      "created_at": "2024-01-15 10:30:00",
      ...
    }
  ]
}
```

### Format 2: Nested Array
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "order_id": 123,
        ...
      }
    ]
  }
}
```

### Format 3: Orders Key
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "order_id": 123,
        ...
      }
    ]
  }
}
```

## Date Filtering Logic

### Backend Should Filter By:
- **Date Field**: `created_at`, `date`, `order_date`, or `created_date`
- **Comparison**: Orders where date is between `from_date` and `to_date` (inclusive)
- **Time Handling**: If dates include time, compare only the date portion (YYYY-MM-DD)

### SQL Example (MySQL)
```sql
-- For date range filtering
WHERE DATE(created_at) >= :from_date 
  AND DATE(created_at) <= :to_date

-- For single date
WHERE DATE(created_at) = :date
```

## Required Order Fields

Each order object should include:
- `order_id` (number): Primary order ID
- `orderid` (string): Formatted order number (e.g., "ORD-123")
- `order_status` or `status` (string): Order status
- `created_at` or `date` (string): Order creation date/time
- `order_type` (string): Order type (e.g., "Dine In", "Takeaway")
- `table_id` (number/string): Table ID (if applicable)
- `g_total_amount` or `total` (number): Order total
- `net_total_amount` or `netTotal` (number): Net total after discount
- `discount_amount` or `discount` (number): Discount amount
- `service_charge` (number): Service charge
- `payment_mode` (string): Payment mode
- `terminal` (string/number): Terminal ID
- `branch_id` (number, optional): Branch ID

## Error Handling

If filtering fails or no orders found:
```json
{
  "success": false,
  "message": "Error message here"
}
```

OR

```json
{
  "success": true,
  "data": [],
  "message": "No orders found for the selected period"
}
```

## Testing Checklist

1. ✅ Test with no date filter (all orders)
2. ✅ Test with daily filter (today's date)
3. ✅ Test with weekly filter (Monday to Sunday)
4. ✅ Test with custom date range
5. ✅ Test with status filter combined with date filter
6. ✅ Test with invalid date ranges
7. ✅ Test with no orders matching criteria (should return empty array)
8. ✅ Verify date comparison includes both start and end dates (inclusive)

## Notes

- The frontend also performs client-side filtering as a fallback, but backend filtering is preferred for performance
- Date format is always `YYYY-MM-DD` (e.g., "2024-01-15")
- Week calculation: Monday is the start of the week, Sunday is the end
- All date comparisons should be timezone-aware or use UTC dates

