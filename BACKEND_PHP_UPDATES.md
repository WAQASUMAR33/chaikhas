# Backend PHP API Files - Required Updates

This document provides **exact PHP code examples** for updating your backend API files to work with the frontend.

---

## 1. `get_categories.php` - GET Categories API

### ✅ Required Update: Accept `branch_id` and filter by it

**Current Issues:**
- Categories not showing in frontend
- Not filtering by `branch_id`

**Updated PHP Code:**

```php
<?php
header('Content-Type: application/json');
require_once 'db_connection.php'; // Your database connection file

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);
$terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
$branch_id = isset($input['branch_id']) ? intval($input['branch_id']) : null;

try {
    // Build query - include branch_id filter
    if ($branch_id) {
        $sql = "SELECT 
                    c.category_id,
                    c.name,
                    c.description,
                    c.kitchen_id,
                    c.kid,
                    c.terminal,
                    c.branch_id,
                    k.title as kitchen_name,
                    k.code as kitchen_code
                FROM categories c
                LEFT JOIN kitchens k ON c.kitchen_id = k.kitchen_id
                WHERE c.branch_id = ? AND c.terminal = ?
                ORDER BY c.name ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $branch_id, $terminal);
    } else {
        // Super admin - return all branches (if branch_id is null)
        $sql = "SELECT 
                    c.category_id,
                    c.name,
                    c.description,
                    c.kitchen_id,
                    c.kid,
                    c.terminal,
                    c.branch_id,
                    k.title as kitchen_name,
                    k.code as kitchen_code
                FROM categories c
                LEFT JOIN kitchens k ON c.kitchen_id = k.kitchen_id
                WHERE c.terminal = ?
                ORDER BY c.branch_id, c.name ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $terminal);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        $categories[] = [
            'category_id' => $row['category_id'],
            'name' => $row['name'],
            'description' => $row['description'] ?? '',
            'kitchen_id' => $row['kitchen_id'] ?? null,
            'kitchen_name' => $row['kitchen_name'] ?? null,
            'kid' => $row['kid'] ?? 0,
            'terminal' => $row['terminal'],
            'branch_id' => $row['branch_id']
        ];
    }
    
    // Return array directly (frontend handles this)
    echo json_encode($categories);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch categories',
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>
```

---

## 2. `category_management.php` - CREATE/UPDATE/DELETE Categories

### ✅ Required Update: Accept `branch_id`, validate, and save it

**Current Issues:**
- Categories not saving to database
- Not including `branch_id` in INSERT/UPDATE

**Updated PHP Code:**

```php
<?php
header('Content-Type: application/json');
require_once 'db_connection.php';

$input = json_decode(file_get_contents('php://input'), true);
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        // CREATE or UPDATE
        $category_id = isset($input['category_id']) ? intval($input['category_id']) : null;
        $name = isset($input['name']) ? trim($input['name']) : '';
        $description = isset($input['description']) ? trim($input['description']) : '';
        $kitchen_id = isset($input['kitchen_id']) ? intval($input['kitchen_id']) : null;
        $kid = isset($input['kid']) ? intval($input['kid']) : 0;
        $terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
        $branch_id = isset($input['branch_id']) ? intval($input['branch_id']) : null;
        
        // Validation
        if (empty($name)) {
            throw new Exception('Category name is required');
        }
        
        if (empty($kitchen_id)) {
            throw new Exception('Kitchen ID is required');
        }
        
        if (empty($branch_id)) {
            throw new Exception('Branch ID is required');
        }
        
        if (empty($category_id)) {
            // CREATE new category
            if (empty($kid)) {
                // Auto-generate kid if not provided
                $kid_sql = "SELECT COALESCE(MAX(kid), 0) + 1 as next_kid FROM categories WHERE branch_id = ? AND terminal = ?";
                $kid_stmt = $conn->prepare($kid_sql);
                $kid_stmt->bind_param("ii", $branch_id, $terminal);
                $kid_stmt->execute();
                $kid_result = $kid_stmt->get_result();
                $kid_row = $kid_result->fetch_assoc();
                $kid = $kid_row['next_kid'];
            }
            
            $sql = "INSERT INTO categories (name, description, kitchen_id, kid, terminal, branch_id) 
                    VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ssiiii", $name, $description, $kitchen_id, $kid, $terminal, $branch_id);
            
        } else {
            // UPDATE existing category
            $sql = "UPDATE categories 
                    SET name = ?, description = ?, kitchen_id = ?, kid = ?
                    WHERE category_id = ? AND branch_id = ? AND terminal = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ssiiiii", $name, $description, $kitchen_id, $kid, $category_id, $branch_id, $terminal);
        }
        
        if ($stmt->execute()) {
            $new_category_id = empty($category_id) ? $conn->insert_id : $category_id;
            
            // Fetch the saved category
            $fetch_sql = "SELECT * FROM categories WHERE category_id = ?";
            $fetch_stmt = $conn->prepare($fetch_sql);
            $fetch_stmt->bind_param("i", $new_category_id);
            $fetch_stmt->execute();
            $saved_category = $fetch_stmt->get_result()->fetch_assoc();
            
            echo json_encode([
                'success' => true,
                'message' => empty($category_id) ? 'Category created successfully' : 'Category updated successfully',
                'data' => $saved_category
            ]);
        } else {
            throw new Exception('Failed to save category: ' . $stmt->error);
        }
        
    } elseif ($method === 'DELETE') {
        // DELETE category
        $category_id = isset($input['category_id']) ? intval($input['category_id']) : null;
        
        if (empty($category_id)) {
            throw new Exception('Category ID is required');
        }
        
        $sql = "DELETE FROM categories WHERE category_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $category_id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Category deleted successfully'
            ]);
        } else {
            throw new Exception('Failed to delete category: ' . $stmt->error);
        }
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>
```

---

## 3. `table_management.php` - UPDATE Table Status

### ✅ Required Update: Accept `branch_id` and `action`, update status correctly

**Current Issues:**
- Table status not updating after order completion
- Not accepting `branch_id` parameter

**Updated PHP Code:**

```php
<?php
header('Content-Type: application/json');
require_once 'db_connection.php';

$input = json_decode(file_get_contents('php://input'), true);
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($input['action']) ? $input['action'] : 'update';

try {
    if ($method === 'POST' && $action === 'update') {
        $table_id = isset($input['table_id']) ? intval($input['table_id']) : null;
        $status = isset($input['status']) ? trim($input['status']) : 'Available';
        $hall_id = isset($input['hall_id']) ? intval($input['hall_id']) : null;
        $table_number = isset($input['table_number']) ? trim($input['table_number']) : '';
        $capacity = isset($input['capacity']) ? intval($input['capacity']) : null;
        $terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
        $branch_id = isset($input['branch_id']) ? intval($input['branch_id']) : null;
        
        if (empty($table_id)) {
            throw new Exception('Table ID is required');
        }
        
        // Validate status values
        $valid_statuses = ['Available', 'Running', 'Occupied'];
        if (!in_array($status, $valid_statuses)) {
            $status = 'Available'; // Default to Available if invalid
        }
        
        // Update table status
        $sql = "UPDATE tables 
                SET status = ?, updated_at = NOW()";
        
        // Optionally update other fields if provided
        if (!empty($hall_id)) {
            $sql .= ", hall_id = ?";
        }
        if (!empty($table_number)) {
            $sql .= ", table_number = ?";
        }
        if (!empty($capacity)) {
            $sql .= ", capacity = ?";
        }
        
        $sql .= " WHERE table_id = ?";
        
        if ($branch_id) {
            $sql .= " AND branch_id = ?";
        }
        if ($terminal) {
            $sql .= " AND terminal = ?";
        }
        
        $stmt = $conn->prepare($sql);
        
        // Build bind params dynamically
        $params = [$status];
        $types = 's';
        
        if (!empty($hall_id)) {
            $params[] = $hall_id;
            $types .= 'i';
        }
        if (!empty($table_number)) {
            $params[] = $table_number;
            $types .= 's';
        }
        if (!empty($capacity)) {
            $params[] = $capacity;
            $types .= 'i';
        }
        
        $params[] = $table_id;
        $types .= 'i';
        
        if ($branch_id) {
            $params[] = $branch_id;
            $types .= 'i';
        }
        if ($terminal) {
            $params[] = $terminal;
            $types .= 'i';
        }
        
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            // Fetch updated table
            $fetch_sql = "SELECT * FROM tables WHERE table_id = ?";
            $fetch_stmt = $conn->prepare($fetch_sql);
            $fetch_stmt->bind_param("i", $table_id);
            $fetch_stmt->execute();
            $updated_table = $fetch_stmt->get_result()->fetch_assoc();
            
            echo json_encode([
                'success' => true,
                'message' => 'Table status updated successfully',
                'data' => $updated_table
            ]);
        } else {
            throw new Exception('Failed to update table status: ' . $stmt->error);
        }
        
    } else {
        throw new Exception('Invalid request method or action');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>
```

---

## 4. `kitchen_management.php` - GET/CREATE/UPDATE/DELETE Kitchens

### ✅ Required Update: Handle optional `branch_id` (null = all branches for super-admin)

**Current Issues:**
- Kitchens not showing in super-admin dashboard
- Not handling "all branches" case

**Updated PHP Code:**

```php
<?php
header('Content-Type: application/json');
require_once 'db_connection.php';

$input = json_decode(file_get_contents('php://input'), true);
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($input['action']) ? $input['action'] : 'get';

try {
    if ($action === 'get') {
        // GET kitchens
        $terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
        // IMPORTANT: Handle null, empty string, or 0 as "all branches" for super-admin
        $branch_id_input = isset($input['branch_id']) ? $input['branch_id'] : null;
        $branch_id = (!empty($branch_id_input) && $branch_id_input !== 'null' && $branch_id_input !== '0') 
                     ? intval($branch_id_input) 
                     : null;
        
        if ($branch_id) {
            // Get kitchens for specific branch
            $sql = "SELECT 
                        kitchen_id,
                        title,
                        code,
                        printer,
                        branch_id,
                        terminal
                    FROM kitchens
                    WHERE branch_id = ? AND terminal = ?
                    ORDER BY title ASC";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ii", $branch_id, $terminal);
        } else {
            // IMPORTANT: Get kitchens for ALL branches (super-admin) when branch_id is null
            // This is the key fix - return all kitchens when branch_id is null/empty
            $sql = "SELECT 
                        kitchen_id,
                        title,
                        code,
                        printer,
                        branch_id,
                        terminal
                    FROM kitchens
                    WHERE terminal = ?
                    ORDER BY branch_id, title ASC";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $terminal);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $kitchens = [];
        while ($row = $result->fetch_assoc()) {
            $kitchens[] = [
                'kitchen_id' => $row['kitchen_id'],
                'title' => $row['title'] ?? $row['name'] ?? 'Kitchen ' . $row['kitchen_id'],
                'code' => $row['code'],
                'printer' => $row['printer'] ?? '',
                'branch_id' => $row['branch_id'],
                'terminal' => $row['terminal']
            ];
        }
        
        // Return array directly (frontend expects this)
        echo json_encode($kitchens);
        
        // Alternative: If you prefer wrapped format, use:
        // echo json_encode([
        //     'success' => true,
        //     'data' => $kitchens
        // ]);
        
    } elseif ($action === 'create' || (empty($input['kitchen_id']) && $method === 'POST')) {
        // CREATE new kitchen
        $title = isset($input['title']) ? trim($input['title']) : '';
        $code = isset($input['code']) ? trim($input['code']) : '';
        $printer = isset($input['printer']) ? trim($input['printer']) : '';
        $terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
        $branch_id = isset($input['branch_id']) ? intval($input['branch_id']) : null;
        
        if (empty($title)) {
            throw new Exception('Kitchen title is required');
        }
        
        if (empty($code)) {
            throw new Exception('Kitchen code is required');
        }
        
        if (empty($branch_id)) {
            throw new Exception('Branch ID is required');
        }
        
        $sql = "INSERT INTO kitchens (title, code, printer, terminal, branch_id) 
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssii", $title, $code, $printer, $terminal, $branch_id);
        
        if ($stmt->execute()) {
            $kitchen_id = $conn->insert_id;
            
            // Fetch the created kitchen
            $fetch_sql = "SELECT * FROM kitchens WHERE kitchen_id = ?";
            $fetch_stmt = $conn->prepare($fetch_sql);
            $fetch_stmt->bind_param("i", $kitchen_id);
            $fetch_stmt->execute();
            $saved_kitchen = $fetch_stmt->get_result()->fetch_assoc();
            
            echo json_encode([
                'success' => true,
                'message' => 'Kitchen created successfully',
                'data' => $saved_kitchen
            ]);
        } else {
            throw new Exception('Failed to create kitchen: ' . $stmt->error);
        }
        
    } elseif ($action === 'update' || (!empty($input['kitchen_id']) && $method === 'POST')) {
        // UPDATE existing kitchen
        $kitchen_id = isset($input['kitchen_id']) ? intval($input['kitchen_id']) : null;
        $title = isset($input['title']) ? trim($input['title']) : '';
        $code = isset($input['code']) ? trim($input['code']) : '';
        $printer = isset($input['printer']) ? trim($input['printer']) : '';
        $terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
        $branch_id = isset($input['branch_id']) ? intval($input['branch_id']) : null;
        
        if (empty($kitchen_id)) {
            throw new Exception('Kitchen ID is required for update');
        }
        
        $sql = "UPDATE kitchens 
                SET title = ?, code = ?, printer = ?
                WHERE kitchen_id = ?";
        
        $where_params = [$kitchen_id];
        $where_types = 'i';
        
        if ($branch_id) {
            $sql .= " AND branch_id = ?";
            $where_params[] = $branch_id;
            $where_types .= 'i';
        }
        if ($terminal) {
            $sql .= " AND terminal = ?";
            $where_params[] = $terminal;
            $where_types .= 'i';
        }
        
        $stmt = $conn->prepare($sql);
        $all_params = array_merge([$title, $code, $printer], $where_params);
        $all_types = 'sss' . $where_types;
        $stmt->bind_param($all_types, ...$all_params);
        
        if ($stmt->execute()) {
            // Fetch updated kitchen
            $fetch_sql = "SELECT * FROM kitchens WHERE kitchen_id = ?";
            $fetch_stmt = $conn->prepare($fetch_sql);
            $fetch_stmt->bind_param("i", $kitchen_id);
            $fetch_stmt->execute();
            $updated_kitchen = $fetch_stmt->get_result()->fetch_assoc();
            
            echo json_encode([
                'success' => true,
                'message' => 'Kitchen updated successfully',
                'data' => $updated_kitchen
            ]);
        } else {
            throw new Exception('Failed to update kitchen: ' . $stmt->error);
        }
        
    } elseif ($method === 'DELETE') {
        // DELETE kitchen
        $kitchen_id = isset($input['kitchen_id']) ? intval($input['kitchen_id']) : null;
        $branch_id = isset($input['branch_id']) ? intval($input['branch_id']) : null;
        
        if (empty($kitchen_id)) {
            throw new Exception('Kitchen ID is required');
        }
        
        $sql = "DELETE FROM kitchens WHERE kitchen_id = ?";
        $where_params = [$kitchen_id];
        $where_types = 'i';
        
        if ($branch_id) {
            $sql .= " AND branch_id = ?";
            $where_params[] = $branch_id;
            $where_types .= 'i';
        }
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($where_types, ...$where_params);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Kitchen deleted successfully'
            ]);
        } else {
            throw new Exception('Failed to delete kitchen: ' . $stmt->error);
        }
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>
```

---

## 5. `get_tables.php` - GET Tables API

### ✅ Required Update: Accept `branch_id` and filter by it

**Updated PHP Code:**

```php
<?php
header('Content-Type: application/json');
require_once 'db_connection.php';

$input = json_decode(file_get_contents('php://input'), true);
$terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
$branch_id = isset($input['branch_id']) ? intval($input['branch_id']) : null;

try {
    if ($branch_id) {
        $sql = "SELECT 
                    table_id,
                    hall_id,
                    table_number,
                    capacity,
                    status,
                    terminal,
                    branch_id
                FROM tables
                WHERE branch_id = ? AND terminal = ?
                ORDER BY hall_id, table_number ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $branch_id, $terminal);
    } else {
        // Super admin - return all branches
        $sql = "SELECT 
                    table_id,
                    hall_id,
                    table_number,
                    capacity,
                    status,
                    terminal,
                    branch_id
                FROM tables
                WHERE terminal = ?
                ORDER BY branch_id, hall_id, table_number ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $terminal);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tables = [];
    while ($row = $result->fetch_assoc()) {
        $tables[] = [
            'table_id' => $row['table_id'],
            'hall_id' => $row['hall_id'] ?? null,
            'table_number' => $row['table_number'],
            'capacity' => $row['capacity'] ?? null,
            'status' => $row['status'] ?? 'Available',
            'terminal' => $row['terminal'],
            'branch_id' => $row['branch_id']
        ];
    }
    
    // Return array directly
    echo json_encode($tables);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch tables',
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>
```

---

## 6. Quick Checklist

### Step 1: Verify Database Tables
```sql
-- Check if branch_id column exists in each table
DESCRIBE categories;
DESCRIBE tables;
DESCRIBE kitchens;

-- If branch_id doesn't exist, add it:
ALTER TABLE categories ADD COLUMN branch_id INT NOT NULL AFTER terminal;
ALTER TABLE tables ADD COLUMN branch_id INT NOT NULL AFTER terminal;
ALTER TABLE kitchens ADD COLUMN branch_id INT NOT NULL AFTER terminal;
```

### Step 2: Update PHP Files
- [ ] Update `get_categories.php` - Add branch_id filtering
- [ ] Update `category_management.php` - Accept and save branch_id
- [ ] Update `table_management.php` - Accept branch_id and action parameter
- [ ] Update `kitchen_management.php` - Handle optional branch_id (null = all)
- [ ] Update `get_tables.php` - Add branch_id filtering

### Step 3: Test
- [ ] Test category creation in branch-admin
- [ ] Test category creation in super-admin
- [ ] Test kitchen display in super-admin
- [ ] Test table status update after order completion

---

## 7. Important Notes

1. **Column Names:** 
   - Some tables might use `name` instead of `title` for kitchen name
   - Check your actual column names: `SHOW COLUMNS FROM kitchens;`

2. **Database Connection:**
   - Replace `db_connection.php` with your actual database connection file
   - Make sure to use prepared statements to prevent SQL injection

3. **Response Format:**
   - GET endpoints can return array directly: `json_encode($array)`
   - CREATE/UPDATE/DELETE should return: `{ success: true, message: "...", data: {...} }`

4. **Error Handling:**
   - Always use try-catch blocks
   - Return proper HTTP status codes
   - Include error messages in response

---

## 8. Common Issues & Solutions

### Issue: "Categories not saving"
**Solution:** 
- Check if `branch_id` column exists in categories table
- Verify INSERT query includes `branch_id`
- Check if `kitchen_id` is valid and belongs to the branch

### Issue: "Table status not updating"
**Solution:**
- Verify `table_management.php` accepts `action: 'update'` parameter
- Check if UPDATE query includes `branch_id` in WHERE clause
- Verify `status` column accepts the values: 'Available', 'Running', 'Occupied'

### Issue: "Kitchens not showing in super-admin"
**Solution:**
- When `branch_id` is null/empty, return all kitchens
- Make sure SQL query uses `WHERE terminal = ?` (not filtering by branch_id when it's null)
- Include `branch_id` in response so frontend can identify which branch

---

## 9. Testing Your PHP Updates

### Test Category Creation:
```php
// Test request
POST /category_management.php
{
  "name": "Test Category",
  "description": "Test",
  "kitchen_id": 1,
  "terminal": 1,
  "branch_id": 1
}

// Expected response
{
  "success": true,
  "message": "Category created successfully",
  "data": { ... }
}
```

### Test Category Fetching:
```php
// Test request
POST /get_categories.php
{
  "terminal": 1,
  "branch_id": 1
}

// Expected response (direct array)
[
  {
    "category_id": 1,
    "name": "Test Category",
    "kitchen_id": 1,
    "branch_id": 1,
    ...
  }
]
```

### Test Table Status Update:
```php
// Test request
POST /table_management.php
{
  "table_id": 1,
  "status": "Available",
  "terminal": 1,
  "branch_id": 1,
  "action": "update"
}

// Expected response
{
  "success": true,
  "message": "Table status updated successfully",
  "data": { ... }
}
```

---

## 10. Need Help?

1. **Check Browser Console (F12):** See exact API requests being sent
2. **Check Network Tab:** Verify request/response data
3. **Check Backend Logs:** Look for SQL errors or PHP errors
4. **Test SQL Directly:** Run queries in phpMyAdmin or MySQL client first

