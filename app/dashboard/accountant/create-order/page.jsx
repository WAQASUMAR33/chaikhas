'use client';

/**
 * Create Order Page for Accountant
 * Create new order: Select Hall → Select Table → Select Dishes → Place Order → Show Receipt
 * Uses real APIs: get_halls.php, get_tables.php, get_products.php, create_order.php
 */

import { useEffect, useState, useCallback } from 'react';
import AccountantLayout from '@/components/accountant/AccountantLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import { apiPost, getTerminal, getToken, getBranchId } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { ShoppingCart, Plus, Minus, X, Receipt, Check } from 'lucide-react';
import { broadcastUpdate, UPDATE_EVENTS } from '@/utils/dashboardSync';

export default function CreateOrderPage() {
  const [halls, setHalls] = useState([]);
  const [tables, setTables] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [orderType, setOrderType] = useState('Dine In'); // Dine In, Take Away, Delivery
  const [selectedHall, setSelectedHall] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState([]); // [{ dish_id, name, price, quantity, category_name }]
  const [comments, setComments] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [printingStatus, setPrintingStatus] = useState(null);

  /**
   * Handle printing of KOT (Kitchen Order Ticket) receipt
   * Prints KOT to respective kitchens automatically
   */
  const handlePrintReceipt = useCallback(async () => {
    if (!orderReceipt || !orderReceipt.order_id) {
      setAlert({ type: 'error', message: 'No order data available to print KOT' });
      return;
    }

    try {
      const orderId = orderReceipt.order_id;
      // Use receipt items, but if they don't have category_id, try to get from cart
      let items = orderReceipt.items || [];
      
      // If items don't have category_id, try to merge with cart items that have category info
      if (items.length > 0 && !items[0].category_id && cart.length > 0) {
        items = items.map(receiptItem => {
          const cartItem = cart.find(c => c.dish_id === receiptItem.dish_id || c.dish_id === receiptItem.id);
          if (cartItem) {
            return {
              ...receiptItem,
              category_id: cartItem.category_id || receiptItem.category_id,
              kitchen_id: cartItem.kitchen_id || receiptItem.kitchen_id,
              kitchen: cartItem.kitchen || receiptItem.kitchen
            };
          }
          return receiptItem;
        });
      }
      
      if (items.length === 0) {
        setAlert({ type: 'error', message: 'No items found to print KOT' });
        return;
      }

      // Get unique kitchen IDs from items
      // Categories are linked to kitchens via kitchen_id field
      console.log('Raw items for KOT printing:', items);
      
      // Access categories from component scope - ensure it's an array
      const currentCategories = Array.isArray(categories) ? categories : [];
      console.log('Available categories:', currentCategories);
      
      // Create a map of category_id to kitchen_id from categories
      const categoryToKitchenMap = {};
      if (currentCategories && currentCategories.length > 0) {
        currentCategories.forEach(cat => {
        const catId = cat.category_id || cat.id;
        const kitchenId = cat.kitchen_id || cat.kitchen;
          if (catId && kitchenId) {
            categoryToKitchenMap[catId] = kitchenId;
          }
        });
      }
      
      console.log('Category to Kitchen Map:', categoryToKitchenMap);
      
      const kitchenIds = [...new Set(
        items
          .map((item, index) => {
            // Priority 1: Direct kitchen_id from item
            if (item.kitchen_id) {
              console.log(`Item ${index} (${item.dish_name || item.name}) has direct kitchen_id:`, item.kitchen_id);
              return item.kitchen_id;
            }
            
            // Priority 2: kitchen field from item
            if (item.kitchen) {
              console.log(`Item ${index} (${item.dish_name || item.name}) has kitchen field:`, item.kitchen);
              return item.kitchen;
            }
            
            // Priority 3: Look up kitchen_id from category using category_id
            const categoryId = item.category_id || item.cat_id || (item.category && item.category.id) || (item.category && item.category.category_id);
            if (categoryId) {
              const kitchenId = categoryToKitchenMap[categoryId];
              if (kitchenId) {
                console.log(`Item ${index} (${item.dish_name || item.name}) category_id ${categoryId} maps to kitchen_id:`, kitchenId);
                return kitchenId;
              } else {
                console.warn(`Item ${index} (${item.dish_name || item.name}) has category_id ${categoryId} but no kitchen_id found in categories map`);
              }
            }
            
            // Priority 4: Try nested category object
            if (item.category) {
              if (item.category.kitchen_id) {
                console.log(`Item ${index} (${item.dish_name || item.name}) has category.kitchen_id:`, item.category.kitchen_id);
                return item.category.kitchen_id;
              }
              if (item.category.kitchen) {
                console.log(`Item ${index} (${item.dish_name || item.name}) has category.kitchen:`, item.category.kitchen);
                return item.category.kitchen;
              }
            }
            
            console.warn(`Item ${index} (${item.dish_name || item.name}) has no kitchen information:`, item);
            return null;
          })
          .filter(Boolean)
      )];

      console.log('Extracted kitchen IDs:', kitchenIds);
      console.log('Order items with kitchen info:', items.map(item => {
        const categoryId = item.category_id || item.cat_id;
        const kitchenId = categoryId ? categoryToKitchenMap[categoryId] : null;
        return {
          name: item.dish_name || item.name,
          category_id: categoryId,
          kitchen_id: item.kitchen_id || kitchenId,
          kitchen: item.kitchen
        };
      }));

      if (kitchenIds.length === 0) {
        console.error('No kitchen IDs found in items:', items);
        setAlert({ 
          type: 'error', 
          message: 'No kitchen information found in items. Please ensure items have category/kitchen assigned. Check console for details.' 
        });
        return;
      }

      // Print KOT to each kitchen
      const branchId = getBranchId() || getTerminal();
      const terminal = getTerminal();
      const printPromises = kitchenIds.map(async (kitchenId) => {
        try {
          console.log(`Printing KOT to kitchen ${kitchenId} for order ${orderId}`);
          console.log('Print parameters:', { order_id: orderId, kitchen_id: kitchenId, branch_id: branchId, terminal });
          
          // Note: create_order_with_kitchen.php auto-prints KOT, but we can manually print if needed
          // Use api/print_kitchen_receipt.php directly (HTTP endpoint)
          const result = await apiPost('api/print_kitchen_receipt.php', {
            order_id: orderId,
            kitchen_id: kitchenId,
            branch_id: branchId,
            terminal: terminal
          });

          console.log(`KOT print result for kitchen ${kitchenId}:`, JSON.stringify(result, null, 2));

          // Check if the API call failed (network error, CORS, etc.)
          if (!result || result.success === false) {
            // Extract error message from result.data
            const errorMsg = result?.data?.message || 
                           result?.data?.details || 
                           result?.message || 
                           (result?.data?.endpoint ? `API endpoint not found: ${result.data.endpoint}` : 'Network error');
            const errorDetails = result?.data?.details || 
                               result?.data?.error || 
                               (result?.data?.apiUrl ? `Tried: ${result.data.apiUrl}` : '');
            const triedUrls = result?.data?.triedUrls || [];
            const endpoint = result?.data?.endpoint || 'api/print_kitchen_receipt.php';
            
            console.error(`KOT print failed for kitchen ${kitchenId}:`, {
              error: errorMsg,
              details: errorDetails,
              endpoint: endpoint,
              triedUrls: triedUrls,
              fullResult: result,
              status: result?.status || 'N/A'
            });
            
            // Create a more helpful error message
            let userMessage = errorMsg;
            if (errorMsg.includes('Cannot connect') || errorMsg.includes('Failed to fetch') || errorMsg.includes('CORS')) {
              userMessage = `Cannot connect to print server. The API endpoint "${endpoint}" may not exist or CORS is not enabled.`;
            }
            
            return { 
              kitchenId, 
              success: false, 
              message: userMessage,
              details: errorDetails,
              triedUrls: triedUrls,
              endpoint: endpoint
            };
          }

          // Handle successful API response
          if (result.data) {
            const responseData = result.data;
            
            // Log full response for debugging
            console.log(`Full API response for kitchen ${kitchenId}:`, JSON.stringify(responseData, null, 2));
            
            // Check for error messages first (even if success is true, there might be an error)
            // Look for actual print errors in message, error field, or results array
            const errorMessage = responseData.error || 
                               responseData.print_error ||
                               (responseData.message && (
                                 responseData.message.toLowerCase().includes('error') ||
                                 responseData.message.toLowerCase().includes('failed') ||
                                 responseData.message.toLowerCase().includes('timeout') ||
                                 responseData.message.toLowerCase().includes('could not connect') ||
                                 responseData.message.toLowerCase().includes('connection timed out') ||
                                 responseData.message.toLowerCase().includes('connection refused') ||
                                 responseData.message.toLowerCase().includes('timed out (110)') ||
                                 responseData.message.toLowerCase().includes('could not connect to printer')
                               ));
            
            // Also check results array for errors
            let resultsError = null;
            if (responseData.results && Array.isArray(responseData.results)) {
              const errorResult = responseData.results.find(r => 
                r.status === 'error' || 
                r.status === 'failed' ||
                (r.message && (
                  r.message.toLowerCase().includes('timeout') ||
                  r.message.toLowerCase().includes('could not connect') ||
                  r.message.toLowerCase().includes('connection timed out') ||
                  r.message.toLowerCase().includes('connection refused') ||
                  r.message.toLowerCase().includes('timed out (110)') ||
                  r.message.toLowerCase().includes('could not connect to printer')
                ))
              );
              if (errorResult) {
                resultsError = errorResult.message || errorResult.error || 'Print failed';
              }
            }
            
            // Check for print_error field (some APIs return this separately)
            if (responseData.print_error) {
              return { 
                kitchenId, 
                success: false, 
                message: responseData.print_error 
              };
            }
            
            if (errorMessage || resultsError) {
              return { 
                kitchenId, 
                success: false, 
                message: resultsError || errorMessage || responseData.message || 'Failed to print' 
              };
            }
            
            // Check if response indicates printer is reachable but printing might have failed
            // Look for actual print success indicators
            const hasPrintSuccess = responseData.printed === true || 
                                   responseData.print_success === true ||
                                   (responseData.message && (
                                     responseData.message.toLowerCase().includes('printed') ||
                                     responseData.message.toLowerCase().includes('sent to printer') ||
                                     responseData.message.toLowerCase().includes('successfully')
                                   ));
            
            // If success is true and we have printer_ip, check results for actual print status
            if (responseData.success === true && responseData.printer_ip) {
              // Check if results array indicates successful print
              if (responseData.results && Array.isArray(responseData.results)) {
                // Check for any errors in results first
                const errorResult = responseData.results.find(r => 
                  r.status === 'error' || 
                  r.status === 'failed' ||
                  (r.message && (
                    r.message.toLowerCase().includes('timeout') ||
                    r.message.toLowerCase().includes('could not connect') ||
                    r.message.toLowerCase().includes('connection timed out') ||
                    r.message.toLowerCase().includes('connection refused')
                  ))
                );
                
                if (errorResult) {
                  // Found an error in results - print failed
                  return { 
                    kitchenId, 
                    success: false, 
                    message: errorResult.message || errorResult.error || 'Print failed' 
                  };
                }
                
                // Check for successful print
                const hasSuccessfulPrint = responseData.results.some(r => 
                  r.status === 'success' && 
                  (r.write_test === 'passed' || r.printed === true || r.print_success === true)
                );
                
                if (hasSuccessfulPrint || hasPrintSuccess) {
                  const kitchenName = responseData.kitchen_name || responseData.name || `Kitchen ${kitchenId}`;
                  const printerIp = responseData.printer_ip || responseData.printer || '';
                  return { 
                    kitchenId, 
                    kitchenName,
                    printerIp,
                    success: true, 
                    message: responseData.message || 'Printed successfully' 
                  };
                }
                
                // If results only show "reachable" or "port open" but no actual print success
                // This means printer is reachable but print might have failed
                const onlyReachable = responseData.results.every(r => 
                  r.message && (
                    r.message.toLowerCase().includes('reachable') ||
                    r.message.toLowerCase().includes('port') ||
                    r.message.toLowerCase().includes('open and accessible') ||
                    r.message.toLowerCase().includes('write test passed')
                  ) && !r.printed && !r.print_success
                );
                
                if (onlyReachable && !hasPrintSuccess) {
                  // Printer is reachable but no clear indication that print succeeded
                  // Check if there's a separate print attempt that failed
                  // The backend might check reachability first, then try to print separately
                  // If we only see "reachable" without "printed", assume print failed
                  console.warn(`Printer ${responseData.printer_ip} is reachable but no print success confirmation for kitchen ${kitchenId}`);
                  console.warn('Response indicates printer connectivity check passed, but actual print status is unclear');
                  
                  // Return error since we can't confirm print success
                  return { 
                    kitchenId, 
                    success: false, 
                    message: 'Printer is reachable but print may have failed. The printer connectivity check passed, but the actual print job may not have been sent successfully. Please check the printer or try again.' 
                  };
                }
              } else if (hasPrintSuccess) {
                // Direct print success indicator
                const kitchenName = responseData.kitchen_name || responseData.name || `Kitchen ${kitchenId}`;
                const printerIp = responseData.printer_ip || responseData.printer || '';
                return { 
                  kitchenId, 
                  kitchenName,
                  printerIp,
                  success: true, 
                  message: responseData.message || 'Printed successfully' 
                };
              }
              
              // If printer is reachable but no clear print success, it might have failed
              // Check for timeout or connection errors in message
              if (responseData.message && (
                responseData.message.toLowerCase().includes('reachable') ||
                responseData.message.toLowerCase().includes('port')
              )) {
                // Printer is reachable but actual print might have failed
                // Return error since we can't confirm print success
                console.warn(`Printer ${responseData.printer_ip} is reachable but print status unclear for kitchen ${kitchenId}`);
                return { 
                  kitchenId, 
                  success: false, 
                  message: 'Printer is reachable but print status is unclear. Please check printer.' 
                };
              }
            }
            
            // Handle nested success field with kitchen_name
            if (responseData.success === true || (responseData.success === undefined && responseData.kitchen_name)) {
              const kitchenName = responseData.kitchen_name || responseData.name || `Kitchen ${kitchenId}`;
              const printerIp = responseData.printer_ip || responseData.printer || '';
              return { 
                kitchenId, 
                kitchenName,
                printerIp,
                success: true, 
                message: responseData.message || 'Printed successfully' 
              };
            }
            
            // Check if result.data has error message
            if (responseData.message || responseData.error) {
              return { 
                kitchenId, 
                success: false, 
                message: responseData.message || responseData.error || 'Failed to print' 
              };
            }
          }
          
          // If result.success is true but no data structure, assume success
          if (result.success === true) {
            return { 
              kitchenId, 
              kitchenName: `Kitchen ${kitchenId}`,
              printerIp: '',
              success: true, 
              message: 'Printed successfully' 
            };
          }
          
          // If we get here, the response structure is unexpected
          console.warn(`Unexpected response structure for kitchen ${kitchenId}:`, result);
          return { 
            kitchenId, 
            success: false, 
            message: result?.data?.message || result?.message || 'Unexpected response from server' 
          };
    } catch (error) {
          console.error(`Exception caught while printing KOT for kitchen ${kitchenId}:`, error);
          // If error is thrown (unexpected), extract details
          const errorMessage = error?.message || 
                             error?.data?.message || 
                             error?.data?.details || 
                             'Unexpected error occurred';
          const errorDetails = error?.data?.details || 
                             error?.data?.error || 
                             (error?.stack ? error.stack.substring(0, 200) : '');
          const triedUrls = error?.data?.triedUrls || [];
          
          return { 
            kitchenId, 
            success: false, 
            message: `Error: ${errorMessage}`,
            details: errorDetails,
            triedUrls: triedUrls
          };
        }
      });

      const results = await Promise.all(printPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      if (successful.length > 0) {
        const kitchenNames = successful.map(r => {
          const name = r.kitchenName || `Kitchen ${r.kitchenId}`;
          const printer = r.printerIp ? ` (${r.printerIp})` : '';
          return `${name}${printer}`;
        }).join(', ');
        
        setAlert({ 
          type: 'success', 
          message: `KOT sent successfully to ${successful.length} kitchen(s): ${kitchenNames}` 
        });
      } else {
        // Provide more detailed error information
        const errorMessages = failed.map(r => {
          let msg = `Kitchen ${r.kitchenId}: ${r.message}`;
          if (r.details && r.details.length > 0) {
            // Add first line of details if available
            const firstLine = r.details.split('\n')[0];
            if (firstLine && firstLine.length < 100) {
              msg += ` (${firstLine})`;
            }
          }
          return msg;
        }).join('; ');
        
        // Check if it's a CORS/network issue
        const isNetworkError = failed.some(r => 
          r.message?.includes('CORS') || 
          r.message?.includes('Cannot connect') || 
          r.message?.includes('Network')
        );
        
        let fullMessage = `KOT printing failed for all kitchens. ${errorMessages}`;
        
        if (isNetworkError) {
          fullMessage += '\n\nPossible solutions:\n';
          fullMessage += '1. Check if the API endpoint exists: api/print_kitchen_receipt.php\n';
          fullMessage += '2. Verify CORS headers are enabled on the server\n';
          fullMessage += '3. Check server logs for errors\n';
          fullMessage += '4. Ensure the kitchen printer is configured correctly';
        }
        
        setAlert({ 
          type: 'error', 
          message: fullMessage 
        });
      }
      
      // Log results for debugging
      console.log('KOT Print Results:', { successful, failed });
    } catch (error) {
      console.error('Error printing KOT:', error);
      setAlert({ 
        type: 'error', 
        message: 'Error printing KOT: ' + (error.message || 'Network error') 
      });
    }
  }, [orderReceipt, categories]);

  /**
   * Auto-print KOT when order is placed and receipt modal opens
   */
  useEffect(() => {
    if (receiptModalOpen && orderReceipt && orderReceipt.order_id) {
      // Auto-print KOT after a short delay
      const timer = setTimeout(() => {
        handlePrintReceipt();
      }, 500); // Small delay to ensure order is fully created
      return () => clearTimeout(timer);
    }
  }, [receiptModalOpen, orderReceipt, handlePrintReceipt]);

  useEffect(() => {
    fetchHalls();
    fetchCategories();
    fetchDishes();
  }, []);

  useEffect(() => {
    if (selectedHall) {
      fetchTables();
    } else {
      setTables([]);
      setSelectedTable('');
    }
  }, [selectedHall]);

  // Filter dishes on client side - no need to refetch

  /**
   * Fetch halls from API (Accountant)
   * Only fetch halls for their branch
   */
  const fetchHalls = async () => {
    try {
      const terminal = getTerminal();
      let branchId = getBranchId();
      
      // Ensure branch_id is valid
      if (branchId) {
        branchId = branchId.toString().trim();
        if (branchId === 'null' || branchId === 'undefined' || branchId === '') {
          branchId = null;
        } else {
          const numBranchId = parseInt(branchId, 10);
          if (isNaN(numBranchId) || numBranchId <= 0) {
            branchId = null;
          }
        }
      }
      
      // Accountant MUST have branch_id
      if (!branchId) {
        console.error('❌ Branch ID is missing for fetching halls');
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        setHalls([]);
        return;
      }
      
      console.log('=== Fetching Halls (Create Order - Accountant) ===');
      console.log('Params:', { terminal, branch_id: branchId });
      
      const result = await apiPost('/get_halls.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for accountant
      });
      
      console.log('get_halls.php response:', result);
      
      let hallsData = [];
      
      // Handle multiple possible response structures
      if (result.data && Array.isArray(result.data)) {
        hallsData = result.data;
        console.log('✅ Found halls in result.data (array)');
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        hallsData = result.data.data;
        console.log('✅ Found halls in result.data.success.data');
      } else if (result.data && typeof result.data === 'object') {
        for (const key in result.data) {
          if (Array.isArray(result.data[key])) {
            hallsData = result.data[key];
            console.log(`✅ Found halls in result.data.${key}`);
            break;
          }
        }
      }
      
      if (hallsData.length > 0) {
        console.log(`✅ Total halls found: ${hallsData.length}`);
        // Map to ensure consistent structure
        const mappedHalls = hallsData.map((hall) => ({
          hall_id: hall.hall_id || hall.id || hall.HallID,
          id: hall.hall_id || hall.id || hall.HallID,
          name: hall.name || hall.hall_name || hall.Name || '',
          capacity: hall.capacity || 0,
          branch_id: hall.branch_id || branchId,
        })).filter(hall => hall.hall_id); // Filter out invalid entries
        
        setHalls(mappedHalls);
        setAlert({ type: '', message: '' }); // Clear any previous errors
      } else {
        console.warn('⚠️ No halls found for this branch');
        setHalls([]);
        setAlert({ type: 'warning', message: 'No halls found. Please add halls in the Hall Management page.' });
      }
    } catch (error) {
      console.error('❌ Error fetching halls:', error);
      setAlert({ type: 'error', message: 'Failed to load halls: ' + (error.message || 'Network error') });
      setHalls([]);
    }
  };

  /**
   * Fetch tables from API (Accountant)
   * Only fetch tables for their branch, filtered by selected hall
   */
  const fetchTables = async () => {
    try {
      if (!selectedHall) {
        setTables([]);
        return;
      }
      
      const terminal = getTerminal();
      let branchId = getBranchId();
      
      // Ensure branch_id is valid
      if (branchId) {
        branchId = branchId.toString().trim();
        if (branchId === 'null' || branchId === 'undefined' || branchId === '') {
          branchId = null;
        } else {
          const numBranchId = parseInt(branchId, 10);
          if (isNaN(numBranchId) || numBranchId <= 0) {
            branchId = null;
          }
        }
      }
      
      // Accountant MUST have branch_id
      if (!branchId) {
        console.error('❌ Branch ID is missing for fetching tables');
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        setTables([]);
        return;
      }
      
      console.log('=== Fetching Tables (Create Order - Accountant) ===');
      console.log('Params:', { terminal, branch_id: branchId, hall_id: selectedHall });
      
      const result = await apiPost('/get_tables.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for accountant
      });
      
      console.log('get_tables.php response:', result);
      
      let tablesData = [];
      
      // Handle multiple possible response structures
      if (result.data && Array.isArray(result.data)) {
        tablesData = result.data;
        console.log('✅ Found tables in result.data (array)');
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        tablesData = result.data.data;
        console.log('✅ Found tables in result.data.success.data');
      } else if (result.data && typeof result.data === 'object') {
        for (const key in result.data) {
          if (Array.isArray(result.data[key])) {
            tablesData = result.data[key];
            console.log(`✅ Found tables in result.data.${key}`);
            break;
          }
        }
      }
      
      if (tablesData.length > 0) {
        // Map to ensure consistent structure and filter by selected hall
        const mappedTables = tablesData
          .map((table) => ({
            table_id: table.table_id || table.id || table.TableID,
            id: table.table_id || table.id || table.TableID,
            table_number: table.table_number || table.table_name || table.number || '',
            hall_id: table.hall_id || table.HallID || null,
            hall_name: table.hall_name || table.hall_Name || '',
            capacity: table.capacity || table.Capacity || 0,
            status: table.status || table.Status || 'available',
            branch_id: table.branch_id || branchId,
          }))
          .filter(table => table.table_id && table.hall_id == selectedHall); // Filter by hall
        
        console.log(`✅ Total tables found for hall ${selectedHall}: ${mappedTables.length}`);
        setTables(mappedTables);
      } else {
        console.warn('⚠️ No tables found for this branch and hall');
        setTables([]);
      }
    } catch (error) {
      console.error('❌ Error fetching tables:', error);
      setAlert({ type: 'error', message: 'Failed to load tables: ' + (error.message || 'Network error') });
      setTables([]);
    }
  };

  /**
   * Fetch categories from API (Accountant)
   * Only fetch categories for their branch
   */
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const terminal = getTerminal();
      let branchId = getBranchId();
      
      // Ensure branch_id is valid
      if (branchId) {
        branchId = branchId.toString().trim();
        if (branchId === 'null' || branchId === 'undefined' || branchId === '') {
          branchId = null;
        } else {
          const numBranchId = parseInt(branchId, 10);
          if (isNaN(numBranchId) || numBranchId <= 0) {
            branchId = null;
          }
        }
      }
      
      // Accountant MUST have branch_id
      if (!branchId) {
        console.error('❌ Branch ID is missing for fetching categories');
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        setCategories([]);
        setLoading(false);
        return;
      }
      
      console.log('=== Fetching Categories (Create Order - Accountant) ===');
      console.log('Params:', { terminal, branch_id: branchId });
      
      const result = await apiPost('/get_categories.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for accountant
      });
      
      console.log('get_categories.php full response:', JSON.stringify(result, null, 2));
      
      let categoriesData = [];
      
      // Handle multiple possible response structures
      if (result.success && result.data) {
        // Check if data is an array directly
        if (Array.isArray(result.data)) {
          categoriesData = result.data;
          console.log('✅ Found categories in result.data (array)');
        } 
        // Check if data.success is true and data.data is an array
        else if (result.data.success === true && Array.isArray(result.data.data)) {
          categoriesData = result.data.data;
          console.log('✅ Found categories in result.data.data');
        }
        // Check if data is an object with a data property that's an array
        else if (typeof result.data === 'object' && Array.isArray(result.data.data)) {
          categoriesData = result.data.data;
          console.log('✅ Found categories in result.data.data');
        }
        // Check for categories property
        else if (Array.isArray(result.data.categories)) {
          categoriesData = result.data.categories;
          console.log('✅ Found categories in result.data.categories');
        }
        // Try to find any array property in result.data
        else if (typeof result.data === 'object') {
          for (const key in result.data) {
            if (Array.isArray(result.data[key]) && key !== 'details' && key !== 'count') {
              categoriesData = result.data[key];
              console.log(`✅ Found categories in result.data.${key}`);
              break;
            }
          }
        }
      }
      
      if (categoriesData.length > 0) {
        console.log(`✅ Total categories found: ${categoriesData.length}`);
        setCategories(categoriesData);
        setAlert({ type: '', message: '' }); // Clear any previous errors
      } else {
        console.warn('⚠️ No categories found for this branch');
        setCategories([]);
        setAlert({ type: 'warning', message: 'No categories found. Please add categories in the Category Management page.' });
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      setAlert({ type: 'error', message: 'Failed to load categories: ' + (error.message || 'Network error') });
      setCategories([]);
      setLoading(false);
    }
  };

  /**
   * Fetch dishes/menu items from API (Accountant)
   * Only fetch products for their branch
   */
  const fetchDishes = async () => {
    try {
      const terminal = getTerminal();
      let branchId = getBranchId();
      
      // Ensure branch_id is valid
      if (branchId) {
        branchId = branchId.toString().trim();
        if (branchId === 'null' || branchId === 'undefined' || branchId === '') {
          branchId = null;
        } else {
          const numBranchId = parseInt(branchId, 10);
          if (isNaN(numBranchId) || numBranchId <= 0) {
            branchId = null;
          }
        }
      }
      
      // Accountant MUST have branch_id
      if (!branchId) {
        console.error('❌ Branch ID is missing for fetching products');
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        setDishes([]);
        setLoading(false);
        return;
      }
      
      console.log('=== Fetching Products (Create Order - Accountant) ===');
      console.log('Params:', { terminal, branch_id: branchId });
      
      const result = await apiPost('/get_products.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for accountant
      });
      
      console.log('get_products.php response:', result);
      
      let dishesData = [];
      
      // Handle multiple possible response structures
      if (result.data && Array.isArray(result.data)) {
        dishesData = result.data;
        console.log('✅ Found products in result.data (array)');
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        dishesData = result.data.data;
        console.log('✅ Found products in result.data.success.data');
      } else if (result.data && typeof result.data === 'object') {
        // Check for products property
        if (Array.isArray(result.data.products)) {
          dishesData = result.data.products;
          console.log('✅ Found products in result.data.products');
        } else {
          // Try to find any array property
          for (const key in result.data) {
            if (Array.isArray(result.data[key])) {
              dishesData = result.data[key];
              console.log(`✅ Found products in result.data.${key}`);
              break;
            }
          }
        }
      }
      
      if (dishesData.length > 0) {
        console.log(`✅ Total products found: ${dishesData.length}`);
        setDishes(dishesData);
        setAlert({ type: '', message: '' }); // Clear any previous errors
      } else {
        console.warn('⚠️ No products found for this branch');
        setDishes([]);
        setAlert({ type: 'warning', message: 'No menu items found. Please add products in the Menu Management page.' });
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      setAlert({ type: 'error', message: 'Failed to load menu items: ' + (error.message || 'Network error') });
      setDishes([]);
      setLoading(false);
    }
  };

  /**
   * Add item to cart
   */
  const addToCart = (dish) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.dish_id === dish.dish_id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.dish_id === dish.dish_id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...dish, quantity: 1 }];
    });
  };

  /**
   * Update cart item quantity
   */
  const updateCartQuantity = (dishId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(dishId);
      return;
    }
    setCart(cart.map(item =>
      item.dish_id === dishId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  /**
   * Remove item from cart
   */
  const removeFromCart = (dishId) => {
    setCart(cart.filter(item => item.dish_id !== dishId));
  };

  /**
   * Calculate totals
   */
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return { subtotal, total: subtotal };
  };

  /**
   * Place order
   */
  const placeOrder = async () => {
    // Validate based on order type
    if (orderType === 'Dine In' && (!selectedHall || !selectedTable)) {
      setAlert({ type: 'error', message: 'Please select a hall and table for Dine In orders' });
      return;
    }
    if (cart.length === 0) {
      setAlert({ type: 'error', message: 'Cart is empty. Please add items' });
      return;
    }
    
    // Check if table is already running (for Dine In orders)
    if (orderType === 'Dine In' && selectedTable) {
      const selectedTableData = tables.find(t => (t.table_id || t.id) == selectedTable);
      if (selectedTableData) {
        const tableStatus = (selectedTableData.status || selectedTableData.Status || '').toLowerCase();
        if (tableStatus === 'running') {
          setAlert({ type: 'error', message: `Table ${selectedTableData.table_number || selectedTable} is currently running. Please select an available table.` });
          return;
        }
      }
    }

    setPlacing(true);
    setAlert({ type: '', message: '' });
    setPrintingStatus('Creating order...');

    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      const userId = getToken(); // Get user ID from token or localStorage
      
      // Prepare order items
      const items = cart.map(item => ({
        dish_id: item.dish_id,
        price: item.price,
        quantity: item.quantity,
      }));

      const { subtotal } = calculateTotals();

      // Prepare order data matching database structure
      // Order status is "Running" to send to kitchen
      // Service charge and discount will be added when generating bill
      const orderData = {
        customer_id: null, // Can be added later if customer selection is needed
        order_type: orderType, // Dine In, Take Away, Delivery
        order_status: 'Running', // Send to Kitchen
        service_charge: 0, // Will be added when generating bill
        discount_amount: 0, // Will be added when generating bill
        order_taker_id: parseInt(userId) || 1,
        payment_mode: 'Cash', // Default, will be set when generating bill
        bill_by: 0,
        hall_id: orderType === 'Dine In' ? parseInt(selectedHall) : 0,
        table_id: orderType === 'Dine In' ? parseInt(selectedTable) : 0,
        comments: comments,
        terminal: terminal,
        branch_id: branchId || terminal, // Use branch_id or fallback to terminal
        items: items,
      };

      // Use kitchen routing API for automatic kitchen assignment
      // Backend automatically prints kitchen receipts after order creation
      const result = await apiPost('/create_order_with_kitchen.php', orderData);

      // Handle response - check for empty response first
      if (!result.data) {
        setAlert({ type: 'error', message: 'Server returned an empty response. Please check your connection and try again.' });
        return;
      }

      // Handle nested response structure: result.data.success and result.data.data
      if (result.success && result.data) {
        // Check if response has success field (nested structure)
        if (result.data.success === true && result.data.data) {
          const responseData = result.data.data;
          // Prefer items returned by API; if missing, fall back to cart items
          let receiptItems =
            (Array.isArray(responseData.items) && responseData.items.length > 0)
              ? responseData.items
              : cart.map(cartItem => ({
                  dish_name: cartItem.name,
                  name: cartItem.name,
                  quantity: cartItem.quantity,
                  qty: cartItem.quantity,
                  price: cartItem.price,
                  dish_id: cartItem.dish_id,
                  category_id: cartItem.category_id,
                  kitchen_id: cartItem.kitchen_id,
                  kitchen: cartItem.kitchen,
                  category_name: cartItem.category_name
                }));

          // Merge category/kitchen info from cart if API items don't have it
          if (receiptItems.length > 0 && cart.length > 0) {
            receiptItems = receiptItems.map(item => {
              const cartItem = cart.find(c => 
                c.dish_id === item.dish_id || 
                c.dish_id === item.id ||
                (c.name === item.name && c.price === item.price)
              );
              if (cartItem) {
                return {
                  ...item,
                  dish_name: item.dish_name || cartItem.name,
                  name: item.name || cartItem.name,
                  quantity: item.quantity || cartItem.quantity,
                  qty: item.qty || item.quantity || cartItem.quantity,
                  category_id: item.category_id || cartItem.category_id,
                  kitchen_id: item.kitchen_id || cartItem.kitchen_id,
                  kitchen: item.kitchen || cartItem.kitchen,
                  category_name: item.category_name || cartItem.category_name
                };
              }
              return item;
            });
          }

          // Ensure items always have required fields
          receiptItems = receiptItems.map(item => ({
            dish_name: item.dish_name || item.name || 'Item',
            name: item.name || item.dish_name || 'Item',
            quantity: item.quantity || item.qty || 1,
            qty: item.qty || item.quantity || 1,
            price: item.price || 0,
            dish_id: item.dish_id || item.id,
            category_id: item.category_id,
            kitchen_id: item.kitchen_id,
            kitchen: item.kitchen,
            category_name: item.category_name
          }));

          setOrderReceipt({
            order: responseData.order || responseData,
            items: receiptItems,
            order_id: responseData.order_id || (responseData.order ? responseData.order.order_id : null),
          });
          
          // Show printing status
          setPrintingStatus('Order created! Printing kitchen receipts...');
          
          // Wait a moment then update status
          setTimeout(() => {
            setPrintingStatus('Kitchen receipts sent to printers');
            setTimeout(() => setPrintingStatus(null), 3000);
          }, 1000);
          
          setReceiptModalOpen(true);
          
          // Update table status to "Running" for Dine In orders
          if (orderType === 'Dine In' && selectedTable) {
            try {
              const terminal = getTerminal();
              const branchId = getBranchId();
              const tableData = tables.find(t => (t.table_id || t.id) == selectedTable);
              
              console.log('🔄 Updating table status to Running for table:', selectedTable);
              await apiPost('/table_management.php', {
                table_id: parseInt(selectedTable),
                hall_id: parseInt(selectedHall),
                table_number: tableData?.table_number || tableData?.table_name || '',
                capacity: tableData?.capacity || 0,
                status: 'running', // Use lowercase to match API
                terminal: terminal,
                branch_id: branchId || terminal,
                action: 'update'
              });
              console.log('✅ Table status updated to Running');
            } catch (error) {
              console.error('❌ Error updating table status:', error);
              // Don't block order placement if table update fails
            }
          }
          
          // Reset form
          setCart([]);
          setOrderType('Dine In');
          setSelectedHall('');
          setSelectedTable('');
          setComments('');
          setAlert({ type: 'success', message: result.data.message || 'Order placed successfully! Kitchen receipts are being printed automatically.' });
          // Broadcast update to other dashboard instances
          if (result.data.order_id) {
            broadcastUpdate(UPDATE_EVENTS.ORDER_CREATED, { 
              order_id: result.data.order_id 
            });
          }
        } else if (result.data.success === false) {
          // API returned an error
          setPrintingStatus(null);
          setAlert({ type: 'error', message: result.data.message || 'Failed to place order' });
        } else {
          // Direct data response (no nested structure)
          const responseData = result.data;
          let receiptItems =
            (Array.isArray(responseData.items) && responseData.items.length > 0)
              ? responseData.items
              : cart.map(cartItem => ({
                  dish_name: cartItem.name,
                  name: cartItem.name,
                  quantity: cartItem.quantity,
                  qty: cartItem.quantity,
                  price: cartItem.price,
                  dish_id: cartItem.dish_id,
                  category_id: cartItem.category_id,
                  kitchen_id: cartItem.kitchen_id,
                  kitchen: cartItem.kitchen,
                  category_name: cartItem.category_name
                }));

          // Merge category/kitchen info from cart if API items don't have it
          if (receiptItems.length > 0 && cart.length > 0) {
            receiptItems = receiptItems.map(item => {
              const cartItem = cart.find(c => 
                c.dish_id === item.dish_id || 
                c.dish_id === item.id ||
                (c.name === item.name && c.price === item.price)
              );
              if (cartItem) {
                return {
                  ...item,
                  dish_name: item.dish_name || cartItem.name,
                  name: item.name || cartItem.name,
                  quantity: item.quantity || cartItem.quantity,
                  qty: item.qty || item.quantity || cartItem.quantity,
                  category_id: item.category_id || cartItem.category_id,
                  kitchen_id: item.kitchen_id || cartItem.kitchen_id,
                  kitchen: item.kitchen || cartItem.kitchen,
                  category_name: item.category_name || cartItem.category_name
                };
              }
              return item;
            });
          }

          // Ensure items always have required fields
          receiptItems = receiptItems.map(item => ({
            dish_name: item.dish_name || item.name || 'Item',
            name: item.name || item.dish_name || 'Item',
            quantity: item.quantity || item.qty || 1,
            qty: item.qty || item.quantity || 1,
            price: item.price || 0,
            dish_id: item.dish_id || item.id,
            category_id: item.category_id,
            kitchen_id: item.kitchen_id,
            kitchen: item.kitchen,
            category_name: item.category_name
          }));

          setOrderReceipt({
            order: responseData.order || responseData,
            items: receiptItems,
            order_id: responseData.order_id || (responseData.order ? responseData.order.order_id : null),
          });
          
          // Show printing status
          setPrintingStatus('Order created! Printing kitchen receipts...');
          
          // Wait a moment then update status
          setTimeout(() => {
            setPrintingStatus('Kitchen receipts sent to printers');
            setTimeout(() => setPrintingStatus(null), 3000);
          }, 1000);
          
          setReceiptModalOpen(true);
          
          // Update table status to "Running" for Dine In orders
          if (orderType === 'Dine In' && selectedTable) {
            try {
              const terminal = getTerminal();
              const branchId = getBranchId();
              const tableData = tables.find(t => (t.table_id || t.id) == selectedTable);
              
              console.log('🔄 Updating table status to Running for table:', selectedTable);
              await apiPost('/table_management.php', {
                table_id: parseInt(selectedTable),
                hall_id: parseInt(selectedHall),
                table_number: tableData?.table_number || tableData?.table_name || '',
                capacity: tableData?.capacity || 0,
                status: 'running', // Use lowercase to match API
                terminal: terminal,
                branch_id: branchId || terminal,
                action: 'update'
              });
              console.log('✅ Table status updated to Running');
            } catch (error) {
              console.error('❌ Error updating table status:', error);
              // Don't block order placement if table update fails
            }
          }
          
          // Reset form
          setCart([]);
          setOrderType('Dine In');
          setSelectedHall('');
          setSelectedTable('');
          setComments('');
          setAlert({ type: 'success', message: 'Order placed successfully! Kitchen receipts are being printed automatically.' });
          // Broadcast update to other dashboard instances
          if (result.data && result.data.order_id) {
            broadcastUpdate(UPDATE_EVENTS.ORDER_CREATED, { 
              order_id: result.data.order_id 
            });
          } else if (responseData && responseData.order_id) {
            broadcastUpdate(UPDATE_EVENTS.ORDER_CREATED, { 
              order_id: responseData.order_id 
            });
          }
        }
      } else {
        setPrintingStatus(null);
        setAlert({ type: 'error', message: result.data?.message || result.data?.rawResponse || 'Failed to place order' });
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setPrintingStatus(null);
      setAlert({ type: 'error', message: 'Failed to place order: ' + (error.message || 'Network error') });
    } finally {
      setPlacing(false);
    }
  };

  const { subtotal } = calculateTotals();
  
  // Filter dishes by selected category - only show items when category is selected
  const filteredDishes = selectedCategory 
    ? dishes.filter(dish => String(dish.category_id) === String(selectedCategory) && dish.is_available == 1)
    : [];

  return (
    <AccountantLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Order</h1>
          <p className="text-gray-600 mt-1">Select hall, table, and dishes to create a new order</p>
        </div>

        {/* Alert Message */}
        {alert.message && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert({ type: '', message: '' })}
          />
        )}

        {/* Printing Status Indicator */}
        {printingStatus && (
          <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-fade-in">
            {printingStatus.includes('Printing') && (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            )}
            <span className="font-medium">{printingStatus}</span>
          </div>
        )}

        {/* Order Selection - Horizontal Row */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Order Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Order Type <span className="text-red-500">*</span>
              </label>
              <select
                value={orderType}
                onChange={(e) => {
                  setOrderType(e.target.value);
                  if (e.target.value !== 'Dine In') {
                    setSelectedHall('');
                    setSelectedTable('');
                  }
                }}
                required
                className="block w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition shadow-sm hover:border-gray-300"
              >
                <option value="Dine In">Dine In</option>
                <option value="Take Away">Take Away</option>
                <option value="Delivery">Delivery</option>
              </select>
            </div>

            {/* Select Hall (only for Dine In) */}
            {orderType === 'Dine In' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Hall <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedHall}
                  onChange={(e) => {
                    setSelectedHall(e.target.value);
                    setSelectedTable('');
                  }}
                  required
                  className="block w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition shadow-sm hover:border-gray-300"
                >
                  <option value="">Select a hall</option>
                  {halls.map((hall) => (
                    <option key={hall.hall_id} value={hall.hall_id}>
                      {hall.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Select Table (only for Dine In) */}
            {orderType === 'Dine In' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Table <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  required
                  disabled={!selectedHall}
                  className="block w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition shadow-sm hover:border-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  <option value="">Select a table</option>
                  {tables.map((table) => {
                    const tableStatus = (table.status || table.Status || 'available').toLowerCase();
                    const isRunning = tableStatus === 'running';
                    return (
                      <option 
                        key={table.table_id} 
                        value={table.table_id}
                        disabled={isRunning}
                        style={isRunning ? { color: '#ef4444', fontStyle: 'italic' } : {}}
                      >
                        {table.table_number} - Capacity: {table.capacity} ({table.status || 'available'}){isRunning ? ' - Running' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items & Cart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              {/* Categories - Attractive Design */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Select Category</h3>
                    <p className="text-sm text-gray-500">Choose a category to view menu items</p>
                  </div>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory('')}
                      className="text-xs text-[#FF5F15] hover:text-[#FF9500] font-semibold px-3 py-1.5 rounded-lg hover:bg-orange-50 transition border border-orange-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories.map((category) => {
                    const isSelected = String(selectedCategory) === String(category.category_id);
                    return (
                      <button
                        key={category.category_id}
                        onClick={() => setSelectedCategory(String(category.category_id))}
                        className={`relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300 transform hover:scale-105 ${
                          isSelected
                            ? 'bg-gradient-to-br from-[#FF5F15] to-[#FF9500] text-white shadow-xl ring-4 ring-orange-200'
                            : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 border-2 border-gray-200 hover:border-[#FF5F15] shadow-md hover:shadow-lg'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                        )}
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                              {category.name}
                            </span>
                            {isSelected && (
                              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-[#FF5F15]" />
                              </div>
                            )}
                          </div>
                          <div className={`text-xs ${isSelected ? 'text-orange-100' : 'text-gray-500'}`}>
                            {dishes.filter(d => String(d.category_id) === String(category.category_id) && d.is_available == 1).length} items available
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {categories.length === 0 && (
                    <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <p className="text-sm text-gray-500">No categories available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Menu Items Section */}
              {!selectedCategory ? (
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 bg-[#FF5F15] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="w-10 h-10 text-[#FF5F15]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Category</h3>
                    <p className="text-gray-600 mb-4">
                      Please select a category from above to view and add menu items to your order.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-[#FF5F15] rounded-full animate-pulse"></div>
                      <span>Choose a category to get started</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">
                          Menu Items
                        </h2>
                        <p className="text-sm text-gray-600">
                          Category: <span className="font-semibold text-[#FF5F15]">{categories.find(c => String(c.category_id) === String(selectedCategory))?.name || 'Selected'}</span>
                        </p>
                      </div>
                      <div className="px-3 py-1.5 bg-[#FF5F15] bg-opacity-10 rounded-lg">
                        <span className="text-sm font-semibold text-[#FF5F15]">
                          {filteredDishes.length} {filteredDishes.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#FF5F15] border-t-transparent mb-3"></div>
                      <p className="text-gray-500">Loading menu items...</p>
                    </div>
                  ) : filteredDishes.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <p className="text-gray-600 font-medium mb-2">No dishes available in this category</p>
                      <p className="text-sm text-gray-500">Try selecting a different category</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredDishes.map((dish) => (
                        <div
                          key={dish.dish_id}
                          className="group relative bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-xl hover:border-[#FF5F15] transition-all duration-300 transform hover:-translate-y-1"
                        >
                          {/* Hover effect overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-[#FF5F15] to-[#FF9500] opacity-0 group-hover:opacity-5 rounded-xl transition-opacity duration-300"></div>
                          
                          <div className="relative">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-[#FF5F15] transition-colors">{dish.name}</h3>
                                {dish.description && (
                                  <p className="text-xs text-gray-600 line-clamp-2 mt-1">{dish.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                              <div>
                                <p className="text-2xl font-bold text-[#FF5F15]">{formatPKR(dish.price)}</p>
                                {dish.is_available != 1 && (
                                  <span className="text-xs text-red-500 font-medium">Unavailable</span>
                                )}
                              </div>
                              {dish.is_available == 1 && (
                                <button
                                  onClick={() => addToCart(dish)}
                                  className="px-5 py-2.5 bg-gradient-to-r from-[#FF5F15] to-[#FF9500] text-white rounded-lg font-semibold text-sm hover:from-[#FF9500] hover:to-[#FF5F15] transition-all shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:scale-105"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Shopping Cart */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-5 sm:p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-200">
                <div className="w-10 h-10 bg-[#FF5F15] rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Shopping Cart</h2>
                  <p className="text-xs text-gray-500">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Your cart is empty</p>
                  <p className="text-sm text-gray-400 mt-1">Add items to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cart Items */}
                  <div className="space-y-3 max-h-64 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                    {cart.map((item) => (
                      <div key={item.dish_id} className="bg-white border-2 border-gray-200 rounded-xl p-3 hover:border-[#FF5F15] transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{formatPKR(item.price)} each</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.dish_id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition flex-shrink-0 ml-2"
                            title="Remove item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                            <button
                              onClick={() => updateCartQuantity(item.dish_id, item.quantity - 1)}
                              className="w-8 h-8 rounded-lg bg-white border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition text-gray-900"
                              title="Decrease quantity"
                            >
                              <Minus className="w-4 h-4 text-gray-900" />
                            </button>
                            <span className="text-sm font-bold w-10 text-center text-gray-900">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.dish_id, item.quantity + 1)}
                              className="w-8 h-8 rounded-lg bg-white border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition text-gray-900"
                              title="Increase quantity"
                            >
                              <Plus className="w-4 h-4 text-gray-900" />
                            </button>
                          </div>
                          <p className="font-bold text-lg text-gray-900">
                            {formatPKR(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comments */}
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Special Instructions
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows="2"
                      className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition shadow-sm"
                      placeholder="Add any special instructions..."
                    />
                  </div>

                  {/* Totals */}
                  <div className="border-t border-gray-200 pt-4 space-y-3 bg-gray-50 rounded-xl p-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-gray-700">Subtotal:</span>
                      <span className="text-xl font-bold text-gray-900">{formatPKR(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-2xl font-bold text-[#FF5F15]">{formatPKR(subtotal)}</span>
                    </div>
                    <p className="text-xs text-gray-500 text-center pt-2">
                      Bill will be generated later with discount & service charge
                    </p>
                  </div>

                  {/* Place Order Button */}
                  <Button
                    onClick={placeOrder}
                    disabled={placing || (orderType === 'Dine In' && (!selectedHall || !selectedTable)) || cart.length === 0}
                    className="w-full mt-4 py-3 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {placing ? 'Placing Order...' : 'Place Order'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Receipt Modal */}
        <Modal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          title="Order Receipt"
          size="lg"
          showCloseButton={true}
        >
          {orderReceipt && (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800 font-medium">
                  Order placed successfully! KOT is being printed to kitchen printers automatically.
                </p>
              </div>

              {/* Kitchen Receipt - 80mm Print View (Item Name & Quantity Only) */}
              <div id="accountant-receipt-print-area">
                <div
                  className="kitchen-receipt-container"
                  style={{
                    width: '80mm',
                    maxWidth: '80mm',
                    minWidth: '80mm',
                    margin: '0 auto',
                    padding: '8mm 5mm',
                    background: '#ffffff',
                    fontFamily:
                      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: '12px',
                    lineHeight: 1.5,
                    color: '#000',
                    boxSizing: 'border-box',
                  }}
                >
                  {(() => {
                    const order = orderReceipt.order || orderReceipt || {};
                    // Get items from orderReceipt, fallback to cart if empty
                    let items = orderReceipt.items || [];
                    
                    // If items are empty, try to get from cart (for display purposes)
                    if (items.length === 0 && cart.length > 0) {
                      items = cart.map(cartItem => ({
                        dish_name: cartItem.name,
                        name: cartItem.name,
                        quantity: cartItem.quantity,
                        qty: cartItem.quantity,
                        price: cartItem.price,
                        dish_id: cartItem.dish_id
                      }));
                    }
                    
                    const orderId = order.order_id || order.id || order.orderid || 'N/A';
                    const tableNumber = order.table_number || order.table || '';
                    const orderType = order.order_type || 'Dine In';
                    const createdAt = order.created_at || new Date().toLocaleString();
                    
                    console.log('KOT Receipt - Order:', order);
                    console.log('KOT Receipt - Items:', items);
                    console.log('KOT Receipt - Cart:', cart);

                    return (
                      <>
                        <div
                          className="kitchen-header"
                          style={{
                            textAlign: 'center',
                            marginBottom: '10px',
                            borderBottom: '2px solid #000',
                            paddingBottom: '6px',
                          }}
                        >
                          <div
                            className="kitchen-title"
                            style={{
                              fontSize: '16px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                            }}
                          >
                            KITCHEN ORDER
                          </div>
                          <div
                            className="kitchen-subtitle"
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              marginTop: '4px',
                            }}
                          >
                            Order #{orderId !== 'N/A' ? `ORD-${orderId}` : 'N/A'}
                          </div>
                          <div
                            className="kitchen-meta"
                            style={{ marginTop: '8px', fontSize: '11px' }}
                          >
                            <div
                              className="kitchen-meta-row"
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                margin: '2px 0',
                              }}
                            >
                              <span>Type:</span>
                              <span>{orderType}</span>
                            </div>
                            {tableNumber && (
                              <div
                                className="kitchen-meta-row"
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  margin: '2px 0',
                                }}
                              >
                                <span>Table:</span>
                                <span>{tableNumber}</span>
                              </div>
                            )}
                            <div
                              className="kitchen-meta-row"
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                margin: '2px 0',
                              }}
                            >
                              <span>Time:</span>
                              <span>{createdAt}</span>
                            </div>
                          </div>
                        </div>

                        <div
                          className="kitchen-items"
                          style={{
                            marginTop: '10px',
                            borderTop: '1px dashed #000',
                            paddingTop: '6px',
                          }}
                        >
                          <div
                            className="kitchen-items-header"
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontWeight: 700,
                              fontSize: '12px',
                              marginBottom: '4px',
                            }}
                          >
                            <span>Item</span>
                            <span>Qty</span>
                          </div>
                          {items.length > 0 ? (
                            items.map((item, index) => (
                              <div
                                key={index}
                                className="kitchen-item-row"
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '3px 0',
                                  borderBottom: '1px dotted #ccc',
                                }}
                              >
                                <span
                                  className="kitchen-item-name"
                                  style={{
                                    flex: 1,
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    marginRight: '8px',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {item.dish_name || item.name || item.title || 'Item'}
                                </span>
                                <span
                                  className="kitchen-item-qty"
                                  style={{
                                    width: '28px',
                                    textAlign: 'right',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                  }}
                                >
                                  {item.quantity || item.qty || item.qnty || 1}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div
                              className="kitchen-item-row"
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '3px 0',
                                borderBottom: '1px dotted #ccc',
                              }}
                            >
                              <span
                                className="kitchen-item-name"
                                style={{
                                  flex: 1,
                                  fontWeight: 600,
                                  fontSize: '12px',
                                  marginRight: '8px',
                                  textTransform: 'uppercase',
                                }}
                              >
                                NO ITEMS FOUND
                              </span>
                              <span
                                className="kitchen-item-qty"
                                style={{
                                  width: '28px',
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                }}
                              >
                                0
                              </span>
                            </div>
                          )}
                        </div>

                        <div
                          className="kitchen-footer"
                          style={{
                            marginTop: '10px',
                            textAlign: 'center',
                            fontSize: '10px',
                          }}
                        >
                          *** Send to kitchen immediately ***
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setReceiptModalOpen(false);
                    // Reset everything
                    setCart([]);
                    setSelectedHall('');
                    setSelectedTable('');
                    setComments('');
                  }}
                  className="flex-1"
                >
                  New Order
                </Button>
                <Button
                  onClick={handlePrintReceipt}
                  className="flex-1"
                >
                  Re-Print KOT
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
      
      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
      `}</style>
    </AccountantLayout>
  );
}

