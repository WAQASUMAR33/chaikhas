# Local Development Setup Guide

## Problem: Cannot Login or Show Data

If you're experiencing issues with login or data not loading in local development, follow these steps:

## Step 1: Verify WAMP Server is Running

1. **Check WAMP Server Status**
   - Open WAMP Server control panel
   - Ensure Apache and MySQL services are running (green icon)
   - If services are red, click "Start All Services"

2. **Verify Apache is Running**
   - Right-click WAMP icon in system tray
   - Go to "Tools" → "Test Port 80"
   - Should show "Port 80 is usable"

## Step 2: Verify API Folder Location

The API should be located at:
```
C:\wamp64\www\restuarent\api\
```

**To verify:**
1. Open File Explorer
2. Navigate to `C:\wamp64\www\`
3. Check if `restuarent` folder exists
4. Check if `api` folder exists inside `restuarent`

**If the folder path is different:**
- Note the actual path (e.g., `C:\wamp64\www\restaurant\api\`)
- Update the `.env.local` file with the correct path

## Step 3: Test API in Browser

1. Open your browser
2. Navigate to: `http://localhost/restuarent/api/login.php`
3. You should see a JSON response (even if it's an error message)
4. If you see "404 Not Found", the path is incorrect

**Common paths to test:**
- `http://localhost/restuarent/api/login.php`
- `http://localhost/restaurant/api/login.php`
- `http://localhost/api/login.php`

## Step 4: Configure .env.local File

1. Open `.env.local` in the project root
2. Uncomment and update the API URL line:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost/restuarent/api
```

**If your path is different, update accordingly:**
```env
# If your folder is named "restaurant" (with 'a'):
NEXT_PUBLIC_API_BASE_URL=http://localhost/restaurant/api

# If API is directly in www:
NEXT_PUBLIC_API_BASE_URL=http://localhost/api

# If using a different port (e.g., 8080):
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/restuarent/api
```

3. **Save the file**
4. **Restart your Next.js development server** (important!)

## Step 5: Check for CORS Issues

Your PHP API files must include CORS headers. Each PHP file should have at the top:

```php
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Rest of your PHP code...
```

**Files that need CORS headers:**
- `login.php`
- `get_halls.php`
- `get_tables.php`
- `get_products.php`
- `get_categories.php`
- `getOrders.php`
- `get_orderdetails.php`
- `bills_management.php`
- And all other API files

## Step 6: Restart Development Server

After updating `.env.local`:

1. Stop the Next.js server (Ctrl + C)
2. Start it again:
```bash
npm run dev
```

**Important:** Environment variables are loaded at build time. You MUST restart the server for changes to take effect.

## Step 7: Clear Browser Cache

1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
4. Or use Ctrl + Shift + Delete to clear cache

## Step 8: Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Try to login
4. Look for errors:
   - **CORS errors** → Add CORS headers to PHP files
   - **404 errors** → Wrong API path, check `.env.local`
   - **Network errors** → WAMP server not running or wrong URL
   - **Failed to fetch** → Check WAMP server status

## Step 9: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for the `login.php` request
5. Check:
   - **Status Code**: Should be 200 (OK)
   - **Request URL**: Should match your API path
   - **Response**: Should contain JSON data

## Common Issues & Solutions

### Issue 1: "Cannot connect to server"
**Solution:**
- Check WAMP server is running
- Verify Apache service is green
- Test `http://localhost/restuarent/api/login.php` in browser

### Issue 2: "404 Not Found"
**Solution:**
- Verify API folder exists at `C:\wamp64\www\restuarent\api\`
- Check folder name spelling (restuarent vs restaurant)
- Update `.env.local` with correct path
- Restart Next.js server

### Issue 3: "CORS error"
**Solution:**
- Add CORS headers to all PHP API files (see Step 5)
- Check browser console for specific CORS error

### Issue 4: "Failed to fetch"
**Solution:**
- WAMP server not running → Start WAMP services
- Wrong URL → Check `.env.local` configuration
- Firewall blocking → Check Windows Firewall settings

### Issue 5: "Empty response"
**Solution:**
- Check PHP error logs: `C:\wamp64\logs\php_error.log`
- Check Apache error logs: `C:\wamp64\logs\apache_error.log`
- Verify database connection in PHP config

### Issue 6: Environment variable not loading
**Solution:**
- Ensure variable name starts with `NEXT_PUBLIC_`
- Restart Next.js development server
- Check file is named exactly `.env.local` (not `.env.local.txt`)

## Quick Verification Checklist

- [ ] WAMP Server is running (green icon)
- [ ] Apache service is running
- [ ] MySQL service is running
- [ ] API folder exists at correct path
- [ ] `.env.local` file is configured correctly
- [ ] `.env.local` API URL is uncommented
- [ ] Next.js server has been restarted after editing `.env.local`
- [ ] Browser cache has been cleared
- [ ] CORS headers are in all PHP files
- [ ] Can access `http://localhost/restuarent/api/login.php` in browser

## Testing API Connection

Run this in browser console to test:
```javascript
fetch('http://localhost/restuarent/api/login.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'test', password: 'test' })
})
.then(r => r.json())
.then(d => console.log('API Response:', d))
.catch(e => console.error('API Error:', e));
```

If this works, the API is accessible. If not, check WAMP and path configuration.

## Need More Help?

1. Check browser console for specific errors
2. Check Network tab for failed requests
3. Check PHP error logs: `C:\wamp64\logs\php_error.log`
4. Verify database connection in PHP config files

