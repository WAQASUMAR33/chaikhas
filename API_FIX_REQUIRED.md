# API Fix Required - Database Column Name Error

## Error
```
Unknown column 'orders.sts' in 'WHERE'
```

## Problem
The backend API `pos/get_sales.php` (or `/get_sales.php`) is trying to query a column called `sts` in the `orders` table, but this column doesn't exist.

## Database Structure
According to your SQL structure, the `orders` table uses:
- ✅ `order_status` (varchar) - Correct column name
- ❌ `sts` - This column does NOT exist

## Required Fix in PHP API

### File: `pos/get_sales.php` or `api/get_sales.php`

**Find and replace:**
```php
// WRONG - This is what's causing the error
WHERE orders.sts = 'Complete'
// or
WHERE orders.sts IN ('Complete', 'Running')
// or any reference to orders.sts

// CORRECT - Use the actual column name
WHERE orders.order_status = 'Complete'
// or
WHERE orders.order_status IN ('Complete', 'Running')
```

### Common Patterns to Fix:
1. `orders.sts` → `orders.order_status`
2. `o.sts` → `o.order_status` (if using alias 'o')
3. `sts =` → `order_status =`
4. `sts IN` → `order_status IN`
5. `ORDER BY sts` → `ORDER BY order_status`

## Frontend Status
✅ Frontend code is correct - it uses `order_status` everywhere
❌ Backend PHP API needs to be updated

## Verification
After fixing the PHP file, the sales pages should work correctly:
- `/dashboard/branch-admin/sales`
- `/dashboard/super-admin/sales`
- `/dashboard/branch-admin/sales-report`
- `/dashboard/super-admin/sales-report`

