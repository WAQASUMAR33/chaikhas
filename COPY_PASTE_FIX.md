# Copy-Paste Fix for get_products.php

## Quick Fix (3 Steps)

### Step 1: Open the File
Open: `C:\wamp64\www\restuarent\api\get_products.php`

### Step 2: Find and Replace (Do this 4 times)

#### Fix #1: First SELECT statement (around line 136)
**FIND:**
```sql
                    COALESCE(c.kitchen_id, 0) AS kitchen_id,
```

**REPLACE WITH:**
```sql
                    COALESCE(k.kitchen_id, 0) AS kitchen_id,
```

#### Fix #2: First JOIN statement (around line 149)
**FIND:**
```sql
                LEFT JOIN kitchens k ON c.kitchen_id = k.kitchen_id AND c.branch_id = k.branch_id AND c.terminal = k.terminal
```

**REPLACE WITH:**
```sql
                LEFT JOIN kitchens k ON d.kitchen_id = k.kitchen_id AND d.branch_id = k.branch_id AND d.terminal = k.terminal
```

#### Fix #3: Second SELECT statement (around line 175)
**FIND:**
```sql
                    COALESCE(c.kitchen_id, 0) AS kitchen_id,
```

**REPLACE WITH:**
```sql
                    COALESCE(k.kitchen_id, 0) AS kitchen_id,
```

#### Fix #4: Second JOIN statement (around line 187)
**FIND:**
```sql
                LEFT JOIN kitchens k ON c.kitchen_id = k.kitchen_id AND c.branch_id = k.branch_id AND c.terminal = k.terminal
```

**REPLACE WITH:**
```sql
                LEFT JOIN kitchens k ON d.kitchen_id = k.kitchen_id AND d.branch_id = k.branch_id AND d.terminal = k.terminal
```

### Step 3: Save and Test
1. Save the file (`Ctrl + S`)
2. Refresh your browser
3. Error should be fixed!

## What Changed?

- **Before:** Trying to get `kitchen_id` from categories table (`c.kitchen_id`) - which doesn't exist
- **After:** Getting `kitchen_id` from kitchens table (`k.kitchen_id`) after the join

## Alternative: If This Doesn't Work

If your `dishes` table doesn't have `kitchen_id` column either, then remove the kitchen_id line entirely:

**FIND (2 places):**
```sql
                    COALESCE(c.kitchen_id, 0) AS kitchen_id,
```

**DELETE THE ENTIRE LINE** (or comment it out with `--`)

Then the kitchen_id will be null in the response, which is fine if you don't need it.

