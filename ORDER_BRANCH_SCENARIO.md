# Order Branch Management - Complete Implementation Guide

## 📋 Scenario Overview

**Super-Admin Dashboard:**
- Shows ALL orders from ALL branches
- Each order displays with its `branch_id` and `branch_name`
- Can filter orders by branch
- Can view and manage orders from any branch
- When a branch-admin creates an order, it immediately appears in super-admin dashboard with branch information

**Branch-Admin Dashboard:**
- Shows ONLY their own branch's orders
- Cannot see orders from other branches
- When they create an order, it's automatically associated with their `branch_id`
- Orders they create will appear in super-admin dashboard

---

## 🗄️ Database Schema Changes

### 1. Verify `orders` Table Structure

Run this SQL query to check if `branch_id` column exists:

```sql
DESCRIBE orders;
-- OR (check your actual table name)
SHOW TABLES LIKE '%order%';
```

### 2. Add `branch_id` Column to Orders Table (If Not Exists)

```sql
-- Add branch_id column to orders table
ALTER TABLE orders 
ADD COLUMN branch_id INT(11) NULL AFTER order_id,
ADD INDEX idx_branch_id (branch_id);

-- Add foreign key constraint (optional, if you have branches table)
-- ALTER TABLE orders 
-- ADD CONSTRAINT fk_orders_branch 
-- FOREIGN KEY (branch_id) REFERENCES branches(branch_id) 
-- ON DELETE CASCADE ON UPDATE CASCADE;
```

### 3. Update Existing Orders (If Needed)

If you have existing orders without `branch_id`, you can set a default:

```sql
-- Set default branch_id for existing orders (change 1 to your default branch_id)
UPDATE orders 
SET branch_id = 1 
WHERE branch_id IS NULL OR branch_id = 0;
```

### 4. Verify Table Relationships

Ensure your `orders` table structure includes:
- `order_id` (PRIMARY KEY)
- `branch_id` (references branches table)
- `table_id` (for Dine In orders)
- `order_type` (Dine In, Take Away, Delivery)
- `order_status` (Pending, Running, Complete, etc.)

```sql
-- Check orders table structure
DESCRIBE orders;

-- Verify branches table exists
DESCRIBE branches;
```

---

## 🔌 PHP API Endpoints - Complete Code

### Endpoint 1: `getOrders.php`

**Purpose:** Fetch orders with branch filtering
- **Branch-Admin:** Returns only their branch's orders (requires `branch_id`)
- **Super-Admin:** Returns all orders with branch info (no `branch_id` or `branch_id` = null)

**Method:** POST

**Request Body:**
```json
{
    "terminal": "1",
    "branch_id": "2",  // Optional: If provided, filter by branch. If null/empty, return all
    "status": "Running"  // Optional: Filter by status
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
    $status = isset($input['status']) ? trim($input['status']) : null;
    
    // Convert branch_id to integer or null
    if ($branch_id === '' || $branch_id === 'null' || $branch_id === 'undefined' || $branch_id === null) {
        $branch_id = null;
    } else {
        $branch_id = intval($branch_id);
        if ($branch_id <= 0) {
            $branch_id = null;
        }
    }
    
    // Build SQL query based on branch_id and status
    if ($branch_id !== null) {
        // Branch-Admin: Get orders for specific branch only
        $sql = "SELECT 
                    o.order_id,
                    o.orderid,
                    o.order_number,
                    o.order_type,
                    o.order_status,
                    o.status,
                    o.table_id,
                    o.tableid,
                    o.hall_id,
                    o.hall_name,
                    o.shopname,
                    o.customer_name,
                    o.customer,
                    o.g_total_amount,
                    o.grand_total_amount,
                    o.total_amount,
                    o.total,
                    o.subtotal,
                    o.net_total_amount,
                    o.netTotal,
                    o.net_total,
                    o.final_amount,
                    o.discount_amount,
                    o.discount,
                    o.service_charge,
                    o.payment_mode,
                    o.order_taker_id,
                    o.created_at,
                    o.date,
                    o.terminal,
                    o.branch_id,
                    t.table_number,
                    t.table_name,
                    b.name AS branch_name,
                    b.branch_name AS branch_name_alt
                FROM orders o
                LEFT JOIN tables t ON o.table_id = t.table_id AND o.branch_id = t.branch_id
                LEFT JOIN branches b ON o.branch_id = b.branch_id
                WHERE o.branch_id = ? AND o.terminal = ?";
        
        $params = [$branch_id, $terminal];
        $types = "ii";
        
        // Add status filter if provided
        if ($status && $status !== 'all') {
            $sql .= " AND (o.order_status = ? OR o.status = ?)";
            $params[] = $status;
            $params[] = $status;
            $types .= "ss";
        }
        
        $sql .= " ORDER BY o.created_at DESC, o.order_id DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
    } else {
        // Super-Admin: Get ALL orders from ALL branches
        $sql = "SELECT 
                    o.order_id,
                    o.orderid,
                    o.order_number,
                    o.order_type,
                    o.order_status,
                    o.status,
                    o.table_id,
                    o.tableid,
                    o.hall_id,
                    o.hall_name,
                    o.shopname,
                    o.customer_name,
                    o.customer,
                    o.g_total_amount,
                    o.grand_total_amount,
                    o.total_amount,
                    o.total,
                    o.subtotal,
                    o.net_total_amount,
                    o.netTotal,
                    o.net_total,
                    o.final_amount,
                    o.discount_amount,
                    o.discount,
                    o.service_charge,
                    o.payment_mode,
                    o.order_taker_id,
                    o.created_at,
                    o.date,
                    o.terminal,
                    o.branch_id,
                    t.table_number,
                    t.table_name,
                    b.name AS branch_name,
                    b.branch_name AS branch_name_alt
                FROM orders o
                LEFT JOIN tables t ON o.table_id = t.table_id AND o.branch_id = t.branch_id
                LEFT JOIN branches b ON o.branch_id = b.branch_id
                WHERE o.terminal = ?";
        
        $params = [$terminal];
        $types = "i";
        
        // Add status filter if provided
        if ($status && $status !== 'all') {
            $sql .= " AND (o.order_status = ? OR o.status = ?)";
            $params[] = $status;
            $params[] = $status;
            $types .= "ss";
        }
        
        $sql .= " ORDER BY o.branch_id ASC, o.created_at DESC, o.order_id DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $orders = [];
    while ($row = $result->fetch_assoc()) {
        // Normalize branch_name (check multiple possible fields)
        $branch_name = $row['branch_name'] ?? $row['branch_name_alt'] ?? null;
        if (!$branch_name && $row['branch_id']) {
            $branch_name = 'Branch ' . $row['branch_id'];
        }
        
        // Normalize order status
        $order_status = $row['order_status'] ?? $row['status'] ?? 'Pending';
        
        // Normalize order_number
        $order_number = $row['order_number'] ?? ($row['order_id'] ? 'ORD-' . $row['order_id'] : null) ?? $row['orderid'] ?? '';
        
        $orders[] = [
            'order_id' => intval($row['order_id']),
            'id' => intval($row['order_id']), // Alias for frontend compatibility
            'orderid' => $order_number,
            'order_number' => $order_number,
            'order_type' => $row['order_type'] ?? 'Dine In',
            'order_status' => $order_status,
            'status' => strtolower($order_status),
            'table_id' => $row['table_id'] ? intval($row['table_id']) : null,
            'tableid' => $row['tableid'] ?? $row['table_id'],
            'table_number' => $row['table_number'] ?? $row['table_name'] ?? null,
            'hall_id' => $row['hall_id'] ?? null,
            'hall_name' => $row['hall_name'] ?? null,
            'shopname' => $row['shopname'] ?? null,
            'customer_name' => $row['customer_name'] ?? $row['customer'] ?? null,
            'g_total_amount' => floatval($row['g_total_amount'] ?? $row['grand_total_amount'] ?? $row['total_amount'] ?? $row['total'] ?? $row['subtotal'] ?? 0),
            'total' => floatval($row['total'] ?? $row['g_total_amount'] ?? $row['grand_total_amount'] ?? $row['total_amount'] ?? $row['subtotal'] ?? 0),
            'subtotal' => floatval($row['subtotal'] ?? $row['total'] ?? 0),
            'net_total_amount' => floatval($row['net_total_amount'] ?? $row['netTotal'] ?? $row['net_total'] ?? $row['final_amount'] ?? 0),
            'netTotal' => floatval($row['netTotal'] ?? $row['net_total_amount'] ?? $row['net_total'] ?? $row['final_amount'] ?? 0),
            'discount_amount' => floatval($row['discount_amount'] ?? $row['discount'] ?? 0),
            'discount' => floatval($row['discount'] ?? $row['discount_amount'] ?? 0),
            'service_charge' => floatval($row['service_charge'] ?? 0),
            'payment_mode' => $row['payment_mode'] ?? 'Cash',
            'order_taker_id' => $row['order_taker_id'] ? intval($row['order_taker_id']) : null,
            'created_at' => $row['created_at'] ?? $row['date'] ?? null,
            'date' => $row['date'] ?? $row['created_at'] ?? null,
            'terminal' => intval($row['terminal']),
            'branch_id' => $row['branch_id'] ? intval($row['branch_id']) : null,
            'branch_name' => $branch_name
        ];
    }
    
    $stmt->close();
    
    // Return success response with orders array
    echo json_encode([
        'success' => true,
        'data' => $orders,
        'count' => count($orders)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch orders',
        'message' => $e->getMessage()
    ]);
}
?>
```

---

### Endpoint 2: `create_order.php` (or `create_order_with_kitchen.php`)

**Purpose:** Create new orders
- **Branch-Admin:** Automatically uses their `branch_id` (must be provided in request)
- **Super-Admin:** Can specify `branch_id` for any branch

**Method:** POST

**Request Body:**
```json
{
    "order_type": "Dine In",
    "table_id": "5",
    "hall_id": "1",
    "customer_name": "John Doe",
    "order_status": "Running",
    "items": [
        {
            "dish_id": 10,
            "price": 12.99,
            "quantity": 2
        }
    ],
    "branch_id": "2",  // REQUIRED: Must be provided
    "terminal": "1",
    "order_taker_id": "1"
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
    
    $order_type = isset($input['order_type']) ? trim($input['order_type']) : 'Dine In';
    $table_id = isset($input['table_id']) && $input['table_id'] ? intval($input['table_id']) : null;
    $hall_id = isset($input['hall_id']) && $input['hall_id'] ? intval($input['hall_id']) : null;
    $customer_name = isset($input['customer_name']) ? trim($input['customer_name']) : '';
    $order_status = isset($input['order_status']) ? trim($input['order_status']) : 'Running';
    $terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;
    $branch_id = isset($input['branch_id']) ? trim($input['branch_id']) : null;
    $order_taker_id = isset($input['order_taker_id']) ? intval($input['order_taker_id']) : 1;
    $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : [];
    
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
    if (empty($items) || count($items) === 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'items are required',
            'message' => 'Order must contain at least one item'
        ]);
        exit();
    }
    
    // Validate order_type
    $valid_order_types = ['Dine In', 'Take Away', 'Delivery'];
    if (!in_array($order_type, $valid_order_types)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid order_type',
            'message' => 'Order type must be one of: ' . implode(', ', $valid_order_types)
        ]);
        exit();
    }
    
    // Validate Dine In orders have table_id
    if ($order_type === 'Dine In' && !$table_id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'table_id is required for Dine In orders',
            'message' => 'Table ID must be provided for Dine In orders'
        ]);
        exit();
    }
    
    // Calculate order total from items
    $subtotal = 0;
    foreach ($items as $item) {
        $price = floatval($item['price'] ?? 0);
        $quantity = intval($item['quantity'] ?? 0);
        $subtotal += $price * $quantity;
    }
    
    // Generate order number
    $order_number = 'ORD-' . time() . '-' . rand(1000, 9999);
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Insert order
        $insert_order_sql = "INSERT INTO orders 
                            (orderid, order_number, order_type, order_status, status, 
                             table_id, hall_id, customer_name, 
                             g_total_amount, total, subtotal,
                             discount_amount, service_charge, payment_mode,
                             order_taker_id, terminal, branch_id, created_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $insert_order_stmt = $conn->prepare($insert_order_sql);
        $insert_order_stmt->bind_param("sssssiisdddddsiii", 
            $order_number, $order_number, $order_type, $order_status, $order_status,
            $table_id, $hall_id, $customer_name,
            $subtotal, $subtotal, $subtotal,
            0, 0, 'Cash',
            $order_taker_id, $terminal, $branch_id
        );
        
        if (!$insert_order_stmt->execute()) {
            throw new Exception('Failed to create order: ' . $conn->error);
        }
        
        $order_id = $conn->insert_id;
        $insert_order_stmt->close();
        
        // Insert order items
        $insert_item_sql = "INSERT INTO order_items 
                           (order_id, dish_id, price, quantity, total_amount, branch_id) 
                           VALUES (?, ?, ?, ?, ?, ?)";
        $insert_item_stmt = $conn->prepare($insert_item_sql);
        
        foreach ($items as $item) {
            $dish_id = intval($item['dish_id'] ?? 0);
            $price = floatval($item['price'] ?? 0);
            $quantity = intval($item['quantity'] ?? 0);
            $total_amount = $price * $quantity;
            
            if ($dish_id <= 0 || $quantity <= 0) {
                continue; // Skip invalid items
            }
            
            $insert_item_stmt->bind_param("iididi", $order_id, $dish_id, $price, $quantity, $total_amount, $branch_id);
            if (!$insert_item_stmt->execute()) {
                throw new Exception('Failed to create order item: ' . $conn->error);
            }
        }
        
        $insert_item_stmt->close();
        
        // Update table status if Dine In order
        if ($order_type === 'Dine In' && $table_id) {
            $update_table_sql = "UPDATE tables 
                                SET status = 'Occupied' 
                                WHERE table_id = ? AND branch_id = ? AND terminal = ?";
            $update_table_stmt = $conn->prepare($update_table_sql);
            $update_table_stmt->bind_param("iii", $table_id, $branch_id, $terminal);
            $update_table_stmt->execute();
            $update_table_stmt->close();
        }
        
        // Commit transaction
        $conn->commit();
        
        // Fetch the created order with branch info
        $fetch_order_sql = "SELECT 
                                o.*,
                                t.table_number,
                                b.name AS branch_name,
                                b.branch_name AS branch_name_alt
                            FROM orders o
                            LEFT JOIN tables t ON o.table_id = t.table_id AND o.branch_id = t.branch_id
                            LEFT JOIN branches b ON o.branch_id = b.branch_id
                            WHERE o.order_id = ?";
        $fetch_order_stmt = $conn->prepare($fetch_order_sql);
        $fetch_order_stmt->bind_param("i", $order_id);
        $fetch_order_stmt->execute();
        $fetch_result = $fetch_order_stmt->get_result();
        $order = $fetch_result->fetch_assoc();
        
        $branch_name = $order['branch_name'] ?? $order['branch_name_alt'] ?? null;
        if (!$branch_name && $order['branch_id']) {
            $branch_name = 'Branch ' . $order['branch_id'];
        }
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Order created successfully',
            'data' => [
                'order_id' => intval($order['order_id']),
                'order_number' => $order['order_number'] ?? $order['orderid'],
                'order_type' => $order['order_type'],
                'order_status' => $order['order_status'],
                'table_id' => $order['table_id'] ? intval($order['table_id']) : null,
                'branch_id' => intval($order['branch_id']),
                'branch_name' => $branch_name,
                'total' => floatval($order['total'] ?? $order['g_total_amount'] ?? 0)
            ]
        ]);
        $fetch_order_stmt->close();
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to create order',
        'message' => $e->getMessage()
    ]);
}
?>
```

---

## 📊 Response Format Examples

### Success Response - Get Orders (Branch-Admin)

```json
{
    "success": true,
    "data": [
        {
            "order_id": 1,
            "id": 1,
            "orderid": "ORD-1",
            "order_number": "ORD-1",
            "order_type": "Dine In",
            "order_status": "Running",
            "status": "running",
            "table_id": 5,
            "table_number": "Table 5",
            "g_total_amount": 25.98,
            "total": 25.98,
            "net_total_amount": 25.98,
            "discount_amount": 0,
            "service_charge": 0,
            "payment_mode": "Cash",
            "created_at": "2024-01-15 10:30:00",
            "terminal": 1,
            "branch_id": 2,
            "branch_name": "Downtown Branch"
        }
    ],
    "count": 1
}
```

### Success Response - Get Orders (Super-Admin - All Branches)

```json
{
    "success": true,
    "data": [
        {
            "order_id": 1,
            "order_number": "ORD-1",
            "order_type": "Dine In",
            "status": "running",
            "table_number": "Table 5",
            "total": 25.98,
            "branch_id": 2,
            "branch_name": "Downtown Branch"
        },
        {
            "order_id": 2,
            "order_number": "ORD-2",
            "order_type": "Take Away",
            "status": "complete",
            "total": 18.99,
            "branch_id": 3,
            "branch_name": "Uptown Branch"
        }
    ],
    "count": 2
}
```

---

## 🔄 Frontend Implementation Status

✅ **Branch-Admin Create-Order Page** (`app/dashboard/branch-admin/create-order/page.jsx`)
- Fetches only their branch's categories and dishes
- Automatically includes `branch_id` when creating orders
- Validates `branch_id` before API calls

✅ **Branch-Admin Order Page** (`app/dashboard/branch-admin/order/page.jsx`)
- Fetches only their branch's orders
- Automatically includes `branch_id` in API calls

✅ **Super-Admin Order Page** (`app/dashboard/super-admin/order/page.jsx`)
- Fetches ALL orders from ALL branches
- Displays `branch_id` and `branch_name` in table
- Can filter by branch
- Shows all orders with branch information

---

## ✅ Testing Checklist

### Database
- [ ] `branch_id` column exists in `orders` table
- [ ] `branch_id` column exists in `order_items` table (if separate table)
- [ ] `branches` table exists with `branch_id` and `name` columns

### API Endpoints
- [ ] `getOrders.php` returns branch-filtered results for branch-admin
- [ ] `getOrders.php` returns all orders with branch info for super-admin
- [ ] `create_order.php` creates orders with correct `branch_id`
- [ ] Orders show correct branch information in responses

### Frontend
- [ ] Branch-admin sees only their orders
- [ ] Branch-admin can create orders (automatically gets their `branch_id`)
- [ ] Branch-admin can only see dishes/categories from their branch when creating orders
- [ ] Super-admin sees all orders with branch info
- [ ] Super-admin can filter by branch
- [ ] When branch-admin creates order, it appears in super-admin dashboard immediately

---

## 🚀 Deployment Steps

1. **Backup Database**
   ```sql
   BACKUP TABLE orders TO '/path/to/backup/orders_backup.sql';
   ```

2. **Add `branch_id` Column to Orders Table**
   ```sql
   ALTER TABLE orders 
   ADD COLUMN branch_id INT(11) NULL AFTER order_id,
   ADD INDEX idx_branch_id (branch_id);
   ```

3. **Add `branch_id` Column to Order Items Table (If Separate Table)**
   ```sql
   ALTER TABLE order_items 
   ADD COLUMN branch_id INT(11) NULL AFTER order_id,
   ADD INDEX idx_branch_id (branch_id);
   ```

4. **Update Existing Data** (if needed)
   ```sql
   UPDATE orders SET branch_id = 1 WHERE branch_id IS NULL;
   UPDATE order_items SET branch_id = 1 WHERE branch_id IS NULL;
   ```

5. **Deploy PHP Files**
   - Upload updated `getOrders.php`
   - Upload updated `create_order.php` or `create_order_with_kitchen.php`

6. **Test Endpoints**
   - Test branch-admin order fetch
   - Test super-admin order fetch
   - Test order creation from branch-admin
   - Verify branch information appears correctly

---

## 📝 Important Notes

- The `branch_id` is **REQUIRED** when creating orders
- Branch-admin cannot see or create orders for other branches
- Super-admin can see and manage orders from all branches
- Orders are automatically filtered by branch when branch-admin fetches them
- The API automatically joins with `branches` table to fetch `branch_name`
- If `branch_name` is not found, it defaults to `"Branch {branch_id}"`

---

## 🆘 Troubleshooting

### Orders Not Showing
1. Check if `branch_id` is being sent correctly in API request
2. Verify `branch_id` exists in `branches` table
3. Check database connection in PHP files
4. Verify SQL query syntax

### Branch Name Not Showing
1. Check if `branches` table has `name` or `branch_name` column
2. Verify JOIN in SQL query is correct
3. Check if branch actually exists for the given `branch_id`

### Order Creation Fails
1. Verify `branch_id` is provided and is valid
2. Check if all required fields are provided
3. Verify items array is not empty
4. Check database constraints and foreign keys

