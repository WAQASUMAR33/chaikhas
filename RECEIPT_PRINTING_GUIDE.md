# Receipt Printing Guide - Restaurant Khas

## 📋 Overview

Your system has **two types of receipts**:

### 1. **KOT (Kitchen Order Ticket)** - Your Existing PHP File ✅
- **Purpose:** Sent to kitchen printers when order is placed
- **File:** Your existing KOT printing PHP file
- **Status:** Already working - **Keep this file!**
- **What it does:**
  - Groups items by kitchen printer
  - Sends to multiple kitchen printers simultaneously
  - Shows: Order ID, Table, Items, Quantity, Comments

### 2. **Customer Receipt (Final Bill)** - New Component
- **Purpose:** Printed for customer at payment time
- **Component:** `components/receipt/ThermalReceipt.jsx`
- **Printing Options:**
  - **Option A:** Browser Printing (Current) - Uses `window.print()` ✅
  - **Option B:** Direct Network Printer (New PHP file) - Like your KOT system

---

## 🖨️ Printing Options for Customer Receipts

### **Option A: Browser Printing (Current Setup) - RECOMMENDED**

**How it works:**
- User clicks "Print Receipt" button
- Browser print dialog opens
- User selects any printer (including thermal printers)
- No PHP file needed ✅

**Pros:**
- ✅ Works with any printer
- ✅ User can choose printer
- ✅ No network configuration needed
- ✅ Already implemented

**Cons:**
- User needs to select printer manually
- Requires printer to be configured on the computer

---

### **Option B: Direct Network Printer (Like Your KOT System)**

**File Created:** `api/print_receipt.php`

**How it works:**
- Sends receipt directly to network thermal printer via socket
- Uses ESC/POS commands (same as your KOT system)
- Automatic printing when payment is completed

**Usage:**

```javascript
// Call from frontend when payment is completed
const printReceipt = async (orderId, printerIp) => {
  try {
    const result = await apiPost('/print_receipt.php', {
      order_id: orderId,
      printer_ip: printerIp // Optional - if not provided, returns receipt data
    });
    
    if (result.success) {
      console.log('Receipt sent to printer');
    }
  } catch (error) {
    console.error('Print error:', error);
  }
};
```

**Pros:**
- ✅ Automatic printing
- ✅ No user interaction needed
- ✅ Consistent with your KOT printing system

**Cons:**
- Requires network printer IP address
- Printer must be accessible on network
- Need to configure printer IP

---

## 🔧 Setup Instructions

### **If Using Option A (Browser Printing):**
- ✅ **Already set up!** No additional configuration needed.
- Just ensure thermal printer is configured as default printer or user selects it.

### **If Using Option B (Direct Network Printing):**

1. **Get Printer IP Address:**
   - Usually printed on printer test page
   - Or check printer network settings
   - Example: `192.168.1.100`

2. **Store Printer IP:**
   - Add to database or configuration
   - Or pass from frontend when printing

3. **Update Frontend:**
   - Call `print_receipt.php` after payment
   - Pass `order_id` and `printer_ip`

4. **Test Connection:**
   - Ensure printer is on same network
   - Port 9100 must be open
   - Test with your KOT printing first

---

## 📝 PHP File Comparison

| Feature | KOT Printing (Your Existing) | Customer Receipt (New) |
|---------|------------------------------|------------------------|
| **Purpose** | Kitchen order tickets | Final customer receipt |
| **When** | Order placed | Payment completed |
| **Content** | Items, Qty, Comments | Full bill with totals |
| **Printers** | Multiple (by kitchen) | Single (receipt printer) |
| **Format** | ESC/POS | ESC/POS |

---

## 🚀 Integration Example

### **Add to Payment Completion:**

```javascript
// In your payment/bill completion handler
const handlePayBill = async () => {
  // ... existing payment code ...
  
  if (paymentSuccess) {
    // Option A: Browser print (already working)
    // User clicks print button manually
    
    // Option B: Auto print to network printer
    if (receiptPrinterIp) {
      await apiPost('/print_receipt.php', {
        order_id: orderId,
        printer_ip: receiptPrinterIp
      });
    }
  }
};
```

---

## ⚙️ Configuration

### **Receipt Printer IP Setting:**

You can add this to your settings or database:

```sql
-- Add receipt printer IP to branches or settings table
ALTER TABLE branches ADD COLUMN receipt_printer_ip VARCHAR(50) NULL;
```

Or store in localStorage/config:
```javascript
const RECEIPT_PRINTER_IP = '192.168.1.100'; // Your receipt printer IP
```

---

## 📄 File Structure

```
api/
  ├── print_receipt.php          ← NEW: Customer receipt printing
  └── (your_kot_print_file.php)  ← EXISTING: Kitchen order tickets

components/
  └── receipt/
      └── ThermalReceipt.jsx     ← Frontend receipt component
```

---

## ✅ Summary

1. **KOT Printing:** Keep your existing PHP file ✅
2. **Customer Receipts:**
   - **Current:** Browser printing (working, no PHP needed)
   - **Optional:** Use `print_receipt.php` for automatic network printing

**Recommendation:** 
- Use **browser printing** for flexibility
- Add **network printing** only if you want automatic printing at payment time

---

## 🆘 Troubleshooting

### **Browser Printing Issues:**
- Ensure thermal printer is installed and configured
- Check printer settings: Paper size = 80mm
- Test with regular printer first

### **Network Printing Issues:**
- Verify printer IP is correct
- Check network connectivity
- Ensure port 9100 is open
- Test with your KOT printing first

---

## 📞 Need Help?

- Check printer documentation for ESC/POS compatibility
- Test network connection: `telnet <printer_ip> 9100`
- Verify printer supports 80mm paper width

