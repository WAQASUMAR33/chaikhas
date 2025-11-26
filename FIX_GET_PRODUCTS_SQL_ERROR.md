# Fix: Unknown column 'c.kitchen_id' in 'SELECT' Error

## Problem
The error "Unknown column 'c.kitchen_id' in 'SELECT'" occurs because `get_products.php` is trying to select a column that doesn't exist in the categories table.

## Location
Open this file in a text editor (Notepad++, VS Code, etc.):
```
C:\wamp64\www\restuarent\api\get_products.php
```

## Step-by-Step Fix

### Step 1: Open the File
1. Navigate to: `C:\wamp64\www\restuarent\api\`
2. Open `get_products.php` in a text editor

### Step 2: Find the SQL Query
Look for a SQL query that looks like this (it might vary slightly):

```php
$sql = "SELECT p.*, c.*, c.kitchen_id 
        FROM products p 
        JOIN categories c ON p.category_id = c.id 
        WHERE ...";
```

OR

```php
$query = "SELECT p.product_id, p.name, p.price, c.category_name, c.kitchen_id 
          FROM products p 
          INNER JOIN categories c ON p.category_id = c.category_id 
          WHERE ...";
```

OR

```php
$sql = "SELECT 
            p.id as product_id,
            p.name as product_name,
            p.price,
            p.category_id,
            c.name as category_name,
            c.kitchen_id
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ...";
```

### Step 3: Remove `c.kitchen_id` from SELECT

**Find this part:**
```php
c.kitchen_id
```

**And remove it.** Here are the most common fixes:

#### Fix Option 1: Simple Removal
**BEFORE:**
```php
$sql = "SELECT p.*, c.*, c.kitchen_id FROM products p JOIN categories c ON p.category_id = c.id";
```

**AFTER:**
```php
$sql = "SELECT p.*, c.* FROM products p JOIN categories c ON p.category_id = c.id";
```

#### Fix Option 2: If kitchen_id is on products table
**BEFORE:**
```php
$sql = "SELECT p.*, c.*, c.kitchen_id FROM products p JOIN categories c ON p.category_id = c.id";
```

**AFTER:**
```php
$sql = "SELECT p.*, c.*, p.kitchen_id FROM products p JOIN categories c ON p.category_id = c.id";
```

#### Fix Option 3: If you need kitchen info, join with kitchens table
**BEFORE:**
```php
$sql = "SELECT p.*, c.*, c.kitchen_id FROM products p JOIN categories c ON p.category_id = c.id";
```

**AFTER:**
```php
$sql = "SELECT p.*, c.*, k.kitchen_id 
        FROM products p 
        JOIN categories c ON p.category_id = c.id 
        LEFT JOIN kitchens k ON p.kitchen_id = k.kitchen_id";
```

### Step 4: Save and Test
1. Save the file (`Ctrl + S`)
2. Go back to your browser
3. Try to access the create order page again
4. The error should be gone

## Common SQL Query Patterns to Look For

### Pattern 1: Basic SELECT
```php
// Find and fix this:
SELECT p.*, c.category_name, c.kitchen_id FROM products p JOIN categories c ...

// Change to this:
SELECT p.*, c.category_name FROM products p JOIN categories c ...
```

### Pattern 2: Multiple columns listed
```php
// Find and fix this:
SELECT 
    p.id, 
    p.name, 
    p.price, 
    c.name as category_name,
    c.kitchen_id
FROM products p
JOIN categories c ...

// Change to this:
SELECT 
    p.id, 
    p.name, 
    p.price, 
    c.name as category_name
FROM products p
JOIN categories c ...
```

### Pattern 3: With WHERE clause
```php
// Find and fix this:
SELECT p.*, c.*, c.kitchen_id 
FROM products p 
JOIN categories c ON p.category_id = c.id 
WHERE p.branch_id = ? AND p.terminal = ?

// Change to this:
SELECT p.*, c.* 
FROM products p 
JOIN categories c ON p.category_id = c.id 
WHERE p.branch_id = ? AND p.terminal = ?
```

## How to Search in the File

1. Open `get_products.php`
2. Press `Ctrl + F` (Find)
3. Search for: `kitchen_id`
4. This will highlight all occurrences
5. Look for `c.kitchen_id` or `categories.kitchen_id`
6. Remove it from the SELECT clause

## Example Fix (Most Common)

Here's the most common scenario:

**BEFORE (Broken):**
```php
<?php
// ... other code ...

$sql = "SELECT 
    p.product_id,
    p.name,
    p.price,
    p.category_id,
    c.category_name,
    c.kitchen_id  // ← THIS LINE CAUSES THE ERROR
FROM products p
JOIN categories c ON p.category_id = c.category_id
WHERE p.branch_id = ? AND p.status = 'active'";

$stmt = $conn->prepare($sql);
// ... rest of code ...
```

**AFTER (Fixed):**
```php
<?php
// ... other code ...

$sql = "SELECT 
    p.product_id,
    p.name,
    p.price,
    p.category_id,
    c.category_name
    // ← REMOVED c.kitchen_id
FROM products p
JOIN categories c ON p.category_id = c.category_id
WHERE p.branch_id = ? AND p.status = 'active'";

$stmt = $conn->prepare($sql);
// ... rest of code ...
```

## Verify the Fix

After making the change:

1. **Save the file**
2. **Clear browser cache** (Ctrl + Shift + Delete)
3. **Refresh the create order page**
4. **Check browser console** - the error should be gone

## If You Still See Errors

If you still get errors after fixing:

1. **Check for multiple SELECT statements** - There might be more than one query in the file
2. **Check all occurrences** - Search for "kitchen_id" throughout the entire file
3. **Check PHP error logs**: `C:\wamp64\logs\php_error.log`
4. **Check the exact error message** - It will tell you which line has the problem

## Quick Checklist

- [ ] Opened `C:\wamp64\www\restuarent\api\get_products.php`
- [ ] Searched for `kitchen_id` (Ctrl + F)
- [ ] Found `c.kitchen_id` in SELECT statement
- [ ] Removed `c.kitchen_id` from SELECT clause
- [ ] Saved the file
- [ ] Refreshed the browser page
- [ ] Error is resolved



