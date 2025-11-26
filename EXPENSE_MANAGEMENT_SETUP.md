# Expense Management System Setup Guide

This guide explains how to set up and use the expense management system for both Super Admin and Branch Admin dashboards.

## Overview

The expense management system allows you to:
- Track expenses with amounts for each branch
- Super Admin can view expenses from all branches
- Branch Admin can only view expenses for their own branch
- Add, edit, and delete expenses
- Filter and search expenses

## Database Setup

### Step 1: Update Database Table

Run the SQL script to create/update the `expenses` table:

```bash
# Option 1: Using phpMyAdmin
1. Open phpMyAdmin
2. Select your database
3. Click on "SQL" tab
4. Copy and paste the contents of `database/update_expenses_table.sql`
5. Click "Go" to execute

# Option 2: Using MySQL command line
mysql -u your_username -p your_database_name < database/update_expenses_table.sql
```

### Step 2: Verify Table Structure

After running the script, verify the table structure:

```sql
DESCRIBE expenses;
```

The table should have the following columns:
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `expense_title_id` (INT, NOT NULL) - Foreign key to `expense_title` table
- `amount` (DECIMAL(10,2), NOT NULL) - Expense amount
- `description` (TEXT, NULL) - Optional description
- `branch_id` (INT, NOT NULL) - Foreign key to `branches` table
- `created_at` (DATETIME) - Creation timestamp
- `updated_at` (DATETIME) - Last update timestamp

## PHP API Files Setup

### Files Created:

1. **`api/get_expenses.php`** - Fetches expenses from database
   - POST request
   - Parameters: `branch_id` (optional, null for all branches)
   - Returns: Array of expenses with expense title and branch name

2. **`api/expense_management.php`** - Handles CRUD operations
   - POST request: Create or Update expense
   - DELETE request: Delete expense
   - Parameters for POST:
     - `id` (optional) - Expense ID for update, omit for create
     - `expense_title_id` (required) - ID from expense_title table
     - `amount` (required) - Expense amount
     - `description` (optional) - Expense description
     - `branch_id` (required) - Branch ID

### API Endpoints:

#### Get Expenses
```
POST /api/get_expenses.php
Content-Type: application/json

{
  "branch_id": 1  // Optional: null or omit for all branches
}
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "expense_title_id": 1,
      "expense_title": "Groceries",
      "amount": 5000.00,
      "description": "Monthly groceries",
      "branch_id": 1,
      "branch_name": "Main Branch",
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00"
    }
  ],
  "count": 1
}
```

#### Create/Update Expense
```
POST /api/expense_management.php
Content-Type: application/json

{
  "id": "",  // Omit or empty for create, provide ID for update
  "expense_title_id": 1,
  "amount": 5000.00,
  "description": "Monthly groceries",
  "branch_id": 1
}
```

#### Delete Expense
```
DELETE /api/expense_management.php
Content-Type: application/json

{
  "id": 1
}
```

## Frontend Pages

### Branch Admin Expense Page
**Location:** `app/dashboard/branch-admin/expenses/page.jsx`

**Features:**
- View only expenses for the logged-in branch
- Add new expenses (automatically uses branch_id from session)
- Edit existing expenses
- Delete expenses
- Search by title, description, amount, or ID
- Display total expenses count and total amount

### Super Admin Expense Page
**Location:** `app/dashboard/super-admin/expenses/page.jsx`

**Features:**
- View expenses from all branches
- Filter by branch using dropdown
- Add new expenses (must select branch)
- Edit existing expenses
- Delete expenses
- Search by title, description, branch, amount, or ID
- Display total expenses count and total amount
- Display filtered results count and total

## Usage Instructions

### For Branch Admin:

1. **View Expenses:**
   - Navigate to Dashboard → Expenses
   - All expenses for your branch will be displayed automatically

2. **Add Expense:**
   - Click "Add Expense" button
   - Select an expense title from dropdown
   - Enter amount
   - Optionally add description
   - Click "Create Expense"
   - Note: Branch is automatically set to your branch

3. **Edit Expense:**
   - Click "Edit" button on any expense row
   - Modify the fields
   - Click "Update Expense"

4. **Delete Expense:**
   - Click "Delete" button on any expense row
   - Confirm deletion

### For Super Admin:

1. **View All Expenses:**
   - Navigate to Dashboard → Expenses
   - All expenses from all branches are displayed

2. **Filter by Branch:**
   - Use the "Filter by Branch" dropdown
   - Select a specific branch or "All Branches"

3. **Add Expense:**
   - Click "Add Expense" button
   - Select a branch (required)
   - Select an expense title
   - Enter amount
   - Optionally add description
   - Click "Create Expense"

4. **Edit Expense:**
   - Click "Edit" button on any expense row
   - Modify the fields (branch cannot be changed)
   - Click "Update Expense"

5. **Delete Expense:**
   - Click "Delete" button on any expense row
   - Confirm deletion

## Database Relationships

```
expenses
├── expense_title_id → expense_title.id
└── branch_id → branches.branch_id
```

**Important:** 
- Before adding expenses, make sure expense titles exist in the `expense_title` table
- Before adding expenses, make sure branches exist in the `branches` table

## Troubleshooting

### Issue: "Expense title is required" error
**Solution:** Make sure you have created expense titles first using the expense title management page.

### Issue: "Branch ID not found" error
**Solution:** 
- For Branch Admin: Make sure you're logged in with a valid branch_id
- For Super Admin: Make sure you select a branch when creating expenses

### Issue: Foreign key constraint error
**Solution:** 
- Make sure the expense_title_id exists in expense_title table
- Make sure the branch_id exists in branches table

### Issue: API returns empty array
**Solution:**
- Check if expenses table exists and has data
- Verify branch_id matches your logged-in branch (for Branch Admin)
- Check database connection in config.php

## Testing

1. **Test Database:**
   ```sql
   -- Insert a test expense
   INSERT INTO expenses (expense_title_id, amount, description, branch_id)
   VALUES (1, 1000.00, 'Test expense', 1);
   
   -- Verify
   SELECT * FROM expenses;
   ```

2. **Test API:**
   - Use Postman or similar tool to test API endpoints
   - Verify CORS headers are set correctly
   - Check response format matches expected structure

3. **Test Frontend:**
   - Login as Branch Admin and verify only your branch expenses show
   - Login as Super Admin and verify all expenses show
   - Test add, edit, delete operations
   - Test search and filter functionality

## Notes

- The expense amount is stored as DECIMAL(10,2) for precise currency calculations
- All timestamps are automatically managed by MySQL
- Foreign key constraints ensure data integrity
- Indexes on branch_id and expense_title_id improve query performance

