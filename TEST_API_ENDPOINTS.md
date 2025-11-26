# Testing API Endpoints

## Quick Test for get_users_accounts.php

### Method 1: Using Browser Console

Open your browser console (F12) and run:

```javascript
// Test the API endpoint directly
fetch('https://darkgreen-trout-102253.hostingersite.com/api/get_users_accounts.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ terminal: 1 })
})
.then(response => response.text())
.then(text => {
  console.log('Raw response:', text);
  try {
    const json = JSON.parse(text);
    console.log('Parsed JSON:', json);
  } catch (e) {
    console.error('Not valid JSON:', e);
    console.log('Response is:', text);
  }
})
.catch(error => console.error('Error:', error));
```

### Method 2: Using Postman or cURL

**cURL command:**
```bash
curl -X POST https://darkgreen-trout-102253.hostingersite.com/api/get_users_accounts.php \
  -H "Content-Type: application/json" \
  -d '{"terminal": 1}'
```

**Postman:**
- Method: POST
- URL: `https://darkgreen-trout-102253.hostingersite.com/api/get_users_accounts.php`
- Headers: `Content-Type: application/json`
- Body (raw JSON): `{"terminal": 1}`

### Method 3: Direct Browser Access

Try accessing directly in browser:
```
https://darkgreen-trout-102253.hostingersite.com/api/get_users_accounts.php
```

**Expected Results:**
- ✅ **Good**: Returns JSON like `{"success": true, "data": [...]}`
- ❌ **Bad**: Returns HTML (404 page or error page)
- ❌ **Bad**: Returns empty response
- ❌ **Bad**: Returns `{}` (empty object)

---

## Common Issues and Solutions

### Issue 1: Returns HTML (404 or Error Page)
**Problem**: File doesn't exist or wrong path
**Solution**: 
- Check if file exists: `/api/get_users_accounts.php`
- Verify file permissions
- Check server error logs

### Issue 2: Returns Empty Object `{}`
**Problem**: File exists but not returning data
**Solution**: Check PHP file:
```php
<?php
// Make sure these are at the top:
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Make sure you're returning JSON:
echo json_encode([
    'success' => true,
    'data' => $users  // Your user data here
]);
?>
```

### Issue 3: CORS Error
**Problem**: Server blocking cross-origin requests
**Solution**: Add CORS headers in PHP:
```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
```

### Issue 4: Returns Empty Response
**Problem**: PHP error or no output
**Solution**:
- Check PHP error logs
- Enable error reporting temporarily:
```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

---

## Required PHP File Template

Create `/api/get_users_accounts.php`:

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php'; // Your database config file

try {
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    $terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
    
    // Database query
    $stmt = $pdo->prepare("
        SELECT 
            id, 
            username, 
            fullname, 
            role, 
            branch_id, 
            status, 
            terminal, 
            created_at 
        FROM users 
        WHERE terminal = ? OR terminal IS NULL
        ORDER BY id DESC
    ");
    $stmt->execute([$terminal]);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Return JSON response
    echo json_encode([
        'success' => true,
        'data' => $users ? $users : []
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
```

---

## Database Table Structure

Make sure your `users` table has these columns:
- `id` (INT, PRIMARY KEY)
- `username` (VARCHAR)
- `fullname` (VARCHAR)
- `role` (VARCHAR) - values: 'super_admin', 'branch_admin', 'order_taker', 'accountant', 'kitchen'
- `branch_id` (INT, NULLABLE)
- `status` (VARCHAR) - values: 'Active', 'Inactive'
- `terminal` (INT)
- `created_at` (DATETIME)

---

## Testing Checklist

- [ ] File exists: `/api/get_users_accounts.php`
- [ ] File is accessible via browser
- [ ] Returns JSON (not HTML)
- [ ] Accepts POST requests
- [ ] Reads `terminal` parameter
- [ ] Returns proper JSON structure
- [ ] CORS headers are set
- [ ] Database connection works
- [ ] Query returns user data
- [ ] Handles errors gracefully

---

## Debug Steps

1. **Check if file exists**: Access directly in browser
2. **Check PHP errors**: Enable error reporting
3. **Check database**: Test query in phpMyAdmin
4. **Check CORS**: Look for CORS errors in browser console
5. **Check response**: Use browser console to see raw response
6. **Check logs**: Check server error logs

