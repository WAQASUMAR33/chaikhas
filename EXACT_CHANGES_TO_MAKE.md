# Exact Changes to Fix get_products.php

## The Problem
The SQL query is trying to select `c.kitchen_id` from the categories table, but that column doesn't exist.

## The Fix

### Change 1: In the SELECT statement (2 places)

**FIND THIS (around line 136):**
```sql
COALESCE(c.kitchen_id, 0) AS kitchen_id,
```

**CHANGE TO:**
```sql
COALESCE(k.kitchen_id, 0) AS kitchen_id,
```

**AND FIND THIS (around line 175):**
```sql
COALESCE(c.kitchen_id, 0) AS kitchen_id,
```

**CHANGE TO:**
```sql
COALESCE(k.kitchen_id, 0) AS kitchen_id,
```

### Change 2: In the JOIN statement (2 places)

**FIND THIS (around line 149):**
```sql
LEFT JOIN kitchens k ON c.kitchen_id = k.kitchen_id AND c.branch_id = k.branch_id AND c.terminal = k.terminal
```

**CHANGE TO (if dishes table has kitchen_id):**
```sql
LEFT JOIN kitchens k ON d.kitchen_id = k.kitchen_id AND d.branch_id = k.branch_id AND d.terminal = k.terminal
```

**OR CHANGE TO (if dishes doesn't have kitchen_id either):**
```sql
LEFT JOIN kitchens k ON c.kid = k.kitchen_id AND c.branch_id = k.branch_id AND c.terminal = k.terminal
```

**AND FIND THIS (around line 187):**
```sql
LEFT JOIN kitchens k ON c.kitchen_id = k.kitchen_id AND c.branch_id = k.branch_id AND c.terminal = k.terminal
```

**CHANGE TO:**
```sql
LEFT JOIN kitchens k ON d.kitchen_id = k.kitchen_id AND d.branch_id = k.branch_id AND d.terminal = k.terminal
```

## Quick Summary

1. **Line ~136**: Change `COALESCE(c.kitchen_id, 0)` to `COALESCE(k.kitchen_id, 0)`
2. **Line ~149**: Change `ON c.kitchen_id = k.kitchen_id` to `ON d.kitchen_id = k.kitchen_id`
3. **Line ~175**: Change `COALESCE(c.kitchen_id, 0)` to `COALESCE(k.kitchen_id, 0)`
4. **Line ~187**: Change `ON c.kitchen_id = k.kitchen_id` to `ON d.kitchen_id = k.kitchen_id`

## Alternative: If dishes table doesn't have kitchen_id either

If the `dishes` table also doesn't have a `kitchen_id` column, then simply remove the kitchen_id from the SELECT entirely:

**FIND:**
```sql
COALESCE(c.kitchen_id, 0) AS kitchen_id,
```

**REMOVE THE ENTIRE LINE** (or comment it out)

And remove the kitchens join if not needed, or keep it for kitchen_name/kitchen_code only.

## Verify Your Database Structure

Before making changes, check which table has `kitchen_id`:

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Select your database
3. Check:
   - Does `categories` table have `kitchen_id`? → NO (that's why we have the error)
   - Does `dishes` table have `kitchen_id`? → Check this
   - Does `kitchens` table exist? → Check this

Based on your database structure, choose the appropriate fix above.

