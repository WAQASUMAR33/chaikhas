# Quick Fix for Local Development Issues

## ✅ What I Just Fixed

I've updated your `.env.local` file to use the correct local API path:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost/restuarent/api
```

## 🔴 IMPORTANT: Restart Your Next.js Server!

**You MUST restart your Next.js development server for the changes to take effect:**

1. **Stop the server** (press `Ctrl + C` in the terminal where it's running)
2. **Start it again:**
   ```bash
   npm run dev
   ```

## ✅ Quick Checklist

Before testing, make sure:

1. **WAMP Server is Running**
   - Check system tray for WAMP icon
   - Should be green (Apache and MySQL running)
   - If red, click "Start All Services"

2. **API Folder Exists**
   - ✅ Verified: `C:\wamp64\www\restuarent\api\` exists

3. **Environment File is Configured**
   - ✅ Fixed: `.env.local` now has the correct URL

4. **Next.js Server Restarted**
   - ⚠️ **YOU NEED TO DO THIS**: Restart your `npm run dev` server

## 🧪 Test API Connection

1. Open browser: `http://localhost/restuarent/api/login.php`
   - Should see JSON response (even if error, that's OK - means API is accessible)

2. Check browser console (F12):
   - Go to Network tab
   - Try to login
   - Look for `login.php` request
   - Check if it shows status 200 or error

## 🐛 Common Issues

### "Cannot connect to server"
- **Fix**: Start WAMP Server (green icon)

### "404 Not Found"
- **Fix**: Verify API folder exists at `C:\wamp64\www\restuarent\api\`

### "CORS error"
- **Fix**: Check if `login.php` has CORS headers at the top:
  ```php
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
  ```

### "Empty response"
- **Fix**: Check PHP error logs: `C:\wamp64\logs\php_error.log`

## 📝 Still Not Working?

1. Open browser DevTools (F12)
2. Go to Console tab - look for errors
3. Go to Network tab - check if requests are being made
4. Check the request URL - should be `http://localhost/restuarent/api/login.php`

See `LOCAL_SETUP_GUIDE.md` for detailed troubleshooting.

