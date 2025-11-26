# Day End Management API Endpoints

This document describes the API endpoints for the Day End Management system.

## Base URL
All endpoints are relative to your API base URL (e.g., `http://localhost/restuarent/api`)

---

## 1. Create/Update Day End Record

**Endpoint:** `POST /dayend_management.php`

**Description:** Creates a new day-end record or updates an existing one.

### Request Body

```json
{
  "id": "",                    // Optional: Day-end ID. Omit or empty for create, provide for update
  "branch_id": 1,              // Required: Branch ID
  "opening_balance": 10000.00, // Required: Opening balance
  "expences": 5000.00,         // Optional: Total expenses (default: 0)
  "total_cash": 15000.00,      // Optional: Total cash sales (default: 0)
  "total_easypaisa": 5000.00,  // Optional: Total online sales (default: 0)
  "total_bank": 2000.00,       // Optional: Total bank transfers (default: 0)
  "credit_sales": 1000.00,     // Optional: Credit sales (default: 0)
  "total_sales": 23000.00,     // Optional: Total sales (default: 0)
  "total_receivings": 500.00,  // Optional: Total receivings (default: 0)
  "drawings": 1000.00,         // Optional: Drawings (default: 0)
  "closing_balance": 20500.00,  // Optional: Closing balance (default: 0)
  "closing_date_time": "2024-01-15 23:59:59", // Optional: Closing datetime (default: current datetime)
  "closing_by": 1,             // Optional: User ID who closed (default: 0)
  "note": "End of day note"    // Optional: Note
}
```

### Response (Success)

```json
{
  "status": "success",
  "message": "Day-end record created successfully",
  "id": 1
}
```

### Response (Error)

```json
{
  "status": "error",
  "message": "Error message here"
}
```

### Important Notes

1. **When Creating New Record:**
   - All orders with `sts = 0` for the branch are updated to `sts = dayend_id`
   - All expenses with `sts = 0` for the branch are updated to `sts = dayend_id`
   - This marks those records as closed in this day-end

2. **When Updating:**
   - Only updates the day-end record
   - Does not modify orders or expenses

3. **Branch ID:**
   - Must be provided and valid
   - Must match the logged-in user's branch (enforced by frontend)

---

## 2. Get Day End Records

**Endpoint:** `POST /get_dayend.php`

**Description:** Fetches day-end records for a branch, optionally filtered by date range.

### Request Body

```json
{
  "branch_id": 1,              // Required: Branch ID
  "start_date": "2024-01-01",  // Optional: Start date (YYYY-MM-DD)
  "end_date": "2024-01-31"     // Optional: End date (YYYY-MM-DD)
}
```

### Response (Success)

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

### Response (Error)

```json
{
  "success": false,
  "message": "Error message here"
}
```

### Query Parameters

- **branch_id** (required): Filters records by branch
- **start_date** (optional): Only returns records on or after this date
- **end_date** (optional): Only returns records on or before this date

---

## Error Codes

| HTTP Status | Description |
|------------|-------------|
| 200 | Success |
| 400 | Bad Request - Missing or invalid parameters |
| 405 | Method Not Allowed - Wrong HTTP method |
| 500 | Internal Server Error - Database or server error |

---

## Example Usage

### Create Day End Record

```javascript
const response = await fetch('http://localhost/restuarent/api/dayend_management.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    branch_id: 1,
    opening_balance: 10000.00,
    expences: 5000.00,
    total_cash: 15000.00,
    total_easypaisa: 5000.00,
    total_bank: 2000.00,
    credit_sales: 1000.00,
    total_sales: 23000.00,
    total_receivings: 500.00,
    drawings: 1000.00,
    closing_balance: 20500.00,
    closing_by: 1,
    note: "End of day"
  })
});

const result = await response.json();
console.log(result);
```

### Get Day End Records

```javascript
const response = await fetch('http://localhost/restuarent/api/get_dayend.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    branch_id: 1,
    start_date: "2024-01-01",
    end_date: "2024-01-31"
  })
});

const result = await response.json();
console.log(result.data);
```

---

## Database Schema

### dayend Table

```sql
CREATE TABLE dayend (
  id INT(11) PRIMARY KEY AUTO_INCREMENT,
  branch_id INT(11) NOT NULL,
  opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  expences DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_cash DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_easypaisa DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_bank DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  credit_sales DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_sales DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_receivings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  drawings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  closing_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  closing_date_time DATETIME NOT NULL,
  closing_by INT(11) NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  FOREIGN KEY (closing_by) REFERENCES users(user_id)
);
```

---

## Security Considerations

1. **SQL Injection Prevention:**
   - All queries use prepared statements
   - All user inputs are properly sanitized

2. **Authorization:**
   - Branch ID validation (should match logged-in user's branch)
   - User ID validation for closing_by field

3. **Data Validation:**
   - Numeric fields are cast to appropriate types
   - Date/time fields are validated
   - Required fields are checked

---

## Troubleshooting

### Issue: "Branch ID is required" error
**Solution:** Make sure `branch_id` is included in the request body

### Issue: Orders/Expenses not updating
**Solution:**
- Verify `sts` columns exist in `orders` and `expenses` tables
- Check that records have `sts = 0` before creating day-end
- Verify branch_id matches in orders/expenses

### Issue: Foreign key constraint error
**Solution:**
- Verify branch_id exists in branches table
- Verify closing_by user_id exists in users table

---

## Notes

- All monetary values are stored as DECIMAL(10,2)
- Dates are stored in DATETIME format (YYYY-MM-DD HH:MM:SS)
- The `sts` (status) field in orders and expenses tracks which dayend they belong to
- `sts = 0` means not yet closed in a dayend
- `sts > 0` means closed in dayend with that ID

