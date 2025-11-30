-- =====================================================
-- SQL Migration Script for Customers Table
-- Adds branch_id and credit_limit columns
-- =====================================================

-- Step 1: Add branch_id column (REQUIRED for branch restrictions)
-- This is CRITICAL - without it, branch-admin cannot filter customers by branch
ALTER TABLE customers 
ADD COLUMN branch_id INT NULL AFTER address;

-- Step 2: Add index for better query performance
ALTER TABLE customers 
ADD INDEX idx_branch_id (branch_id);

-- Step 3: Add credit_limit column (OPTIONAL but recommended)
-- This allows you to set maximum credit limit per customer
ALTER TABLE customers 
ADD COLUMN credit_limit DECIMAL(10,2) DEFAULT 0.00 AFTER balance;

-- Step 4: Update existing customers with default branch_id
-- IMPORTANT: Replace '1' with your actual default branch_id
-- You may need to assign customers to branches based on your business logic
-- Example: All existing customers go to branch_id = 1
UPDATE customers 
SET branch_id = 1 
WHERE branch_id IS NULL;

-- Step 5: Make branch_id NOT NULL after updating existing records (optional)
-- Uncomment the following line after you've updated all existing customers
-- ALTER TABLE customers MODIFY COLUMN branch_id INT NOT NULL;

-- Step 6: Add foreign key constraint (optional, but recommended)
-- Make sure your branches table exists first
-- Uncomment the following if you want to enforce referential integrity
-- ALTER TABLE customers 
-- ADD CONSTRAINT fk_customers_branch 
-- FOREIGN KEY (branch_id) REFERENCES branches(branch_id) 
-- ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table structure
DESCRIBE customers;

-- Check if branch_id was added successfully
SELECT customer_id, name, branch_id, credit_limit 
FROM customers 
LIMIT 10;

-- Count customers per branch
SELECT branch_id, COUNT(*) as customer_count 
FROM customers 
GROUP BY branch_id;

