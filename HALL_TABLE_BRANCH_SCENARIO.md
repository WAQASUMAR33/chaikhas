# Hall & Table Branch Management - PHP Update Guide

## 📋 Scenario Overview

**Super-Admin Dashboard:**
- Shows ALL halls and tables from ALL branches
- Each hall/table displays with its `branch_id` and `branch_name`
- Can filter halls/tables by branch
- Can add/edit halls/tables for any branch
- When a branch-admin adds a hall/table, it immediately appears in super-admin dashboard

**Branch-Admin Dashboard:**
- Shows ONLY their own branch's halls and tables
- Cannot see halls/tables from other branches
- When they add a hall/table, it's automatically associated with their `branch_id`

---

## 🗄️ Database Schema Changes

### 1. **Check if `halls` table has `branch_id` column**
   ```sql
   DESCRIBE halls;
   ```

### 2. **Add `branch_id` to `halls` table (if missing)**
   - Add `branch_id INT(11) NULL` column after `hall_id`
   - Add index on `branch_id` for better query performance
   - Optional: Add foreign key constraint to `branches` table

### 3. **Check if `tables` table has `branch_id` column**
   ```sql
   DESCRIBE tables;
   ```

### 4. **Add `branch_id` to `tables` table (if missing)**
   - Add `branch_id INT(11) NULL` column after `table_id`
   - Add index on `branch_id`
   - Optional: Add foreign key constraint to `branches` table

### 5. **Update existing records (if needed)**
   - Set default `branch_id` for existing halls and tables
   - Use a migration query to assign default branch

---

## 🔌 PHP API Files to Update

### **File 1: `get_halls.php`**

**What to Change:**

1. **Request Parameter Handling:**
   - Accept `branch_id` from POST request body (optional)
   - If `branch_id` is null/empty → return ALL halls from ALL branches (Super-Admin)
   - If `branch_id` is provided → return only halls for that branch (Branch-Admin)

2. **SQL Query Logic:**
   - **Branch-Admin scenario:** Add `WHERE h.branch_id = ?` condition
   - **Super-Admin scenario:** Remove branch filter, return all halls
   - **JOIN with branches table:** Add `LEFT JOIN branches b ON h.branch_id = b.branch_id`
   - **Select branch info:** Include `b.name AS branch_name` and `b.branch_name AS branch_name_alt` in SELECT

3. **Response Format:**
   - Include `branch_id` in each hall object
   - Include `branch_name` in each hall object (from JOIN or default to "Branch {id}")
   - Sort results: For super-admin, sort by `branch_id` first, then `hall_id`

4. **Error Handling:**
   - Validate `branch_id` if provided (must be positive integer)
   - Return proper error messages if branch doesn't exist

---

### **File 2: `hall_management.php`**

**What to Change:**

1. **CREATE Operation (POST with empty `hall_id`):**
   - **REQUIRE `branch_id`** in request body (mandatory field)
   - Validate `branch_id` exists and is valid
   - Insert `branch_id` into `halls` table
   - After insert, fetch created hall with JOIN to get `branch_name`
   - Return response with `branch_id` and `branch_name`

2. **UPDATE Operation (POST with existing `hall_id`):**
   - Accept `branch_id` in request (but use existing `branch_id` if not provided to prevent branch-admin from changing it)
   - Update hall with new `branch_id` if provided (super-admin can change)
   - Validate new `branch_id` if provided
   - Fetch updated hall with branch info in response

3. **DELETE Operation (DELETE method):**
   - Check if hall exists before deleting
   - Optional: Check if hall has tables assigned (prevent deletion if tables exist)
   - Delete hall by `hall_id`

4. **Validation:**
   - Require `branch_id` for CREATE
   - Validate `branch_id` is valid positive integer
   - Validate branch exists in `branches` table (optional check)
   - Ensure hall name uniqueness per branch (if business logic requires)

---

### **File 3: `get_tables.php`**

**What to Change:**

1. **Request Parameter Handling:**
   - Accept `branch_id` from POST request body (optional)
   - If `branch_id` is null/empty → return ALL tables from ALL branches (Super-Admin)
   - If `branch_id` is provided → return only tables for that branch (Branch-Admin)

2. **SQL Query Logic:**
   - **JOIN with halls table:** Keep existing `LEFT JOIN halls h ON t.hall_id = h.hall_id`
   - **JOIN with branches table:** Add `LEFT JOIN branches b ON t.branch_id = b.branch_id`
   - **Branch-Admin scenario:** Add `WHERE t.branch_id = ?` condition
   - **Super-Admin scenario:** Remove branch filter
   - **Select branch info:** Include `b.name AS branch_name` in SELECT
   - **Select hall info:** Keep `h.name AS hall_name` from existing JOIN

3. **Response Format:**
   - Include `branch_id` in each table object
   - Include `branch_name` in each table object
   - Include `hall_name` (already exists)
   - Sort results: For super-admin, sort by `branch_id` first, then `table_id`

4. **Error Handling:**
   - Validate `branch_id` if provided
   - Handle cases where hall might not have `branch_id` (null check)

---

### **File 4: `table_management.php`**

**What to Change:**

1. **CREATE Operation (POST with empty `table_id`):**
   - **REQUIRE `branch_id`** in request body (mandatory field)
   - Validate `branch_id` exists and is valid
   - Validate `hall_id` belongs to the same branch (important: hall must be from same branch)
   - Insert `branch_id` into `tables` table
   - After insert, fetch created table with JOINs to get `branch_name` and `hall_name`
   - Return response with `branch_id`, `branch_name`, and `hall_name`

2. **UPDATE Operation (POST with existing `table_id`):**
   - Accept `branch_id` in request (but use existing `branch_id` if not provided)
   - If `hall_id` is being updated, validate it belongs to same branch as `branch_id`
   - Update table with new `branch_id` if provided (super-admin can change)
   - Fetch updated table with branch and hall info in response

3. **DELETE Operation (DELETE method):**
   - Check if table exists before deleting
   - Optional: Check if table has active orders (prevent deletion if orders exist)
   - Delete table by `table_id`

4. **Validation:**
   - Require `branch_id` for CREATE
   - Validate `branch_id` is valid positive integer
   - Validate `hall_id` exists and belongs to same branch as `branch_id`
   - Ensure table number uniqueness per branch (if business logic requires)

---

## 🔑 Key Points for Implementation

### **For Branch-Admin Scenarios:**
- Always require and validate `branch_id` in requests
- Filter all queries by `branch_id`
- Prevent branch-admin from changing `branch_id` on updates (use existing value)

### **For Super-Admin Scenarios:**
- Make `branch_id` optional in GET requests (null = return all)
- Require `branch_id` in CREATE requests (must select which branch)
- Allow super-admin to change `branch_id` on updates
- JOIN with `branches` table to get `branch_name` for display

### **SQL JOIN Pattern:**
```sql
-- Always JOIN branches table to get branch_name
LEFT JOIN branches b ON table_name.branch_id = b.branch_id

-- Select branch name with fallback
b.name AS branch_name,
b.branch_name AS branch_name_alt
-- If both are null, default to "Branch {branch_id}" in PHP
```

### **Response Structure:**
- Always include `branch_id` and `branch_name` in responses
- Sort by `branch_id` first when returning all records (super-admin view)
- Return consistent JSON structure matching frontend expectations

---

## ✅ Checklist for PHP Updates

### `get_halls.php`
- [ ] Accept optional `branch_id` parameter
- [ ] Add JOIN with `branches` table
- [ ] Filter by `branch_id` when provided
- [ ] Return all halls when `branch_id` is null
- [ ] Include `branch_id` and `branch_name` in response
- [ ] Sort by `branch_id` for super-admin view

### `hall_management.php`
- [ ] Require `branch_id` for CREATE operation
- [ ] Validate `branch_id` before insert/update
- [ ] Include `branch_id` in INSERT statement
- [ ] Fetch created/updated hall with branch info
- [ ] Return `branch_id` and `branch_name` in response

### `get_tables.php`
- [ ] Accept optional `branch_id` parameter
- [ ] Keep existing JOIN with `halls` table
- [ ] Add JOIN with `branches` table
- [ ] Filter by `branch_id` when provided
- [ ] Return all tables when `branch_id` is null
- [ ] Include `branch_id` and `branch_name` in response
- [ ] Include `hall_name` in response (from halls JOIN)

### `table_management.php`
- [ ] Require `branch_id` for CREATE operation
- [ ] Validate `branch_id` before insert/update
- [ ] Validate `hall_id` belongs to same branch
- [ ] Include `branch_id` in INSERT statement
- [ ] Fetch created/updated table with branch and hall info
- [ ] Return `branch_id`, `branch_name`, and `hall_name` in response

---

## 🚨 Important Notes

1. **Hall-Table Relationship:**
   - Tables must belong to the same branch as their assigned hall
   - Validate this relationship when creating/updating tables

2. **Branch Validation:**
   - Always validate `branch_id` exists in `branches` table (optional but recommended)
   - Handle cases where branch might be deleted (cascade or prevent)

3. **Existing Data:**
   - Update existing halls and tables to have `branch_id` before deploying
   - Handle NULL `branch_id` gracefully in queries (use WHERE clause to filter out NULLs for branch-admin)

4. **Error Messages:**
   - Return clear error messages if `branch_id` is missing
   - Return clear error messages if `branch_id` is invalid
   - Return clear error messages if hall doesn't belong to branch (for table creation)

5. **Security:**
   - Always use prepared statements to prevent SQL injection
   - Validate all input parameters before using in queries
   - Check user permissions (super-admin vs branch-admin) if needed

---

## 🔗 Related Files

- See `CATEGORY_BRANCH_SCENARIO.md` for category branch implementation pattern
- See `MENU_BRANCH_SCENARIO.md` for menu item branch implementation pattern
- Same pattern applies: branch filtering for branch-admin, all records for super-admin

---

## 📝 Quick Reference

### Request Format (Branch-Admin)
```json
{
    "terminal": "1",
    "branch_id": "2"  // Always required for branch-admin
}
```

### Request Format (Super-Admin)
```json
{
    "terminal": "1",
    "branch_id": "2"  // Optional: omit or null for all branches
}
```

### Response Format (Include in all responses)
```json
{
    "success": true,
    "data": [
        {
            "hall_id": 1,
            "name": "Main Hall",
            "branch_id": 2,
            "branch_name": "Downtown Branch",
            ...
        }
    ]
}
```

---

## 🆘 Troubleshooting

1. **Halls/Tables not showing in branch-admin:**
   - Check if `branch_id` is being sent correctly
   - Verify `branch_id` exists in database
   - Check SQL WHERE clause filters correctly

2. **Branch name not showing:**
   - Verify JOIN with `branches` table
   - Check if `branches` table has `name` or `branch_name` column
   - Add fallback to "Branch {branch_id}" if name not found

3. **Table creation fails with hall validation:**
   - Ensure hall belongs to same branch as table
   - Check hall's `branch_id` matches table's `branch_id`
   - Verify validation logic in PHP code

4. **Super-admin sees all but branch-admin sees none:**
   - Check if `branch_id` is being sent in branch-admin requests
   - Verify database has `branch_id` set for records
   - Check WHERE clause logic (should filter when `branch_id` provided)

