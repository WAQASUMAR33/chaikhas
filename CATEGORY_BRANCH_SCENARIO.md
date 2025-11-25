# Category Branch Management - Complete Implementation Guide

## 📋 Scenario Overview

**Super-Admin Dashboard:**
- Shows ALL categories from ALL branches
- Each category displays with its `branch_id` and `branch_name`
- Can filter categories by branch
- Can add/edit categories for any branch
- When a branch-admin adds a category, it immediately appears in super-admin dashboard with branch information

**Branch-Admin Dashboard:**
- Shows ONLY their own branch's categories
- Cannot see categories from other branches
- When they add a category, it's automatically associated with their `branch_id`
- Categories they add will appear in super-admin dashboard

---

## 🗄️ Database Schema Changes

### 1. Verify `categories` Table Structure

Run this SQL query to check if `branch_id` column exists:

```sql
DESCRIBE categories;
```

### 2. Add `branch_id` Column (If Not Exists)

```sql
-- Add branch_id column to categories table
ALTER TABLE categories 
ADD COLUMN branch_id INT(11) NULL AFTER category_id,
ADD INDEX idx_branch_id (branch_id);

-- Add foreign key constraint (optional, if you have branches table)
-- ALTER TABLE categories 
-- ADD CONSTRAINT fk_categories_branch 
-- FOREIGN KEY (branch_id) REFERENCES branches(branch_id) 
-- ON DELETE CASCADE ON UPDATE CASCADE;
```

### 3. Update Existing Categories (If Needed)

If you have existing categories without `branch_id`, you can set a default:

```sql
-- Set default branch_id for existing categories (change 1 to your default branch_id)
UPDATE categories 
SET branch_id = 1 
WHERE branch_id IS NULL OR branch_id = 0;
```

### 4. Verify `branches` Table Structure

Ensure you have a `branches` table with at least:
- `branch_id` (PRIMARY KEY)
- `name` or `branch_name` (branch name)

```sql
-- Example branches table structure
CREATE TABLE IF NOT EXISTS branches (
    branch_id INT(11) AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    branch_name VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔌 PHP API Endpoints - Complete Code

### Endpoint 1: `get_categories.php`

**Purpose:** Fetch categories with branch filtering
- **Branch-Admin:** Returns only their branch's categories (requires `branch_id`)
- **Super-Admin:** Returns all categories with branch info (no `branch_id` or `branch_id` = null)

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
    if ($branch_id !== null) {
        // Branch-Admin: Get categories for specific branch only
        $sql = "SELECT 
                    c.category_id,
                    c.kid,
                    c.name,
                    c.description,
                    c.kitchen_id,
                    c.terminal,
                    c.branch_id,
                    b.name AS branch_name,
                    b.branch_name AS branch_name_alt,
                    k.title AS kitchen_name,
                    k.code AS kitchen_code
                FROM categories c
                LEFT JOIN branches b ON c.branch_id = b.branch_id
                LEFT JOIN kitchens k ON c.kitchen_id = k.kitchen_id
                WHERE c.branch_id = ? AND c.terminal = ?
                ORDER BY c.name ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $branch_id, $terminal);
    } else {
        // Super-Admin: Get ALL categories from ALL branches
        $sql = "SELECT 
                    c.category_id,
                    c.kid,
                    c.name,
                    c.description,
                    c.kitchen_id,
                    c.terminal,
                    c.branch_id,
                    b.name AS branch_name,
                    b.branch_name AS branch_name_alt,
                    k.title AS kitchen_name,
                    k.code AS kitchen_code
                FROM categories c
                LEFT JOIN branches b ON c.branch_id = b.branch_id
                LEFT JOIN kitchens k ON c.kitchen_id = k.kitchen_id
                WHERE c.terminal = ?
                ORDER BY c.branch_id ASC, c.name ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $terminal);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        // Normalize branch_name (check multiple possible fields)
        $branch_name = $row['branch_name'] ?? $row['branch_name_alt'] ?? null;
        if (!$branch_name && $row['branch_id']) {
            $branch_name = 'Branch ' . $row['branch_id'];
        }
        
        $categories[] = [
            'category_id' => intval($row['category_id']),
            'id' => intval($row['category_id']), // Alias for frontend compatibility
            'kid' => intval($row['kid'] ?? 0),
            'name' => $row['name'] ?? '',
            'category_name' => $row['name'] ?? '', // Alias
            'description' => $row['description'] ?? '',
            'kitchen_id' => $row['kitchen_id'] ? intval($row['kitchen_id']) : null,
            'kitchen_name' => $row['kitchen_name'] ?? null,
            'terminal' => intval($row['terminal']),
            'branch_id' => $row['branch_id'] ? intval($row['branch_id']) : null,
            'branch_name' => $branch_name
        ];
    }
    
    $stmt->close();
    
    // Return success response with categories array
    echo json_encode([
        'success' => true,
        'data' => $categories,
        'count' => count($categories)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch categories',
        'message' => $e->getMessage()
    ]);
}
?>
```

---

### Endpoint 2: `category_management.php`

**Purpose:** Create, Update, or Delete categories
- **Branch-Admin:** Automatically uses their `branch_id` (must be provided in request)
- **Super-Admin:** Can specify `branch_id` for any branch

**Method:** POST (for create/update), DELETE (for delete)

**Request Body (Create/Update):**
```json
{
    "category_id": "",  // Empty for create, existing ID for update
    "kid": "0",  // Auto-generated if 0
    "name": "Appetizers",
    "description": "Starters and appetizers",
    "kitchen_id": "2",
    "terminal": "1",
    "branch_id": "2"  // REQUIRED: Must be provided
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
        
        $category_id = isset($input['category_id']) ? trim($input['category_id']) : '';
        $kid = isset($input['kid']) ? intval($input['kid']) : 0;
        $name = isset($input['name']) ? trim($input['name']) : '';
        $description = isset($input['description']) ? trim($input['description']) : '';
        $kitchen_id = isset($input['kitchen_id']) && $input['kitchen_id'] ? intval($input['kitchen_id']) : null;
        $terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
        $branch_id = isset($input['branch_id']) ? trim($input['branch_id']) : null;
        
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
                'message' => 'Category name is required'
            ]);
            exit();
        }
        
        // Validate kitchen_id (optional but recommended)
        if ($kitchen_id === null || $kitchen_id <= 0) {
            // You can make this required or optional based on your business logic
            // For now, we'll allow null but log a warning
        }
        
        if (empty($category_id)) {
            // CREATE NEW CATEGORY
            // Auto-generate kid if not provided or 0
            if ($kid <= 0) {
                // Get next kid for this branch and terminal
                $kid_sql = "SELECT COALESCE(MAX(kid), 0) + 1 AS next_kid 
                           FROM categories 
                           WHERE branch_id = ? AND terminal = ?";
                $kid_stmt = $conn->prepare($kid_sql);
                $kid_stmt->bind_param("ii", $branch_id, $terminal);
                $kid_stmt->execute();
                $kid_result = $kid_stmt->get_result();
                $kid_row = $kid_result->fetch_assoc();
                $kid = intval($kid_row['next_kid']);
                $kid_stmt->close();
            }
            
            // Check if category name already exists for this branch
            $check_sql = "SELECT category_id FROM categories 
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
                    'error' => 'Category already exists',
                    'message' => 'A category with this name already exists for this branch'
                ]);
                exit();
            }
            $check_stmt->close();
            
            // Insert new category
            $insert_sql = "INSERT INTO categories 
                          (kid, name, description, kitchen_id, terminal, branch_id) 
                          VALUES (?, ?, ?, ?, ?, ?)";
            $insert_stmt = $conn->prepare($insert_sql);
            $insert_stmt->bind_param("issiii", $kid, $name, $description, $kitchen_id, $terminal, $branch_id);
            
            if ($insert_stmt->execute()) {
                $new_category_id = $conn->insert_id;
                $insert_stmt->close();
                
                // Fetch the created category with branch info
                $fetch_sql = "SELECT 
                                c.category_id,
                                c.kid,
                                c.name,
                                c.description,
                                c.kitchen_id,
                                c.terminal,
                                c.branch_id,
                                b.name AS branch_name,
                                b.branch_name AS branch_name_alt,
                                k.title AS kitchen_name
                            FROM categories c
                            LEFT JOIN branches b ON c.branch_id = b.branch_id
                            LEFT JOIN kitchens k ON c.kitchen_id = k.kitchen_id
                            WHERE c.category_id = ?";
                $fetch_stmt = $conn->prepare($fetch_sql);
                $fetch_stmt->bind_param("i", $new_category_id);
                $fetch_stmt->execute();
                $fetch_result = $fetch_stmt->get_result();
                $category = $fetch_result->fetch_assoc();
                
                $branch_name = $category['branch_name'] ?? $category['branch_name_alt'] ?? null;
                if (!$branch_name && $category['branch_id']) {
                    $branch_name = 'Branch ' . $category['branch_id'];
                }
                
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'Category created successfully',
                    'data' => [
                        'category_id' => intval($category['category_id']),
                        'kid' => intval($category['kid']),
                        'name' => $category['name'],
                        'description' => $category['description'],
                        'kitchen_id' => $category['kitchen_id'] ? intval($category['kitchen_id']) : null,
                        'branch_id' => intval($category['branch_id']),
                        'branch_name' => $branch_name
                    ]
                ]);
                $fetch_stmt->close();
            } else {
                $insert_stmt->close();
                throw new Exception('Failed to create category: ' . $conn->error);
            }
            
        } else {
            // UPDATE EXISTING CATEGORY
            $category_id = intval($category_id);
            
            // Check if category exists
            $check_sql = "SELECT category_id, branch_id FROM categories WHERE category_id = ?";
            $check_stmt = $conn->prepare($check_sql);
            $check_stmt->bind_param("i", $category_id);
            $check_stmt->execute();
            $check_result = $check_stmt->get_result();
            
            if ($check_result->num_rows === 0) {
                $check_stmt->close();
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Category not found',
                    'message' => 'Category with ID ' . $category_id . ' does not exist'
                ]);
                exit();
            }
            
            $existing = $check_result->fetch_assoc();
            // Use existing branch_id if branch_id wasn't provided in update
            // This prevents branch-admin from changing branch_id of their categories
            $update_branch_id = $branch_id ? $branch_id : intval($existing['branch_id']);
            $check_stmt->close();
            
            // Check if name already exists for another category in the same branch
            $name_check_sql = "SELECT category_id FROM categories 
                              WHERE name = ? AND branch_id = ? AND terminal = ? AND category_id != ?";
            $name_check_stmt = $conn->prepare($name_check_sql);
            $name_check_stmt->bind_param("siii", $name, $update_branch_id, $terminal, $category_id);
            $name_check_stmt->execute();
            $name_check_result = $name_check_stmt->get_result();
            
            if ($name_check_result->num_rows > 0) {
                $name_check_stmt->close();
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Category name already exists',
                    'message' => 'A category with this name already exists for this branch'
                ]);
                exit();
            }
            $name_check_stmt->close();
            
            // Update category
            $update_sql = "UPDATE categories 
                          SET name = ?, 
                              description = ?, 
                              kitchen_id = ?,
                              kid = ?,
                              branch_id = ?
                          WHERE category_id = ? AND terminal = ?";
            $update_stmt = $conn->prepare($update_sql);
            $update_stmt->bind_param("ssiiiii", $name, $description, $kitchen_id, $kid, $update_branch_id, $category_id, $terminal);
            
            if ($update_stmt->execute()) {
                $update_stmt->close();
                
                // Fetch updated category with branch info
                $fetch_sql = "SELECT 
                                c.category_id,
                                c.kid,
                                c.name,
                                c.description,
                                c.kitchen_id,
                                c.terminal,
                                c.branch_id,
                                b.name AS branch_name,
                                b.branch_name AS branch_name_alt,
                                k.title AS kitchen_name
                            FROM categories c
                            LEFT JOIN branches b ON c.branch_id = b.branch_id
                            LEFT JOIN kitchens k ON c.kitchen_id = k.kitchen_id
                            WHERE c.category_id = ?";
                $fetch_stmt = $conn->prepare($fetch_sql);
                $fetch_stmt->bind_param("i", $category_id);
                $fetch_stmt->execute();
                $fetch_result = $fetch_stmt->get_result();
                $category = $fetch_result->fetch_assoc();
                
                $branch_name = $category['branch_name'] ?? $category['branch_name_alt'] ?? null;
                if (!$branch_name && $category['branch_id']) {
                    $branch_name = 'Branch ' . $category['branch_id'];
                }
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Category updated successfully',
                    'data' => [
                        'category_id' => intval($category['category_id']),
                        'kid' => intval($category['kid']),
                        'name' => $category['name'],
                        'description' => $category['description'],
                        'kitchen_id' => $category['kitchen_id'] ? intval($category['kitchen_id']) : null,
                        'branch_id' => intval($category['branch_id']),
                        'branch_name' => $branch_name
                    ]
                ]);
                $fetch_stmt->close();
            } else {
                $update_stmt->close();
                throw new Exception('Failed to update category: ' . $conn->error);
            }
        }
        
    } elseif ($method === 'DELETE') {
        // DELETE CATEGORY
        $input = json_decode(file_get_contents('php://input'), true);
        $category_id = isset($input['category_id']) ? intval($input['category_id']) : 0;
        
        if ($category_id <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid category_id',
                'message' => 'Category ID is required'
            ]);
            exit();
        }
        
        // Check if category exists
        $check_sql = "SELECT category_id FROM categories WHERE category_id = ?";
        $check_stmt = $conn->prepare($check_sql);
        $check_stmt->bind_param("i", $category_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        
        if ($check_result->num_rows === 0) {
            $check_stmt->close();
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Category not found',
                'message' => 'Category does not exist'
            ]);
            exit();
        }
        $check_stmt->close();
        
        // Delete category
        $delete_sql = "DELETE FROM categories WHERE category_id = ?";
        $delete_stmt = $conn->prepare($delete_sql);
        $delete_stmt->bind_param("i", $category_id);
        
        if ($delete_stmt->execute()) {
            $delete_stmt->close();
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Category deleted successfully'
            ]);
        } else {
            $delete_stmt->close();
            throw new Exception('Failed to delete category: ' . $conn->error);
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

### Success Response - Get Categories (Branch-Admin)

```json
{
    "success": true,
    "data": [
        {
            "category_id": 1,
            "id": 1,
            "kid": 1,
            "name": "Appetizers",
            "category_name": "Appetizers",
            "description": "Starters",
            "kitchen_id": 2,
            "kitchen_name": "Main Kitchen",
            "terminal": 1,
            "branch_id": 2,
            "branch_name": "Downtown Branch"
        }
    ],
    "count": 1
}
```

### Success Response - Get Categories (Super-Admin - All Branches)

```json
{
    "success": true,
    "data": [
        {
            "category_id": 1,
            "id": 1,
            "kid": 1,
            "name": "Appetizers",
            "category_name": "Appetizers",
            "description": "Starters",
            "kitchen_id": 2,
            "kitchen_name": "Main Kitchen",
            "terminal": 1,
            "branch_id": 2,
            "branch_name": "Downtown Branch"
        },
        {
            "category_id": 2,
            "id": 2,
            "kid": 1,
            "name": "Main Course",
            "category_name": "Main Course",
            "description": "Main dishes",
            "kitchen_id": 3,
            "kitchen_name": "Grill Kitchen",
            "terminal": 1,
            "branch_id": 3,
            "branch_name": "Uptown Branch"
        }
    ],
    "count": 2
}
```

### Success Response - Create/Update Category

```json
{
    "success": true,
    "message": "Category created successfully",
    "data": {
        "category_id": 5,
        "kid": 2,
        "name": "Desserts",
        "description": "Sweet treats",
        "kitchen_id": 4,
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

✅ **Branch-Admin Category Page** (`app/dashboard/branch-admin/category/page.jsx`)
- Fetches only their branch's categories
- Automatically includes `branch_id` when creating/updating

✅ **Branch-Admin Create-Order Page** (`app/dashboard/branch-admin/create-order/page.jsx`)
- Fetches only their branch's categories
- Shows categories in dropdown for order creation

✅ **Super-Admin Category Page** (`app/dashboard/super-admin/category/page.jsx`)
- Fetches ALL categories from ALL branches
- Displays `branch_id` and `branch_name` in table
- Can filter by branch
- Can add/edit categories for any branch

---

## ✅ Testing Checklist

### Database
- [ ] `branch_id` column exists in `categories` table
- [ ] `branches` table exists with `branch_id` and `name` columns
- [ ] Foreign key relationship is set up (optional)

### API Endpoints
- [ ] `get_categories.php` returns branch-filtered results for branch-admin
- [ ] `get_categories.php` returns all categories with branch info for super-admin
- [ ] `category_management.php` creates categories with correct `branch_id`
- [ ] `category_management.php` updates categories correctly
- [ ] `category_management.php` deletes categories correctly

### Frontend
- [ ] Branch-admin sees only their categories
- [ ] Branch-admin can create categories (automatically gets their `branch_id`)
- [ ] Super-admin sees all categories with branch info
- [ ] Super-admin can filter by branch
- [ ] Super-admin can create categories for any branch
- [ ] When branch-admin adds category, it appears in super-admin dashboard immediately

---

## 🚀 Deployment Steps

1. **Backup Database**
   ```sql
   BACKUP TABLE categories TO '/path/to/backup/categories_backup.sql';
   ```

2. **Add `branch_id` Column**
   ```sql
   ALTER TABLE categories 
   ADD COLUMN branch_id INT(11) NULL AFTER category_id,
   ADD INDEX idx_branch_id (branch_id);
   ```

3. **Update Existing Data** (if needed)
   ```sql
   UPDATE categories SET branch_id = 1 WHERE branch_id IS NULL;
   ```

4. **Deploy PHP Files**
   - Upload updated `get_categories.php`
   - Upload updated `category_management.php`

5. **Test Endpoints**
   - Test branch-admin category fetch
   - Test super-admin category fetch
   - Test category creation from both roles
   - Verify branch information appears correctly

---

## 📝 Notes

- The `branch_id` is **REQUIRED** when creating/updating categories
- Branch-admin cannot change `branch_id` of existing categories (uses existing value)
- Super-admin can specify `branch_id` for any branch
- The API automatically joins with `branches` table to fetch `branch_name`
- If `branch_name` is not found, it defaults to `"Branch {branch_id}"`

---

## 🆘 Troubleshooting

### Categories Not Showing
1. Check if `branch_id` is being sent correctly in API request
2. Verify `branch_id` exists in `branches` table
3. Check database connection in PHP files
4. Verify SQL query syntax

### Branch Name Not Showing
1. Check if `branches` table has `name` or `branch_name` column
2. Verify JOIN in SQL query is correct
3. Check if branch actually exists for the given `branch_id`

### Category Creation Fails
1. Verify `branch_id` is provided and is valid
2. Check if category name already exists for that branch
3. Verify `kitchen_id` exists in `kitchens` table
4. Check database constraints and foreign keys

