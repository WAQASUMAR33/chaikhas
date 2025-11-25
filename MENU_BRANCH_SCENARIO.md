# Menu/Dish Branch Management - Complete Implementation Guide

## 📋 Scenario Overview

**Super-Admin Dashboard:**
- Shows ALL menu items (dishes) from ALL branches
- Each menu item displays with its `branch_id` and `branch_name`
- Can filter menu items by branch
- Can add/edit menu items for any branch
- When a branch-admin adds a menu item, it immediately appears in super-admin dashboard with branch information

**Branch-Admin Dashboard:**
- Shows ONLY their own branch's menu items
- Cannot see menu items from other branches
- Can only select categories from their own branch when creating menu items
- When they add a menu item, it's automatically associated with their `branch_id`
- Menu items they add will appear in super-admin dashboard

---

## 🗄️ Database Schema Changes

### 1. Verify `dishes` Table Structure

Run this SQL query to check if `branch_id` column exists:

```sql
DESCRIBE dishes;
-- OR
DESCRIBE products;
-- OR (check your actual table name)
SHOW TABLES LIKE '%dish%';
SHOW TABLES LIKE '%product%';
```

### 2. Add `branch_id` Column to Dishes Table (If Not Exists)

**Note:** Your table might be named `dishes`, `products`, `menu_items`, or similar. Replace `dishes` with your actual table name.

```sql
-- Add branch_id column to dishes table
ALTER TABLE dishes 
ADD COLUMN branch_id INT(11) NULL AFTER dish_id,
ADD INDEX idx_branch_id (branch_id);

-- Add foreign key constraint (optional, if you have branches table)
-- ALTER TABLE dishes 
-- ADD CONSTRAINT fk_dishes_branch 
-- FOREIGN KEY (branch_id) REFERENCES branches(branch_id) 
-- ON DELETE CASCADE ON UPDATE CASCADE;
```

### 3. Update Existing Dishes (If Needed)

If you have existing dishes without `branch_id`, you can set a default:

```sql
-- Set default branch_id for existing dishes (change 1 to your default branch_id)
UPDATE dishes 
SET branch_id = 1 
WHERE branch_id IS NULL OR branch_id = 0;
```

### 4. Verify Table Relationships

Ensure your `dishes` table has a `category_id` column that references `categories` table:

```sql
-- Check if category_id exists
DESCRIBE dishes;

-- Verify categories table has branch_id
DESCRIBE categories;

-- Ensure dishes can only reference categories from the same branch
-- This should be enforced in PHP code, not database (for flexibility)
```

---

## 🔌 PHP API Endpoints - Complete Code

### Endpoint 1: `get_products.php`

**Purpose:** Fetch menu items (dishes) with branch filtering
- **Branch-Admin:** Returns only their branch's menu items (requires `branch_id`)
- **Super-Admin:** Returns all menu items with branch info (no `branch_id` or `branch_id` = null)

**Method:** POST

**Request Body:**
```json
{
    "terminal": "1",
    "branch_id": "2"  // Optional: If provided, filter by branch. If null/empty, return all
}
```

**Complete PHP Code:**

```php
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connection.php'; // Your database connection file

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    $terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
    $branch_id = isset($input['branch_id']) ? trim($input['branch_id']) : null;
    
    // Convert branch_id to integer or null
    if ($branch_id === '' || $branch_id === 'null' || $branch_id === 'undefined' || $branch_id === null) {
        $branch_id = null;
    } else {
        $branch_id = intval($branch_id);
        if ($branch_id <= 0) {
            $branch_id = null;
        }
    }
    
    // Build SQL query based on branch_id
    // Note: Join with categories to get category name and kitchen_id (kitchen_id comes from category, not dish)
    // IMPORTANT: If your dishes table has kitchen_id column, use d.kitchen_id. Otherwise use c.kitchen_id
    if ($branch_id !== null) {
        // Branch-Admin: Get dishes for specific branch only
        $sql = "SELECT 
                    d.dish_id,
                    d.name,
                    d.description,
                    d.price,
                    d.qnty,
                    d.barcode,
                    d.is_available,
                    d.is_frequent,
                    d.discount,
                    d.category_id,
                    COALESCE(d.kitchen_id, c.kitchen_id) AS kitchen_id,
                    d.terminal,
                    d.branch_id,
                    c.name AS catname,
                    c.category_name,
                    c.kid AS category_kid,
                    c.kitchen_id AS category_kitchen_id,
                    b.name AS branch_name,
                    b.branch_name AS branch_name_alt,
                    k.title AS kitchen_name
                FROM dishes d
                LEFT JOIN categories c ON d.category_id = c.category_id AND d.branch_id = c.branch_id
                LEFT JOIN branches b ON d.branch_id = b.branch_id
                LEFT JOIN kitchens k ON COALESCE(d.kitchen_id, c.kitchen_id) = k.kitchen_id
                WHERE d.branch_id = ? AND d.terminal = ?
                ORDER BY c.name ASC, d.name ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $branch_id, $terminal);
    } else {
        // Super-Admin: Get ALL dishes from ALL branches
        $sql = "SELECT 
                    d.dish_id,
                    d.name,
                    d.description,
                    d.price,
                    d.qnty,
                    d.barcode,
                    d.is_available,
                    d.is_frequent,
                    d.discount,
                    d.category_id,
                    COALESCE(d.kitchen_id, c.kitchen_id) AS kitchen_id,
                    d.terminal,
                    d.branch_id,
                    c.name AS catname,
                    c.category_name,
                    c.kid AS category_kid,
                    c.kitchen_id AS category_kitchen_id,
                    b.name AS branch_name,
                    b.branch_name AS branch_name_alt,
                    k.title AS kitchen_name
                FROM dishes d
                LEFT JOIN categories c ON d.category_id = c.category_id AND d.branch_id = c.branch_id
                LEFT JOIN branches b ON d.branch_id = b.branch_id
                LEFT JOIN kitchens k ON COALESCE(d.kitchen_id, c.kitchen_id) = k.kitchen_id
                WHERE d.terminal = ?
                ORDER BY d.branch_id ASC, c.name ASC, d.name ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $terminal);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $menuItems = [];
    while ($row = $result->fetch_assoc()) {
        // Normalize branch_name (check multiple possible fields)
        $branch_name = $row['branch_name'] ?? $row['branch_name_alt'] ?? null;
        if (!$branch_name && $row['branch_id']) {
            $branch_name = 'Branch ' . $row['branch_id'];
        }
        
        // Normalize category name
        $category_name = $row['catname'] ?? $row['category_name'] ?? null;
        if (!$category_name) {
            $category_name = 'Uncategorized';
        }
        
        $menuItems[] = [
            'dish_id' => intval($row['dish_id']),
            'id' => intval($row['dish_id']), // Alias for frontend compatibility
            'name' => $row['name'] ?? '',
            'dish_name' => $row['name'] ?? '', // Alias
            'description' => $row['description'] ?? '',
            'price' => floatval($row['price'] ?? 0),
            'qnty' => $row['qnty'] ?? '1',
            'quantity' => $row['qnty'] ?? '1', // Alias
            'barcode' => $row['barcode'] ?? '',
            'is_available' => intval($row['is_available'] ?? 1),
            'is_frequent' => intval($row['is_frequent'] ?? 1),
            'discount' => floatval($row['discount'] ?? 0),
            'category_id' => $row['category_id'] ? intval($row['category_id']) : null,
            'category_name' => $category_name,
            'catname' => $category_name, // Alias
            'kitchen_id' => $row['kitchen_id'] ? intval($row['kitchen_id']) : null,
            'kitchen_name' => $row['kitchen_name'] ?? null,
            'terminal' => intval($row['terminal']),
            'branch_id' => $row['branch_id'] ? intval($row['branch_id']) : null,
            'branch_name' => $branch_name
        ];
    }
    
    $stmt->close();
    
    // Return success response with menu items array
    echo json_encode([
        'success' => true,
        'data' => $menuItems,
        'count' => count($menuItems)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch menu items',
        'message' => $e->getMessage()
    ]);
}
?>
```

---

### Endpoint 2: `dishes_management.php`

**Purpose:** Create, Update, or Delete menu items (dishes)
- **Branch-Admin:** Automatically uses their `branch_id` (must be provided in request)
- **Super-Admin:** Can specify `branch_id` for any branch

**Method:** POST (for create/update), DELETE (for delete)

**Request Body (Create/Update):**
```json
{
    "dish_id": "",  // Empty for create, existing ID for update
    "category_id": "5",
    "name": "Caesar Salad",
    "description": "Fresh romaine lettuce with caesar dressing",
    "price": "12.99",
    "is_available": 1,
    "terminal": "1",
    "branch_id": "2",  // REQUIRED: Must be provided
    "discount": 0,
    "kitchen_id": "3"
}
```

**Complete PHP Code:**

```php
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connection.php'; // Your database connection file

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        // CREATE or UPDATE
        $input = json_decode(file_get_contents('php://input'), true);
        
        $dish_id = isset($input['dish_id']) ? trim($input['dish_id']) : '';
        $category_id = isset($input['category_id']) && $input['category_id'] ? intval($input['category_id']) : null;
        $name = isset($input['name']) ? trim($input['name']) : '';
        $description = isset($input['description']) ? trim($input['description']) : '';
        $price = isset($input['price']) ? floatval($input['price']) : 0;
        $is_available = isset($input['is_available']) ? intval($input['is_available']) : 1;
        $terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
        $branch_id = isset($input['branch_id']) ? trim($input['branch_id']) : null;
        $discount = isset($input['discount']) ? floatval($input['discount']) : 0;
        $kitchen_id = isset($input['kitchen_id']) && $input['kitchen_id'] ? intval($input['kitchen_id']) : null;
        $qnty = isset($input['qnty']) ? $input['qnty'] : '1';
        $barcode = isset($input['barcode']) ? trim($input['barcode']) : '';
        
        // Validate branch_id
        if (!$branch_id || $branch_id === '' || $branch_id === 'null' || $branch_id === 'undefined') {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'branch_id is required',
                'message' => 'Branch ID must be provided'
            ]);
            exit();
        }
        
        $branch_id = intval($branch_id);
        if ($branch_id <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid branch_id',
                'message' => 'Branch ID must be a valid positive integer'
            ]);
            exit();
        }
        
        // Validate required fields
        if (empty($name)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'name is required',
                'message' => 'Dish name is required'
            ]);
            exit();
        }
        
        if ($price <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'price is required',
                'message' => 'Price must be greater than 0'
            ]);
            exit();
        }
        
        // Validate category_id exists and belongs to the same branch
        if ($category_id) {
            $category_check_sql = "SELECT category_id FROM categories 
                                  WHERE category_id = ? AND branch_id = ? AND terminal = ?";
            $category_check_stmt = $conn->prepare($category_check_sql);
            $category_check_stmt->bind_param("iii", $category_id, $branch_id, $terminal);
            $category_check_stmt->execute();
            $category_check_result = $category_check_stmt->get_result();
            
            if ($category_check_result->num_rows === 0) {
                $category_check_stmt->close();
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Invalid category',
                    'message' => 'Category does not exist or does not belong to this branch'
                ]);
                exit();
            }
            $category_check_stmt->close();
        }
        
        if (empty($dish_id)) {
            // CREATE NEW DISH
            // Check if dish name already exists for this branch
            $check_sql = "SELECT dish_id FROM dishes 
                         WHERE name = ? AND branch_id = ? AND terminal = ?";
            $check_stmt = $conn->prepare($check_sql);
            $check_stmt->bind_param("sii", $name, $branch_id, $terminal);
            $check_stmt->execute();
            $check_result = $check_stmt->get_result();
            
            if ($check_result->num_rows > 0) {
                $check_stmt->close();
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Dish already exists',
                    'message' => 'A dish with this name already exists for this branch'
                ]);
                exit();
            }
            $check_stmt->close();
            
            // Insert new dish
            // NOTE: If your dishes table has kitchen_id column, include it. Otherwise, kitchen_id comes from category.
            // Check if kitchen_id column exists in dishes table
            $check_kitchen_col = "SHOW COLUMNS FROM dishes LIKE 'kitchen_id'";
            $col_check = $conn->query($check_kitchen_col);
            $has_kitchen_id_col = $col_check && $col_check->num_rows > 0;
            
            if ($has_kitchen_id_col) {
                // Dishes table has kitchen_id column - include it in INSERT
                $insert_sql = "INSERT INTO dishes 
                              (name, description, price, qnty, barcode, is_available, is_frequent, 
                               discount, category_id, kitchen_id, terminal, branch_id) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $insert_stmt = $conn->prepare($insert_sql);
                $is_frequent = isset($input['is_frequent']) ? intval($input['is_frequent']) : 1;
                $insert_stmt->bind_param("ssdssiiiisii", 
                    $name, $description, $price, $qnty, $barcode, 
                    $is_available, $is_frequent, $discount, $category_id, $kitchen_id, $terminal, $branch_id);
            } else {
                // Dishes table does NOT have kitchen_id column - omit it (will come from category)
                $insert_sql = "INSERT INTO dishes 
                              (name, description, price, qnty, barcode, is_available, is_frequent, 
                               discount, category_id, terminal, branch_id) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $insert_stmt = $conn->prepare($insert_sql);
                $is_frequent = isset($input['is_frequent']) ? intval($input['is_frequent']) : 1;
                $insert_stmt->bind_param("ssdssiiiisi", 
                    $name, $description, $price, $qnty, $barcode, 
                    $is_available, $is_frequent, $discount, $category_id, $terminal, $branch_id);
            }
            
            if ($insert_stmt->execute()) {
                $new_dish_id = $conn->insert_id;
                $insert_stmt->close();
                
                // Fetch the created dish with branch and category info
                $fetch_sql = "SELECT 
                                d.dish_id,
                                d.name,
                                d.description,
                                d.price,
                                d.qnty,
                                d.barcode,
                                d.is_available,
                                d.is_frequent,
                                d.discount,
                                d.category_id,
                                COALESCE(d.kitchen_id, c.kitchen_id) AS kitchen_id,
                                d.terminal,
                                d.branch_id,
                                c.name AS catname,
                                c.category_name,
                                b.name AS branch_name,
                                b.branch_name AS branch_name_alt,
                                k.title AS kitchen_name
                            FROM dishes d
                            LEFT JOIN categories c ON d.category_id = c.category_id AND d.branch_id = c.branch_id
                            LEFT JOIN branches b ON d.branch_id = b.branch_id
                            LEFT JOIN kitchens k ON COALESCE(d.kitchen_id, c.kitchen_id) = k.kitchen_id
                            WHERE d.dish_id = ?";
                $fetch_stmt = $conn->prepare($fetch_sql);
                $fetch_stmt->bind_param("i", $new_dish_id);
                $fetch_stmt->execute();
                $fetch_result = $fetch_stmt->get_result();
                $dish = $fetch_result->fetch_assoc();
                
                $branch_name = $dish['branch_name'] ?? $dish['branch_name_alt'] ?? null;
                if (!$branch_name && $dish['branch_id']) {
                    $branch_name = 'Branch ' . $dish['branch_id'];
                }
                
                $category_name = $dish['catname'] ?? $dish['category_name'] ?? null;
                
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'Menu item created successfully',
                    'data' => [
                        'dish_id' => intval($dish['dish_id']),
                        'name' => $dish['name'],
                        'description' => $dish['description'],
                        'price' => floatval($dish['price']),
                        'qnty' => $dish['qnty'],
                        'category_id' => $dish['category_id'] ? intval($dish['category_id']) : null,
                        'category_name' => $category_name,
                        'kitchen_id' => $dish['kitchen_id'] ? intval($dish['kitchen_id']) : null,
                        'branch_id' => intval($dish['branch_id']),
                        'branch_name' => $branch_name
                    ]
                ]);
                $fetch_stmt->close();
            } else {
                $insert_stmt->close();
                throw new Exception('Failed to create dish: ' . $conn->error);
            }
            
        } else {
            // UPDATE EXISTING DISH
            $dish_id = intval($dish_id);
            
            // Check if dish exists
            $check_sql = "SELECT dish_id, branch_id FROM dishes WHERE dish_id = ?";
            $check_stmt = $conn->prepare($check_sql);
            $check_stmt->bind_param("i", $dish_id);
            $check_stmt->execute();
            $check_result = $check_stmt->get_result();
            
            if ($check_result->num_rows === 0) {
                $check_stmt->close();
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Dish not found',
                    'message' => 'Dish with ID ' . $dish_id . ' does not exist'
                ]);
                exit();
            }
            
            $existing = $check_result->fetch_assoc();
            // Use existing branch_id if branch_id wasn't provided in update
            // This prevents branch-admin from changing branch_id of their dishes
            $update_branch_id = $branch_id ? $branch_id : intval($existing['branch_id']);
            $check_stmt->close();
            
            // Check if name already exists for another dish in the same branch
            $name_check_sql = "SELECT dish_id FROM dishes 
                              WHERE name = ? AND branch_id = ? AND terminal = ? AND dish_id != ?";
            $name_check_stmt = $conn->prepare($name_check_sql);
            $name_check_stmt->bind_param("siii", $name, $update_branch_id, $terminal, $dish_id);
            $name_check_stmt->execute();
            $name_check_result = $name_check_stmt->get_result();
            
            if ($name_check_result->num_rows > 0) {
                $name_check_stmt->close();
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Dish name already exists',
                    'message' => 'A dish with this name already exists for this branch'
                ]);
                exit();
            }
            $name_check_stmt->close();
            
            // Update dish
            // NOTE: If your dishes table has kitchen_id column, include it. Otherwise, kitchen_id comes from category.
            $check_kitchen_col = "SHOW COLUMNS FROM dishes LIKE 'kitchen_id'";
            $col_check = $conn->query($check_kitchen_col);
            $has_kitchen_id_col = $col_check && $col_check->num_rows > 0;
            
            if ($has_kitchen_id_col) {
                // Dishes table has kitchen_id column - include it in UPDATE
                $update_sql = "UPDATE dishes 
                              SET name = ?, 
                                  description = ?, 
                                  price = ?,
                                  qnty = ?,
                                  barcode = ?,
                                  is_available = ?,
                                  is_frequent = ?,
                                  discount = ?,
                                  category_id = ?,
                                  kitchen_id = ?,
                                  branch_id = ?
                              WHERE dish_id = ? AND terminal = ?";
                $is_frequent = isset($input['is_frequent']) ? intval($input['is_frequent']) : 1;
                $update_stmt = $conn->prepare($update_sql);
                $update_stmt->bind_param("ssdssiiiisiii", 
                    $name, $description, $price, $qnty, $barcode, 
                    $is_available, $is_frequent, $discount, $category_id, $kitchen_id, 
                    $update_branch_id, $dish_id, $terminal);
            } else {
                // Dishes table does NOT have kitchen_id column - omit it
                $update_sql = "UPDATE dishes 
                              SET name = ?, 
                                  description = ?, 
                                  price = ?,
                                  qnty = ?,
                                  barcode = ?,
                                  is_available = ?,
                                  is_frequent = ?,
                                  discount = ?,
                                  category_id = ?,
                                  branch_id = ?
                              WHERE dish_id = ? AND terminal = ?";
                $is_frequent = isset($input['is_frequent']) ? intval($input['is_frequent']) : 1;
                $update_stmt = $conn->prepare($update_sql);
                $update_stmt->bind_param("ssdssiiiiisii", 
                    $name, $description, $price, $qnty, $barcode, 
                    $is_available, $is_frequent, $discount, $category_id, 
                    $update_branch_id, $dish_id, $terminal);
            }
            
            if ($update_stmt->execute()) {
                $update_stmt->close();
                
                // Fetch updated dish with branch and category info
                $fetch_sql = "SELECT 
                                d.dish_id,
                                d.name,
                                d.description,
                                d.price,
                                d.qnty,
                                d.barcode,
                                d.is_available,
                                d.is_frequent,
                                d.discount,
                                d.category_id,
                                COALESCE(d.kitchen_id, c.kitchen_id) AS kitchen_id,
                                d.terminal,
                                d.branch_id,
                                c.name AS catname,
                                c.category_name,
                                b.name AS branch_name,
                                b.branch_name AS branch_name_alt,
                                k.title AS kitchen_name
                            FROM dishes d
                            LEFT JOIN categories c ON d.category_id = c.category_id AND d.branch_id = c.branch_id
                            LEFT JOIN branches b ON d.branch_id = b.branch_id
                            LEFT JOIN kitchens k ON COALESCE(d.kitchen_id, c.kitchen_id) = k.kitchen_id
                            WHERE d.dish_id = ?";
                $fetch_stmt = $conn->prepare($fetch_sql);
                $fetch_stmt->bind_param("i", $dish_id);
                $fetch_stmt->execute();
                $fetch_result = $fetch_stmt->get_result();
                $dish = $fetch_result->fetch_assoc();
                
                $branch_name = $dish['branch_name'] ?? $dish['branch_name_alt'] ?? null;
                if (!$branch_name && $dish['branch_id']) {
                    $branch_name = 'Branch ' . $dish['branch_id'];
                }
                
                $category_name = $dish['catname'] ?? $dish['category_name'] ?? null;
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Menu item updated successfully',
                    'data' => [
                        'dish_id' => intval($dish['dish_id']),
                        'name' => $dish['name'],
                        'description' => $dish['description'],
                        'price' => floatval($dish['price']),
                        'qnty' => $dish['qnty'],
                        'category_id' => $dish['category_id'] ? intval($dish['category_id']) : null,
                        'category_name' => $category_name,
                        'kitchen_id' => $dish['kitchen_id'] ? intval($dish['kitchen_id']) : null,
                        'branch_id' => intval($dish['branch_id']),
                        'branch_name' => $branch_name
                    ]
                ]);
                $fetch_stmt->close();
            } else {
                $update_stmt->close();
                throw new Exception('Failed to update dish: ' . $conn->error);
            }
        }
        
    } elseif ($method === 'DELETE') {
        // DELETE DISH
        $input = json_decode(file_get_contents('php://input'), true);
        $dish_id = isset($input['dish_id']) ? intval($input['dish_id']) : 0;
        
        if ($dish_id <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid dish_id',
                'message' => 'Dish ID is required'
            ]);
            exit();
        }
        
        // Check if dish exists
        $check_sql = "SELECT dish_id FROM dishes WHERE dish_id = ?";
        $check_stmt = $conn->prepare($check_sql);
        $check_stmt->bind_param("i", $dish_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        
        if ($check_result->num_rows === 0) {
            $check_stmt->close();
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Dish not found',
                'message' => 'Dish does not exist'
            ]);
            exit();
        }
        $check_stmt->close();
        
        // Delete dish
        $delete_sql = "DELETE FROM dishes WHERE dish_id = ?";
        $delete_stmt = $conn->prepare($delete_sql);
        $delete_stmt->bind_param("i", $dish_id);
        
        if ($delete_stmt->execute()) {
            $delete_stmt->close();
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Menu item deleted successfully'
            ]);
        } else {
            $delete_stmt->close();
            throw new Exception('Failed to delete dish: ' . $conn->error);
        }
        
    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Method not allowed',
            'message' => 'Only POST and DELETE methods are allowed'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error',
        'message' => $e->getMessage()
    ]);
}
?>
```

---

## 📊 Response Format Examples

### Success Response - Get Menu Items (Branch-Admin)

```json
{
    "success": true,
    "data": [
        {
            "dish_id": 1,
            "id": 1,
            "name": "Caesar Salad",
            "description": "Fresh romaine lettuce",
            "price": 12.99,
            "qnty": "1",
            "category_id": 5,
            "category_name": "Salads",
            "catname": "Salads",
            "is_available": 1,
            "is_frequent": 1,
            "discount": 0,
            "kitchen_id": 3,
            "kitchen_name": "Salad Kitchen",
            "terminal": 1,
            "branch_id": 2,
            "branch_name": "Downtown Branch"
        }
    ],
    "count": 1
}
```

### Success Response - Get Menu Items (Super-Admin - All Branches)

```json
{
    "success": true,
    "data": [
        {
            "dish_id": 1,
            "id": 1,
            "name": "Caesar Salad",
            "description": "Fresh romaine lettuce",
            "price": 12.99,
            "qnty": "1",
            "category_id": 5,
            "category_name": "Salads",
            "catname": "Salads",
            "is_available": 1,
            "is_frequent": 1,
            "discount": 0,
            "kitchen_id": 3,
            "kitchen_name": "Salad Kitchen",
            "terminal": 1,
            "branch_id": 2,
            "branch_name": "Downtown Branch"
        },
        {
            "dish_id": 2,
            "id": 2,
            "name": "Grilled Chicken",
            "description": "Tender grilled chicken breast",
            "price": 18.99,
            "qnty": "1",
            "category_id": 8,
            "category_name": "Main Course",
            "catname": "Main Course",
            "is_available": 1,
            "is_frequent": 1,
            "discount": 0,
            "kitchen_id": 4,
            "kitchen_name": "Grill Kitchen",
            "terminal": 1,
            "branch_id": 3,
            "branch_name": "Uptown Branch"
        }
    ],
    "count": 2
}
```

### Success Response - Create/Update Menu Item

```json
{
    "success": true,
    "message": "Menu item created successfully",
    "data": {
        "dish_id": 10,
        "name": "Chocolate Cake",
        "description": "Rich chocolate cake",
        "price": 8.99,
        "qnty": "1",
        "category_id": 12,
        "category_name": "Desserts",
        "kitchen_id": 5,
        "branch_id": 2,
        "branch_name": "Downtown Branch"
    }
}
```

### Error Response

```json
{
    "success": false,
    "error": "branch_id is required",
    "message": "Branch ID must be provided"
}
```

---

## 🔄 Frontend Implementation Status

✅ **Branch-Admin Menu Page** (`app/dashboard/branch-admin/menu/page.jsx`)
- Fetches only their branch's menu items
- Automatically includes `branch_id` when creating/updating
- Only shows categories from their branch

✅ **Super-Admin Menu Page** (`app/dashboard/super-admin/menu/page.jsx`)
- Fetches ALL menu items from ALL branches
- Displays `branch_id` and `branch_name` in table
- Can filter by branch
- Can add/edit menu items for any branch
- Shows branch info when adding menu items

---

## ✅ Testing Checklist

### Database
- [ ] `branch_id` column exists in `dishes` table
- [ ] `categories` table has `branch_id` column (from category scenario)
- [ ] `branches` table exists with `branch_id` and `name` columns
- [ ] Foreign key relationships are set up (optional)

### API Endpoints
- [ ] `get_products.php` returns branch-filtered results for branch-admin
- [ ] `get_products.php` returns all menu items with branch info for super-admin
- [ ] `dishes_management.php` creates menu items with correct `branch_id`
- [ ] `dishes_management.php` validates category belongs to same branch
- [ ] `dishes_management.php` updates menu items correctly
- [ ] `dishes_management.php` deletes menu items correctly

### Frontend
- [ ] Branch-admin sees only their menu items
- [ ] Branch-admin can create menu items (automatically gets their `branch_id`)
- [ ] Branch-admin can only select categories from their branch
- [ ] Super-admin sees all menu items with branch info
- [ ] Super-admin can filter by branch
- [ ] Super-admin can create menu items for any branch
- [ ] When branch-admin adds menu item, it appears in super-admin dashboard immediately

---

## 🚀 Deployment Steps

1. **Backup Database**
   ```sql
   BACKUP TABLE dishes TO '/path/to/backup/dishes_backup.sql';
   ```

2. **Add `branch_id` Column to Dishes Table**
   ```sql
   ALTER TABLE dishes 
   ADD COLUMN branch_id INT(11) NULL AFTER dish_id,
   ADD INDEX idx_branch_id (branch_id);
   ```

3. **Update Existing Data** (if needed)
   ```sql
   UPDATE dishes SET branch_id = 1 WHERE branch_id IS NULL;
   ```

4. **Deploy PHP Files**
   - Upload updated `get_products.php`
   - Upload updated `dishes_management.php`

5. **Test Endpoints**
   - Test branch-admin menu fetch
   - Test super-admin menu fetch
   - Test menu item creation from both roles
   - Verify branch information appears correctly
   - Verify category validation works

---

## 📝 Important Notes

- The `branch_id` is **REQUIRED** when creating/updating menu items
- Menu items must reference categories from the **same branch**
- Branch-admin cannot change `branch_id` of existing menu items (uses existing value)
- Super-admin can specify `branch_id` for any branch
- The API automatically validates that category belongs to the same branch as the dish
- The API joins with `branches` table to fetch `branch_name`
- If `branch_name` is not found, it defaults to `"Branch {branch_id}"`

---

## 🔗 Related Documentation

- See `CATEGORY_BRANCH_SCENARIO.md` for category management implementation
- Both categories and menu items use the same `branch_id` concept
- Ensure categories are set up first before adding menu items

---

## 🆘 Troubleshooting

### Menu Items Not Showing
1. Check if `branch_id` is being sent correctly in API request
2. Verify `branch_id` exists in `branches` table
3. Check database connection in PHP files
4. Verify SQL query syntax

### Branch Name Not Showing
1. Check if `branches` table has `name` or `branch_name` column
2. Verify JOIN in SQL query is correct
3. Check if branch actually exists for the given `branch_id`

### Menu Item Creation Fails
1. Verify `branch_id` is provided and is valid
2. Check if menu item name already exists for that branch
3. Verify `category_id` exists and belongs to the same branch
4. Check database constraints and foreign keys

### Category Validation Error
1. Ensure category has `branch_id` set
2. Verify category exists for the specified branch
3. Check that category and dish have matching `branch_id` values

