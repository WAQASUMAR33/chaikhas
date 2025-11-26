# API Fixes Needed for Backend

## Issues Found

### 1. **get_users_accounts.php** - Empty Response Error

**Error**: `Users API request failed: {}` - Empty response received

**Expected Behavior**: 
- API should return JSON with user data
- Should accept POST request with `terminal` parameter

**Expected Response Format** (choose one):
```json
// Option 1: Direct array
[
  {
    "id": 1,
    "username": "user1",
    "fullname": "User One",
    "role": "branch_admin",
    "branch_id": 1,
    "status": "Active",
    "terminal": 1,
    "created_at": "2025-01-01 10:00:00"
  }
]

// Option 2: Wrapped in success object
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "user1",
      ...
    }
  ]
}

// Option 3: With message
{
  "success": true,
  "data": {
    "users": [...]
  }
}
```

**Fix Required**:
1. Check if `get_users_accounts.php` exists in your API folder
2. Ensure it accepts POST requests (not GET)
3. Ensure it returns JSON (not HTML or empty response)
4. Add error handling for database connection issues
5. Return proper JSON even if no users found: `{"success": true, "data": []}`

---

### 2. **get_products.php** - Failed to Fetch Error

**Error**: `API GET Error: "/get_products.php" "Failed to fetch"`

**Expected Behavior**:
- API should be accessible
- Should return product/menu items data

**Possible Causes**:
1. API endpoint doesn't exist
2. CORS issues (Cross-Origin Resource Sharing)
3. Server is down or unreachable
4. Wrong API URL configuration

**Fix Required**:
1. Verify `get_products.php` exists in API folder
2. Check CORS headers in PHP:
   ```php
   header('Access-Control-Allow-Origin: *');
   header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
   header('Access-Control-Allow-Headers: Content-Type, Authorization');
   ```
3. Ensure API base URL is correct in `.env.local`:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://darkgreen-trout-102253.hostingersite.com/api
   ```
4. Test API directly in browser: `https://your-domain.com/api/get_products.php`

---

### 3. **branch_management.php** - Response Format

**Current Issue**: Using POST with `{ action: 'get' }` but may need to verify response format

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "branch_id": 1,
      "branch_name": "Main Branch",
      "branch_code": "MB001",
      ...
    }
  ]
}
```

**Fix Required**:
- Ensure API accepts POST with `action: 'get'` parameter
- Return consistent JSON format

---

## Testing Checklist

### For get_users_accounts.php:
- [ ] File exists: `/api/get_users_accounts.php`
- [ ] Accepts POST method
- [ ] Reads `terminal` parameter from POST body
- [ ] Returns JSON (not HTML)
- [ ] Handles empty results gracefully
- [ ] Returns proper error messages on failure

### For get_products.php:
- [ ] File exists: `/api/get_products.php`
- [ ] Accessible via GET or POST
- [ ] CORS headers are set
- [ ] Returns JSON format
- [ ] Server is running and accessible

### General API Requirements:
- [ ] All APIs return JSON
- [ ] CORS is enabled for all endpoints
- [ ] Error responses follow format: `{"success": false, "message": "Error message"}`
- [ ] Success responses follow format: `{"success": true, "data": [...]}`

---

## Quick Fix Template for get_users_accounts.php

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php'; // Your database config

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $terminal = $input['terminal'] ?? 1;
    
    // Your database query here
    $stmt = $pdo->prepare("SELECT id, username, fullname, role, branch_id, status, terminal, created_at FROM users WHERE terminal = ?");
    $stmt->execute([$terminal]);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $users
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching users: ' . $e->getMessage()
    ]);
}
?>
```

---

## Database Configuration Reminder

Make sure your `config.php` has the correct database password:
```php
define('DB_PASS', 'Resturantkhas@786');
```

