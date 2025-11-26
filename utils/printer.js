/**
 * Direct Network Printer Utility
 * Sends print jobs directly to network printers via IP address
 * No dialog, silent printing to specified printers
 */

/**
 * Print receipt directly to network printer via IP address
 * @param {string} content - HTML content to print
 * @param {string} printerIP - Printer IP address
 * @param {number} printerPort - Printer port (default: 9100)
 * @returns {Promise<boolean>} - Success status
 */
export const printToNetworkPrinter = async (content, printerIP, printerPort = 9100) => {
  try {
    if (!printerIP) {
      console.error('Printer IP address is required');
      return false;
    }

    // Convert HTML to plain text for thermal printer
    const textContent = convertHtmlToText(content);
    
    // Send print job via API endpoint
    const response = await fetch('/api/print_direct.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        printer_ip: printerIP,
        printer_port: printerPort,
        content: textContent,
        format: 'thermal'
      })
    });

    if (response.ok) {
      const result = await response.json();
      return result.success === true;
    }
    
    return false;
  } catch (error) {
    console.error('Error printing to network printer:', error);
    return false;
  }
};

/**
 * Convert HTML content to plain text for thermal printer
 * @param {string} html - HTML content
 * @returns {string} - Plain text content
 */
const convertHtmlToText = (html) => {
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Extract text content
  let text = tempDiv.textContent || tempDiv.innerText || '';
  
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

/**
 * Print receipt to multiple printers based on categories
 * @param {string} receiptContent - HTML content of receipt
 * @param {Array} items - Order items with category/kitchen info
 * @param {Array} printers - Available printers with IP addresses
 * @param {Array} categories - Categories with printer associations
 * @returns {Promise<Object>} - Print results for each printer
 */
export const printToCategoryPrinters = async (receiptContent, items, printers, categories) => {
  const results = {};
  
  try {
    // Get unique categories from items
    const itemCategories = [...new Set(
      items
        .map(item => item.category_id || item.kitchen_id)
        .filter(Boolean)
    )];

    // Find printers for each category
    const printersToUse = [];
    
    for (const categoryId of itemCategories) {
      // Find category info
      const category = categories.find(cat => 
        (cat.category_id || cat.id) == categoryId ||
        (cat.kitchen_id || cat.kitchen_ID) == categoryId
      );
      
      if (category) {
        // Get printer from category's kitchen
        const kitchenId = category.kitchen_id || category.kitchen_ID;
        if (kitchenId) {
          // Find printer for this kitchen
          const printer = printers.find(p => 
            p.kitchen_id == kitchenId || 
            p.name?.toLowerCase().includes('kitchen') ||
            p.type === 'kitchen'
          );
          
          if (printer && printer.ip_address) {
            // Check if printer already added
            if (!printersToUse.find(p => p.ip_address === printer.ip_address)) {
              printersToUse.push({
                ip: printer.ip_address,
                port: printer.port || 9100,
                name: printer.name || `Printer ${printer.ip_address}`,
                category_id: categoryId
              });
            }
          }
        }
      }
    }

    // If no category-based printers found, use default printers
    if (printersToUse.length === 0) {
      const defaultPrinters = printers
        .filter(p => p.ip_address && (p.type === 'receipt' || p.type === 'kitchen'))
        .slice(0, 2); // Get first 2 printers
      
      defaultPrinters.forEach(printer => {
        printersToUse.push({
          ip: printer.ip_address,
          port: printer.port || 9100,
          name: printer.name || `Printer ${printer.ip_address}`
        });
      });
    }

    // Print to each printer
    for (const printer of printersToUse) {
      try {
        const success = await printToNetworkPrinter(
          receiptContent,
          printer.ip,
          printer.port
        );
        
        results[printer.name || printer.ip] = {
          success,
          printer: printer.name || printer.ip,
          ip: printer.ip
        };
      } catch (error) {
        console.error(`Error printing to ${printer.name}:`, error);
        results[printer.name || printer.ip] = {
          success: false,
          error: error.message,
          printer: printer.name || printer.ip,
          ip: printer.ip
        };
      }
    }

    return results;
  } catch (error) {
    console.error('Error in printToCategoryPrinters:', error);
    return results;
  }
};

/**
 * Print using browser's print API but without showing dialog
 * This is a fallback method
 * @param {string} content - HTML content
 * @returns {Promise<boolean>}
 */
export const silentPrint = (content) => {
  return new Promise((resolve) => {
    try {
      const printWindow = window.open('', '_blank', 'width=1,height=1');
      if (!printWindow) {
        resolve(false);
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print</title>
            <style>
              @media print {
                @page { size: 80mm auto; margin: 0; }
                body { margin: 0; padding: 0; }
              }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                margin: 0;
                padding: 10px;
              }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Try to print without dialog (may not work in all browsers)
      setTimeout(() => {
        try {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
            resolve(true);
          }, 500);
        } catch (error) {
          printWindow.close();
          resolve(false);
        }
      }, 250);
    } catch (error) {
      console.error('Error in silentPrint:', error);
      resolve(false);
    }
  });
};

