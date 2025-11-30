# Backend Changes Required: Update Customer Credit Balance on Credit Sales

## Overview
When a customer makes a credit sale, the credit amount should be automatically added to the customer's `total_credit_amount` (or `balance`) in the `customers` table. This ensures accurate tracking of outstanding credit for each customer.

## Required Backend Changes

### 1. `api/bills_management.php` - Update Customer Balance on Credit Sale

**When:** A bill is created or updated with `payment_status = 'Credit'` or `payment_method = 'Credit'`

**Action Required:**
- When a bill is saved with credit payment, update the customer's balance in the `customers` table
- Add the bill's `grand_total` (or `total_amount`) to the customer's `total_credit_amount` or `balance`

**Implementation:**

```php
// After creating/updating a bill with payment_status = 'Credit'
if ($payment_status === 'Credit' || $payment_method === 'Credit' || $is_credit === true) {
    if (!empty($customer_id) && $customer_id > 0) {
        // Get the bill amount
        $credit_amount = $grand_total ?? $total_amount ?? 0;
        
        // Update customer's total_credit_amount (or balance)
        $updateCustomerSql = "UPDATE customers 
                              SET total_credit_amount = COALESCE(total_credit_amount, 0) + :credit_amount,
                                  balance = COALESCE(balance, 0) + :credit_amount,
                                  updated_at = NOW()
                              WHERE customer_id = :customer_id";
        
        $stmt = $pdo->prepare($updateCustomerSql);
        $stmt->execute([
            ':credit_amount' => $credit_amount,
            ':customer_id' => $customer_id
        ]);
        
        // Log the update
        error_log("Updated customer $customer_id credit balance: +$credit_amount");
    }
}
```

### 2. Handle Bill Updates (Payment Status Changes)

**Scenario:** When a credit bill is later paid (status changes from 'Credit' to 'Paid')

**Action Required:**
- When a bill's payment_status changes from 'Credit' to 'Paid', subtract the amount from customer's balance
- This ensures the balance reflects only unpaid credit

**Implementation:**

```php
// When updating bill payment_status from 'Credit' to 'Paid'
if ($old_payment_status === 'Credit' && $new_payment_status === 'Paid') {
    if (!empty($customer_id) && $customer_id > 0) {
        // Get the bill amount
        $credit_amount = $grand_total ?? $total_amount ?? 0;
        
        // Subtract from customer's balance (credit is now paid)
        $updateCustomerSql = "UPDATE customers 
                              SET total_credit_amount = GREATEST(COALESCE(total_credit_amount, 0) - :credit_amount, 0),
                                  balance = GREATEST(COALESCE(balance, 0) - :credit_amount, 0),
                                  updated_at = NOW()
                              WHERE customer_id = :customer_id";
        
        $stmt = $pdo->prepare($updateCustomerSql);
        $stmt->execute([
            ':credit_amount' => $credit_amount,
            ':customer_id' => $customer_id
        ]);
        
        error_log("Reduced customer $customer_id credit balance: -$credit_amount (bill paid)");
    }
}
```

### 3. Handle Bill Deletion

**Scenario:** When a credit bill is deleted

**Action Required:**
- Subtract the bill amount from customer's balance before deleting the bill

**Implementation:**

```php
// Before deleting a credit bill
if ($bill_payment_status === 'Credit' && !empty($customer_id)) {
    $credit_amount = $grand_total ?? $total_amount ?? 0;
    
    // Subtract from customer balance
    $updateCustomerSql = "UPDATE customers 
                          SET total_credit_amount = GREATEST(COALESCE(total_credit_amount, 0) - :credit_amount, 0),
                              balance = GREATEST(COALESCE(balance, 0) - :credit_amount, 0),
                              updated_at = NOW()
                          WHERE customer_id = :customer_id";
    
    $stmt = $pdo->prepare($updateCustomerSql);
    $stmt->execute([
        ':credit_amount' => $credit_amount,
        ':customer_id' => $customer_id
    ]);
}
```

## Database Schema Requirements

### `customers` Table
Ensure the following columns exist:
- `customer_id` (primary key)
- `total_credit_amount` (DECIMAL(10,2)) - Total outstanding credit
- `balance` (DECIMAL(10,2)) - Customer balance (can be same as total_credit_amount)
- `updated_at` (TIMESTAMP) - Last update timestamp

**SQL to add if missing:**
```sql
ALTER TABLE customers 
ADD COLUMN total_credit_amount DECIMAL(10,2) DEFAULT 0.00 AFTER balance;

-- Update existing customers to calculate their current credit balance
UPDATE customers c
SET total_credit_amount = (
    SELECT COALESCE(SUM(b.grand_total), 0)
    FROM bills b
    WHERE b.customer_id = c.customer_id
    AND (b.payment_status = 'Credit' 
         OR b.payment_method = 'Credit' 
         OR (b.payment_status = 'Unpaid' AND b.customer_id IS NOT NULL))
);
```

### `bills` Table
Ensure the following columns exist:
- `bill_id` (primary key)
- `customer_id` (foreign key to customers table)
- `grand_total` or `total_amount` (bill amount)
- `payment_status` (values: 'Paid', 'Unpaid', 'Credit')
- `payment_method` (values: 'Cash', 'Card', 'Credit', etc.)
- `is_credit` (boolean, optional)

## API Endpoints to Update

### 1. `api/bills_management.php`

**POST Request (Create/Update Bill):**
- When `payment_status = 'Credit'` or `payment_method = 'Credit'`:
  - Add `grand_total` to customer's `total_credit_amount`
  - Update customer's `balance`
  - Set `updated_at` timestamp

**PUT/DELETE Request (Update/Delete Bill):**
- When payment_status changes from 'Credit' to 'Paid':
  - Subtract `grand_total` from customer's `total_credit_amount`
- When deleting a credit bill:
  - Subtract `grand_total` from customer's `total_credit_amount`

## Testing Checklist

- [ ] Create a credit bill → Customer's `total_credit_amount` increases
- [ ] Create multiple credit bills → Customer's `total_credit_amount` accumulates correctly
- [ ] Pay a credit bill (status: Credit → Paid) → Customer's `total_credit_amount` decreases
- [ ] Delete a credit bill → Customer's `total_credit_amount` decreases
- [ ] Update bill amount → Customer's `total_credit_amount` updates correctly
- [ ] Change customer on existing credit bill → Old customer's balance decreases, new customer's balance increases
- [ ] Verify balance never goes negative (use GREATEST function)

## Important Notes

1. **Transaction Safety:** Use database transactions to ensure bill creation and customer balance update happen atomically
2. **Prevent Negative Balances:** Use `GREATEST(..., 0)` to prevent negative balances
3. **Handle NULL Values:** Use `COALESCE()` to handle NULL balances (treat as 0)
4. **Logging:** Log all balance updates for audit trail
5. **Concurrency:** Consider using row-level locking when updating customer balance to prevent race conditions

## Example Complete Flow

```php
// In bills_management.php (POST - Create/Update Bill)

try {
    $pdo->beginTransaction();
    
    // 1. Create/Update the bill
    $billSql = "INSERT INTO bills (...) VALUES (...) 
                ON DUPLICATE KEY UPDATE ...";
    // ... execute bill insert/update
    
    // 2. If credit payment, update customer balance
    if (($payment_status === 'Credit' || $payment_method === 'Credit' || $is_credit === true) 
        && !empty($customer_id) && $customer_id > 0) {
        
        $credit_amount = $grand_total ?? $total_amount ?? 0;
        
        $updateCustomerSql = "UPDATE customers 
                              SET total_credit_amount = COALESCE(total_credit_amount, 0) + :credit_amount,
                                  balance = COALESCE(balance, 0) + :credit_amount,
                                  updated_at = NOW()
                              WHERE customer_id = :customer_id";
        
        $stmt = $pdo->prepare($updateCustomerSql);
        $stmt->execute([
            ':credit_amount' => $credit_amount,
            ':customer_id' => $customer_id
        ]);
    }
    
    $pdo->commit();
    return ['success' => true, 'message' => 'Bill saved and customer balance updated'];
    
} catch (Exception $e) {
    $pdo->rollBack();
    return ['success' => false, 'message' => 'Error: ' . $e->getMessage()];
}
```

## Frontend Impact

**No frontend changes required.** The frontend already:
- Sends `customer_id` when creating credit bills
- Sets `payment_status = 'Credit'` for credit payments
- Sets `is_credit = true` for credit payments

The backend will automatically update the customer balance when processing these requests.

