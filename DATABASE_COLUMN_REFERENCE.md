# Database Column Reference

This document maps the correct database column names from the SQL structure to ensure consistency across all pages.

## Orders Table (`orders`)
- `order_id` - Primary key
- `branch_id` - Branch ID (default: 1)
- `customer_id` - Customer ID (nullable)
- `order_type` - Enum: 'Dine-In', 'Take-Away', 'Delivery' (stored as varchar)
- `order_status` - Varchar: 'Pending', 'Running', 'Complete', 'Cancelled'
- `service_charge` - Decimal(10,2), default 0.00
- `g_total_amount` - Float, gross total amount
- `discount_amount` - Float, discount amount (NOT percentage)
- `net_total_amount` - Float, final amount after discount
- `order_taker_id` - Integer, default 0
- `payment_mode` - Varchar(50), default 'Cash'
- `bill_by` - Integer, default 0
- `hall_id` - Integer, default 0
- `table_id` - Integer, default 0
- `comments` - Text
- `terminal` - Integer, default 0
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Bills Table (`bills`)
- `bill_id` - Primary key
- `branch_id` - Branch ID (default: 1)
- `order_id` - Foreign key to orders
- `total_amount` - Decimal(10,2) - Subtotal before service charge and discount
- `service_charge` - Decimal(10,2), default 0.00
- `discount` - Decimal(10,2), default 0.00 (NOT discount_amount)
- `grand_total` - Decimal(10,2) - Final amount
- `payment_method` - Enum: 'Cash', 'Card', 'Online'
- `payment_status` - Enum: 'Paid', 'Unpaid', default 'Unpaid'
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Order Items Table (`order_items`)
- `item_id` - Primary key
- `branch_id` - Branch ID (default: 1)
- `order_id` - Foreign key to orders
- `dish_id` - Foreign key to dishes
- `quantity` - Integer
- `price` - Decimal(10,2) - Unit price
- `total_amount` - Float - Quantity × Price
- `kitchen_id` - Integer (nullable)
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Key Differences to Remember:
1. **Orders table**: Uses `g_total_amount`, `discount_amount`, `net_total_amount`
2. **Bills table**: Uses `total_amount`, `discount` (not discount_amount), `grand_total`
3. **Order Items table**: Uses `total_amount` for line item total
4. **Payment**: Orders use `payment_mode`, Bills use `payment_method`
5. **Status**: Orders use `order_status`, Bills use `payment_status`

## API Payload Guidelines:
- When creating/updating orders: Use `order_status`, `g_total_amount`, `discount_amount`, `net_total_amount`, `payment_mode`
- When creating/updating bills: Use `total_amount`, `service_charge`, `discount`, `grand_total`, `payment_method`, `payment_status`
- When creating/updating order items: Use `total_amount` for line item total

