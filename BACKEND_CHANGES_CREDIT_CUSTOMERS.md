# Backend Changes Required for Credit Customer Feature

## Overview
The frontend now displays credit order counts and total credit amounts for each customer, along with a detailed list of credit bills. The following backend API changes are required to support this functionality.

## Required API Changes

### 1. `api/customer_management.php` - Enhanced Customer Response

**Current Behavior:**
- Returns basic customer information (id, name, phone, email, address, credit_limit, balance)

**Required Enhancement:**
- Add credit statistics to the customer response when fetching customers
- Include `credit_orders_count` and `total_credit_amount` fields

**Recommended Implementation:**
```php
// When fetching customers (GET request with branch_id)
// Add these fields to the SELECT query or calculate them:

SELECT 
    c.*,
    COUNT(DISTINCT b.bill_id) as credit_orders_count,
    COALESCE(SUM(CASE WHEN b.payment_status = 'Credit' OR b.payment_method = 'Credit' 
                      OR (b.payment_status = 'Unpaid' AND b.customer_id IS NOT NULL)
                 THEN b.grand_total ELSE 0 END), 0) as total_credit_amount
FROM customers c
LEFT JOIN bills b ON c.customer_id = b.customer_id 
    AND (b.payment_status = 'Credit' 
         OR b.payment_method = 'Credit' 
         OR (b.payment_status = 'Unpaid' AND b.customer_id IS NOT NULL))
WHERE c.branch_id = :branch_id
GROUP BY c.customer_id
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 1,
      "name": "John Doe",
      "phone": "1234567890",
      "email": "john@example.com",
      "address": "123 Main St",
      "credit_limit": 50000,
      "balance": 0,
      "branch_id": 1,
      "credit_orders_count": 5,
      "total_credit_amount": 25000.00,
      "created_at": "2024-01-01 10:00:00"
    }
  ]
}
```

### 2. `api/bills_management.php` - Filter by Customer ID and Payment Status

**Current Behavior:**
- Fetches bills with various filters (order_id, branch_id, date range)

**Required Enhancement:**
- Support filtering by `customer_id` parameter
- Support filtering by `payment_status` parameter (specifically 'Credit')
- When both `customer_id` and `payment_status='Credit'` are provided, return only credit bills for that customer

**Recommended Implementation:**
```php
// GET request parameters:
// - customer_id (optional): Filter bills by customer ID
// - payment_status (optional): Filter by payment status ('Credit', 'Paid', 'Unpaid')
// - branch_id (optional): Filter by branch ID

$customer_id = isset($_GET['customer_id']) ? intval($_GET['customer_id']) : null;
$payment_status = isset($_GET['payment_status']) ? $_GET['payment_status'] : null;
$branch_id = isset($_GET['branch_id']) ? intval($_GET['branch_id']) : null;

$sql = "SELECT * FROM bills WHERE 1=1";

if ($customer_id) {
    $sql .= " AND customer_id = :customer_id";
}

if ($payment_status) {
    if ($payment_status === 'Credit') {
        // Credit bills: payment_status='Credit' OR payment_method='Credit' 
        // OR (payment_status='Unpaid' AND customer_id IS NOT NULL)
        $sql .= " AND (payment_status = 'Credit' 
                       OR payment_method = 'Credit' 
                       OR (payment_status = 'Unpaid' AND customer_id IS NOT NULL))";
    } else {
        $sql .= " AND payment_status = :payment_status";
    }
}

if ($branch_id) {
    $sql .= " AND branch_id = :branch_id";
}

$sql .= " ORDER BY created_at DESC";
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "bill_id": 101,
      "id": 101,
      "order_id": 50,
      "customer_id": 1,
      "branch_id": 1,
      "grand_total": 5000.00,
      "total_amount": 5000.00,
      "net_total": 5000.00,
      "payment_status": "Credit",
      "payment_method": "Credit",
      "is_credit": true,
      "created_at": "2024-01-15 14:30:00",
      "date": "2024-01-15"
    }
  ]
}
```

### 3. Credit Detection Logic

**Important:** The backend should consistently identify credit bills using the following logic:

1. **Explicit Credit:**
   - `payment_status = 'Credit'` OR
   - `payment_method = 'Credit'` OR
   - `is_credit = true` OR `is_credit = 1`

2. **Implicit Credit (Unpaid with Customer):**
   - `payment_status = 'Unpaid'` AND `customer_id IS NOT NULL` AND `customer_id > 0`

**This ensures consistency with the frontend credit detection logic.**

## Database Schema Requirements

### `bills` Table
Ensure the following columns exist:
- `bill_id` or `id` (primary key)
- `order_id` (foreign key to orders table)
- `customer_id` (foreign key to customers table, nullable)
- `branch_id` (foreign key to branches table)
- `grand_total` or `total_amount` (bill amount)
- `payment_status` (values: 'Paid', 'Unpaid', 'Credit')
- `payment_method` (values: 'Cash', 'Card', 'Credit', etc.)
- `is_credit` (boolean or tinyint, optional but recommended)
- `created_at` or `date` (timestamp)

### `customers` Table
Ensure the following columns exist:
- `customer_id` or `id` (primary key)
- `name` or `customer_name`
- `phone`
- `email`
- `address`
- `credit_limit` (optional but recommended)
- `balance`
- `branch_id` (foreign key to branches table) - **REQUIRED for branch restrictions**
- `created_at`
- `updated_at`

## SQL Migration Script

Based on your current table structure, you need to add the following columns:

```sql
-- Add branch_id column (REQUIRED for branch restrictions)
-- This is CRITICAL - without it, branch-admin cannot filter customers by branch
ALTER TABLE customers 
ADD COLUMN branch_id INT NULL AFTER address;

-- Add index for better query performance
ALTER TABLE customers 
ADD INDEX idx_branch_id (branch_id);

-- Add foreign key constraint (optional, but recommended)
-- Make sure your branches table exists first
ALTER TABLE customers 
ADD CONSTRAINT fk_customers_branch 
FOREIGN KEY (branch_id) REFERENCES branches(branch_id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add credit_limit column (OPTIONAL but recommended)
-- This allows you to set maximum credit limit per customer
ALTER TABLE customers 
ADD COLUMN credit_limit DECIMAL(10,2) DEFAULT 0.00 AFTER balance;

-- Update existing customers with default branch_id if needed
-- IMPORTANT: Set this to the appropriate branch_id for existing customers
-- Example: UPDATE customers SET branch_id = 1 WHERE branch_id IS NULL;
-- Replace '1' with your actual default branch_id
```

### Column Details:

1. **`branch_id` (REQUIRED)**
   - Type: `INT` (or `BIGINT` if your branch_id uses BIGINT)
   - Nullable: `YES` (initially, but should be set for all customers)
   - Purpose: Links customer to a branch for branch-based filtering
   - **Critical:** Without this, branch-admin cannot see only their branch's customers

2. **`credit_limit` (OPTIONAL)**
   - Type: `DECIMAL(10,2)`
   - Default: `0.00`
   - Purpose: Maximum credit amount allowed for the customer
   - Note: Frontend will work without this (shows 0), but it's useful for credit management

### Important Notes:

- **Existing Data:** After adding `branch_id`, you MUST update existing customers with their branch_id
- **Default Branch:** Decide which branch existing customers should belong to, or create a migration script
- **Foreign Key:** The foreign key constraint is optional but recommended for data integrity
- **Index:** The index on `branch_id` improves query performance when filtering by branch

## API Endpoints Summary

### 1. Get Customers with Credit Stats
**Endpoint:** `GET api/customer_management.php`
**Parameters:**
- `branch_id` (required for branch-admin, optional for super-admin)

**Response:** Array of customers with `credit_orders_count` and `total_credit_amount`

### 2. Get Credit Bills for Customer
**Endpoint:** `GET api/bills_management.php`
**Parameters:**
- `customer_id` (required): Customer ID to filter bills
- `branch_id` (required for branch-admin, optional for super-admin)
- `payment_status` (optional): Set to 'Credit' to get only credit bills

**Response:** Array of credit bills for the specified customer

## Testing Checklist

- [ ] `customer_management.php` returns `credit_orders_count` and `total_credit_amount` for each customer
- [ ] `bills_management.php` filters correctly by `customer_id`
- [ ] `bills_management.php` filters correctly by `payment_status='Credit'`
- [ ] Credit detection logic matches frontend expectations
- [ ] Branch filtering works correctly (branch-admin only sees their branch's data)
- [ ] Super-admin can see credit bills from all branches
- [ ] Response format matches expected structure

## Notes

1. **Performance Consideration:** If calculating credit stats on-the-fly is slow, consider:
   - Adding indexes on `bills.customer_id`, `bills.payment_status`, `bills.branch_id`
   - Caching credit statistics in the `customers` table (update on bill creation/payment)
   - Using a materialized view or summary table

2. **Data Consistency:** Ensure that when a bill is created with `payment_status='Credit'` or `payment_method='Credit'`, the `customer_id` is properly set.

3. **Backward Compatibility:** The frontend will work even if the backend doesn't return `credit_orders_count` and `total_credit_amount` (it will show 0), but the feature will be fully functional only after backend implementation.

