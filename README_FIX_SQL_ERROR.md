# 🚨 Fix SQL Error: Unknown column 'c.kitchen_id'

## Quick Summary
Your `get_products.php` file has a SQL query trying to select `c.kitchen_id` from the categories table, but that column doesn't exist.

## ⚡ Fastest Fix (2 Minutes)

### Option 1: Use Helper Script (Easiest)
1. Open PowerShell in this folder
2. Run: `.\fix-get-products.ps1`
3. It will show you exactly which line to fix
4. Open the file and remove `c.kitchen_id` from that line

### Option 2: Manual Fix
1. Open: `C:\wamp64\www\restuarent\api\get_products.php`
2. Press `Ctrl + F` and search for: `c.kitchen_id`
3. Remove `c.kitchen_id` from the SELECT statement
4. Save the file
5. Refresh browser

**Example Fix:**
- **BEFORE:** `SELECT p.*, c.*, c.kitchen_id FROM products p JOIN categories c`
- **AFTER:** `SELECT p.*, c.* FROM products p JOIN categories c`

## 📚 Detailed Guides

I've created multiple guides to help you:

1. **`SIMPLE_FIX_STEPS.md`** ⭐ START HERE
   - 3-step quick fix
   - Perfect if you just want to fix it fast

2. **`FIX_GET_PRODUCTS_SQL_ERROR.md`** 📖 DETAILED GUIDE
   - Comprehensive instructions
   - All possible SQL patterns
   - Multiple fix options

3. **`BACKEND_FIX_GUIDE.md`** 📋 ORIGINAL GUIDE
   - General backend fix guide
   - Database schema checking

4. **`fix-get-products.ps1`** 🔧 HELPER SCRIPT
   - PowerShell script to find the problem
   - Shows you the exact line number

## ✅ After Fixing

1. Save the file
2. Clear browser cache (`Ctrl + Shift + Delete`)
3. Refresh the page (`Ctrl + F5`)
4. Try to access create order page again

## 🆘 Still Having Issues?

1. Check browser console (F12) for exact error
2. Run the PowerShell script: `.\fix-get-products.ps1`
3. Check PHP error logs: `C:\wamp64\logs\php_error.log`
4. Make sure there aren't multiple SELECT statements to fix

## 🎯 What to Look For

In `get_products.php`, search for any of these patterns:
- `c.kitchen_id`
- `categories.kitchen_id`
- `kitchen_id` in SELECT statements

Remove them from the SELECT clause!

