# Backend SQL Fix Guide - get_products.php Error

## Error Message
```
Unknown column 'c.kitchen_id' in 'SELECT'
```

## Problem
The PHP backend file `get_products.php` contains a SQL query that tries to select `c.kitchen_id` from the categories table (aliased as `c`), but this column doesn't exist in your database.

## Location of the File
Your PHP backend file should be located at:
```
C:\wamp64\www\restuarent\api\get_products.php
```

## How to Fix

### Step 1: Open the File
1. Navigate to `C:\wamp64\www\restuarent\api\`
2. Open `get_products.php` in a text editor (Notepad++, VS Code, etc.)

### Step 2: Find the SQL Query
Look for a SQL query that looks something like this:

```php
// Example of what might be causing the error:
$query = "SELECT p.*, c.*, c.kitchen_id 
          FROM products p 
          JOIN categories c ON p.category_id = c.id 
          WHERE ...";
```

### Step 3: Fix Options

#### Option A: Remove `c.kitchen_id` (If categories don't have kitchen_id)
If your categories table doesn't have a `kitchen_id` column, simply remove it from the SELECT clause:

```php
// Change FROM:
SELECT p.*, c.*, c.kitchen_id FROM products p JOIN categories c ...

// Change TO:
SELECT p.*, c.* FROM products p JOIN categories c ...
```

#### Option B: Use `p.kitchen_id` (If kitchen_id is on products table)
If `kitchen_id` exists on the products table instead of categories:

```php
// Change FROM:
SELECT p.*, c.*, c.kitchen_id FROM products p JOIN categories c ...

// Change TO:
SELECT p.*, c.*, p.kitchen_id FROM products p JOIN categories c ...
```

#### Option C: Join with Kitchens Table (If kitchen info is needed)
If you need kitchen information and it's in a separate kitchens table:

```php
// Add a LEFT JOIN:
SELECT p.*, c.*, k.kitchen_id, k.kitchen_name 
FROM products p 
JOIN categories c ON p.category_id = c.id 
LEFT JOIN kitchens k ON p.kitchen_id = k.kitchen_id 
WHERE ...
```

#### Option D: Remove Kitchen Reference Entirely
If kitchen_id is not needed in the products query at all:

```php
// Simply remove the kitchen_id reference:
SELECT p.*, c.* FROM products p JOIN categories c ...
```

### Step 4: Save and Test
1. Save the file
2. Refresh your browser
3. Try creating an order again

## Common SQL Query Patterns in get_products.php

The query might look like one of these patterns:

### Pattern 1: Simple Join
```php
$sql = "SELECT p.*, c.category_name, c.kitchen_id 
        FROM products p 
        INNER JOIN categories c ON p.category_id = c.id 
        WHERE p.branch_id = ? AND p.terminal = ?";
```

### Pattern 2: Multiple Joins
```php
$sql = "SELECT p.*, c.category_name, c.kitchen_id, k.kitchen_name 
        FROM products p 
        INNER JOIN categories c ON p.category_id = c.id 
        LEFT JOIN kitchens k ON c.kitchen_id = k.id 
        WHERE p.branch_id = ?";
```

### Pattern 3: Using Aliases
```php
$sql = "SELECT p.id, p.name, p.price, c.name as category_name, c.kitchen_id 
        FROM products p, categories c 
        WHERE p.category_id = c.id";
```

## How to Check Your Database Schema

To verify which columns exist, you can:

1. **Open phpMyAdmin**: `http://localhost/phpmyadmin`
2. **Select your database** (usually `restuarent` or similar)
3. **Check the `categories` table structure**:
   - Look for a `kitchen_id` column
   - Note what columns actually exist

4. **Check the `products` table structure**:
   - Look for a `kitchen_id` column
   - Note the relationship with categories

## Expected Fix

The most likely fix is **Option A** or **Option D** - simply removing `c.kitchen_id` from the SELECT clause, since categories likely don't have a kitchen_id column directly.

## After Fixing

After you fix the SQL query:
1. Save the file
2. Clear browser cache (Ctrl + Shift + Delete)
3. Refresh the create order page
4. The error should be resolved

## Need Help?

If you're still getting errors after fixing, check:
- PHP error logs: `C:\wamp64\logs\php_error.log`
- Apache error logs: `C:\wamp64\logs\apache_error.log`
- Browser console (F12) for any additional errors

