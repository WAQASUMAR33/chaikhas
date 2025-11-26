# Day End Management System Setup Guide

This guide explains how to set up and use the day-end management system for Branch Admin.

## Overview

The day-end management system allows you to:
- Track daily opening and closing balances
- Record expenses, sales, and payments
- Mark the end of each business day
- Generate and print shift reports
- Filter and view historical day-end records

## Features

### Day End Fields
- **ID** - Unique day-end record ID
- **Opening Balance** - Starting balance for the day
- **Expenses** - Total expenses for the day
- **Total Cash** - Total cash sales
- **Total Online** - Total online/easypaisa sales
- **Total Bank** - Total bank transfers
- **Credit Sale** - Credit sales amount
- **Total Sale** - Total sales amount
- **Total Receivings** - Total receivings
- **Drawings** - Drawings amount
- **Closing Balance** - Calculated closing balance
- **Closed By** - User who closed the day
- **Updated** - Last update timestamp

### Functionality
- **Mark as Day End** - Create a new day-end record
- **Print Shift Report** - Print day-end report
- **Date Filter** - Filter records by date range
- **Auto-calculation** - Closing balance is automatically calculated

## Database Setup

### Step 1: Create Day End Table

Run the SQL script to create the `dayend` table:

```bash
# Option 1: Using phpMyAdmin
1. Open phpMyAdmin
2. Select your database
3. Click on "SQL" tab
4. Copy and paste the contents of `database/create_dayend_table.sql`
5. Click "Go" to execute

# Option 2: Using MySQL command line
mysql -u your_username -p your_database_name < database/create_dayend_table.sql
```

### Step 2: Verify Table Structure

After running the script, verify the table structure:

```sql
DESCRIBE dayend;
```

The table should have the following columns:
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `branch_id` (INT, NOT NULL) - Foreign key to `branches` table
- `opening_balance` (DECIMAL(10,2)) - Opening balance
- `expences` (DECIMAL(10,2)) - Total expenses
- `total_cash` (DECIMAL(10,2)) - Total cash sales
- `total_easypaisa` (DECIMAL(10,2)) - Total online sales
- `total_bank` (DECIMAL(10,2)) - Total bank transfers
- `credit_sales` (DECIMAL(10,2)) - Credit sales
- `total_sales` (DECIMAL(10,2)) - Total sales
- `total_receivings` (DECIMAL(10,2)) - Total receivings
- `drawings` (DECIMAL(10,2)) - Drawings
- `closing_balance` (DECIMAL(10,2)) - Closing balance
- `closing_date_time` (DATETIME) - Closing timestamp
- `closing_by` (INT) - User ID who closed
- `note` (TEXT) - Optional note
- `created_at` (DATETIME) - Creation timestamp
- `updated_at` (DATETIME) - Update timestamp

### Step 3: Verify sts Columns

The script also adds `sts` (status) columns to `orders` and `expenses` tables:
- `orders.sts` - Tracks which dayend the order belongs to
- `expenses.sts` - Tracks which dayend the expense belongs to

Verify these columns exist:
```sql
DESCRIBE orders;
DESCRIBE expenses;
```

## PHP API Files Setup

### Files Created:

1. **`api/dayend_management.php`** - Handles CREATE and UPDATE operations
   - POST request
   - Parameters: All day-end fields + branch_id
   - When creating new record, updates orders.sts and expenses.sts

2. **`api/get_dayend.php`** - Fetches day-end records
   - POST request
   - Parameters: branch_id (required), start_date (optional), end_date (optional)
   - Returns: Array of day-end records

### API Endpoints:

#### Create/Update Day End
```
POST /api/dayend_management.php
Content-Type: application/json

{
  "branch_id": 1,
  "opening_balance": 10000.00,
  "expences": 5000.00,
  "total_cash": 15000.00,
  "total_easypaisa": 5000.00,
  "total_bank": 2000.00,
  "credit_sales": 1000.00,
  "total_sales": 23000.00,
  "total_receivings": 500.00,
  "drawings": 1000.00,
  "closing_balance": 20500.00,
  "closing_date_time": "2024-01-15 23:59:59",
  "closing_by": 1,
  "note": "End of day note"
}
```

Response:
```json
{
  "status": "success",
  "message": "Day-end record created successfully",
  "id": 1
}
```

#### Get Day End Records
```
POST /api/get_dayend.php
Content-Type: application/json

{
  "branch_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "branch_id": 1,
      "branch_name": "Main Branch",
      "opening_balance": 10000.00,
      "expences": 5000.00,
      "total_cash": 15000.00,
      "total_easypaisa": 5000.00,
      "total_bank": 2000.00,
      "credit_sales": 1000.00,
      "total_sales": 23000.00,
      "total_receivings": 500.00,
      "drawings": 1000.00,
      "closing_balance": 20500.00,
      "closing_date_time": "2024-01-15 23:59:59",
      "closing_by": 1,
      "closing_by_name": "John Doe",
      "note": "End of day note",
      "created_at": "2024-01-15 23:59:59",
      "updated_at": "2024-01-15 23:59:59"
    }
  ],
  "count": 1
}
```

## Frontend Page

### Branch Admin Day End Page
**Location:** `app/dashboard/branch-admin/dayend/page.jsx`

**Features:**
- View all day-end records for the branch
- Mark as Day End button
- Print Shift Report button
- Date range filter
- Auto-calculation of closing balance
- Modal form for marking day-end

## Usage Instructions

### For Branch Admin:

1. **Navigate to Day End:**
   - Go to Dashboard → Day End

2. **View Day End Records:**
   - All day-end records for your branch are displayed
   - Use date filters to view specific date ranges

3. **Mark as Day End:**
   - Click "Mark as Day End" button
   - Fill in the form:
     - **Opening Balance** (required) - Starting balance
     - **Expenses** - Total expenses for the day
     - **Total Cash** - Cash sales
     - **Total Online** - Online/easypaisa sales
     - **Total Bank** - Bank transfers
     - **Credit Sales** - Credit sales
     - **Total Sales** - Total sales
     - **Total Receivings** - Receivings
     - **Drawings** - Drawings
     - **Closing Balance** - Auto-calculated
     - **Note** - Optional note
   - Click "Mark as Day End" to save

4. **Print Shift Report:**
   - Click "Print" button on any day-end record
   - Print dialog will open
   - Report will be printed in A4 format

5. **Filter Records:**
   - Select start date and/or end date
   - Click "Filter" button
   - Click "Clear" to remove filters

## Closing Balance Calculation

The closing balance is automatically calculated using the formula:

```
Closing Balance = Opening Balance + Total Cash + Total Easypaisa + Total Bank + Total Receivings - Expenses - Drawings
```

This calculation happens automatically when you enter values in the form.

## Important Notes

### When Marking Day End:

1. **Orders Status Update:**
   - When a new day-end is created, all orders with `sts = 0` for the branch are updated to `sts = dayend_id`
   - This marks those orders as closed in this day-end

2. **Expenses Status Update:**
   - When a new day-end is created, all expenses with `sts = 0` for the branch are updated to `sts = dayend_id`
   - This marks those expenses as closed in this day-end

3. **Branch ID:**
   - Day-end records are branch-specific
   - Each branch manages its own day-end records

4. **Closing By:**
   - Currently uses a default user ID (you may need to update this to use actual logged-in user ID)

## Troubleshooting

### Issue: "Branch ID not found" error
**Solution:** Make sure you're logged in with a valid branch_id

### Issue: Closing balance calculation is wrong
**Solution:** 
- Check that all amounts are entered correctly
- Verify the calculation formula matches your business logic
- Check for negative values

### Issue: Orders/Expenses not updating
**Solution:**
- Verify `sts` columns exist in `orders` and `expenses` tables
- Check that orders/expenses have `sts = 0` before marking day-end
- Verify branch_id matches in orders/expenses

### Issue: API returns error
**Solution:**
- Verify `dayend_management.php` and `get_dayend.php` are in the `api` folder
- Check database connection in `config.php`
- Verify all required tables exist
- Check that foreign key constraints are satisfied

## Database Relationships

```
dayend
├── branch_id → branches.branch_id
└── closing_by → users.user_id

orders
└── sts → dayend.id (when closed)

expenses
└── sts → dayend.id (when closed)
```

## Testing

1. **Test Day End Creation:**
   - Mark a day-end with test data
   - Verify record is created
   - Check that orders.sts and expenses.sts are updated

2. **Test Date Filter:**
   - Create multiple day-end records
   - Use date filter to view specific ranges
   - Verify filtering works correctly

3. **Test Print:**
   - Mark a day-end
   - Click print button
   - Verify print preview shows correct data

## Security Notes

- The API uses prepared statements to prevent SQL injection
- Branch ID is required and validated
- All numeric values are properly cast to float/int
- Date/time values are validated

## Future Enhancements

- Auto-calculate totals from orders and expenses
- Integration with sales reports
- Email shift reports
- Multiple shift support per day
- Approval workflow for day-end

