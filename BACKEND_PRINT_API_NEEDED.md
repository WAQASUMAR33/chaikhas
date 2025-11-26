# Backend API Required for Direct Printing

## Overview
The frontend has been updated to call a backend API that prints receipts directly to network printers without showing a dialog. The backend needs to handle printing to TWO default printers based on category.

## Required API Endpoint

### Endpoint: `/print_receipt_direct.php`

**Method:** POST

**Request Body:**
```json
{
  "order_id": 123,
  "bill_id": 44,
  "receipt_content": "<html>...</html>",
  "category_ids": [1, 2],
  "items": [
    {
      "item_id": 1,
      "category_id": 1,
      "name": "Item Name",
      "quantity": 2,
      "price": 100
    }
  ],
  "terminal": "1",
  "branch_id": "1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Receipt sent to printers successfully",
  "printers": ["Printer 1", "Printer 2"],
  "printer_ips": ["192.168.1.100", "192.168.1.101"]
}
```

## Implementation Requirements

### 1. Get Default Printers
- Fetch two default printers from database
- Priority: Receipt printers or Kitchen printers
- Must have valid IP addresses

### 2. Category-Based Printer Selection
- If items have categories, find printers associated with those categories
- Each category can have a printer assigned
- Print to both printers if items span multiple categories

### 3. Direct Network Printing
- Use printer IP addresses to send print jobs
- Port: 9100 (default for network printers)
- Format: Raw text or ESC/POS commands for thermal printers
- No dialog, silent printing

### 4. Print Content Formatting
- Convert HTML receipt content to plain text
- Format for 80mm thermal printer
- Include all receipt details (logo, items, totals, etc.)

## PHP Implementation Example

```php
<?php
// print_receipt_direct.php

header('Content-Type: application/json');
require_once 'config.php'; // Database connection

$input = json_decode(file_get_contents('php://input'), true);

$order_id = $input['order_id'] ?? null;
$bill_id = $input['bill_id'] ?? null;
$receipt_content = $input['receipt_content'] ?? '';
$category_ids = $input['category_ids'] ?? [];
$items = $input['items'] ?? [];
$terminal = $input['terminal'] ?? '';
$branch_id = $input['branch_id'] ?? '';

try {
    // 1. Get default printers (2 printers)
    $printers_query = "SELECT * FROM printers 
                       WHERE branch_id = ? 
                       AND status = 'active' 
                       AND type IN ('receipt', 'kitchen')
                       ORDER BY type, printer_id 
                       LIMIT 2";
    
    $stmt = $conn->prepare($printers_query);
    $stmt->bind_param("s", $branch_id);
    $stmt->execute();
    $printers_result = $stmt->get_result();
    
    $printers = [];
    while ($row = $printers_result->fetch_assoc()) {
        if (!empty($row['ip_address'])) {
            $printers[] = $row;
        }
    }
    
    // If less than 2 printers, get any available printers
    if (count($printers) < 2) {
        $fallback_query = "SELECT * FROM printers 
                          WHERE branch_id = ? 
                          AND status = 'active' 
                          AND ip_address IS NOT NULL 
                          AND ip_address != ''
                          LIMIT 2";
        $stmt = $conn->prepare($fallback_query);
        $stmt->bind_param("s", $branch_id);
        $stmt->execute();
        $fallback_result = $stmt->get_result();
        
        $printers = [];
        while ($row = $fallback_result->fetch_assoc()) {
            $printers[] = $row;
        }
    }
    
    if (empty($printers)) {
        throw new Exception('No printers configured');
    }
    
    // 2. Convert HTML to plain text for thermal printer
    $text_content = strip_tags($receipt_content);
    $text_content = html_entity_decode($text_content);
    $text_content = preg_replace('/\s+/', ' ', $text_content);
    
    // 3. Print to each printer
    $printed_printers = [];
    $printer_ips = [];
    
    foreach ($printers as $printer) {
        $ip = $printer['ip_address'];
        $port = $printer['port'] ?? 9100;
        
        // Send print job via socket
        $socket = @fsockopen($ip, $port, $errno, $errstr, 2);
        
        if ($socket) {
            // Send ESC/POS commands for thermal printer
            $print_data = "\x1B\x40"; // Initialize printer
            $print_data .= $text_content;
            $print_data .= "\n\n\n"; // Feed paper
            $print_data .= "\x1D\x56\x41\x03"; // Cut paper
            
            fwrite($socket, $print_data);
            fclose($socket);
            
            $printed_printers[] = $printer['name'] ?? "Printer at $ip";
            $printer_ips[] = $ip;
        }
    }
    
    if (empty($printed_printers)) {
        throw new Exception('Failed to connect to printers');
    }
    
    // 4. Return success response
    echo json_encode([
        'success' => true,
        'message' => 'Receipt sent to printers successfully',
        'printers' => $printed_printers,
        'printer_ips' => $printer_ips
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
```

## Testing

1. **Test with 2 printers configured:**
   - Should print to both printers
   - No dialog should appear

2. **Test with 1 printer:**
   - Should print to available printer
   - Should show warning if second printer not available

3. **Test with no printers:**
   - Should return error message
   - Frontend should handle gracefully

## Notes

- Printers must be configured in the printer management page
- Each printer must have a valid IP address
- Port 9100 is standard for network thermal printers
- ESC/POS commands are used for thermal printer control
- The API should handle connection timeouts gracefully

