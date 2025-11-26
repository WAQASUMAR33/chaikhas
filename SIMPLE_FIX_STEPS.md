# Simple 5-Minute Fix for get_products.php Error

## The Error
```
Database Error: Unknown column 'c.kitchen_id' in 'SELECT'
```

## Quick Fix (3 Steps)

### Step 1: Open the File
1. Open File Explorer
2. Navigate to: `C:\wamp64\www\restuarent\api\`
3. Right-click `get_products.php`
4. Choose "Open with" → Notepad++ or any text editor

### Step 2: Find and Remove the Problem
1. Press `Ctrl + F` (Find)
2. Search for: `c.kitchen_id`
3. You'll find a line like this:
   ```sql
   SELECT p.*, c.*, c.kitchen_id FROM ...
   ```
   OR
   ```sql
   SELECT ..., c.kitchen_id FROM ...
   ```

4. **Remove `, c.kitchen_id`** or **remove `c.kitchen_id,`** from that line

**Example:**
- **BEFORE:** `SELECT p.*, c.*, c.kitchen_id FROM products p JOIN categories c`
- **AFTER:** `SELECT p.*, c.* FROM products p JOIN categories c`

### Step 3: Save and Refresh
1. Press `Ctrl + S` to save
2. Go back to your browser
3. Press `Ctrl + F5` to hard refresh
4. Try again - error should be gone!

## Alternative: Use the Helper Script

I've created a PowerShell script to help you find the exact line:

1. Open PowerShell in the project folder
2. Run:
   ```powershell
   .\fix-get-products.ps1
   ```
3. It will show you exactly which line has the problem

## Still Not Working?

1. Make sure you saved the file
2. Clear browser cache (Ctrl + Shift + Delete)
3. Check if there are multiple SELECT statements - fix all of them
4. Check browser console for the exact error message

## Need More Details?

See `FIX_GET_PRODUCTS_SQL_ERROR.md` for comprehensive instructions.

