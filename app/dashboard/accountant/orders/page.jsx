'use client';

/**
 * Order Management Page
 * View and manage all orders with full CRUD operations
 * Uses real APIs: order_management.php (GET for list), get_ordersbyid.php (POST for details with items), chnageorder_status.php, bills_management.php, print.php
 */

import { useEffect, useState } from 'react';
import AccountantLayout from '@/components/accountant/AccountantLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import Modal from '@/components/ui/Modal';
import { apiPost, apiDelete, apiGet, getTerminal, getBranchId, getBranchName } from '@/utils/api';
import { formatPKR, formatDateTime } from '@/utils/format';
import { FileText, Eye, Edit, Trash2, X, RefreshCw, Receipt, Calculator, Printer, Plus, Minus, ShoppingCart, CreditCard, DollarSign } from 'lucide-react';
import ThermalReceipt from '@/components/receipt/ThermalReceipt';
import { broadcastUpdate, listenForUpdates, UPDATE_EVENTS } from '@/utils/dashboardSync';

export default function OrderManagementPage() {
  const [orders, setOrders] = useState([]);
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [existingBill, setExistingBill] = useState(null); // Bill data for order (if exists)
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, preparing, ready, completed, cancelled
  const [searchOrderId, setSearchOrderId] = useState(''); // Search by order ID
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [billOrder, setBillOrder] = useState(null);
  const [billData, setBillData] = useState({
    discount_percentage: 0, // Discount as percentage (e.g., 10 means 10%)
    service_charge: 0,
  });
  const [customers, setCustomers] = useState([]); // Credit customers list
  const [paymentMode, setPaymentMode] = useState('Cash'); // Payment mode for Pay Bill modal
  const [paymentCustomerId, setPaymentCustomerId] = useState(null); // Customer ID for credit payment
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    cash_received: 0,
    change: 0,
  });
  const [generatedBill, setGeneratedBill] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [formData, setFormData] = useState({
    status: 'Pending',
    table_id: '',
    discount: 0,
    items: [], // Order items for editing
  });
  const [dishes, setDishes] = useState([]); // All available dishes for edit modal
  const [categories, setCategories] = useState([]); // Categories for filtering dishes
  const [selectedCategory, setSelectedCategory] = useState(''); // Selected category in edit modal
  const [tables, setTables] = useState([]); // Tables for transfer functionality
  const [originalTableId, setOriginalTableId] = useState(null); // Store original table ID for transfer

  useEffect(() => {
    fetchOrders();
    fetchCustomers(); // Fetch credit customers
    // Auto-refresh every 30 seconds to show new orders
    const interval = setInterval(fetchOrders, 30000);
    
    // Listen for updates from other dashboard instances
    const cleanup = listenForUpdates((event) => {
      if (event.type === UPDATE_EVENTS.ORDER_CREATED || 
          event.type === UPDATE_EVENTS.ORDER_UPDATED || 
          event.type === UPDATE_EVENTS.ORDER_DELETED ||
          event.type === UPDATE_EVENTS.ORDER_STATUS_CHANGED ||
          event.type === UPDATE_EVENTS.BILL_CREATED ||
          event.type === UPDATE_EVENTS.BILL_UPDATED ||
          event.type === UPDATE_EVENTS.BILL_PAID) {
        // Refresh orders when any order/bill is updated
        fetchOrders();
      }
    });
    
    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, [filter]);

      // Initialize bill data when bill modal opens (no auto-calculation)
      useEffect(() => {
        if (billModalOpen && billOrder) {
          // Preserve existing service charge if already set, otherwise default to 0
          setBillData(prev => ({
            ...prev,
            service_charge: prev.service_charge || 0,
            discount_percentage: prev.discount_percentage || 0,
          }));
        } else if (!billModalOpen) {
      // Reset bill data when modal closes
      setBillData({
        discount_percentage: 0,
        service_charge: 0,
        payment_mode: 'Cash',
        customer_id: null,
        is_credit: false,
      });
    }
  }, [billModalOpen, billOrder]);

  // Auto-calculate change when cash received changes (only for Cash payments)
  useEffect(() => {
    if (paymentModalOpen && generatedBill && paymentMode === 'Cash') {
      const grandTotal = parseFloat(generatedBill.grand_total || 0);
      const cashReceived = parseFloat(paymentData.cash_received || 0);
      const change = Math.max(0, cashReceived - grandTotal);
      setPaymentData(prev => ({
        ...prev,
        change: change,
      }));
    } else if (paymentModalOpen && generatedBill && paymentMode !== 'Cash') {
      // For non-cash payments, set cash received to grand total
      const grandTotal = parseFloat(generatedBill.grand_total || 0);
      setPaymentData(prev => ({
        ...prev,
        cash_received: grandTotal,
        change: 0,
      }));
    }
  }, [paymentModalOpen, paymentData.cash_received, generatedBill, paymentMode]);

  /**
   * Fetch orders from API
   * API: order_management.php (GET with terminal and optional status)
   */
  const fetchOrders = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    try {
      const terminal = getTerminal();
      const params = { terminal };
      if (filter !== 'all') {
        params.status = filter;
      }
      
      // Use GET method for fetching orders list
      const result = await apiGet('api/order_management.php', params);
      
      // Handle multiple possible response structures
      let ordersData = [];
      
      // Check if result.data is an array directly
      if (result.data && Array.isArray(result.data)) {
        ordersData = result.data;
      }
      // Check if result.data.data is an array (nested structure)
      else if (result.data && result.data.data && Array.isArray(result.data.data)) {
        ordersData = result.data.data;
      }
      // Check if result.data.orders is an array
      else if (result.data && result.data.orders && Array.isArray(result.data.orders)) {
        ordersData = result.data.orders;
      }
      // Check if result.data.success and result.data.data is an array
      else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        ordersData = result.data.data;
      }
      // Check if result.success and result.data is an array
      else if (result.success && result.data && Array.isArray(result.data)) {
        ordersData = result.data;
      }
      // Try to find any array in result.data object
      else if (result.data && typeof result.data === 'object') {
        for (const key in result.data) {
          if (Array.isArray(result.data[key])) {
            ordersData = result.data[key];
            break;
          }
        }
      }
      // Check if response has success field with false
      else if (result.data && result.data.success === false) {
        console.error('Orders API returned error:', result.data);
        setAlert({ type: 'error', message: result.data.message || 'Failed to load orders' });
        setOrders([]);
        setLoading(false);
        return;
      }
      // Check if result is not successful
      else if (!result.success) {
        console.error('Orders API request failed:', result);
        setAlert({ 
          type: 'error', 
          message: result.data?.message || result.data?.error || 'Failed to load orders. Please check your connection.' 
        });
        setOrders([]);
        setLoading(false);
        return;
      }
      
      
      if (ordersData.length > 0) {
        // Map API response - matching actual database structure
        const mappedOrders = ordersData
          .filter(order => order !== null && order !== undefined) // Filter out null/undefined orders
          .map((order, index) => {
            try {
              // Extract order ID - try multiple fields
              const orderId = order.order_id || order.id || order.OrderID || index + 1;
              
              // Extract order number - try multiple formats
              let orderNumber = '';
              if (order.order_id) {
                orderNumber = `ORD-${order.order_id}`;
              } else if (order.orderid) {
                orderNumber = order.orderid;
              } else if (order.order_number) {
                orderNumber = order.order_number;
              } else if (order.id) {
                orderNumber = `ORD-${order.id}`;
              } else {
                orderNumber = `ORD-${orderId}`;
              }
              
              // Calculate totals with fallbacks
              const gTotalAmount = parseFloat(order.g_total_amount || order.total || order.grand_total || 0);
              const discountAmount = parseFloat(order.discount_amount || order.discount || 0);
              const serviceCharge = parseFloat(order.service_charge || 0);
              let netTotalAmount = parseFloat(order.net_total_amount || order.net_total || order.netTotal || order.grand_total || 0);
              
              // If netTotal is 0 but we have a total, use total as fallback
              if (netTotalAmount === 0 && gTotalAmount > 0) {
                netTotalAmount = gTotalAmount;
              }
              
              // Extract status - prioritize order_status field (from database), then status field
              // Keep original case for display, but normalize for comparison
              const rawStatus = order.order_status || order.status || order.Status || 'Pending';
              const normalizedStatus = String(rawStatus).toLowerCase().trim();
              
              return {
                id: orderId,
                order_id: orderId,
                order_number: orderNumber,
                orderid: order.orderid || orderNumber, // Ensure orderid is always formatted string like "ORD-123"
                order_type: order.order_type || 'Dine In',
                table_id: order.table_id || order.tableid || '-',
                table_number: order.table_number || order.table_id || '-',
                hall_id: order.hall_id || '-',
                hall_name: order.hall_name || '-',
                shop_name: order.shopname || '-',
                customer_name: order.customer_name || order.customer || '-',
                total: gTotalAmount,
                discount: discountAmount,
                service_charge: serviceCharge,
                netTotal: netTotalAmount,
                status: normalizedStatus,
                order_status: rawStatus, // Preserve original status from API
                original_status: rawStatus, // Keep original for reference
                payment_mode: order.payment_mode || 'Cash',
                created_at: order.created_at || order.date || '',
                terminal: order.terminal || terminal,
              };
            } catch (error) {
              console.error('Error mapping order:', error, order);
              return null;
            }
          })
          .filter(order => order !== null); // Remove any null entries from mapping errors
        
        setOrders(mappedOrders);
      } else {
        setOrders([]);
        if (result.data && result.data.message) {
          setAlert({ type: 'info', message: result.data.message || 'No orders found.' });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setAlert({ type: 'error', message: 'Failed to load orders: ' + (error.message || 'Network error') });
      setLoading(false);
      setOrders([]);
    }
  };

  /**
   * Fetch credit customers for the current branch
   * API: api/customer_management.php (GET with branch_id)
   */
  const fetchCustomers = async () => {
    try {
      const branchId = getBranchId();
      if (!branchId) {
        return; // No branch ID, skip fetching customers
      }

      const result = await apiGet('api/customer_management.php', { 
        branch_id: branchId 
      });
      
      let customersData = [];
      
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          customersData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          customersData = result.data.data;
        }
      }

      // Map customers
      const mappedCustomers = customersData.map(customer => ({
        id: customer.id,
        customer_name: customer.customer_name || customer.name || '',
        phone: customer.phone || '',
        credit_limit: parseFloat(customer.credit_limit || 0),
      }));

      setCustomers(mappedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      // Don't show error to user, just log it
    }
  };

  /**
   * Fetch order details and items
   * API: get_ordersbyid.php (returns order with items array)
   */
  const fetchOrderDetails = async (orderId, orderNumber) => {
    try {
      // Prepare order ID - prefer numeric order_id over orderid string
      const orderIdParam = orderId || (orderNumber ? (orderNumber.toString().replace(/ORD-?/i, '') || orderNumber) : null);
      
      
      // Fetch order details with items - get_ordersbyid.php returns order with items array
      const orderResult = await apiPost('api/get_ordersbyid.php', { 
        order_id: orderIdParam,
        orderid: orderNumber || `ORD-${orderIdParam}` || orderIdParam
      });
      
      // Initialize itemsData early to avoid "Cannot access before initialization" error
      let itemsData = [];
      
      let orderData = null;
      
      // Handle multiple response structures for order data
      // get_ordersbyid.php returns order with items array
      if (orderResult.success && orderResult.data) {
        if (Array.isArray(orderResult.data) && orderResult.data.length > 0) {
          orderData = orderResult.data[0];
          // Extract items from order if present
          if (orderData.items && Array.isArray(orderData.items)) {
            itemsData = orderData.items;
          }
        } else if (orderResult.data.data && Array.isArray(orderResult.data.data) && orderResult.data.data.length > 0) {
          orderData = orderResult.data.data[0];
          // Extract items from order if present
          if (orderData.items && Array.isArray(orderData.items)) {
            itemsData = orderData.items;
          }
        } else if (orderResult.data.order && typeof orderResult.data.order === 'object') {
          orderData = orderResult.data.order;
          // Extract items from order if present
          if (orderData.items && Array.isArray(orderData.items)) {
            itemsData = orderData.items;
          }
        } else if (!Array.isArray(orderResult.data) && typeof orderResult.data === 'object') {
          orderData = orderResult.data;
          // Extract items from order if present
          if (orderData.items && Array.isArray(orderData.items)) {
            itemsData = orderData.items;
          }
        }
        
        // Also check for items at the response level
        if (itemsData.length === 0 && orderResult.data.items && Array.isArray(orderResult.data.items)) {
          itemsData = orderResult.data.items;
        }
      }
      
      // Also try to get from orders list
      if (!orderData) {
        const order = orders.find(o => o.id == orderId || o.orderid == orderNumber);
        if (order) {
          orderData = {
            id: order.id,
            order_id: order.order_id || order.id,
            orderid: order.orderid || order.order_number,
            table_id: order.table_id,
            total: order.total,
            discount: order.discount,
            netTotal: order.netTotal,
            status: order.status,
            order_status: order.status,
            created_at: order.created_at,
            order_type: order.order_type,
            hall_name: order.hall_name,
            table_number: order.table_number,
            payment_mode: order.payment_mode,
            g_total_amount: order.total,
            discount_amount: order.discount,
            service_charge: order.service_charge,
            net_total_amount: order.netTotal,
          };
        }
      }
      
      // Fetch bill if exists for this order (GET request - no total_amount means fetch existing bill)
      let billData = null;
      if (orderIdParam) {
        try {
          // Use GET method to fetch existing bill (apiGet with order_id parameter)
          const billResult = await apiGet('api/bills_management.php', { order_id: orderIdParam });
          
          // Debug: Log bill fetch result
          if (billResult.success && billResult.data) {
            // Handle different response structures
            let billResponseData = null;
            if (billResult.data.success === true && billResult.data.data) {
              // Response: { success: true, data: { bill: {...}, bill_id: 123, order_items: [...] } }
              billResponseData = billResult.data.data;
              billData = billResponseData.bill || billResponseData;
            } else if (billResult.data.bill) {
              // Response: { success: true, bill: {...}, order_items: [...] }
              billResponseData = billResult.data;
              billData = billResult.data.bill;
            } else if (billResult.data.bill_id || billResult.data.order_id) {
              // Response: { success: true, bill_id: 123, order_items: [...], ... } (bill object itself)
              billResponseData = billResult.data;
              billData = billResult.data;
            }
            
            // Extract order_items from bill response if available (NEW: bills_management.php now returns order_items)
            if (billResponseData && billResponseData.order_items && Array.isArray(billResponseData.order_items)) {
              // Store items from bill response - they're already fetched, no need to call get_ordersbyid.php again
              if (billResponseData.order_items.length > 0) {
                itemsData = billResponseData.order_items;
              }
            }
            
            // Ensure payment_status is set (default to 'Unpaid' if not present)
            if (billData && !billData.payment_status) {
              billData.payment_status = 'Unpaid';
            }
          }
        } catch (error) {
          console.error('Error fetching bill:', error);
          // Continue even if bill fetch fails
        }
      }
      
      // If orderData is still null after all attempts, show error
      if (!orderData) {
        console.error('Failed to fetch order data. API response:', { orderResult });
        setAlert({ 
          type: 'error', 
          message: `Failed to load order details. Order ID: ${orderIdParam || orderId || orderNumber}. Please check if the order exists.` 
        });
        setDetailsModalOpen(false);
        return;
      }

      setOrderDetails(orderData);
      setExistingBill(billData); // Store bill data
      
      // Items should already be extracted from orderResult above
      // If itemsData is still empty, log a warning
      if (itemsData.length === 0) {
        console.warn('⚠️ No items found in order response. Order might not have items.');
      }
      
      setOrderItems(itemsData);
      
      setDetailsModalOpen(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setAlert({ type: 'error', message: 'Failed to load order details: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Update order status
   * API: chnageorder_status.php (POST)
   * Accepts: order_id (numeric) or orderid (string format "ORD-{number}")
   */
  const updateOrderStatus = async (orderId, orderNumber, newStatus) => {
    try {
      // Format orderid correctly - prefer numeric order_id, fallback to formatted orderid
      const orderidValue = orderNumber || (orderId ? `ORD-${orderId}` : null);
      const order_idValue = orderId || (orderNumber ? parseInt(orderNumber.replace(/ORD-?/i, '')) : null);
      
      // Send both order_id (numeric) and orderid (formatted string) for maximum compatibility
      const payload = { status: newStatus };
      if (order_idValue) {
        payload.order_id = order_idValue;
      }
      if (orderidValue) {
        payload.orderid = orderidValue;
      }
      
      const result = await apiPost('api/chnageorder_status.php', payload);

      // Check response - API can return success in different formats
      const apiResponse = result.data;
      const isSuccess = result.success && apiResponse && (
        apiResponse.success === true || 
        apiResponse.status === 'success' ||
        (apiResponse.message && apiResponse.message.toLowerCase().includes('success'))
      );

      if (isSuccess) {
        // If order is completed, Credit, or Bill Generated (credit) and it's a Dine In order, update table status to Available
        // Get order details to check if it's a Dine In order with a table
        const order = orders.find(o => (o.order_id || o.id) == orderId || o.orderid == orderNumber);
        const isDineIn = order?.order_type === 'Dine In';
        const tableId = order?.table_id;
        
        // Check if this is a credit order by checking payment status
        const isCreditOrder = order?.payment_status === 'Credit' || order?.payment_method === 'Credit' || order?.is_credit === true || newStatus.toLowerCase() === 'credit';
        const shouldUpdateTable = (
          newStatus.toLowerCase() === 'complete' || 
          newStatus.toLowerCase() === 'credit' ||
          (newStatus.toLowerCase() === 'bill generated' && isCreditOrder)
        ) && isDineIn && tableId;
        
        if (shouldUpdateTable) {
          try {
            // Fetch current table details first
            const terminal = getTerminal();
            const branchId = getBranchId();
            const tablesResult = await apiPost('api/get_tables.php', { 
              terminal,
              branch_id: branchId || terminal
            });
            
            // Handle different response structures
            let tablesData = [];
            if (tablesResult.data && Array.isArray(tablesResult.data)) {
              tablesData = tablesResult.data;
            } else if (tablesResult.data && tablesResult.data.data && Array.isArray(tablesResult.data.data)) {
              tablesData = tablesResult.data.data;
            }
            
            const table = tablesData.find(t => (t.table_id || t.id) == tableId);
            if (table) {
              // Update table status to Available
              console.log('Updating table status to Available for table:', tableId);
              const updateResult = await apiPost('api/table_management.php', {
                table_id: parseInt(tableId),
                hall_id: table.hall_id,
                table_number: table.table_number || table.table_name || table.number,
                capacity: table.capacity,
                status: 'Available',
                terminal: terminal,
                branch_id: branchId || terminal,
                action: 'update'
              });
              console.log('Table status update result:', updateResult);
            }
          } catch (error) {
            console.error('Error updating table status:', error);
            // Don't show error to user, table status update is secondary
          }
        }
        
        setAlert({ type: 'success', message: apiResponse.message || 'Order status updated successfully!' });
        // Broadcast update to other dashboard instances
        broadcastUpdate(UPDATE_EVENTS.ORDER_STATUS_CHANGED, { 
          order_id: orderId,
          status: newStatus 
        });
        fetchOrders(); // Refresh list
      } else {
        setAlert({ type: 'error', message: apiResponse?.message || result.message || 'Failed to update order status' });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setAlert({ type: 'error', message: 'Failed to update order status: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Fetch dishes for edit modal
   */
  const fetchDishes = async () => {
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      const params = { terminal };
      if (branchId) {
        params.branch_id = branchId;
      }
      
      const result = await apiPost('api/get_products.php', params);
      
      let dishesData = [];
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          dishesData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          dishesData = result.data.data;
        } else if (result.data.products && Array.isArray(result.data.products)) {
          dishesData = result.data.products;
        } else if (typeof result.data === 'object') {
          // Try to find any array in the response
          for (const key in result.data) {
            if (Array.isArray(result.data[key])) {
              dishesData = result.data[key];
              break;
            }
          }
        }
      }
      
      const mappedDishes = dishesData.map(item => ({
        dish_id: item.dish_id || item.id || item.product_id,
        name: item.name || item.dish_name || item.title || item.product_name || 'Item',
        price: parseFloat(item.price || item.rate || item.unit_price || 0),
        category_id: item.category_id || item.cat_id || null,
        category_name: item.catname || item.category_name || item.cat_name || '',
        is_available: item.is_available || item.is_available === 1 || 1,
        kitchen_id: item.kitchen_id || null,
      }));
      
      setDishes(mappedDishes);
    } catch (error) {
      console.error('Error fetching dishes:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        error: error
      });
      setAlert({ type: 'error', message: 'Failed to load dishes: ' + (error?.message || 'Network error') });
    }
  };

  /**
   * Fetch categories for edit modal
   */
  const fetchCategories = async () => {
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      const params = { terminal };
      if (branchId) {
        params.branch_id = branchId;
      }
      
      const result = await apiPost('api/get_categories.php', params);
      
      let categoriesData = [];
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          categoriesData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          categoriesData = result.data.data;
        } else if (result.data.categories && Array.isArray(result.data.categories)) {
          categoriesData = result.data.categories;
        } else if (typeof result.data === 'object') {
          // Try to find any array in the response
          for (const key in result.data) {
            if (Array.isArray(result.data[key])) {
              categoriesData = result.data[key];
              break;
            }
          }
        }
      }
      
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        error: error
      });
      setAlert({ type: 'error', message: 'Failed to load categories: ' + (error?.message || 'Network error') });
    }
  };

  /**
   * Fetch tables for table transfer functionality
   */
  const fetchTables = async () => {
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      console.log('=== Fetching Tables for Transfer ===');
      console.log('Terminal:', terminal);
      console.log('Branch ID:', branchId);
      
      const result = await apiPost('api/get_tables.php', {
        terminal,
        branch_id: branchId || terminal
      });
      
      console.log('Tables API response:', result);
      
      let tablesData = [];
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          tablesData = result.data;
          console.log('Found tables in result.data (array):', tablesData.length);
        } else if (result.data.data && Array.isArray(result.data.data)) {
          tablesData = result.data.data;
          console.log('Found tables in result.data.data:', tablesData.length);
        } else if (result.data.tables && Array.isArray(result.data.tables)) {
          tablesData = result.data.tables;
          console.log('Found tables in result.data.tables:', tablesData.length);
        } else if (typeof result.data === 'object') {
          // Try to find any array in the response
          for (const key in result.data) {
            if (Array.isArray(result.data[key])) {
              tablesData = result.data[key];
              console.log(`Found tables in result.data.${key}:`, tablesData.length);
              break;
            }
          }
        }
      }
      
      if (tablesData.length === 0) {
        console.warn('⚠️ No tables found in API response');
        console.warn('Response structure:', JSON.stringify(result, null, 2));
      } else {
        console.log('✅ Found', tablesData.length, 'tables');
      }
      
      setTables(tablesData);
    } catch (error) {
      console.error('Error fetching tables:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        error: error
      });
      setTables([]);
      setAlert({ type: 'error', message: 'Failed to fetch tables: ' + (error.message || 'Unknown error') });
    }
  };

  /**
   * Edit order - open edit modal
   * Only allowed for Pending and Running orders
   */
  const handleEdit = async (order) => {
    if (!canEditOrder(order.status)) {
      setAlert({ type: 'error', message: 'Cannot edit order. Only "Pending" and "Running" orders can be edited.' });
      return;
    }

    // Fetch dishes and categories for editing
    await fetchDishes();
    await fetchCategories();
    
    // Fetch tables if this is a Dine In order
    const isDineIn = (order.order_type || '').toLowerCase() === 'dine in';
    if (isDineIn) {
      await fetchTables();
    }

    // Fetch current order items for editing
    try {
      const orderId = order.order_id || order.id;
      const orderNumber = order.orderid || order.order_number || `ORD-${orderId}`;
      
      // Fetch order details and items
      const orderResult = await apiPost('api/get_ordersbyid.php', { 
        order_id: orderId,
        orderid: orderNumber
      });
      
      // get_ordersbyid.php returns order with items, so extract items from orderResult
      // Handle multiple response structures for order data
      let orderData = null;
      let orderItems = [];
      
      if (orderResult.success && orderResult.data) {
        if (Array.isArray(orderResult.data) && orderResult.data.length > 0) {
          orderData = orderResult.data[0];
          if (orderData.items && Array.isArray(orderData.items)) {
            orderItems = orderData.items;
          }
        } else if (orderResult.data.data && Array.isArray(orderResult.data.data) && orderResult.data.data.length > 0) {
          orderData = orderResult.data.data[0];
          if (orderData.items && Array.isArray(orderData.items)) {
            orderItems = orderData.items;
          }
        } else if (orderResult.data.order && typeof orderResult.data.order === 'object') {
          orderData = orderResult.data.order;
          if (orderData.items && Array.isArray(orderData.items)) {
            orderItems = orderData.items;
          }
        } else if (!Array.isArray(orderResult.data) && typeof orderResult.data === 'object') {
          orderData = orderResult.data;
          if (orderData.items && Array.isArray(orderData.items)) {
            orderItems = orderData.items;
          }
        }
        
        // Also check for items at response level
        if (orderItems.length === 0 && orderResult.data.items && Array.isArray(orderResult.data.items)) {
          orderItems = orderResult.data.items;
        }
      }
      
      // If orderData not found, use the order from the list
      if (!orderData) {
        console.warn('Order data not found in API response, using order from list');
        orderData = order;
      }
      
      // If still no items, try to find any array in the response
      if (orderItems.length === 0 && orderResult.success && orderResult.data) {
        for (const key in orderResult.data) {
          if (Array.isArray(orderResult.data[key])) {
            orderItems = orderResult.data[key];
            break;
          }
        }
      }
      
      if (orderItems.length === 0) {
        console.warn('⚠️ No items found in order response');
      }
      
      if (orderItems.length === 0) {
        setAlert({ 
          type: 'error', 
          message: 'No order items found. The order may not have any items, or there was an error fetching them.' 
        });
      }
      
      // Merge order data with the order from list to ensure all fields are present
      const mergedOrderData = {
        ...order,
        ...orderData,
        // Ensure all required fields are present
        order_id: orderData.order_id || order.order_id || order.id,
        id: orderData.id || order.id,
        orderid: orderData.orderid || order.orderid || orderNumber,
        order_number: orderData.order_number || order.order_number || orderNumber,
        order_type: orderData.order_type || order.order_type || 'Dine In',
        order_status: orderData.order_status || orderData.status || order.order_status || order.status || 'Pending',
        table_id: orderData.table_id || order.table_id || '',
        hall_id: orderData.hall_id || order.hall_id || '',
        customer_id: orderData.customer_id || order.customer_id || null,
        comments: orderData.comments || order.comments || '',
        g_total_amount: orderData.g_total_amount || orderData.total || order.g_total_amount || order.total || 0,
        discount_amount: orderData.discount_amount || orderData.discount || order.discount_amount || order.discount || 0,
        service_charge: orderData.service_charge || order.service_charge || 0,
        net_total_amount: orderData.net_total_amount || orderData.netTotal || order.net_total_amount || order.netTotal || 0,
        payment_mode: orderData.payment_mode || order.payment_mode || 'Cash',
        table_number: orderData.table_number || order.table_number || '',
        hall_name: orderData.hall_name || order.hall_name || '',
      };
      
      // Format order items with all required fields
      const formattedItems = orderItems.map((item, index) => {
        const dishId = item.dish_id || item.id || item.product_id || item.dishid;
        const name = item.dish_name || item.name || item.title || item.item_name || item.dishname || 'Item';
        const price = parseFloat(item.price || item.rate || item.unit_price || item.amount || 0);
        const quantity = parseInt(item.quantity || item.qty || item.qnty || item.qty || 1);
        const totalAmount = parseFloat(item.total_amount || item.total || item.total_price || item.amount || (price * quantity));
        
        const formattedItem = {
          dish_id: dishId,
          name: name,
          dish_name: name,
          price: price,
          quantity: quantity,
          qty: quantity,
          total: totalAmount,
          total_amount: totalAmount,
          category_id: item.category_id || item.cat_id || item.categoryid || null,
          kitchen_id: item.kitchen_id || item.kitchenid || null,
        };
        
        return formattedItem;
      });
      
      setEditingOrder(mergedOrderData);
      
      console.log('Formatted items count:', formattedItems.length);
      console.log('Formatted items:', JSON.stringify(formattedItems, null, 2));
      
      const currentTableId = mergedOrderData.table_id || '';
      const newFormData = {
        status: mergedOrderData.order_status || mergedOrderData.status || 'Pending',
        table_id: currentTableId,
        discount: mergedOrderData.discount_amount || mergedOrderData.discount || 0,
        items: formattedItems,
      };
      
      // Store original table ID for transfer functionality
      setOriginalTableId(currentTableId || null);
      
      console.log('New formData:', JSON.stringify(newFormData, null, 2));
      console.log('Items in newFormData:', newFormData.items.length);
      console.log('Original table ID:', currentTableId);
      
      setFormData(newFormData);
      setSelectedCategory('');
      setEditModalOpen(true);
      
      // Verify formData was set correctly
      setTimeout(() => {
        console.log('formData.items.length:', formData.items.length);
      }, 100);
      
      console.log('✅ Edit modal opened with order data:', {
        order_id: mergedOrderData.order_id,
        items_count: formattedItems.length,
        table_id: mergedOrderData.table_id,
        status: mergedOrderData.order_status,
        formData_items_count: newFormData.items.length
      });
      
      console.log('✅ Edit modal opened with order data:', {
        order_id: mergedOrderData.order_id,
        items_count: formattedItems.length,
        table_id: mergedOrderData.table_id,
        status: mergedOrderData.order_status
      });
    } catch (error) {
      console.error('Error fetching order details for edit:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setAlert({ type: 'error', message: 'Failed to load order details for editing: ' + (error.message || 'Unknown error') });
    }
  };

  /**
   * Add dish to order items
   */
  const addDishToOrder = (dish) => {
    if (!dish.is_available || dish.is_available != 1) {
      setAlert({ type: 'error', message: 'Cannot add unavailable dish to order.' });
      return;
    }

    const existingItem = formData.items.find(item => item.dish_id === dish.dish_id);
    if (existingItem) {
      // Update quantity if dish already exists
      setFormData({
        ...formData,
        items: formData.items.map(item =>
          item.dish_id === dish.dish_id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        ),
      });
    } else {
      // Add new dish
      setFormData({
        ...formData,
        items: [
          ...formData.items,
          {
            dish_id: dish.dish_id,
            name: dish.name,
            price: dish.price,
            quantity: 1,
            total: dish.price,
          },
        ],
      });
    }
  };

  /**
   * Remove dish from order items
   */
  const removeDishFromOrder = (dishId) => {
    setFormData({
      ...formData,
      items: formData.items.filter(item => item.dish_id !== dishId),
    });
  };

  /**
   * Update dish quantity in order items
   */
  const updateDishQuantity = (dishId, newQuantity) => {
    if (newQuantity < 1) {
      removeDishFromOrder(dishId);
      return;
    }

    setFormData({
      ...formData,
      items: formData.items.map(item =>
        item.dish_id === dishId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      ),
    });
  };

  /**
   * Calculate order total from items
   */
  const calculateOrderTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const discount = parseFloat(formData.discount || 0);
    return Math.max(0, subtotal - discount);
  };

  /**
   * Update order
   * API: order_management.php (POST/PUT) and upload_orderdetails.php for items
   */
  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    // Validate items
    if (!formData.items || formData.items.length === 0) {
      setAlert({ type: 'error', message: 'Order must have at least one item.' });
      return;
    }

    try {
      const terminal = getTerminal();
      const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
      const discount = parseFloat(formData.discount || 0);
      const netTotal = Math.max(0, subtotal - discount);

      // Check if table transfer is needed (for Dine In orders)
      const isDineIn = (editingOrder.order_type || '').toLowerCase() === 'dine in';
      const newTableId = formData.table_id || editingOrder.table_id;
      const oldTableId = originalTableId;
      const tableChanged = isDineIn && oldTableId && newTableId && oldTableId.toString() !== newTableId.toString();

      // Update order details
      const orderData = {
        order_id: editingOrder.order_id || editingOrder.id,
        order_type: editingOrder.order_type || 'Dine In',
        order_status: formData.status,
        table_id: newTableId,
        discount_amount: discount,
        g_total_amount: subtotal,
        service_charge: editingOrder.service_charge || 0,
        net_total_amount: netTotal,
        terminal: terminal,
      };

      // Update order first
      const orderResult = await apiPost('api/order_management.php', orderData);

      if (!orderResult.success || !orderResult.data || !orderResult.data.success) {
        setAlert({ type: 'error', message: orderResult.data?.message || 'Failed to update order details' });
        return;
      }

      // Handle table transfer if table changed
      if (tableChanged) {
        try {
          const branchId = getBranchId();
          console.log('🔄 Transferring table from', oldTableId, 'to', newTableId);
          
          // Get tables to find table details
          const tablesResult = await apiPost('api/get_tables.php', {
            terminal,
            branch_id: branchId || terminal
          });

          if (tablesResult.success && tablesResult.data && Array.isArray(tablesResult.data)) {
            // Find old table and set to Available
            const oldTable = tablesResult.data.find(t => (t.table_id || t.id) == oldTableId);
            if (oldTable) {
              await apiPost('api/table_management.php', {
                table_id: parseInt(oldTableId),
                hall_id: oldTable.hall_id,
                table_number: oldTable.table_number || oldTable.table_name || oldTable.number,
                capacity: oldTable.capacity,
                status: 'Available',
                terminal: terminal,
                branch_id: branchId || terminal,
                action: 'update'
              });
              console.log('✅ Old table', oldTableId, 'set to Available');
            }

            // Find new table and set to Running
            const newTable = tablesResult.data.find(t => (t.table_id || t.id) == newTableId);
            if (newTable) {
              await apiPost('api/table_management.php', {
                table_id: parseInt(newTableId),
                hall_id: newTable.hall_id,
                table_number: newTable.table_number || newTable.table_name || newTable.number,
                capacity: newTable.capacity,
                status: 'Running',
                terminal: terminal,
                branch_id: branchId || terminal,
                action: 'update'
              });
              console.log('✅ New table', newTableId, 'set to Running');
            } else {
              console.warn('⚠️ New table not found:', newTableId);
            }
          }
        } catch (tableError) {
          console.error('Error transferring table:', tableError);
          // Don't fail the order update if table transfer fails
          setAlert({ type: 'warning', message: 'Order updated but table transfer had an issue. Please check table statuses manually.' });
        }
      }

      // Delete existing order items (if API supports it)
      // Then add new order items
      const orderId = editingOrder.order_id || editingOrder.id;
      
      // Prepare items for upload
      const itemsData = formData.items.map(item => ({
        order_id: orderId,
        dish_id: item.dish_id,
        quantity: item.quantity,
        price: item.price,
        total_amount: item.total,
        terminal: terminal,
      }));

      // Update order items using upload_orderdetails.php
      const itemsResult = await apiPost('api/upload_orderdetails.php', {
        order_id: orderId,
        items: itemsData,
        delete_existing: true, // Flag to delete existing items first
      });

      if (itemsResult.success) {
        const successMessage = tableChanged 
          ? `Order updated successfully! Table transferred from ${oldTableId} to ${newTableId}.`
          : 'Order updated successfully with all items!';
        setAlert({ type: 'success', message: successMessage });
        // Broadcast update to other dashboard instances
        broadcastUpdate(UPDATE_EVENTS.ORDER_UPDATED, { 
          order_id: editingOrder.order_id || editingOrder.id 
        });
        setEditModalOpen(false);
        setEditingOrder(null);
        setFormData({ status: 'Pending', table_id: '', discount: 0, items: [] });
        setSelectedCategory('');
        setOriginalTableId(null);
        setTables([]);
        fetchOrders(); // Refresh list
      } else {
        // Even if items update fails, order was updated
        setAlert({ type: 'warning', message: 'Order details updated, but there was an issue updating items. Please check manually.' });
        // Broadcast update anyway
        broadcastUpdate(UPDATE_EVENTS.ORDER_UPDATED, { 
          order_id: editingOrder.order_id || editingOrder.id 
        });
        setEditModalOpen(false);
        setEditingOrder(null);
        setFormData({ status: 'Pending', table_id: '', discount: 0, items: [] });
        setSelectedCategory('');
        setOriginalTableId(null);
        setTables([]);
        fetchOrders(); // Refresh list
      }
    } catch (error) {
      console.error('Error updating order:', error);
      setAlert({ type: 'error', message: 'Failed to update order: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Delete order
   * API: order_management.php (DELETE)
   * Cannot delete orders with "Complete" status
   */
  const handleDeleteOrder = async (orderId, orderNumber) => {
    // Find the order to check status
    const order = orders.find(o => (o.order_id || o.id) == orderId || o.orderid == orderNumber);
    if (order && (order.status || '').toLowerCase() === 'complete') {
      setAlert({ type: 'error', message: 'Cannot delete order with "Complete" status. The order has been finalized.' });
      return;
    }

    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;

    try {
      const result = await apiDelete('api/order_management.php', {
        order_id: orderId || orderNumber,
        orderid: orderNumber || orderId,
      });

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'Order deleted successfully!' });
        // Broadcast update to other dashboard instances
        broadcastUpdate(UPDATE_EVENTS.ORDER_DELETED, { 
          order_id: orderId 
        });
        fetchOrders(); // Refresh list
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to delete order' });
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      setAlert({ type: 'error', message: 'Failed to delete order: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Handle pay bill - Update bill payment_status to "Paid" and order status to "Complete"
   */
  const handlePayBill = async () => {
    if (!generatedBill || !generatedBill.order_id) {
      setAlert({ type: 'error', message: 'Order information is missing. Cannot process payment.' });
      return;
    }

    // Validate: If payment mode is Credit, customer must be selected
    if (paymentMode === 'Credit' && !paymentCustomerId) {
      setAlert({ 
        type: 'error', 
        message: 'Please select a customer for credit payment.' 
      });
      return;
    }

    const grandTotal = parseFloat(generatedBill.grand_total || 0);
    let cashReceived = 0;
    let change = 0;

    // For Cash payments, validate cash received
    if (paymentMode === 'Cash') {
      cashReceived = parseFloat(paymentData.cash_received || 0);

      if (cashReceived <= 0) {
        setAlert({ type: 'error', message: 'Please enter a valid cash amount received.' });
        return;
      }

      if (cashReceived < grandTotal) {
        setAlert({ type: 'error', message: 'Cash received is less than the grand total. Please enter the correct amount.' });
        return;
      }

      change = Math.max(0, cashReceived - grandTotal);
    } else {
      // For Card/Online, cash received equals grand total (no change)
      cashReceived = grandTotal;
      change = 0;
    }

    try {
      // Try to get bill_id from generatedBill first, then fetch if needed
      let billIdToUse = generatedBill.bill_id;
      
      // If bill_id is not in generatedBill, try to fetch it
      if (!billIdToUse && generatedBill.order_id) {
        console.log('=== Fetching Bill ID for Payment ===');
        console.log('Order ID:', generatedBill.order_id);
        
        try {
          // Use GET to fetch existing bill (no total_amount means fetch, not create)
          const billFetchResult = await apiGet('api/bills_management.php', { 
            order_id: generatedBill.order_id 
          });
          
          console.log('Bill fetch result for payment:', JSON.stringify(billFetchResult, null, 2));
          
          if (billFetchResult.success && billFetchResult.data) {
            // Handle different response structures
            let billData = null;
            
            // Try multiple response structures
            if (billFetchResult.data.success === true && billFetchResult.data.data) {
              billData = billFetchResult.data.data.bill || billFetchResult.data.data;
            } else if (billFetchResult.data.bill) {
              billData = billFetchResult.data.bill;
            } else if (billFetchResult.data.bill_id) {
              billData = billFetchResult.data;
            } else if (Array.isArray(billFetchResult.data) && billFetchResult.data.length > 0) {
              // If response is an array, take the first bill
              billData = billFetchResult.data[0];
            }
            
            if (billData && billData.bill_id) {
              billIdToUse = billData.bill_id;
            } else if (billData && billData.id) {
              // Some APIs might return 'id' instead of 'bill_id'
              billIdToUse = billData.id;
            }
          }
        } catch (fetchError) {
          console.error('Error fetching bill ID:', fetchError);
          // Don't return early - we'll try to use order_id as fallback
        }
      }

      // If we still don't have bill_id, we can still proceed with order_id
      // The API should handle updating existing bill or creating one
      // But we'll log a warning

      // Update bill payment_status via bills_management.php
      // For Credit payments, set status to 'Credit', otherwise 'Paid'
      const finalPaymentStatus = paymentMode === 'Credit' ? 'Credit' : 'Paid';
      const finalPaymentMethod = paymentMode;
      
      // Prefer bill_id if available, otherwise use order_id (API should handle updating existing bill)
      // IMPORTANT: Do NOT include total_amount - that would trigger bill creation instead of payment update
      const billUpdatePayload = {
        payment_status: finalPaymentStatus,
        payment_method: finalPaymentMethod,
        // Do NOT include total_amount, service_charge, discount, grand_total
        // These would cause the API to treat this as bill creation, not payment update
      };

      // Add customer_id and is_credit for credit payments
      if (paymentMode === 'Credit' && paymentCustomerId) {
        billUpdatePayload.customer_id = paymentCustomerId;
        billUpdatePayload.is_credit = true;
      }

      // CRITICAL: Always include both bill_id AND order_id to ensure API finds existing bill
      // This prevents duplicate bill creation
      if (billIdToUse) {
        billUpdatePayload.bill_id = billIdToUse;
      }
      // Always include order_id as well to help API find the bill
      billUpdatePayload.order_id = generatedBill.order_id;

      // If cash payment, include cash_received and change
      if (paymentMode === 'Cash') {
        billUpdatePayload.cash_received = cashReceived;
        billUpdatePayload.change = change;
      }

      console.log('=== Bill Update Payload ===');
      console.log('Payload:', JSON.stringify(billUpdatePayload, null, 2));

      const billUpdateResult = await apiPost('api/bills_management.php', billUpdatePayload);

      console.log('=== Bill Update Result ===');
      console.log('Result:', JSON.stringify(billUpdateResult, null, 2));

      // Check if bill update was successful - be more lenient with success check
      const billApiResponse = billUpdateResult.data;
      
      // Extract error message for better debugging
      let billUpdateErrorMsg = null;
      if (billUpdateResult.data) {
        if (typeof billUpdateResult.data === 'string') {
          billUpdateErrorMsg = billUpdateResult.data;
        } else if (billUpdateResult.data.message) {
          billUpdateErrorMsg = billUpdateResult.data.message;
        } else if (billUpdateResult.data.error) {
          billUpdateErrorMsg = billUpdateResult.data.error;
        } else if (billUpdateResult.data.data?.message) {
          billUpdateErrorMsg = billUpdateResult.data.data.message;
        } else if (billUpdateResult.data.data?.error) {
          billUpdateErrorMsg = billUpdateResult.data.data.error;
        }
      }
      
      // Check success for both 'Paid' and 'Credit' statuses
      // The API may return success message even if payment_status in response hasn't updated yet
      // Handle both object and string responses
      let billUpdateSuccess = false;
      if (billUpdateResult.success && billApiResponse) {
        // Check if response is a string with success message
        if (typeof billApiResponse === 'string') {
          const lowerMsg = billApiResponse.toLowerCase();
          billUpdateSuccess = lowerMsg.includes('success') || 
                             lowerMsg.includes('updated successfully') ||
                             lowerMsg.includes('paid') ||
                             lowerMsg.includes('credit');
        } else if (typeof billApiResponse === 'object') {
          // Primary check: API explicitly says success
          if (billApiResponse.success === true) {
            billUpdateSuccess = true;
          }
          // Secondary check: Check if payment_status matches (but API might not have updated it in response yet)
          else if (billApiResponse.data?.payment_status === finalPaymentStatus ||
                   billApiResponse.data?.bill?.payment_status === finalPaymentStatus ||
                   billApiResponse.payment_status === finalPaymentStatus) {
            billUpdateSuccess = true;
          }
          // Tertiary check: Check message for success indicators
          else if (billApiResponse.message && (
            billApiResponse.message.toLowerCase().includes('success') ||
            billApiResponse.message.toLowerCase().includes('updated successfully')
          )) {
            billUpdateSuccess = true;
          }
          // Also check status field
          else if (billApiResponse.status === 'success') {
            billUpdateSuccess = true;
          }
        }
      }
      
      // Also check the error message - if it contains "success", it's actually a success
      if (!billUpdateSuccess && billUpdateErrorMsg) {
        const lowerErrorMsg = billUpdateErrorMsg.toLowerCase();
        if (lowerErrorMsg.includes('success') || lowerErrorMsg.includes('updated successfully')) {
          billUpdateSuccess = true;
        }
      }
      
      if (!billUpdateSuccess && billUpdateErrorMsg) {
        console.error('Bill update error:', billUpdateErrorMsg);
      }

      // Update order status: 'Bill Generated' for credit payments (Credit is not a valid order status), 'Complete' for others
      // Note: We display 'Credit' in UI based on payment_method, not order_status
      // This MUST succeed for the payment to be considered complete
      const orderIdValue = generatedBill.order_id;
      const orderidValue = generatedBill.order_number || `ORD-${generatedBill.order_id}`;
      // Keep order status as 'Bill Generated' for credit payments since 'Credit' is not a valid order status
      const finalOrderStatus = paymentMode === 'Credit' ? 'Bill Generated' : 'Complete';
      
      const orderStatusPayload = { 
        order_status: finalOrderStatus,
        payment_status: finalPaymentStatus,
        payment_method: finalPaymentMethod,
        order_id: orderIdValue,
        orderid: orderidValue
      };
      
      let orderUpdateSuccess = false;
      let orderUpdateError = null;
      try {
        const orderStatusResult = await apiPost('api/chnageorder_status.php', orderStatusPayload);
        
        // Check if order status update was successful - be strict about this
        const orderApiResponse = orderStatusResult.data;
        orderUpdateSuccess = orderStatusResult.success && orderApiResponse && (
          orderApiResponse.success === true ||
          orderApiResponse.status === 'success' ||
          (orderApiResponse.message && orderApiResponse.message.toLowerCase().includes('success'))
        );
        
        if (!orderUpdateSuccess) {
          // Extract error message from multiple possible locations
          let errorMsg = null;
          
          if (orderApiResponse) {
            if (typeof orderApiResponse === 'string') {
              errorMsg = orderApiResponse;
            } else if (orderApiResponse.message) {
              errorMsg = orderApiResponse.message;
            } else if (orderApiResponse.error) {
              errorMsg = orderApiResponse.error;
            } else if (orderApiResponse.data?.message) {
              errorMsg = orderApiResponse.data.message;
            } else if (orderApiResponse.data?.error) {
              errorMsg = orderApiResponse.data.error;
            } else if (Object.keys(orderApiResponse).length === 0) {
              errorMsg = 'Empty response from server. Please check if chnageorder_status.php API is working correctly.';
            } else {
              // Try to stringify the response to see what we got
              errorMsg = `Unexpected response format: ${JSON.stringify(orderApiResponse).substring(0, 200)}`;
            }
          } else if (!orderStatusResult.success) {
            errorMsg = `HTTP ${orderStatusResult.status || 'error'}: ${orderStatusResult.status === 404 ? 'API endpoint not found' : 'Server error'}`;
          } else {
            errorMsg = 'Order status update failed - unknown error';
          }
          
          orderUpdateError = errorMsg || 'Order status update failed';
          console.error('Order status update failed:', {
            response: orderApiResponse,
            fullResult: orderStatusResult,
            errorMessage: orderUpdateError,
            httpStatus: orderStatusResult.status,
            httpSuccess: orderStatusResult.success
          });
        }
      } catch (orderError) {
        console.error('Error updating order status:', orderError);
        orderUpdateError = orderError.message || orderError.toString() || 'Network error';
      }
      
      // If order status update failed, show error but still proceed with payment
      if (!orderUpdateSuccess) {
        setAlert({ 
          type: 'warning', 
          message: `Payment recorded successfully, but order status update failed: ${orderUpdateError || 'Unknown error'}. The bill is paid, but you may need to manually update the order status to Complete.` 
        });
        // Still refresh to show updated payment status
        fetchOrders();
        // Don't return - allow the success flow to continue since payment was successful
      }
      
      // If order is completed/credit and it's a Dine In order, update table status to Available
      // This should happen regardless of orderUpdateSuccess since payment was successful
      // Update table for both 'Complete' status and credit payments ('Bill Generated' status with credit payment)
      // Use generatedBill data if orderDetails is not available
      const orderForTableUpdate = orderDetails || generatedBill;
      const isCreditPayment = paymentMode === 'Credit';
      const shouldUpdateTable = finalOrderStatus === 'Complete' || isCreditPayment;
      
      if (shouldUpdateTable && orderForTableUpdate && orderForTableUpdate.order_type === 'Dine In' && (orderForTableUpdate.table_id || orderForTableUpdate.table_number)) {
        try {
          const terminal = getTerminal();
          const branchId = getBranchId();
          const tableId = orderForTableUpdate.table_id || orderForTableUpdate.table_number;
          
          console.log(`🔄 Updating table status to Available after ${isCreditPayment ? 'credit payment' : 'order completion'}`);
          console.log('Table ID:', tableId);
          console.log('Order type:', orderForTableUpdate.order_type);
          
          // Fetch current table details
          const tablesResult = await apiPost('api/get_tables.php', { 
            terminal,
            branch_id: branchId || terminal
          });
          
          // Handle different response structures
          let tablesData = [];
          if (tablesResult.data && Array.isArray(tablesResult.data)) {
            tablesData = tablesResult.data;
          } else if (tablesResult.data && tablesResult.data.data && Array.isArray(tablesResult.data.data)) {
            tablesData = tablesResult.data.data;
          }
          
          const table = tablesData.find(t => {
            const tId = t.table_id || t.id;
            const tNum = t.table_number || t.table_name || t.number;
            return tId == tableId || tNum == tableId || String(tId) === String(tableId);
          });
          
          if (table) {
            // Update table status to Available
            console.log('🔄 Updating table status to Available for table:', tableId);
            const updateResult = await apiPost('api/table_management.php', {
              table_id: parseInt(table.table_id || table.id || tableId),
              hall_id: table.hall_id || table.hall_ID || orderForTableUpdate.hall_id,
              table_number: table.table_number || table.table_name || table.number || orderForTableUpdate.table_number,
              capacity: table.capacity || table.Capacity || 0,
              status: 'Available',
              terminal: terminal,
              branch_id: branchId || terminal,
              action: 'update'
            });
            console.log('✅ Table status updated to Available:', updateResult);
          } else {
            console.warn('⚠️ Table not found for table_id:', tableId);
          }
        } catch (error) {
          console.error('Error updating table status after payment:', error);
          // Don't show error to user, table status update is secondary
        }
      }

      // Both bill update AND order status update must succeed
      if (billUpdateSuccess && orderUpdateSuccess) {
        // Fetch order items for receipt
        let itemsForReceipt = generatedBill.items || [];
        
        if (itemsForReceipt.length === 0) {
          try {
            console.log('=== Fetching Order Items for Paid Receipt ===');
            const orderId = generatedBill.order_id;
            const orderNumber = generatedBill.order_number || `ORD-${orderId}`;
            
            // Use get_ordersbyid.php to get order with items
            const orderResult = await apiPost('api/get_ordersbyid.php', { 
              order_id: orderId,
              orderid: orderNumber
            });
            
            // Extract items from order response
            if (orderResult.success && orderResult.data) {
              let orderData = null;
              if (Array.isArray(orderResult.data) && orderResult.data.length > 0) {
                orderData = orderResult.data[0];
              } else if (orderResult.data.data && Array.isArray(orderResult.data.data) && orderResult.data.data.length > 0) {
                orderData = orderResult.data.data[0];
              } else if (orderResult.data.order) {
                orderData = orderResult.data.order;
              } else if (typeof orderResult.data === 'object') {
                orderData = orderResult.data;
              }
              
              if (orderData && orderData.items && Array.isArray(orderData.items)) {
                itemsForReceipt = orderData.items;
                console.log('✅ Found items in order data for paid receipt:', itemsForReceipt.length);
              } else if (orderResult.data.items && Array.isArray(orderResult.data.items)) {
                itemsForReceipt = orderResult.data.items;
                console.log('✅ Found items in response for paid receipt:', itemsForReceipt.length);
              }
            }
            
            console.log('✅ Fetched items for paid receipt:', itemsForReceipt.length);
          } catch (error) {
            console.error('Error fetching order items for paid receipt:', error);
            // Continue with existing items if fetch fails
            if (generatedBill.items && generatedBill.items.length > 0) {
              itemsForReceipt = generatedBill.items;
            }
          }
        }
        
        // Format items for receipt
        const formattedItems = (itemsForReceipt || []).map(item => ({
          dish_id: item.dish_id || item.id || item.product_id,
          dish_name: item.dish_name || item.name || item.title || item.item_name || 'Item',
          name: item.dish_name || item.name || item.title || item.item_name || 'Item',
          price: parseFloat(item.price || item.rate || item.unit_price || 0),
          quantity: parseInt(item.quantity || item.qty || item.qnty || 1),
          qty: parseInt(item.quantity || item.qty || item.qnty || 1),
          total_amount: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || item.rate || item.unit_price || 0) * parseInt(item.quantity || item.qty || item.qnty || 1))),
          total: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || item.rate || item.unit_price || 0) * parseInt(item.quantity || item.qty || item.qnty || 1))),
        }));
        
        // Get customer info if credit
        let customerName = null;
        let customerPhone = null;
        if (paymentMode === 'Credit' && paymentCustomerId) {
          const selectedCustomer = customers.find(c => c.id === paymentCustomerId);
          if (selectedCustomer) {
            customerName = selectedCustomer.customer_name;
            customerPhone = selectedCustomer.phone;
          }
        }

        // Update generatedBill with payment info and items
        setGeneratedBill({
          ...generatedBill,
          bill_id: billIdToUse || generatedBill.bill_id,
          payment_status: finalPaymentStatus,
          payment_method: finalPaymentMethod,
          payment_mode: finalPaymentMethod,
          cash_received: cashReceived,
          change: change,
          customer_id: paymentCustomerId || null,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          is_credit: paymentMode === 'Credit',
          items: formattedItems,
        });

        // Close payment modal automatically
        setPaymentModalOpen(false);
        setPaymentData({ cash_received: 0, change: 0 });
        setPaymentMode('Cash'); // Reset to default
        setPaymentCustomerId(null); // Reset customer selection
        
        // Refresh orders to show updated status
        fetchOrders();
        
        // Update existingBill state to reflect payment
        if (existingBill) {
          setExistingBill({
            ...existingBill,
            payment_status: 'Paid',
            cash_received: cashReceived,
            change: change,
          });
        }
        
        // Show receipt modal with paid receipt
        setReceiptModalOpen(true);
        setDetailsModalOpen(false);
        
        // Show success message
        if (paymentMode === 'Cash' && change > 0) {
          setAlert({ 
            type: 'success', 
            message: `Payment received successfully! Change: ${formatPKR(change)}. Order status updated to Complete. Receipt is ready to print.` 
          });
        } else if (paymentMode === 'Credit') {
          setAlert({ 
            type: 'success', 
            message: `Credit payment recorded successfully! Bill status updated to Credit. Customer: ${customerName || 'N/A'}` 
          });
        } else {
          setAlert({ 
            type: 'success', 
            message: `Payment received successfully via ${paymentMode}! Order status updated to Complete.` 
          });
        }
      } else {
        // Both updates failed - provide detailed error message
        const billError = billUpdateErrorMsg || billApiResponse?.message || billApiResponse?.error || 
                         (billUpdateResult.status === 404 ? 'Bill not found. Please generate the bill first.' : 
                          billUpdateResult.status ? `HTTP ${billUpdateResult.status} error` : 'Bill update failed');
        
        const orderError = orderUpdateError || 'Order status update failed';
        
        console.error('Both updates failed:', {
          billError: billError,
          orderError: orderError,
          billResponse: billApiResponse,
          billStatus: billUpdateResult.status
        });
        
        setAlert({ 
          type: 'error', 
          message: `Payment failed: ${billError}. ${orderError ? `Order status: ${orderError}` : ''}` 
        });
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setAlert({ type: 'error', message: 'Failed to process payment: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Handle print KOT (Kitchen Order Ticket) for an order
   */
  const handlePrintKOT = async (orderId, orderItems) => {
    if (!orderId || !orderItems || orderItems.length === 0) {
      setAlert({ type: 'error', message: 'No order data available to print KOT' });
      return;
    }

    try {
      // Get unique kitchen IDs from items
      // Create a map of category_id to kitchen_id from categories
      console.log('Order items for KOT printing:', orderItems);
      console.log('Available categories:', categories);
      
      const categoryToKitchenMap = {};
      categories.forEach(cat => {
        const catId = cat.category_id || cat.id;
        const kitchenId = cat.kitchen_id || cat.kitchen;
        if (catId && kitchenId) {
          categoryToKitchenMap[catId] = kitchenId;
        }
      });
      
      console.log('Category to Kitchen Map:', categoryToKitchenMap);
      
      const kitchenIds = [...new Set(
        orderItems
          .map((item, index) => {
            // Priority 1: Direct kitchen_id from item
            if (item.kitchen_id) {
              console.log(`Item ${index} has direct kitchen_id:`, item.kitchen_id);
              return item.kitchen_id;
            }
            
            // Priority 2: kitchen field from item
            if (item.kitchen) {
              console.log(`Item ${index} has kitchen field:`, item.kitchen);
              return item.kitchen;
            }
            
            // Priority 3: Look up kitchen_id from category using category_id
            const categoryId = item.category_id || item.cat_id;
            if (categoryId) {
              const kitchenId = categoryToKitchenMap[categoryId];
              if (kitchenId) {
                console.log(`Item ${index} category_id ${categoryId} maps to kitchen_id:`, kitchenId);
                return kitchenId;
              } else {
                console.warn(`Item ${index} has category_id ${categoryId} but no kitchen_id found in categories map`);
              }
            }
            
            console.warn(`Item ${index} has no kitchen information:`, item);
            return null;
          })
          .filter(Boolean)
      )];
      
      console.log('Extracted kitchen IDs:', kitchenIds);

      if (kitchenIds.length === 0) {
        setAlert({ type: 'error', message: 'No kitchen information found in items' });
        return;
      }

      // Print KOT to each kitchen
      const branchId = getBranchId() || getTerminal();
      const terminal = getTerminal();
      const printPromises = kitchenIds.map(async (kitchenId) => {
        try {
          console.log(`Printing KOT to kitchen ${kitchenId} for order ${orderId}`);
          console.log('Print parameters:', { order_id: orderId, kitchen_id: kitchenId, branch_id: branchId, terminal });
          
          // Use api/print_kitchen_receipt.php directly (HTTP endpoint)
          const result = await apiPost('api/print_kitchen_receipt.php', {
            order_id: orderId,
            kitchen_id: kitchenId,
            branch_id: branchId,
            terminal: terminal
          });

          console.log(`KOT print result for kitchen ${kitchenId}:`, result);

          // Check if the API call failed (network error, CORS, etc.)
          if (!result || result.success === false) {
            // Extract error message from result.data
            const errorMsg = result?.data?.message || result?.data?.details || result?.message || 'Network error';
            const errorDetails = result?.data?.details || result?.data?.error || '';
            const triedUrls = result?.data?.triedUrls || [];
            
            console.error(`KOT print failed for kitchen ${kitchenId}:`, {
              error: errorMsg,
              details: errorDetails,
              triedUrls: triedUrls,
              fullResult: result
            });
            
            return { 
              kitchenId, 
              success: false, 
              message: errorMsg,
              details: errorDetails,
              triedUrls: triedUrls
            };
          }

          // Handle successful API response
          if (result.data) {
            const responseData = result.data;
            
            // Check for error messages first (even if success is true, there might be an error)
            // Look for actual print errors in message, error field, or results array
            const errorMessage = responseData.error || 
                               (responseData.message && (
                                 responseData.message.toLowerCase().includes('error') ||
                                 responseData.message.toLowerCase().includes('failed') ||
                                 responseData.message.toLowerCase().includes('timeout') ||
                                 responseData.message.toLowerCase().includes('could not connect') ||
                                 responseData.message.toLowerCase().includes('connection timed out') ||
                                 responseData.message.toLowerCase().includes('connection refused')
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
                  r.message.toLowerCase().includes('connection refused')
                ))
              );
              if (errorResult) {
                resultsError = errorResult.message || errorResult.error || 'Print failed';
              }
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
            
            // If success is true and we have printer_ip, check for actual print success
            if (responseData.success === true && responseData.printer_ip) {
              // Check if results array indicates successful print
              if (responseData.results && Array.isArray(responseData.results)) {
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
                // Return success for now but log a warning
                console.warn(`Printer ${responseData.printer_ip} is reachable but print status unclear for kitchen ${kitchenId}`);
                const kitchenName = responseData.kitchen_name || responseData.name || `Kitchen ${kitchenId}`;
                const printerIp = responseData.printer_ip || responseData.printer || '';
                return { 
                  kitchenId, 
                  kitchenName,
                  printerIp,
                  success: true, 
                  message: responseData.message || 'Print sent to printer' 
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
          }
          
          if (result.success === true) {
            return { 
              kitchenId, 
              kitchenName: `Kitchen ${kitchenId}`,
              printerIp: '',
              success: true, 
              message: 'Printed successfully' 
            };
          }
          
          console.warn(`Unexpected response structure for kitchen ${kitchenId}:`, result);
          return { 
            kitchenId, 
            success: false, 
            message: result?.data?.message || result?.message || 'Unexpected response from server' 
          };
        } catch (error) {
          console.error(`Error printing KOT for kitchen ${kitchenId}:`, error);
          // If error is thrown from apiPost, it might have more details
          const errorMessage = error.message || error.data?.message || error.data?.details || 'Network error';
          const errorDetails = error.data?.details || error.data?.error || '';
          const triedUrls = error.data?.triedUrls || [];
          
          return { 
            kitchenId, 
            success: false, 
            message: errorMessage,
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
        const errorMessages = failed.map(r => `Kitchen ${r.kitchenId}: ${r.message}`).join('; ');
        // Check if it's a CORS/network issue
        const isNetworkError = failed.some(r => {
          const message = r.message ? String(r.message) : '';
          return message.includes('CORS') || 
                 message.includes('Cannot connect') || 
                 message.includes('Network');
        });
        
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
  };

  /**
   * Handle print receipt - Print bill receipt if bill exists, otherwise print KOT
   */
  const handlePrintReceipt = async () => {
    // Wait a bit for the DOM to render if receipt modal just opened
    const checkForReceiptElement = () => {
      return document.getElementById('receipt-print-area');
    };
    
    // If no bill, try to print KOT from order details
    if (!generatedBill) {
      // Try to get order details from the currently selected order
      if (orderDetails && orderDetails.order_id) {
        const items = orderItems || orderDetails.items || [];
        if (items.length > 0) {
          await handlePrintKOT(orderDetails.order_id, items);
          return;
        }
      }
      setAlert({ type: 'error', message: 'No receipt data available to print. Please generate a bill first or select an order.' });
      return;
    }
    
    // Wait for receipt element to be rendered (max 2 seconds)
    let attempts = 0;
    while (!checkForReceiptElement() && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!checkForReceiptElement()) {
      console.warn('Receipt element not found after waiting, proceeding anyway...');
    }
    
    // Prevent multiple simultaneous print requests
    if (isPrinting) {
      console.log('Print already in progress, ignoring duplicate request');
      return;
    }
    
    // Validate that items are present - if not, try to fetch them
    let items = generatedBill.items || [];
    
    // If items are missing, try to fetch them from the order
    if (!items || items.length === 0) {
      console.warn('⚠️ No items in generatedBill, attempting to fetch from order...');
      
      if (generatedBill.order_id) {
        try {
          const orderId = generatedBill.order_id;
          const orderNumber = generatedBill.order_number || `ORD-${orderId}`;
          
          console.log('Fetching items for print receipt, Order ID:', orderId);
          
          // Use get_ordersbyid.php to get order with items
          const orderResult = await apiPost('api/get_ordersbyid.php', { 
            order_id: orderId,
            orderid: orderNumber
          });
          
          // Extract items from order response
          if (orderResult.success && orderResult.data) {
            let orderData = null;
            if (Array.isArray(orderResult.data) && orderResult.data.length > 0) {
              orderData = orderResult.data[0];
            } else if (orderResult.data.data && Array.isArray(orderResult.data.data) && orderResult.data.data.length > 0) {
              orderData = orderResult.data.data[0];
            } else if (orderResult.data.order) {
              orderData = orderResult.data.order;
            } else if (typeof orderResult.data === 'object') {
              orderData = orderResult.data;
            }
            
            if (orderData && orderData.items && Array.isArray(orderData.items)) {
              items = orderData.items;
              console.log('✅ Found items in order data for print:', items.length);
            } else if (orderResult.data.items && Array.isArray(orderResult.data.items)) {
              items = orderResult.data.items;
              console.log('✅ Found items in response for print:', items.length);
            }
          }
          
          // Format items if fetched
          if (items && items.length > 0) {
            items = items.map(item => ({
              dish_id: item.dish_id || item.id || item.product_id,
              dish_name: item.dish_name || item.name || item.title || item.item_name || 'Item',
              name: item.dish_name || item.name || item.title || item.item_name || 'Item',
              price: parseFloat(item.price || item.rate || item.unit_price || 0),
              quantity: parseInt(item.quantity || item.qty || item.qnty || 1),
              qty: parseInt(item.quantity || item.qty || item.qnty || 1),
              total_amount: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || item.rate || item.unit_price || 0) * parseInt(item.quantity || item.qty || item.qnty || 1))),
              total: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || item.rate || item.unit_price || 0) * parseInt(item.quantity || item.qty || item.qnty || 1))),
              category_id: item.category_id,
            }));
            
            // Update generatedBill with fetched items
            setGeneratedBill({
              ...generatedBill,
              items: items
            });
            
            console.log('✅ Fetched and formatted items for print:', items.length);
          }
        } catch (error) {
          console.error('Error fetching items for print:', error);
        }
      }
    }
    
    // Final validation - if still no items, show error
    if (!items || items.length === 0) {
      console.error('❌ Cannot print: No items in generated bill after fetch attempt');
      console.error('Generated bill:', generatedBill);
      setAlert({ 
        type: 'error', 
        message: 'Cannot print receipt: No order items found. Please regenerate the bill or try again.' 
      });
      return;
    }
    
    setIsPrinting(true);
    console.log('=== Printing Receipt ===');
    console.log('Items count:', items.length);
    console.log('Items:', items);
    
    try {
      // Get the receipt print area content
      const printContent = document.getElementById('receipt-print-area');
      if (!printContent) {
        setAlert({ type: 'error', message: 'Receipt content not found' });
        setIsPrinting(false);
        return;
      }

      // Get categories from items
      const categoryIds = [...new Set(
        items
          .map(item => item.category_id || item.kitchen_id)
          .filter(Boolean)
      )];

      // Prepare receipt content
      const receiptHTML = printContent.innerHTML;
      
      console.log('Receipt HTML length:', receiptHTML.length);
      console.log('Category IDs:', categoryIds);
      
      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Print request timed out after 10 seconds')), 10000);
      });
      
      // Call backend API to print directly to network printers with timeout
      // Use api/print.php for printing receipts (replaces print_receipt_direct.php)
      const printPromise = apiPost('api/print.php', {
        order_id: generatedBill.order_id,
        bill_id: generatedBill.bill_id,
        receipt_content: receiptHTML,
        category_ids: categoryIds,
        items: items.map(item => ({
          item_id: item.dish_id || item.id,
          category_id: item.category_id || item.kitchen_id,
          name: item.dish_name || item.name,
          quantity: item.quantity || item.qty,
          price: item.price || item.rate
        })),
        terminal: getTerminal(),
        branch_id: getBranchId() || getTerminal()
      });
      
      let printResult;
      try {
        // Race between print API and timeout
        printResult = await Promise.race([printPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.warn('Print API timed out or failed, using fallback print method');
        // Fallback to window.print() if API fails or times out
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Receipt - Restaurant Khas</title>
                <style>
                  @media print {
                    @page {
                      size: 80mm auto;
                      margin: 0;
                    }
                    body {
                      margin: 0;
                      padding: 0;
                    }
                  }
                  body {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    margin: 0;
                    padding: 0;
                  }
                </style>
              </head>
              <body>${receiptHTML}</body>
            </html>
          `);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        } else {
          // If popup blocked, use direct window.print
          window.print();
        }
        
        setAlert({ 
          type: 'warning', 
          message: 'Print API unavailable. Using browser print dialog instead.' 
        });
        setIsPrinting(false);
        return;
      }

      if (printResult.success && printResult.data) {
        const response = printResult.data;
        
        if (response.success === true) {
          // Show success message with printer info
          const printerNames = response.printers || ['Default Printers'];
          setAlert({ 
            type: 'success', 
            message: `Receipt sent to ${printerNames.join(' and ')} successfully` 
          });
          
          // If bill is unpaid, update status based on payment method (Credit or Bill Generated)
          if (generatedBill.payment_status !== 'Paid' && generatedBill.bill_id && generatedBill.order_id) {
            try {
              const orderIdValue = generatedBill.order_id;
              const orderidValue = generatedBill.order_number || `ORD-${generatedBill.order_id}`;
              
              // Determine status: 'Credit' for credit bills, 'Bill Generated' for others
              const isCredit = generatedBill.payment_method === 'Credit' || 
                               generatedBill.payment_mode === 'Credit' || 
                               generatedBill.payment_status === 'Credit' ||
                               generatedBill.is_credit === true;
              const orderStatus = isCredit ? 'Credit' : 'Bill Generated';
              
              const statusPayload = { 
                status: orderStatus,
                order_id: orderIdValue,
                orderid: orderidValue
              };
              
              await apiPost('api/chnageorder_status.php', statusPayload);
              fetchOrders(); // Refresh orders list
            } catch (error) {
              console.error('Error updating order status on print:', error);
            }
          }
        } else {
          // API returned but with error, fallback to window.print
          console.warn('Print API returned error, using fallback');
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Receipt - Restaurant Khas</title>
                  <style>
                    @media print {
                      @page {
                        size: 80mm auto;
                        margin: 0;
                      }
                      body {
                        margin: 0;
                        padding: 0;
                      }
                    }
                    body {
                      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                      margin: 0;
                      padding: 0;
                    }
                  </style>
                </head>
                <body>${receiptHTML}</body>
              </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 250);
          } else {
            window.print();
          }
          
          setAlert({ 
            type: 'warning', 
            message: response.message || 'Print API unavailable. Using browser print dialog instead.' 
          });
        }
      } else {
        // API call failed, fallback to window.print
        console.warn('Print API failed, using fallback');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Receipt - Restaurant Khas</title>
                <style>
                  @media print {
                    @page {
                      size: 80mm auto;
                      margin: 0;
                    }
                    body {
                      margin: 0;
                      padding: 0;
                    }
                  }
                  body {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    margin: 0;
                    padding: 0;
                  }
                </style>
              </head>
              <body>${receiptHTML}</body>
            </html>
          `);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        } else {
          window.print();
        }
        
        setAlert({ 
          type: 'warning', 
          message: 'Print API unavailable. Using browser print dialog instead.' 
        });
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      
      // Fallback to window.print on any error
      try {
        const printContent = document.getElementById('receipt-print-area');
        if (printContent) {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Receipt - Restaurant Khas</title>
                  <style>
                    @media print {
                      @page {
                        size: 80mm auto;
                        margin: 0;
                      }
                      body {
                        margin: 0;
                        padding: 0;
                      }
                    }
                    body {
                      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                      margin: 0;
                      padding: 0;
                    }
                  </style>
                </head>
                <body>${printContent.innerHTML}</body>
              </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 250);
        } else {
          window.print();
        }
        }
      } catch (fallbackError) {
        console.error('Fallback print also failed:', fallbackError);
      }
      
      setAlert({ 
        type: 'error', 
        message: 'Error printing receipt. Using browser print dialog instead.' 
      });
    } finally {
      setIsPrinting(false);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      running: 'bg-blue-100 text-blue-800',
      'bill generated': 'bg-purple-100 text-purple-800',
      complete: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      credit: 'bg-amber-100 text-amber-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[statusLower] || colors.pending;
  };

  /**
   * Table columns configuration
   */
  const columns = [
    { 
      header: 'Order #', 
      accessor: (row) => (
        <span className="font-bold text-gray-900 text-sm">{row.order_number}</span>
      ),
      className: 'w-36',
      wrap: false,
    },
    {
      header: 'Type',
      accessor: (row) => (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap bg-blue-100 text-blue-800 border border-blue-200">
          {row.order_type || 'Dine In'}
        </span>
      ),
      className: 'w-28',
      wrap: false,
    },
    { 
      header: 'Table', 
      accessor: (row) => (
        <span className="text-gray-700 text-sm">
          {row.order_type === 'Dine In' ? (row.table_number || '-') : '-'}
        </span>
      ),
      className: 'w-24',
      wrap: false,
    },
    {
      header: 'Total',
      accessor: (row) => (
        <span className="font-bold text-[#FF5F15] text-sm">{formatPKR(row.netTotal)}</span>
      ),
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Status',
      accessor: (row) => {
        // Check if this is a credit payment - display 'Credit' based on payment_method/payment_status
        const isCredit = row.payment_method === 'Credit' || 
                        row.payment_mode === 'Credit' || 
                        row.payment_status === 'Credit' ||
                        row.is_credit === true;
        
        // If credit payment, display 'Credit' regardless of order_status
        // Otherwise, use order_status
        const displayStatus = isCredit ? 'Credit' : (row.status || 'Pending');
        return (
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(displayStatus)} border`}>
            {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
          </span>
        );
      },
      className: 'w-32',
      wrap: false,
    },
    { 
      header: 'Date', 
      accessor: (row) => (
        <span className="text-gray-600 text-sm">{formatDateTime(row.created_at) || row.created_at}</span>
      ),
      className: 'w-40',
      wrap: false,
    },
  ];

  /**
   * Check if order can be edited (only Pending and Running status)
   */
  const canEditOrder = (status) => {
    const statusLower = (status || '').toLowerCase();
    return statusLower === 'pending' || statusLower === 'running';
  };

  /**
   * Check if order can be cancelled (only Pending and Running status)
   */
  const canCancelOrder = (status) => {
    return canEditOrder(status);
  };

  /**
   * Check if order can be deleted (all statuses except Complete)
   */
  const canDeleteOrder = (status) => {
    const statusLower = (status || '').toLowerCase();
    return statusLower !== 'complete';
  };

  /**
   * Table actions
   */
  const actions = (row) => {
    const statusLower = (row.status || '').toLowerCase();
    const canEdit = canEditOrder(row.status);
    const canCancel = canCancelOrder(row.status);
    const canDelete = canDeleteOrder(row.status);
    
    return (
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {/* Status Dropdown - Only for Pending and Running (Cannot directly set to Bill Generated or Complete) */}
        {canEdit && (
          <select
            value={row.status}
            onChange={(e) => {
              // Prevent setting to Bill Generated or Complete from dropdown
              if (e.target.value === 'Bill Generated' || e.target.value === 'Complete') {
                setAlert({ type: 'error', message: 'Cannot set status to "Bill Generated" or "Complete" from dropdown. Bill must be generated first or receipt must be printed.' });
                return;
              }
              updateOrderStatus(row.order_id || row.id, row.orderid || row.order_number, e.target.value);
            }}
            className="px-3 py-1.5 text-sm border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] transition hover:border-[#FF5F15] font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="Pending">Pending</option>
            <option value="Running">Running</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            fetchOrderDetails(row.order_id || row.id, row.orderid || row.order_number || row.order_id);
          }}
          title="View Details"
          className="hover:bg-blue-50 hover:border-blue-300"
        >
          <Eye className="w-4 h-4" />
        </Button>
        {/* Edit Button - Only for Pending and Running */}
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            title="Edit Order"
            className="hover:bg-green-50 hover:border-green-300"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        {/* Delete Button - Not allowed for Complete status */}
        {canDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteOrder(row.order_id || row.id, row.orderid || row.order_number || row.order_id);
            }}
            title="Delete Order"
            className="hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  };

  // Filter orders by status and search order ID
  const filteredOrders = orders.filter(order => {
    // Filter by status
    if (filter !== 'all' && order.status.toLowerCase() !== filter.toLowerCase()) {
      return false;
    }
    
    // Filter by search order ID if provided
    if (searchOrderId && searchOrderId.trim()) {
      const searchTerm = searchOrderId.trim().toLowerCase();
      const orderId = String(order.order_id || order.id || '').toLowerCase();
      const orderNumber = String(order.orderid || order.order_number || '').toLowerCase();
      const orderIdFormatted = orderNumber.replace(/ord-?/i, ''); // Remove ORD- prefix for matching
      
      // Match exact order ID, order number, or order number without prefix
      if (!orderId.includes(searchTerm) && 
          !orderNumber.includes(searchTerm) && 
          !orderIdFormatted.includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <AccountantLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-[#FF5F15]" />
              Order Management
            </h1>
            <p className="text-gray-600 mt-1">View and manage all orders with full CRUD operations</p>
          </div>
          <Button
            variant="outline"
            onClick={fetchOrders}
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Alert Message */}
        {alert.message && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert({ type: '', message: '' })}
          />
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                label="Search Order by ID"
                name="searchOrderId"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="Enter Order ID or Order Number (e.g., 123 or ORD-123)"
                className="w-full"
              />
            </div>
            {searchOrderId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSearchOrderId('')}
                className="mt-6"
              >
                Clear
              </Button>
            )}
          </div>
          {searchOrderId && (
            <p className="text-sm text-gray-600 mt-2">
              Showing {filteredOrders.length} order(s) matching "{searchOrderId}"
            </p>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm font-medium text-gray-700 mr-2">Filter by Status:</span>
          {['all', 'Pending', 'Running', 'Bill Generated', 'Credit', 'Complete', 'Cancelled'].map((status) => {
            const count = filter === status.toLowerCase() 
              ? filteredOrders.length 
              : orders.filter(o => o.status.toLowerCase() === status.toLowerCase()).length;
            
            return (
              <Button
                key={status}
                variant={filter === status.toLowerCase() ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter(status.toLowerCase())}
                className={`transition-all duration-200 ${
                  filter === status.toLowerCase() 
                    ? 'shadow-md scale-105' 
                    : 'hover:shadow-sm'
                }`}
              >
                {status} 
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  filter === status.toLowerCase()
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {count}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5F15] mb-4"></div>
            <p className="text-gray-600 font-medium">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium text-lg mb-2">No orders found</p>
            <p className="text-gray-500 text-sm">
              {filter === 'all' 
                ? 'There are no orders in the system yet.' 
                : `No orders found with status "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <Table
              columns={columns}
              data={filteredOrders}
              actions={actions}
              emptyMessage="No orders found"
            />
          </div>
        )}

        {/* Order Details Modal */}
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setOrderDetails(null);
            setOrderItems([]);
            setExistingBill(null); // Clear bill data
          }}
          title="Order Details"
          size="lg"
        >
          {orderDetails ? (
            <div className="space-y-6 text-gray-900">
              {/* Order Header with enhanced styling */}
              <div className="grid grid-cols-2 gap-4 pb-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Order Number</p>
                  <p className="font-bold text-xl text-gray-900">{orderDetails.order_id ? `ORD-${orderDetails.order_id}` : (orderDetails.orderid || orderDetails.id)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Order Type</p>
                  <span className="px-3 py-1.5 text-sm font-semibold rounded-lg inline-block mt-1 bg-blue-500 text-white shadow-sm">
                    {orderDetails.order_type || 'Dine In'}
                  </span>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Status</p>
                  <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg inline-block mt-1 ${getStatusColor(orderDetails.order_status || orderDetails.status)} shadow-sm`}>
                    {orderDetails.order_status || orderDetails.status || 'Pending'}
                  </span>
                </div>
                {orderDetails.order_type === 'Dine In' && orderDetails.hall_name && orderDetails.table_number && (
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100">
                    <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">Hall / Table</p>
                    <p className="font-bold text-lg text-gray-900">{orderDetails.hall_name || '-'} / {orderDetails.table_number || '-'}</p>
                  </div>
                )}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Payment Mode</p>
                  <p className="font-semibold text-lg text-gray-900">{orderDetails.payment_mode || 'Cash'}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Date</p>
                  <p className="font-semibold text-lg text-gray-900">{formatDateTime(orderDetails.created_at) || orderDetails.created_at || '-'}</p>
                </div>
              </div>

              {/* Order Items with enhanced styling */}
              {orderItems.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-[#FF5F15] rounded-full"></span>
                    Order Items
                  </h3>
                  <div className="space-y-3 bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-3 px-4 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-base">{item.title || item.dish_name || 'Item'}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {formatPKR(item.price || item.rate || 0)} × {item.quantity || item.qnty || 0}
                          </p>
                        </div>
                        <p className="font-bold text-lg text-gray-900 ml-4">
                          {formatPKR(item.total_amount || item.total || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Totals with enhanced styling */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-3">
                <div className="flex justify-between text-sm py-2">
                  <span className="text-gray-600 font-medium">Subtotal:</span>
                  <span className="font-semibold text-gray-900">{formatPKR(orderDetails.g_total_amount || orderDetails.total || 0)}</span>
                </div>
                {orderDetails.service_charge > 0 && (
                  <div className="flex justify-between text-sm py-2">
                    <span className="text-gray-600 font-medium">Service Charge:</span>
                    <span className="font-semibold text-gray-900">{formatPKR(orderDetails.service_charge || 0)}</span>
                  </div>
                )}
                {orderDetails.discount_amount > 0 && (
                  <div className="flex justify-between text-sm py-2">
                    <span className="text-gray-600 font-medium">Discount:</span>
                    <span className="font-semibold text-red-600">-{formatPKR(orderDetails.discount_amount || orderDetails.discount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-200">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-[#FF5F15] text-2xl">
                    {formatPKR(orderDetails.net_total_amount || orderDetails.netTotal || orderDetails.total || 0)}
                  </span>
                </div>
              </div>

              {/* Generate Bill Button - Always show for Running orders (works for all order types: Dine In, Take Away, Delivery) */}
              {(() => {
                // Case-insensitive status check
                const status = (orderDetails.order_status || orderDetails.status || '').toLowerCase();
                const isRunning = status === 'running';
                
                // Always show Generate Bill for Running orders, regardless of existing bill
                // This ensures proper flow: Running → Generate Bill → Bill Generated → Pay Bill
                return isRunning;
              })() && (
                <div className="pt-2">
                  <Button
                    onClick={async () => {
                      // Ensure orderItems are loaded before opening bill modal
                      if (!orderItems || orderItems.length === 0) {
                        console.log('⚠️ Order items not loaded, fetching now...');
                        try {
                          const orderId = orderDetails.order_id || orderDetails.id;
                          const orderNumber = orderDetails.orderid || orderDetails.order_number || (orderId ? `ORD-${orderId}` : '');
                          
                          // Use get_ordersbyid.php to get order with items
                          const orderResult = await apiPost('api/get_ordersbyid.php', { 
                            order_id: orderId,
                            orderid: orderNumber
                          });
                          
                          // Extract items from order response
                          let itemsData = [];
                          if (orderResult.success && orderResult.data) {
                            let orderData = null;
                            if (Array.isArray(orderResult.data) && orderResult.data.length > 0) {
                              orderData = orderResult.data[0];
                            } else if (orderResult.data.data && Array.isArray(orderResult.data.data) && orderResult.data.data.length > 0) {
                              orderData = orderResult.data.data[0];
                            } else if (orderResult.data.order) {
                              orderData = orderResult.data.order;
                            } else if (typeof orderResult.data === 'object') {
                              orderData = orderResult.data;
                            }
                            
                            if (orderData && orderData.items && Array.isArray(orderData.items)) {
                              itemsData = orderData.items;
                            } else if (orderResult.data.items && Array.isArray(orderResult.data.items)) {
                              itemsData = orderResult.data.items;
                            }
                          }
                          
                          if (itemsData.length > 0) {
                            setOrderItems(itemsData);
                            console.log('✅ Loaded order items before opening bill modal:', itemsData.length);
                          } else {
                            console.warn('⚠️ No items found when preparing to open bill modal');
                            setAlert({ 
                              type: 'warning', 
                              message: 'Warning: No items found for this order. The bill may not generate correctly.' 
                            });
                          }
                        } catch (error) {
                          console.error('Error fetching items before opening bill modal:', error);
                          setAlert({ 
                            type: 'warning', 
                            message: 'Could not fetch order items. The bill may not generate correctly.' 
                          });
                        }
                      }
                      
                      setBillOrder(orderDetails);
                      // Initialize with existing service charge if available, otherwise 0
                      const existingServiceCharge = parseFloat(orderDetails.service_charge || 0);
                      setBillData({
                        discount_percentage: 0,
                        service_charge: existingServiceCharge,
                        payment_mode: orderDetails.payment_mode || 'Cash',
                      });
                      setBillModalOpen(true);
                    }}
                    className="w-full bg-gradient-to-r from-[#FF5F15] to-[#FF8C42] hover:from-[#FF6B2B] hover:to-[#FF9A5C] text-white font-semibold py-3.5 text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    <Receipt className="w-5 h-5 mr-2" />
                    Generate Bill
                  </Button>
                </div>
              )}

              {/* Credit Bill Indicator - Show when bill is credit */}
              {existingBill && (() => {
                const paymentStatus = (existingBill.payment_status || existingBill.payment_method || 'Unpaid').toString().toLowerCase();
                const isCredit = paymentStatus === 'credit' || 
                                 existingBill.is_credit === true || 
                                 existingBill.payment_method === 'Credit' ||
                                 existingBill.payment_mode === 'Credit';
                return isCredit;
              })() && (
                <div className="pt-2">
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-5 h-5 text-amber-600" />
                      <h3 className="font-semibold text-amber-900">Credit Bill</h3>
                    </div>
                    <p className="text-sm text-amber-800">
                      This is a credit bill. Payment will be received from the customer at a later date.
                    </p>
                    {existingBill.customer_id && (
                      <p className="text-xs text-amber-700 mt-2">
                        Customer ID: {existingBill.customer_id}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Pay Bill Button - Only show if order status is "Bill Generated" or "Complete", NOT for "Running" orders, NOT for Credit bills */}
              {(() => {
                // Check order status (case-insensitive)
                const orderStatus = (orderDetails.order_status || orderDetails.status || '').toLowerCase();
                const isRunning = orderStatus === 'running';
                const isBillGenerated = orderStatus === 'bill generated';
                const isComplete = orderStatus === 'complete';
                
                // Never show Pay Bill for Running orders - they should Generate Bill first
                if (isRunning) {
                  return false;
                }
                
                // Check if bill is credit - don't show Pay Bill for credit bills
                if (existingBill) {
                  const paymentStatus = (existingBill.payment_status || existingBill.payment_method || 'Unpaid').toString().toLowerCase();
                  const isCredit = paymentStatus === 'credit' || 
                                   existingBill.is_credit === true || 
                                   existingBill.payment_method === 'Credit' ||
                                   existingBill.payment_mode === 'Credit';
                  
                  // Don't show Pay Bill for credit bills - payment will be received later
                  if (isCredit) {
                    return false;
                  }
                }
                
                // Never show Pay Bill if order status is "Complete" - order is already paid
                if (isComplete) {
                  return false;
                }
                
                // Show Pay Bill if status is "Bill Generated" (even if bill fetch failed)
                if (isBillGenerated) {
                  return true;
                }
                
                // Show Pay Bill if bill exists and is unpaid (for other statuses, not Complete)
                if (existingBill) {
                  const paymentStatus = (existingBill.payment_status || 'Unpaid').toString().toLowerCase();
                  return paymentStatus !== 'paid' && paymentStatus !== 'credit';
                }
                
                return false;
              })() && (
                <div className="pt-2">
                  <Button
                    onClick={async () => {
                      // If bill data not loaded, fetch it first
                      let billToPay = existingBill;
                      if (!billToPay && (orderDetails.order_id || orderDetails.id)) {
                        try {
                          console.log('=== Fetching Bill for Payment ===');
                          console.log('Order ID:', orderDetails.order_id || orderDetails.id);
                          
                          // Use GET to fetch existing bill
                          const billFetchResult = await apiGet('api/bills_management.php', { 
                            order_id: orderDetails.order_id || orderDetails.id 
                          });
                          
                          console.log('Bill fetch result:', JSON.stringify(billFetchResult, null, 2));
                          
                          if (billFetchResult.success && billFetchResult.data) {
                            // Handle different response structures
                            let billResponseData = null;
                            if (billFetchResult.data.success === true && billFetchResult.data.data) {
                              billResponseData = billFetchResult.data.data;
                              billToPay = billResponseData.bill || billResponseData;
                            } else if (billFetchResult.data.bill) {
                              billResponseData = billFetchResult.data;
                              billToPay = billFetchResult.data.bill;
                            } else if (billFetchResult.data.bill_id || billFetchResult.data.order_id) {
                              billResponseData = billFetchResult.data;
                              billToPay = billFetchResult.data;
                            }
                            
                            // Extract order_items from bill response if available (NEW: bills_management.php now returns order_items)
                            if (billResponseData && billResponseData.order_items && Array.isArray(billResponseData.order_items)) {
                              console.log('✅ Found order_items in bill response for payment:', billResponseData.order_items.length);
                              // Update orderItems state with items from bill response
                              if (billResponseData.order_items.length > 0) {
                                setOrderItems(billResponseData.order_items);
                              }
                            }
                            
                            // Update existingBill state
                            if (billToPay) {
                              setExistingBill(billToPay);
                              // Ensure payment_status is set
                              if (!billToPay.payment_status) {
                                billToPay.payment_status = 'Unpaid';
                              }
                            }
                            
                            console.log('Extracted bill to pay:', JSON.stringify(billToPay, null, 2));
                          }
                        } catch (error) {
                          console.error('Error fetching bill for payment:', error);
                          // Continue with order data if bill fetch fails
                        }
                      }
                      
                      // Calculate totals - prefer bill data, fallback to order data with calculations
                      let subtotal = parseFloat(billToPay?.total_amount || orderDetails.g_total_amount || orderDetails.total || 0);
                      let serviceCharge = parseFloat(billToPay?.service_charge || 0);
                      let discountAmount = parseFloat(billToPay?.discount || 0);
                      let grandTotal = parseFloat(billToPay?.grand_total || 0);
                      
                      // If bill data is missing, calculate from order (for "Bill Generated" orders)
                      if (!billToPay || !grandTotal) {
                        subtotal = parseFloat(orderDetails.g_total_amount || orderDetails.total || 0);
                        // Get service charge from order if available, otherwise 0
                        serviceCharge = parseFloat(orderDetails.service_charge || 0);
                        // Get discount from order if available
                        discountAmount = parseFloat(orderDetails.discount_amount || orderDetails.discount || 0);
                        // Calculate grand total
                        grandTotal = subtotal + serviceCharge - discountAmount;
                      }
                      
                      // Calculate discount percentage
                      const discountPercentage = discountAmount > 0 && (subtotal + serviceCharge) > 0 
                        ? ((discountAmount / (subtotal + serviceCharge)) * 100).toFixed(2)
                        : 0;
                      
                      // Prepare bill data for payment modal
                      const receiptData = {
                        bill_id: billToPay?.bill_id || null,
                        order_id: orderDetails.order_id || orderDetails.id,
                        order_number: orderDetails.order_id ? `ORD-${orderDetails.order_id}` : (orderDetails.orderid || orderDetails.id),
                        order_type: orderDetails.order_type || 'Dine In',
                        subtotal: subtotal,
                        service_charge: serviceCharge,
                        discount_percentage: parseFloat(discountPercentage) || 0,
                        discount_amount: discountAmount,
                        grand_total: grandTotal,
                        payment_method: billToPay?.payment_method || orderDetails.payment_mode || 'Cash',
                        payment_status: billToPay?.payment_status || 'Unpaid',
                        items: orderItems,
                        date: billToPay?.created_at || orderDetails.created_at || new Date().toLocaleString(),
                      };
                      
                      console.log('=== Payment Receipt Data Prepared ===');
                      console.log('Receipt data:', JSON.stringify(receiptData, null, 2));
                      
                      setGeneratedBill(receiptData);
                      setPaymentData({
                        cash_received: receiptData.grand_total, // Pre-fill with grand total
                        change: 0,
                      });
                      setPaymentModalOpen(true);
                      setDetailsModalOpen(false); // Close details modal
                    }}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3.5 text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pay Bill
                  </Button>
                </div>
              )}

              {/* View Receipt Button - Show if order status is Complete OR if bill is paid (case-insensitive check) */}
              {(() => {
                // Check order status (case-insensitive)
                const orderStatus = (orderDetails.order_status || orderDetails.status || '').toLowerCase();
                const isComplete = orderStatus === 'complete';
                
                // Show if order status is Complete
                if (isComplete) {
                  return true;
                }
                
                // Also show if bill exists and is paid
                if (existingBill) {
                  const paymentStatus = (existingBill.payment_status || 'Unpaid').toString().toLowerCase();
                  return paymentStatus === 'paid';
                }
                
                return false;
              })() && (
                <div className="pt-2">
                  <Button
                    onClick={async () => {
                      // Fetch bill if not already loaded (for Complete orders)
                      let billForReceipt = existingBill;
                      if (!billForReceipt && (orderDetails.order_id || orderDetails.id)) {
                        try {
                          console.log('=== Fetching Bill for Paid Receipt ===');
                          const billFetchResult = await apiGet('api/bills_management.php', { 
                            order_id: orderDetails.order_id || orderDetails.id 
                          });
                          
                          if (billFetchResult.success && billFetchResult.data) {
                            if (billFetchResult.data.success === true && billFetchResult.data.data) {
                              billForReceipt = billFetchResult.data.data.bill || billFetchResult.data.data;
                            } else if (billFetchResult.data.bill) {
                              billForReceipt = billFetchResult.data.bill;
                            } else if (billFetchResult.data.bill_id || billFetchResult.data.order_id) {
                              billForReceipt = billFetchResult.data;
                            }
                            if (billForReceipt) {
                              setExistingBill(billForReceipt);
                            }
                          }
                        } catch (error) {
                          console.error('Error fetching bill for receipt:', error);
                        }
                      }
                      
                      // Fetch order items if not already loaded
                      let itemsForReceipt = orderItems || [];
                      
                      if (itemsForReceipt.length === 0 || (itemsForReceipt.length > 0 && itemsForReceipt[0]?.order_id !== orderDetails.order_id)) {
                        try {
                          console.log('=== Fetching Order Items for Paid Receipt ===');
                          const orderId = orderDetails.order_id || orderDetails.id;
                          const orderNumber = orderDetails.orderid || orderDetails.order_number || (orderId ? `ORD-${orderId}` : '');
                          
                          // Use get_ordersbyid.php to get order with items
                          const orderResult = await apiPost('api/get_ordersbyid.php', { 
                            order_id: orderId,
                            orderid: orderNumber
                          });
                          
                          // Extract items from order response
                          if (orderResult.success && orderResult.data) {
                            let orderData = null;
                            if (Array.isArray(orderResult.data) && orderResult.data.length > 0) {
                              orderData = orderResult.data[0];
                            } else if (orderResult.data.data && Array.isArray(orderResult.data.data) && orderResult.data.data.length > 0) {
                              orderData = orderResult.data.data[0];
                            } else if (orderResult.data.order) {
                              orderData = orderResult.data.order;
                            } else if (typeof orderResult.data === 'object') {
                              orderData = orderResult.data;
                            }
                            
                            if (orderData && orderData.items && Array.isArray(orderData.items)) {
                              itemsForReceipt = orderData.items;
                            } else if (orderResult.data.items && Array.isArray(orderResult.data.items)) {
                              itemsForReceipt = orderResult.data.items;
                            }
                          }
                          console.log('✅ Fetched items for paid receipt:', itemsForReceipt.length);
                        } catch (error) {
                          console.error('Error fetching order items for paid receipt:', error);
                          // Continue with orderItems from state if fetch fails
                          if (orderItems && orderItems.length > 0) {
                            itemsForReceipt = orderItems;
                          }
                        }
                      }
                      
                      // Format items for receipt
                      const formattedItems = (itemsForReceipt || []).map(item => ({
                        dish_id: item.dish_id || item.id || item.product_id,
                        dish_name: item.dish_name || item.name || item.title || item.item_name || 'Item',
                        name: item.dish_name || item.name || item.title || item.item_name || 'Item',
                        price: parseFloat(item.price || item.rate || item.unit_price || 0),
                        quantity: parseInt(item.quantity || item.qty || item.qnty || 1),
                        qty: parseInt(item.quantity || item.qty || item.qnty || 1),
                        total_amount: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || item.rate || item.unit_price || 0) * parseInt(item.quantity || item.qty || item.qnty || 1))),
                        total: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || item.rate || item.unit_price || 0) * parseInt(item.quantity || item.qty || item.qnty || 1))),
                      }));
                      
                      // Prepare paid bill receipt data
                      const receiptData = {
                        bill_id: billForReceipt?.bill_id || null,
                        order_id: orderDetails.order_id || orderDetails.id,
                        order_number: orderDetails.order_id ? `ORD-${orderDetails.order_id}` : (orderDetails.orderid || orderDetails.id),
                        order_type: orderDetails.order_type || 'Dine In',
                        table_number: orderDetails.table_number || orderDetails.table_id || '',
                        subtotal: parseFloat(billForReceipt?.total_amount || orderDetails.g_total_amount || orderDetails.total || 0),
                        service_charge: parseFloat(billForReceipt?.service_charge || 0),
                        discount_percentage: billForReceipt?.discount > 0 && billForReceipt?.total_amount > 0 
                          ? ((billForReceipt.discount / (billForReceipt.total_amount + (billForReceipt.service_charge || 0))) * 100).toFixed(2)
                          : 0,
                        discount_amount: parseFloat(billForReceipt?.discount || 0),
                        grand_total: parseFloat(billForReceipt?.grand_total || orderDetails.net_total_amount || orderDetails.total || 0),
                        payment_method: billForReceipt?.payment_method || orderDetails.payment_mode || 'Cash',
                        payment_status: 'Paid',
                        cash_received: parseFloat(billForReceipt?.cash_received || billForReceipt?.grand_total || 0),
                        change: parseFloat(billForReceipt?.change || 0),
                        items: formattedItems,
                        date: billForReceipt?.created_at || billForReceipt?.updated_at || new Date().toLocaleString(),
                      };
                      
                      console.log('✅ Paid receipt data prepared with items:', formattedItems.length);
                      
                      setGeneratedBill(receiptData);
                      setReceiptModalOpen(true);
                      setDetailsModalOpen(false); // Close details modal
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3.5 text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    <Printer className="w-5 h-5 mr-2" />
                    View Paid Receipt
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-red-600 font-semibold text-lg mb-2">Failed to load order details</p>
              <p className="text-gray-600 text-sm">The order information could not be retrieved. Please try again or check if the order exists.</p>
            </div>
          )}
        </Modal>

        {/* Generate Bill Modal */}
        <Modal
          isOpen={billModalOpen}
          onClose={() => {
            setBillModalOpen(false);
            setBillOrder(null);
            setBillData({ discount_percentage: 0, service_charge: 0 });
          }}
          title="Generate Bill"
          size="md"
        >
          {billOrder && (
            <div className="space-y-4 text-gray-900">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Order #{billOrder.order_id ? `ORD-${billOrder.order_id}` : (billOrder.orderid || billOrder.id)}</p>
                <p className="text-sm text-gray-600">Type: {billOrder.order_type || 'Dine In'}</p>
              </div>

              {/* Order Items Summary */}
              {orderItems.length > 0 && (
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  <h4 className="font-semibold text-gray-900 mb-2">Order Items</h4>
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm py-1">
                      <span className="text-gray-900">{item.title || item.dish_name || 'Item'}</span>
                      <span className="text-gray-900 font-medium">{formatPKR(item.total_amount || item.total || 0)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bill Calculation */}
              <div className="space-y-4">
                {/* Subtotal - Read Only */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-sm font-medium text-blue-600 mb-1.5 uppercase tracking-wide">
                    Subtotal
                  </label>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPKR(billOrder.g_total_amount || billOrder.total || 0)}
                  </p>
                </div>

                {/* Service Charge - Manual Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Service Charge <span className="text-gray-500 font-normal">(Amount)</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={billData.service_charge || 0}
                    onChange={(e) => {
                      const serviceCharge = parseFloat(e.target.value) || 0;
                      setBillData({ ...billData, service_charge: serviceCharge });
                    }}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter service charge amount (e.g., 50.00)
                  </p>
                </div>

                {/* Discount - Percentage Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Discount (Percentage) <span className="text-gray-500 font-normal">e.g., 10 = 10%</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={billData.discount_percentage}
                    onChange={(e) => {
                      const discountPercent = parseFloat(e.target.value) || 0;
                      setBillData({ ...billData, discount_percentage: discountPercent });
                    }}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter percentage value (e.g., 10 for 10% discount)
                  </p>
                </div>


                {/* Bill Summary - Real-time Calculation */}
                {(() => {
                  const subtotal = parseFloat(billOrder.g_total_amount || billOrder.total || 0);
                  // Step 1: Service charge (from manual input)
                  const serviceCharge = parseFloat(billData.service_charge || 0);
                  // Step 2: Discount amount (percentage of subtotal + service charge)
                  const discountAmount = ((subtotal + serviceCharge) * (billData.discount_percentage / 100));
                  // Step 3: Grand total
                  const grandTotal = (subtotal + serviceCharge) - discountAmount;
                  
                  return (
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-3">
                      <div className="flex justify-between text-sm py-2">
                        <span className="text-gray-600 font-medium">Subtotal:</span>
                        <span className="font-semibold text-gray-900">{formatPKR(subtotal)}</span>
                      </div>
                      {serviceCharge > 0 && (
                        <div className="flex justify-between text-sm py-2">
                          <span className="text-gray-600 font-medium">Service Charge:</span>
                          <span className="font-semibold text-gray-900">{formatPKR(serviceCharge)}</span>
                        </div>
                      )}
                      {billData.discount_percentage > 0 && (
                        <>
                          <div className="flex justify-between text-sm py-2">
                            <span className="text-gray-600 font-medium">Discount ({billData.discount_percentage}%):</span>
                            <span className="font-semibold text-red-600">-{formatPKR(discountAmount)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-200">
                        <span className="text-gray-900">Grand Total:</span>
                        <span className="text-[#FF5F15] text-2xl">
                          {formatPKR(grandTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Generate Bill Button */}
                <Button
                  onClick={async () => {
                    try {
                      const subtotal = parseFloat(billOrder.g_total_amount || billOrder.total || 0);
                      
                      // Step 1: Service charge (from manual input)
                      const serviceCharge = parseFloat(billData.service_charge || 0);
                      
                      // Step 2: Discount amount (percentage of subtotal + service charge)
                      const discountAmount = ((subtotal + serviceCharge) * (billData.discount_percentage / 100));
                      
                      // Step 3: Grand total
                      const grandTotal = (subtotal + serviceCharge) - discountAmount;

                      // Create bill using bills_management.php API - Always create as Unpaid
                      const billPayload = {
                        order_id: billOrder.order_id || billOrder.id,
                        total_amount: subtotal,
                        service_charge: serviceCharge,
                        discount: discountAmount, // Store discount amount (not percentage)
                        grand_total: grandTotal,
                        payment_method: 'Cash', // Default payment method, will be updated when payment is received
                        payment_status: 'Unpaid', // Bill always starts as Unpaid
                      };

                      // Log the payload being sent
                      console.log('Bill payload being sent:', billPayload);
                      
                      const result = await apiPost('api/bills_management.php', billPayload);
                      
                      // Debug: Log the complete result
                      console.log('=== Bill Generation Result ===');
                      console.log('Complete result:', JSON.stringify(result, null, 2));
                      console.log('Result success (HTTP ok):', result.success);
                      console.log('Result status code:', result.status);
                      console.log('Result data type:', typeof result.data);
                      console.log('Result data:', result.data);
                      
                      // Check if result itself is empty or undefined
                      if (!result || typeof result !== 'object' || Object.keys(result).length === 0) {
                        console.error('Empty result received from API');
                        setAlert({ type: 'error', message: 'Empty response from server. Please check server logs and ensure the bills_management.php API is working.' });
                        return;
                      }
                      
                      // apiPost returns { success: response.ok, data: parsedJSON, status }
                      // The API response JSON is in result.data
                      const apiResponse = result.data; // This is the parsed API JSON response
                      
                      // Check if we have a valid API response
                      if (!apiResponse || typeof apiResponse !== 'object' || Object.keys(apiResponse).length === 0) {
                        console.error('Invalid or empty API response:', apiResponse);
                        console.error('Full result object:', result);
                        setAlert({ 
                          type: 'error', 
                          message: 'Invalid or empty response from server. Status: ' + (result.status || 'unknown') + '. Please check server logs.' 
                        });
                        return;
                      }
                      
                      // Check if API call was successful (HTTP 200) AND API returned success: true
                      const isSuccess = result.success && apiResponse && apiResponse.success === true;
                      
                      console.log('Is success?', isSuccess);
                      console.log('HTTP Success (response.ok):', result.success);
                      console.log('HTTP Status:', result.status);
                      console.log('API Response success:', apiResponse?.success);
                      console.log('API Response data:', apiResponse?.data);
                      
                      if (isSuccess && apiResponse.data) {
                        // Extract bill_id and bill data from API response
                        const responseData = apiResponse.data; // { bill: {...}, bill_id: 123 }
                        
                        let billId = null;
                        let billData = null;
                        
                        // Get bill_id from responseData.bill_id
                        if (responseData.bill_id) {
                          billId = responseData.bill_id;
                        }
                        
                        // Get bill object
                        if (responseData.bill) {
                          billData = responseData.bill;
                          // If bill_id not found, try from bill object
                          if (!billId && billData.bill_id) {
                            billId = billData.bill_id;
                          }
                        } else if (responseData.bill_id) {
                          // If responseData itself has bill_id, it might be the bill
                          billData = responseData;
                          billId = responseData.bill_id;
                        }
                        
                        // If still no billId, throw error
                        if (!billId) {
                          console.error('No bill ID found in response:', {
                            result,
                            apiResponse,
                            responseData,
                            'responseData.bill_id': responseData?.bill_id,
                            'responseData.bill': responseData?.bill,
                            'responseData.bill.bill_id': responseData?.bill?.bill_id
                          });
                          throw new Error('Bill created but no bill ID returned. Please check server logs.');
                        }
                        
                        // Calculate discount percentage if not in bill data
                        let discountPercentage = billData.discount_percentage || 0;
                        if (!discountPercentage && billData.discount && (subtotal + serviceCharge) > 0) {
                          discountPercentage = ((billData.discount / (subtotal + serviceCharge)) * 100).toFixed(2);
                        }
                        
                        // Check if order_items are already in the response (NEW: bills_management.php now returns order_items)
                        let itemsForReceipt = [];
                        if (responseData.order_items && Array.isArray(responseData.order_items) && responseData.order_items.length > 0) {
                          console.log('✅ Using order_items from bill response:', responseData.order_items.length);
                          itemsForReceipt = responseData.order_items;
                        } else {
                          // Fallback: Fetch order items separately if not in response
                          try {
                            console.log('=== Fetching Order Items for Bill Generation (fallback) ===');
                            const orderId = billOrder.order_id || billOrder.id;
                            const orderNumber = billOrder.orderid || billOrder.order_number || (orderId ? `ORD-${orderId}` : '');
                            
                            console.log('Order ID:', orderId);
                            console.log('Order Number:', orderNumber);
                            
                            // Use get_ordersbyid.php to get order with items
                            const orderResult = await apiPost('api/get_ordersbyid.php', { 
                              order_id: orderId,
                              orderid: orderNumber
                            });
                            
                            console.log('Order API response:', orderResult);
                            console.log('Order API response success:', orderResult.success);
                            console.log('Order API response status:', orderResult.status);
                            console.log('Order API response data:', JSON.stringify(orderResult.data, null, 2));
                            
                            // Extract items from order response - handle multiple structures
                            if (orderResult.success && orderResult.data) {
                              let orderData = null;
                              if (Array.isArray(orderResult.data) && orderResult.data.length > 0) {
                                orderData = orderResult.data[0];
                              } else if (orderResult.data.data && Array.isArray(orderResult.data.data) && orderResult.data.data.length > 0) {
                                orderData = orderResult.data.data[0];
                              } else if (orderResult.data.order) {
                                orderData = orderResult.data.order;
                              } else if (typeof orderResult.data === 'object') {
                                orderData = orderResult.data;
                              }
                              
                              if (orderData && orderData.items && Array.isArray(orderData.items)) {
                                itemsForReceipt = orderData.items;
                                console.log('✅ Found items in order data (items):', itemsForReceipt.length);
                              } else if (orderResult.data.items && Array.isArray(orderResult.data.items)) {
                                itemsForReceipt = orderResult.data.items;
                                console.log('✅ Found items in response (items):', itemsForReceipt.length);
                              }
                            }
                            
                            // If still no items, try orderItems from state
                            if (itemsForReceipt.length === 0) {
                              console.warn('⚠️ No items found in API response. Trying orderItems from state...');
                              console.log('orderItems state:', orderItems);
                              console.log('orderItems length:', orderItems?.length || 0);
                              
                              // Fallback to orderItems from state if API returns empty
                              if (orderItems && orderItems.length > 0) {
                                itemsForReceipt = orderItems;
                                console.log('✅ Using orderItems from state:', itemsForReceipt.length);
                              } else {
                                console.error('❌ No items found after all attempts');
                              }
                            }
                            
                            console.log('✅ Final items for receipt:', itemsForReceipt.length);
                            if (itemsForReceipt.length > 0) {
                              console.log('Sample item:', JSON.stringify(itemsForReceipt[0], null, 2));
                            } else {
                              console.error('❌ CRITICAL: No items found after all attempts!');
                              console.error('Order ID:', orderId);
                              console.error('Order Number:', orderNumber);
                              console.error('billOrder:', billOrder);
                              console.error('orderItems state:', orderItems);
                              console.error('API Response:', orderResult);
                            }
                          } catch (error) {
                            console.error('❌ Error fetching order items for bill (fallback):', error);
                            console.error('Error details:', error.message, error.stack);
                            // Fallback to orderItems from state if fetch fails
                            if (orderItems && orderItems.length > 0) {
                              itemsForReceipt = orderItems;
                              console.log('✅ Using orderItems from state as fallback:', itemsForReceipt.length);
                            } else {
                              console.error('❌ No fallback available - orderItems state is also empty');
                            }
                          }
                        }
                        
                        // Validate that items are present before formatting
                        if (!itemsForReceipt || itemsForReceipt.length === 0) {
                          console.error('❌ No items found in receipt data!');
                          console.error('Debug info:', {
                            itemsForReceipt: itemsForReceipt?.length || 0,
                            orderItems: orderItems?.length || 0,
                            billOrder: billOrder,
                            orderId: billOrder?.order_id || billOrder?.id,
                            orderNumber: billOrder?.orderid || billOrder?.order_number,
                            responseData: responseData
                          });
                          
                          setAlert({ 
                            type: 'error', 
                            message: `Cannot generate receipt: No order items found for order ${billOrder?.order_id ? `ORD-${billOrder.order_id}` : billOrder?.orderid || 'N/A'}. Please ensure the order has items and try again. If the problem persists, check the browser console for API response details.` 
                          });
                          return;
                        }
                        
                        // Format items for receipt
                        const formattedItems = itemsForReceipt.map(item => ({
                          dish_id: item.dish_id || item.id || item.product_id,
                          dish_name: item.dish_name || item.name || item.title || item.item_name || 'Item',
                          name: item.dish_name || item.name || item.title || item.item_name || 'Item',
                          price: parseFloat(item.price || item.rate || item.unit_price || 0),
                          quantity: parseInt(item.quantity || item.qty || item.qnty || 1),
                          qty: parseInt(item.quantity || item.qty || item.qnty || 1),
                          total_amount: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || item.rate || item.unit_price || 0) * parseInt(item.quantity || item.qty || item.qnty || 1))),
                          total: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || item.rate || item.unit_price || 0) * parseInt(item.quantity || item.qty || item.qnty || 1))),
                        }));
                        
                        console.log('✅ Formatted items for receipt:', formattedItems.length);
                        if (formattedItems.length > 0) {
                          console.log('Sample formatted item:', JSON.stringify(formattedItems[0], null, 2));
                        }
                        
                        // Store bill data for receipt - use calculated values from frontend
                        const receiptData = {
                          bill_id: billId,
                          order_id: billOrder.order_id || billOrder.id,
                          order_number: billOrder.order_id ? `ORD-${billOrder.order_id}` : (billOrder.orderid || billOrder.id),
                          order_type: billOrder.order_type || 'Dine In',
                          table_number: billOrder.table_number || billOrder.table_id || '',
                          subtotal: subtotal,
                          service_charge: serviceCharge,
                          discount_percentage: parseFloat(discountPercentage) || 0,
                          discount_amount: discountAmount,
                          grand_total: grandTotal,
                          payment_method: 'Cash', // Default payment method, will be updated when payment is received
                          payment_mode: 'Cash', // Default payment method, will be updated when payment is received
                          payment_status: 'Unpaid', // Bill always starts as Unpaid
                          items: formattedItems,
                          date: new Date().toLocaleString(),
                        };
                        
                        console.log('=== Receipt Data Prepared ===');
                        console.log('Receipt data:', receiptData);
                        console.log('Items count:', formattedItems.length);
                        console.log('Items:', formattedItems);
                        
                        // Store bill data for receipt
                        setGeneratedBill(receiptData);
                        
                        // Close bill modal
                        setBillModalOpen(false);
                        setBillOrder(null);
                        setBillData({ discount_percentage: 0, service_charge: 0 });
                        
                        // Update order status - always 'Bill Generated' after bill generation
                        const orderIdValue = billOrder.order_id || billOrder.id;
                        const orderidValue = billOrder.order_id ? `ORD-${billOrder.order_id}` : (billOrder.orderid || billOrder.id);
                        
                        // Order status is always 'Bill Generated' after bill generation
                        const orderStatus = 'Bill Generated';
                        
                        try {
                          const statusPayload = { 
                            status: orderStatus,
                            order_id: orderIdValue,
                            orderid: orderidValue
                          };
                          await apiPost('api/chnageorder_status.php', statusPayload);
                          console.log(`Order status updated to: ${orderStatus}`);
                        } catch (error) {
                          console.error('Error updating order status:', error);
                          // Continue even if status update fails
                        }
                        
                        // Refresh orders list
                        fetchOrders();
                        
                        // Show receipt modal for printing
                        setReceiptModalOpen(true);
                        setDetailsModalOpen(false);
                        
                        // Auto-print bill receipt after a delay to ensure modal is rendered
                        // Use a longer delay to ensure React has rendered the modal and DOM elements
                        setTimeout(() => {
                          // Check receiptData (the new value) instead of generatedBill (old value)
                          if (receiptData && receiptData.items && receiptData.items.length > 0) {
                            handlePrintReceipt();
                          } else {
                            console.warn('Generated bill not ready for printing, user can click print button manually');
                            setAlert({ 
                              type: 'info', 
                              message: 'Bill generated successfully! Click the Print button to print the receipt.' 
                            });
                          }
                        }, 1000);
                        
                        setAlert({ type: 'success', message: 'Bill generated successfully! Printing receipt...' });
                        // Broadcast update to other dashboard instances
                        broadcastUpdate(UPDATE_EVENTS.BILL_CREATED, { 
                          bill_id: billId,
                          order_id: billOrder.order_id || billOrder.id 
                        });
                        broadcastUpdate(UPDATE_EVENTS.ORDER_STATUS_CHANGED, { 
                          order_id: billOrder.order_id || billOrder.id,
                          status: 'Bill Generated' 
                        });
                        // Broadcast update to other dashboard instances
                        broadcastUpdate(UPDATE_EVENTS.BILL_CREATED, { 
                          bill_id: billId,
                          order_id: billOrder.order_id || billOrder.id 
                        });
                        broadcastUpdate(UPDATE_EVENTS.ORDER_STATUS_CHANGED, { 
                          order_id: billOrder.order_id || billOrder.id,
                          status: 'Bill Generated' 
                        });
                      } else {
                        // More detailed error message - check all possible error locations
                        let errorMsg = 'Failed to generate bill';
                        
                        if (apiResponse && typeof apiResponse === 'object') {
                          // Check for database column errors
                          const responseStr = JSON.stringify(apiResponse).toLowerCase();
                          if (responseStr.includes('unknown column') || responseStr.includes('is_cancel')) {
                            errorMsg = 'Database error: The backend is trying to use a column that doesn\'t exist. Please contact the administrator to fix the database schema or update the API file (bills_management.php).';
                          } else {
                            errorMsg = apiResponse.message || 
                                      apiResponse.data?.message || 
                                      apiResponse.data?.error || 
                                      apiResponse.error ||
                                      (apiResponse.success === false ? 'Bill creation failed on server' : errorMsg);
                          }
                        } else if (result.data && typeof result.data === 'string') {
                          const dataStr = result.data.toLowerCase();
                          if (dataStr.includes('unknown column') || dataStr.includes('is_cancel')) {
                            errorMsg = 'Database error: The backend is trying to use a column that doesn\'t exist. Please contact the administrator to fix the database schema or update the API file (bills_management.php).';
                          } else {
                            errorMsg = result.data;
                          }
                        } else if (result.message) {
                          errorMsg = result.message;
                        }
                        
                        console.error('=== Bill Generation Failed ===');
                        console.error('HTTP Success:', result.success);
                        console.error('HTTP Status:', result.status);
                        console.error('API Response:', apiResponse);
                        console.error('Error Message:', errorMsg);
                        
                        // Show user-friendly error message
                        setAlert({ 
                          type: 'error', 
                          message: errorMsg || 'Failed to generate bill. Please check server logs or contact support.' 
                        });
                      }
                    } catch (error) {
                      console.error('Error generating bill:', error);
                      const errorStr = (error.message || '').toLowerCase();
                      let errorMsg = 'Failed to generate bill: ' + (error.message || 'Network error');
                      
                      // Check for database column errors in catch block
                      if (errorStr.includes('unknown column') || errorStr.includes('is_cancel')) {
                        errorMsg = 'Database error: The backend is trying to use a column that doesn\'t exist. Please contact the administrator to fix the database schema or update the API file (bills_management.php).';
                      }
                      
                      setAlert({ type: 'error', message: errorMsg });
                    }
                  }}
                  className="w-full bg-gradient-to-r from-[#FF5F15] to-[#FF8C42] hover:from-[#FF6B2B] hover:to-[#FF9A5C] text-white font-semibold py-3.5 text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <Calculator className="w-5 h-5 mr-2" />
                  Generate Bill
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Order Modal */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingOrder(null);
            setFormData({ status: 'Pending', table_id: '', discount: 0, items: [] });
            setSelectedCategory('');
            setOriginalTableId(null);
            setTables([]);
          }}
          title="Edit Order"
          size="lg"
        >
          {editingOrder && (
            <form onSubmit={handleUpdateOrder}>
              <div className="space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
                {/* Order Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Order Number
                  </label>
                  <p className="font-semibold text-gray-900">{editingOrder.order_number}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      // Prevent setting to Bill Generated or Complete from edit modal
                      if (e.target.value === 'Bill Generated' || e.target.value === 'Complete') {
                        setAlert({ type: 'error', message: 'Cannot set status to "Bill Generated" or "Complete" from edit. Bill must be generated first or receipt must be printed.' });
                        return;
                      }
                      setFormData({ ...formData, status: e.target.value });
                    }}
                    required
                    className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Running">Running</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Status can only be set to "Bill Generated" when receipt is printed, or "Complete" after bill payment.
                  </p>
                </div>

                {/* Table Selection - Show dropdown for Dine In orders */}
                {editingOrder && (editingOrder.order_type || '').toLowerCase() === 'dine in' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Table <span className="text-red-500">*</span>
                      {originalTableId && formData.table_id && originalTableId.toString() !== formData.table_id.toString() && (
                        <span className="ml-2 text-xs text-amber-600 font-normal">
                          (Transferring from Table {originalTableId} to Table {formData.table_id})
                        </span>
                      )}
                    </label>
                    <select
                      value={formData.table_id || ''}
                      onChange={(e) => setFormData({ ...formData, table_id: e.target.value })}
                      required
                      className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                    >
                      <option value="">Select Table</option>
                      {tables.map((table) => {
                        const tableId = table.table_id || table.id;
                        const tableNumber = table.table_number || table.table_name || table.number || tableId;
                        const tableStatus = table.status || 'Available';
                        const isCurrentTable = tableId && originalTableId && tableId.toString() === originalTableId.toString();
                        const isAvailable = tableStatus.toLowerCase() === 'available' || isCurrentTable;
                        
                        return (
                          <option 
                            key={tableId} 
                            value={tableId}
                            disabled={!isAvailable && !isCurrentTable}
                          >
                            {tableNumber} {isCurrentTable ? '(Current)' : ''} {!isAvailable && !isCurrentTable ? '(Occupied)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select a table to transfer the order. Current table will be set to Available, new table will be set to Running.
                    </p>
                  </div>
                ) : (
                  <Input
                    label="Table ID"
                    type="text"
                    value={formData.table_id}
                    onChange={(e) => setFormData({ ...formData, table_id: e.target.value })}
                    placeholder="Table ID"
                  />
                )}

                {/* Current Order Items */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-[#FF5F15]" />
                      Order Items ({formData.items.length})
                    </h3>
                  </div>
                  {formData.items.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No items in order. Add items below.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">{formatPKR(item.price)} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateDishQuantity(item.dish_id, item.quantity - 1)}
                              className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-900"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-medium w-8 text-center text-gray-900">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateDishQuantity(item.dish_id, item.quantity + 1)}
                              className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-900"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-semibold text-gray-900 w-20 text-right">{formatPKR(item.total)}</span>
                            <button
                              type="button"
                              onClick={() => removeDishFromOrder(item.dish_id)}
                              className="ml-2 text-red-500 hover:text-red-700"
                              title="Remove item"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Dishes Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Add Dishes</h3>
                  
                  {/* Category Filter */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Filter by Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="block w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category.category_id} value={category.category_id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dishes List */}
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {dishes
                      .filter(dish => !selectedCategory || dish.category_id == selectedCategory)
                      .filter(dish => dish.is_available == 1)
                      .map((dish) => (
                        <div
                          key={dish.dish_id}
                          className="border border-gray-200 rounded-lg p-2 hover:shadow-md transition cursor-pointer"
                          onClick={() => addDishToOrder(dish)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium text-sm text-gray-900 flex-1">{dish.name}</p>
                            <p className="font-bold text-xs text-[#FF5F15] ml-2">{formatPKR(dish.price)}</p>
                          </div>
                          <p className="text-xs text-gray-500">{dish.category_name || ''}</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              addDishToOrder(dish);
                            }}
                            className="w-full mt-2 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))}
                  </div>
                  {dishes.filter(dish => (!selectedCategory || dish.category_id == selectedCategory) && dish.is_available == 1).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No available dishes in this category</p>
                  )}
                </div>

                <Input
                  label="Discount (PKR)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  placeholder="0.00"
                />

                {/* Order Totals */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Subtotal:</span>
                    <span className="font-semibold text-gray-900">
                      {formatPKR(formData.items.reduce((sum, item) => sum + item.total, 0))}
                    </span>
                  </div>
                  {formData.discount > 0 && (
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium">Discount:</span>
                      <span className="font-semibold text-red-600">-{formatPKR(formData.discount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-[#FF5F15]">
                      {formatPKR(calculateOrderTotal())}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingOrder(null);
                      setFormData({ status: 'Pending', table_id: '', discount: 0, items: [] });
                      setSelectedCategory('');
                      setOriginalTableId(null);
                      setTables([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formData.items.length === 0}>
                    Update Order
                  </Button>
                </div>
              </div>
            </form>
          )}
        </Modal>

        {/* Payment Modal - Shows after bill generation for cash collection */}
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => {
            // Allow cancel for now - user can pay later
            if (confirm('Cancel payment? You can pay the bill later from the orders page.')) {
              setPaymentModalOpen(false);
              setPaymentData({ cash_received: 0, change: 0 });
              setPaymentMode('Cash'); // Reset to default
              setPaymentCustomerId(null); // Reset customer selection
            }
          }}
          title="Receive Payment"
          size="md"
          showCloseButton={true}
        >
          {generatedBill && (
            <div className="space-y-6 text-gray-900">
              {/* Bill Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200 shadow-sm">
                <div className="text-center mb-4">
                  <DollarSign className="w-12 h-12 text-[#FF5F15] mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-gray-900">Bill Payment</h3>
                  <p className="text-sm text-gray-600 mt-1">Order #{generatedBill.order_number}</p>
                  <p className="text-xs text-gray-500 mt-1">Payment Method: {generatedBill.payment_method}</p>
                </div>
                
                <div className="space-y-2 bg-white p-4 rounded-lg border border-blue-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Subtotal:</span>
                    <span className="font-semibold text-gray-900">{formatPKR(generatedBill.subtotal)}</span>
                  </div>
                  {generatedBill.service_charge > 0 && generatedBill.order_type === 'Dine In' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">Service Charge:</span>
                      <span className="font-semibold text-gray-900">{formatPKR(generatedBill.service_charge)}</span>
                    </div>
                  )}
                  {generatedBill.discount_percentage > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">Discount ({generatedBill.discount_percentage}%):</span>
                      <span className="font-semibold text-red-600">-{formatPKR(generatedBill.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t-2 border-gray-200">
                    <span className="text-gray-900">Grand Total:</span>
                    <span className="text-[#FF5F15] text-2xl">
                      {formatPKR(generatedBill.grand_total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => {
                    const newPaymentMode = e.target.value;
                    setPaymentMode(newPaymentMode);
                    if (newPaymentMode !== 'Credit') {
                      setPaymentCustomerId(null);
                    }
                    // Update generatedBill payment method for display
                    setGeneratedBill({
                      ...generatedBill,
                      payment_method: newPaymentMode,
                      payment_mode: newPaymentMode,
                    });
                  }}
                  className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Online">Online</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>

              {/* Customer Selection - Only show when payment mode is Credit */}
              {paymentMode === 'Credit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Select Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentCustomerId || ''}
                    onChange={(e) => setPaymentCustomerId(e.target.value ? parseInt(e.target.value) : null)}
                    className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                    required={paymentMode === 'Credit'}
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.customer_name} {customer.phone ? `(${customer.phone})` : ''} - Limit: {formatPKR(customer.credit_limit)}
                      </option>
                    ))}
                  </select>
                  {customers.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No credit customers found. Please add customers in the Customer Management page.
                    </p>
                  )}
                </div>
              )}

              {/* Cash Payment Flow - Only show cash input for Cash payment method */}
              {paymentMode === 'Cash' ? (
                <>
                  {/* Cash Received Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Cash Received (PKR) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min={generatedBill.grand_total}
                      value={paymentData.cash_received}
                      onChange={(e) => {
                        const cash = parseFloat(e.target.value) || 0;
                        const grandTotal = parseFloat(generatedBill.grand_total || 0);
                        setPaymentData({
                          cash_received: cash,
                          change: Math.max(0, cash - grandTotal),
                        });
                      }}
                      placeholder="0.00"
                      className="text-lg font-semibold text-gray-900"
                      autoFocus
                      onKeyPress={(e) => {
                        // Allow Enter key to submit payment
                        if (e.key === 'Enter' && paymentData.cash_received >= generatedBill.grand_total) {
                          handlePayBill();
                        }
                      }}
                    />
                    {paymentData.cash_received > 0 && paymentData.cash_received < generatedBill.grand_total && (
                      <p className="text-sm text-red-600 mt-1 font-medium">
                        ⚠ Insufficient amount. Need {formatPKR(generatedBill.grand_total - paymentData.cash_received)} more.
                      </p>
                    )}
                    {paymentData.cash_received >= generatedBill.grand_total && (
                      <p className="text-sm text-green-600 mt-1 font-medium">
                        ✓ Amount sufficient
                      </p>
                    )}
                  </div>

                  {/* Change Display */}
                  {paymentData.change > 0 && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-300 shadow-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700 font-semibold text-lg">Change to Return:</span>
                        <span className="text-3xl font-bold text-green-800">
                          {formatPKR(paymentData.change)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Exact Payment */}
                  {paymentData.change === 0 && paymentData.cash_received === generatedBill.grand_total && paymentData.cash_received > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                      <p className="text-center text-blue-700 font-medium">
                        ✓ Exact payment received. No change required.
                      </p>
                    </div>
                  )}
                </>
              ) : paymentMode === 'Credit' ? (
                /* For Credit payments - Show credit notice */
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-5 rounded-xl border-2 border-amber-300">
                  <div className="text-center">
                    <CreditCard className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                    <p className="text-amber-800 font-bold mb-2 text-lg">
                      Credit Payment
                    </p>
                    <p className="text-sm text-amber-700 mb-2">
                      This payment will be recorded as credit. The customer will pay later.
                    </p>
                    {paymentCustomerId && (() => {
                      const selectedCustomer = customers.find(c => c.id === paymentCustomerId);
                      return selectedCustomer ? (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200">
                          <p className="text-sm font-semibold text-amber-900">Customer:</p>
                          <p className="text-base font-bold text-amber-800">{selectedCustomer.customer_name}</p>
                          {selectedCustomer.phone && (
                            <p className="text-xs text-amber-700">Phone: {selectedCustomer.phone}</p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              ) : (
                /* For Card/Online payments - Just confirm payment */
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-5 rounded-xl border border-purple-200">
                  <div className="text-center">
                    <CreditCard className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                    <p className="text-purple-700 font-medium mb-2">
                      Payment Method: {paymentMode}
                    </p>
                    <p className="text-sm text-gray-600">
                      Confirm that payment of {formatPKR(generatedBill.grand_total)} has been received via {paymentMode}.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Allow cancel if user wants to go back
                    if (confirm('Cancel payment? You can pay later from the orders page.')) {
                      setPaymentModalOpen(false);
                      setPaymentData({ cash_received: 0, change: 0 });
                    }
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayBill}
                  disabled={
                    paymentMode === 'Cash' 
                      ? (!paymentData.cash_received || paymentData.cash_received < generatedBill.grand_total)
                      : paymentMode === 'Credit'
                      ? !paymentCustomerId
                      : false
                  }
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 text-base shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  {paymentMode === 'Cash' 
                    ? `Pay Bill${paymentData.change > 0 ? ` (Change: ${formatPKR(paymentData.change)})` : ''}` 
                    : paymentMode === 'Credit'
                    ? 'Record Credit Payment'
                    : 'Confirm Payment'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Receipt Modal */}
        <Modal
          isOpen={receiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false);
            setGeneratedBill(null);
            setPaymentData({ cash_received: 0, change: 0 });
          }}
          title="Bill Receipt"
          size="lg"
          showCloseButton={true}
        >
          {generatedBill && (() => {
            // Debug: Log items when rendering receipt
            const receiptItems = generatedBill.items || [];
            console.log('=== Rendering Receipt Modal ===');
            console.log('Items count:', receiptItems.length);
            console.log('Items:', receiptItems);
            console.log('Generated bill:', generatedBill);
            
            if (receiptItems.length === 0) {
              console.error('❌ ERROR: Receipt modal opened with NO ITEMS!');
            }
            
            return (
              <div className="space-y-4" id="receipt-content">
                {/* Thermal Receipt - Print View */}
                <div id="receipt-print-area" className="bg-white p-4 rounded-lg border border-gray-200">
                  <ThermalReceipt 
                    order={{
                      order_id: generatedBill.order_id,
                      orderid: generatedBill.order_number,
                      g_total_amount: generatedBill.subtotal || 0,
                      total: generatedBill.subtotal || 0,
                      subtotal: generatedBill.subtotal || 0,
                      service_charge: generatedBill.service_charge || 0,
                      discount_amount: generatedBill.discount_amount || 0,
                      discount: generatedBill.discount_amount || 0,
                      net_total_amount: generatedBill.grand_total || 0,
                      netTotal: generatedBill.grand_total || 0,
                      grand_total: generatedBill.grand_total || 0,
                      final_amount: generatedBill.grand_total || 0,
                      payment_method: generatedBill.payment_method || 'Cash',
                      payment_mode: generatedBill.payment_method || 'Cash',
                      payment_status: generatedBill.payment_status || 'Unpaid',
                      cash_received: generatedBill.cash_received || 0,
                      change: generatedBill.change || 0,
                      bill_id: generatedBill.bill_id,
                      created_at: generatedBill.date || new Date().toISOString(),
                      date: generatedBill.date || new Date().toISOString(),
                      order_type: generatedBill.order_type || 'Dine In',
                      table_number: generatedBill.table_number || ''
                    }}
                    items={receiptItems}
                    branchName={getBranchName() || ''}
                    showPaidAmount={generatedBill.payment_status === 'Paid'}
                  />
                </div>

                {/* Action Buttons - Hidden in print */}
                <div className="flex gap-3 pt-4 no-print">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setReceiptModalOpen(false);
                      setGeneratedBill(null);
                    }}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handlePrintReceipt}
                    disabled={isPrinting}
                    className="flex-1 bg-gradient-to-r from-[#FF5F15] to-[#FF8C42] hover:from-[#FF6B2B] hover:to-[#FF9A5C] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPrinting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Printing...
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 mr-2" />
                        Print Receipt
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      </div>
    </AccountantLayout>
  );
}
