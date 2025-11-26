'use client';

/**
 * Order Management Page
 * View and manage all orders with full CRUD operations
 * Uses real APIs: getOrders.php, get_ordersbyid.php, get_orderdetails.php, chnageorder_status.php, order_management.php, bills_management.php
 */

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import Modal from '@/components/ui/Modal';
import { apiGet, apiPost, apiDelete, getTerminal, getBranchId, getBranchName } from '@/utils/api';
import { formatPKR, formatDateTime } from '@/utils/format';
import { FileText, Eye, Edit, Trash2, X, RefreshCw, Receipt, Calculator, Printer, Plus, Minus, ShoppingCart, CreditCard, DollarSign, Calendar } from 'lucide-react';
import ThermalReceipt from '@/components/receipt/ThermalReceipt';
import logger from '@/utils/logger';

export default function OrderManagementPage() {
  const [orders, setOrders] = useState([]);
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [existingBill, setExistingBill] = useState(null); // Bill data for order (if exists)
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, preparing, ready, completed, cancelled
  const [dateFilter, setDateFilter] = useState('today'); // today, week, month, custom
  const [customDate, setCustomDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [billOrder, setBillOrder] = useState(null);
  const [billData, setBillData] = useState({
    discount_percentage: 0, // Discount as percentage (e.g., 10 means 10%)
    service_charge: 0,
    payment_mode: 'Cash',
  });
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    cash_received: 0,
    change: 0,
  });
  const [generatedBill, setGeneratedBill] = useState(null);
  const [formData, setFormData] = useState({
    status: 'Pending',
    table_id: '',
    discount: 0,
    items: [], // Order items for editing
  });
  const [dishes, setDishes] = useState([]); // All available dishes for edit modal
  const [categories, setCategories] = useState([]); // Categories for filtering dishes
  const [selectedCategory, setSelectedCategory] = useState(''); // Selected category in edit modal

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 30 seconds to show new orders
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [filter, dateFilter, customDate]);

  /**
   * Auto-print bill receipt when the receipt modal opens
   * This covers both newly generated bills and viewing paid receipts.
   */
  // Debug: Log generatedBill changes to verify items are present
  useEffect(() => {
    if (generatedBill) {
      console.log('=== Generated Bill State ===');
      console.log('Bill ID:', generatedBill.bill_id);
      console.log('Order ID:', generatedBill.order_id);
      console.log('Items count:', generatedBill.items?.length || 0);
      console.log('Items:', generatedBill.items);
      console.log('Subtotal:', generatedBill.subtotal);
      console.log('Grand Total:', generatedBill.grand_total);
      
      if (!generatedBill.items || generatedBill.items.length === 0) {
        console.error('❌ WARNING: Generated bill has no items!');
      } else {
        console.log('✅ Generated bill has items:', generatedBill.items.length);
      }
    }
  }, [generatedBill]);

  // Debug: Log orders state changes
  useEffect(() => {
    if (orders.length > 0) {
      console.log('📊 Orders state updated:', {
        totalOrders: orders.length,
        filter: filter,
        firstOrder: orders[0] ? {
          id: orders[0].id,
          order_number: orders[0].order_number,
          status: orders[0].status
        } : null
      });
    }
  }, [orders.length, filter]);

  // Debug: Log orderDetails state changes
  useEffect(() => {
    if (orderDetails) {
      console.log('🎯 orderDetails state updated:', {
        order_id: orderDetails.order_id,
        orderid: orderDetails.orderid,
        g_total_amount: orderDetails.g_total_amount,
        total: orderDetails.total,
        subtotal: orderDetails.subtotal,
        net_total_amount: orderDetails.net_total_amount,
        netTotal: orderDetails.netTotal,
        discount_amount: orderDetails.discount_amount,
        service_charge: orderDetails.service_charge,
        allKeys: Object.keys(orderDetails)
      });
      console.log('🎯 Full orderDetails object:', JSON.stringify(orderDetails, null, 2));
    } else {
      console.log('🎯 orderDetails is null');
    }
  }, [orderDetails]);

  // Auto-calculate 10% service charge for Dine In orders only when bill modal opens
  useEffect(() => {
    if (billModalOpen && billOrder) {
      const subtotal = parseFloat(billOrder.g_total_amount || billOrder.total || 0);
      // Only 10% service charge for Dine In orders
      const autoServiceCharge = billOrder.order_type === 'Dine In' ? subtotal * 0.10 : 0;
      setBillData(prev => ({
        ...prev,
        service_charge: autoServiceCharge,
        discount_percentage: prev.discount_percentage || 0,
      }));
    }
  }, [billModalOpen, billOrder]);

  // Auto-calculate change when cash received changes (only for Cash payments)
  useEffect(() => {
    if (paymentModalOpen && generatedBill && generatedBill.payment_method === 'Cash') {
      const grandTotal = parseFloat(generatedBill.grand_total || 0);
      const cashReceived = parseFloat(paymentData.cash_received || 0);
      const change = Math.max(0, cashReceived - grandTotal);
      setPaymentData(prev => ({
        ...prev,
        change: change,
      }));
    } else if (paymentModalOpen && generatedBill && generatedBill.payment_method !== 'Cash') {
      // For non-cash payments, set cash received to grand total
      const grandTotal = parseFloat(generatedBill.grand_total || 0);
      setPaymentData(prev => ({
        ...prev,
        cash_received: grandTotal,
        change: 0,
      }));
    }
  }, [paymentModalOpen, paymentData.cash_received, generatedBill]);

  /**
   * Fetch orders from API
   * API: getOrders.php (POST with terminal and optional status)
   */
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      let branchId = getBranchId();
      
      // Ensure branch_id is valid (not null, undefined, or empty string)
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
      
      // Branch-admin MUST have branch_id
      if (!branchId) {
        console.error('❌ Branch ID is missing for branch-admin');
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        setOrders([]);
        setLoading(false);
        return;
      }
      
      logger.info('Fetching Orders', { 
        terminal, 
        branch_id: branchId, 
        status: filter !== 'all' ? filter : 'all',
        dateFilter 
      });
      
      // Calculate date range based on filter
      let fromDate = '';
      let toDate = '';
      
      if (dateFilter === 'today') {
        const today = new Date();
        fromDate = today.toISOString().split('T')[0];
        toDate = today.toISOString().split('T')[0];
      } else if (dateFilter === 'week') {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        fromDate = weekAgo.toISOString().split('T')[0];
        toDate = today.toISOString().split('T')[0];
      } else if (dateFilter === 'month') {
        const today = new Date();
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        fromDate = monthAgo.toISOString().split('T')[0];
        toDate = today.toISOString().split('T')[0];
      } else if (dateFilter === 'custom' && customDate) {
        fromDate = customDate;
        toDate = customDate;
      }
      
      const payload = { 
        terminal,
        branch_id: branchId  // Always include branch_id for branch-admin
      };
      if (filter !== 'all') {
        payload.status = filter;
      }
      if (fromDate && toDate) {
        payload.from_date = fromDate;
        payload.to_date = toDate;
      }
      
      logger.info('Date filter applied', { dateFilter, fromDate, toDate });
      
      const result = await apiPost('/getOrders.php', payload);
      
      // Handle multiple possible response structures
      let ordersData = [];
      let dataSource = '';
      
      // Check if result.data is an array directly
      if (result.data && Array.isArray(result.data)) {
        ordersData = result.data;
        dataSource = 'result.data';
      }
      // Check if result.data.data is an array (nested structure)
      else if (result.data && result.data.data && Array.isArray(result.data.data)) {
        ordersData = result.data.data;
        dataSource = 'result.data.data';
      }
      // Check if result.data.orders is an array
      else if (result.data && result.data.orders && Array.isArray(result.data.orders)) {
        ordersData = result.data.orders;
        dataSource = 'result.data.orders';
      }
      // Check if result.data.success and result.data.data is an array
      else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        ordersData = result.data.data;
        dataSource = 'result.data.success.data';
      }
      // Check if result is an array directly
      else if (Array.isArray(result)) {
        ordersData = result;
        dataSource = 'result (direct array)';
      }
      // Check if result.success and result.data is an array
      else if (result.success && result.data && Array.isArray(result.data)) {
        ordersData = result.data;
        console.log('✅ Found orders in result.success.data, count:', ordersData.length);
      }
      // Try to find any array in result.data object
      else if (result.data && typeof result.data === 'object') {
        for (const key in result.data) {
          if (Array.isArray(result.data[key])) {
            ordersData = result.data[key];
            console.log(`✅ Found orders in result.data.${key}, count:`, ordersData.length);
            break;
          }
        }
      }
      
      // Debug: Log sample order from API
      if (ordersData.length > 0) {
        console.log('✅ Orders data received:', ordersData.length, 'orders');
        console.log('Sample order from API:', JSON.stringify(ordersData[0], null, 2));
      } else {
        console.warn('⚠️ No orders found in API response. Full response:', result);
        if (result.data && typeof result.data === 'object') {
          console.warn('result.data keys:', Object.keys(result.data));
          // Try to log the full result.data to see structure
          console.warn('Full result.data:', JSON.stringify(result.data, null, 2));
        }
      }
      
      if (ordersData.length > 0) {
        logger.info(`Mapping ${ordersData.length} orders from API response`);
        
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
              
              // Ensure orderNumber is a string
              if (typeof orderNumber !== 'string') {
                orderNumber = String(orderNumber);
              }
              
              // Calculate total amounts with better fallback logic
              // Try multiple field names that might contain the order total
              const gTotalAmount = parseFloat(order.g_total_amount || order.grand_total_amount || order.total_amount || order.total || order.subtotal || 0) || 0;
              
              // Try multiple field names for net total
              let netTotalAmount = parseFloat(order.net_total_amount || order.netTotal || order.net_total || order.final_amount || 0) || 0;
              
              // If netTotal is 0 but we have a total, use total as fallback
              // This handles cases where bill hasn't been generated yet
              if (netTotalAmount === 0 && gTotalAmount > 0) {
                netTotalAmount = gTotalAmount;
              }
              
              // If both are 0, try calculating from order items if available
              if (netTotalAmount === 0 && gTotalAmount === 0 && order.items && Array.isArray(order.items)) {
                const calculatedTotal = order.items.reduce((sum, item) => {
                  const itemTotal = parseFloat(item.total_amount || item.total || (item.price || 0) * (item.quantity || 0) || 0);
                  return sum + (itemTotal || 0);
                }, 0);
                if (calculatedTotal > 0) {
                  netTotalAmount = calculatedTotal;
                }
              }
              
              // Extract status - prioritize order_status field (from database), then status field
              // Keep original case for display, but normalize for comparison
              const rawStatus = order.order_status || order.status || order.Status || 'Pending';
              // Preserve original status for display, but also store normalized version
              const normalizedStatus = String(rawStatus).toLowerCase().trim();
              
              // Debug: Log status extraction
              if (order.order_id === 85 || order.id === 85) {
                console.log('🔍 Status extraction for order 85:', {
                  order_status: order.order_status,
                  status: order.status,
                  rawStatus,
                  normalizedStatus
                });
              }
              
              return {
                id: orderId,
                order_id: orderId,
                order_number: orderNumber,
                orderid: order.orderid || orderNumber,
                order_type: order.order_type || order.orderType || 'Dine In',
                table_id: order.table_id || order.tableid || order.table_ID || '-',
                table_number: order.table_number || order.table_id || order.table_ID || '-',
                hall_id: order.hall_id || order.hall_ID || '-',
                hall_name: order.hall_name || order.hall_Name || '-',
                shop_name: order.shopname || order.shop_name || '-',
                customer_name: order.customer_name || order.customer || '-',
                total: gTotalAmount,
                discount: parseFloat(order.discount_amount || order.discount || 0) || 0,
                service_charge: parseFloat(order.service_charge || order.serviceCharge || 0) || 0,
                netTotal: netTotalAmount,
                status: normalizedStatus,
                order_status: rawStatus, // Preserve original status from API
                original_status: rawStatus, // Keep original for reference
                payment_mode: order.payment_mode || order.paymentMode || 'Cash',
                created_at: order.created_at || order.date || order.createdAt || '',
                terminal: order.terminal || terminal,
              };
            } catch (error) {
              logger.error(`Error mapping order at index ${index}`, { error: error.message, orderData: order });
              return null; // Return null for invalid orders, will be filtered out
            }
          })
          .filter(order => order !== null); // Remove any null entries from mapping errors
        
        logger.logDataMapping('API Orders', 'Mapped Orders', mappedOrders.length);
        logger.success(`Successfully mapped ${mappedOrders.length} orders`, { 
          totalReceived: ordersData.length,
          successfullyMapped: mappedOrders.length,
          failed: ordersData.length - mappedOrders.length
        });
        
        console.log(`✅ Successfully mapped ${mappedOrders.length} out of ${ordersData.length} orders`);
        
        if (mappedOrders.length > 0) {
          console.log('✅ Sample mapped order:', JSON.stringify(mappedOrders[0], null, 2));
          console.log('✅ Setting orders state with', mappedOrders.length, 'orders');
          setOrders(mappedOrders);
          
          // Debug: Verify orders were set (will log on next render)
          setTimeout(() => {
            console.log('✅ Orders state should now have', mappedOrders.length, 'orders');
          }, 100);
          
          setAlert({ type: '', message: '' }); // Clear any previous errors
        } else {
          console.error('❌ All orders failed to map. Original data:', ordersData);
          console.error('❌ Full API result:', result);
          setAlert({ type: 'error', message: 'Orders data format is incorrect. Please check API response structure.' });
          setOrders([]);
        }
      } else if (result.data && result.data.success === false) {
        const errorMsg = result.data.message || result.data.error || 'Failed to load orders';
        console.error('❌ API returned error:', errorMsg);
        setAlert({ type: 'error', message: errorMsg });
        setOrders([]);
      } else {
        console.warn('⚠️ No orders found in response');
        console.warn('⚠️ Full response structure:', {
          success: result.success,
          dataType: typeof result.data,
          dataKeys: result.data ? Object.keys(result.data) : null,
          fullResult: result
        });
        
        // Try one more time to find data in a different structure
        if (result && typeof result === 'object') {
          // Check all keys for arrays
          for (const key in result) {
            if (Array.isArray(result[key]) && result[key].length > 0) {
              console.warn(`⚠️ Found array in result.${key} with ${result[key].length} items. This might be the orders data.`);
            }
          }
        }
        
        if (!result.success && result.data && result.data.message) {
          setAlert({ type: 'warning', message: result.data.message || 'No orders found' });
        } else {
          setAlert({ type: 'info', message: 'No orders found. Check console for API response details.' });
        }
        setOrders([]);
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
   * Fetch order details and items
   * APIs: get_ordersbyid.php and get_orderdetails.php
   */
  const fetchOrderDetails = async (orderId, orderNumber) => {
    try {
      // Prepare order ID - prefer numeric order_id over orderid string
      const orderIdParam = orderId || (orderNumber ? (orderNumber.toString().replace(/ORD-?/i, '') || orderNumber) : null);
      
      // Fetch order details - send both order_id (numeric) and orderid (string) for flexibility
      const orderResult = await apiPost('/get_ordersbyid.php', { 
        order_id: orderIdParam,
        orderid: orderNumber || `ORD-${orderIdParam}` || orderIdParam
      });
      
      // Fetch order items - send both order_id (numeric) and orderid (string) for flexibility
      const itemsResult = await apiPost('/get_orderdetails.php', { 
        order_id: orderIdParam,
        orderid: orderNumber || `ORD-${orderIdParam}` || orderIdParam
      });
      
      console.log('🔍 Raw orderResult from API:', JSON.stringify(orderResult, null, 2));
      console.log('🔍 orderResult.data type:', typeof orderResult.data);
      console.log('🔍 orderResult.data:', orderResult.data);
      console.log('🔍 orderResult.data keys:', orderResult.data ? Object.keys(orderResult.data) : 'null');
      console.log('🔍 orderResult.data isEmpty:', orderResult.data && Object.keys(orderResult.data).length === 0);
      
      let orderData = null;
      
      // Check if API returned an error or empty response
      if (!orderResult.success) {
        console.warn('⚠️ API call was not successful:', orderResult);
      }
      
      // Handle multiple possible response structures for order data
      // The API returns: { success: true, data: [{ order_id: 85, ... }] }
      // apiPost wraps it, so orderResult.data = { success: true, data: [...] }
      
      if (orderResult.data && Object.keys(orderResult.data).length > 0) {
        // Case 1: orderResult.data is directly an array (unlikely but possible)
        if (Array.isArray(orderResult.data) && orderResult.data.length > 0) {
          orderData = orderResult.data[0];
          console.log('✅ Case 1: Found order data in result.data[0] (direct array)');
        } 
        // Case 2: orderResult.data = { success: true, data: [...] } - THIS IS THE EXPECTED CASE
        else if (orderResult.data.data && Array.isArray(orderResult.data.data) && orderResult.data.data.length > 0) {
          orderData = orderResult.data.data[0];
          console.log('✅ Case 2: Found order data in result.data.data[0] (success wrapper with data array)');
        }
        // Case 3: orderResult.data = { success: true, data: {...} } (single object, not array)
        else if (orderResult.data.success && orderResult.data.data && !Array.isArray(orderResult.data.data)) {
          orderData = orderResult.data.data;
          console.log('✅ Case 3: Found order data in result.data.data (success wrapper with single object)');
        }
        // Case 4: orderResult.data is a direct object (not wrapped)
        else if (!Array.isArray(orderResult.data) && typeof orderResult.data === 'object' && Object.keys(orderResult.data).length > 0) {
          // Check if it has order_id directly (it's the order object itself)
          if (orderResult.data.order_id || orderResult.data.id) {
            orderData = orderResult.data;
            console.log('✅ Case 4: Found order data in result.data (direct order object)');
          }
          // Check if it's a success wrapper but data is not an array
          else if (orderResult.data.success && orderResult.data.data) {
            orderData = Array.isArray(orderResult.data.data) ? orderResult.data.data[0] : orderResult.data.data;
            console.log('✅ Case 4b: Found order data in result.data.success.data');
          }
        }
        // Case 5: Search for order object in nested structure
        else if (typeof orderResult.data === 'object') {
          for (const key in orderResult.data) {
            if (key === 'order' && orderResult.data[key]) {
              orderData = Array.isArray(orderResult.data[key]) ? orderResult.data[key][0] : orderResult.data[key];
              console.log('✅ Case 5: Found order data in result.data.order');
              break;
            } else if (Array.isArray(orderResult.data[key]) && orderResult.data[key].length > 0) {
              orderData = orderResult.data[key][0];
              console.log(`✅ Case 5b: Found order data in result.data.${key}[0]`);
              break;
            }
          }
        }
      } else if (orderResult.data && Object.keys(orderResult.data).length === 0) {
        console.warn('⚠️ orderResult.data is an empty object {} - API may not have found the order');
      }
      
      // If we couldn't extract order data from API, try to get it from the orders list
      if (!orderData) {
        console.warn('⚠️ Could not extract order data from API response, trying to get from orders list...');
        console.log('Searching for order with:', { orderId: orderIdParam, orderNumber });
        
        const orderFromList = orders.find(o => 
          (o.order_id || o.id) == orderIdParam || 
          o.orderid === orderNumber || 
          o.order_number === orderNumber ||
          (o.orderid && o.orderid.toString() === orderNumber?.toString()) ||
          (o.order_number && o.order_number.toString() === orderNumber?.toString())
        );
        
        if (orderFromList) {
          console.log('✅ Found order in orders list:', orderFromList);
          // Convert order from list to match expected structure
          orderData = {
            order_id: orderFromList.order_id || orderFromList.id,
            id: orderFromList.id || orderFromList.order_id,
            orderid: orderFromList.orderid || orderFromList.order_number || `ORD-${orderFromList.order_id || orderFromList.id}`,
            order_number: orderFromList.order_number || orderFromList.orderid,
            order_type: orderFromList.order_type || 'Dine In',
            order_status: orderFromList.order_status || orderFromList.status || 'Pending',
            status: orderFromList.status || orderFromList.order_status || 'Pending',
            table_id: orderFromList.table_id,
            table_number: orderFromList.table_number,
            hall_id: orderFromList.hall_id,
            hall_name: orderFromList.hall_name,
            customer_name: orderFromList.customer_name,
            g_total_amount: orderFromList.total || orderFromList.g_total_amount || 0,
            total: orderFromList.total || orderFromList.g_total_amount || 0,
            subtotal: orderFromList.total || orderFromList.g_total_amount || 0,
            net_total_amount: orderFromList.netTotal || orderFromList.net_total_amount || orderFromList.total || 0,
            netTotal: orderFromList.netTotal || orderFromList.net_total_amount || orderFromList.total || 0,
            discount_amount: orderFromList.discount || orderFromList.discount_amount || 0,
            discount: orderFromList.discount || orderFromList.discount_amount || 0,
            service_charge: orderFromList.service_charge || 0,
            payment_mode: orderFromList.payment_mode || 'Cash',
            created_at: orderFromList.created_at || '',
            terminal: orderFromList.terminal,
            branch_id: orderFromList.branch_id,
          };
        } else {
          console.error('❌ Could not find order in API response or orders list:', {
            orderIdParam,
            orderNumber,
            ordersListLength: orders.length,
            orderResult: orderResult,
            orderResultData: orderResult.data,
            orderResultDataType: typeof orderResult.data,
            isArray: Array.isArray(orderResult.data),
            isEmpty: orderResult.data && Object.keys(orderResult.data).length === 0
          });
        }
      }
      
      console.log('✅ Extracted order data (raw from API):', orderData);
      console.log('Raw order data values:', {
        g_total_amount: orderData?.g_total_amount,
        total: orderData?.total,
        subtotal: orderData?.subtotal,
        net_total_amount: orderData?.net_total_amount,
        netTotal: orderData?.netTotal,
        discount_amount: orderData?.discount_amount,
        service_charge: orderData?.service_charge
      });
      
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
      
      // Fetch bill if exists for this order
      let billData = null;
      if (orderIdParam) {
        try {
          const billResult = await apiPost('/bills_management.php', { order_id: orderIdParam });
          
          // Debug: Log bill fetch result
          console.log('=== Bill Fetch Result ===');
          console.log('Bill result:', JSON.stringify(billResult, null, 2));
          
          if (billResult.success && billResult.data) {
            // Handle different response structures
            if (billResult.data.success === true && billResult.data.data) {
              // Response: { success: true, data: { bill: {...}, bill_id: 123 } }
              billData = billResult.data.data.bill || billResult.data.data;
            } else if (billResult.data.bill) {
              // Response: { success: true, bill: {...} }
              billData = billResult.data.bill;
            } else if (billResult.data.bill_id || billResult.data.order_id) {
              // Response: { success: true, bill_id: 123, ... } (bill object itself)
              billData = billResult.data;
            }
            
            // Ensure payment_status is set (default to 'Unpaid' if not present)
            if (billData && !billData.payment_status) {
              billData.payment_status = 'Unpaid';
            }
          }
          
          // Debug: Log extracted bill data
          console.log('Extracted bill data:', JSON.stringify(billData, null, 2));
        } catch (error) {
          console.error('Error fetching bill:', error);
          // Continue even if bill fetch fails
        }
      }
      
      // Handle order items response - extract items array from various structures
      let itemsData = [];
      if (itemsResult.data) {
        if (Array.isArray(itemsResult.data)) {
          itemsData = itemsResult.data;
          console.log('✅ Found items in result.data (array), count:', itemsData.length);
        } else if (itemsResult.data.data && Array.isArray(itemsResult.data.data)) {
          itemsData = itemsResult.data.data;
          console.log('✅ Found items in result.data.data (array), count:', itemsData.length);
        } else if (itemsResult.data.items && Array.isArray(itemsResult.data.items)) {
          itemsData = itemsResult.data.items;
          console.log('✅ Found items in result.data.items (array), count:', itemsData.length);
        } else if (itemsResult.data.order_items && Array.isArray(itemsResult.data.order_items)) {
          itemsData = itemsResult.data.order_items;
          console.log('✅ Found items in result.data.order_items (array), count:', itemsData.length);
        } else if (typeof itemsResult.data === 'object') {
          // Search for any array in the response
          for (const key in itemsResult.data) {
            if (Array.isArray(itemsResult.data[key])) {
              itemsData = itemsResult.data[key];
              console.log(`✅ Found items in result.data.${key} (array), count:`, itemsData.length);
              break;
            }
          }
        }
      }
      
      setOrderItems(itemsData);
      
      // Calculate totals from items if order totals are missing
      let calculatedSubtotal = 0;
      let calculatedTotal = 0;
      
      if (itemsData.length > 0) {
        // Calculate subtotal from items
        calculatedSubtotal = itemsData.reduce((sum, item) => {
          const itemTotal = parseFloat(
            item.total_amount || 
            item.total || 
            item.total_price || 
            item.amount ||
            (item.quantity && item.price ? item.quantity * item.price : 0) ||
            0
          );
          return sum + itemTotal;
        }, 0);
        
        calculatedTotal = calculatedSubtotal;
        console.log('Calculated subtotal from items:', calculatedSubtotal);
      }
      
      // Extract and normalize amount fields from orderData, handling various field names
      // IMPORTANT: Preserve ALL original fields from API response first
      if (orderData) {
        // Create a copy to preserve all original fields
        const preservedOrderData = { ...orderData };
        
        console.log('🔍 Normalization - Preserved original data:', {
          g_total_amount: preservedOrderData.g_total_amount,
          total: preservedOrderData.total,
          subtotal: preservedOrderData.subtotal,
          net_total_amount: preservedOrderData.net_total_amount,
          netTotal: preservedOrderData.netTotal,
          discount_amount: preservedOrderData.discount_amount,
          service_charge: preservedOrderData.service_charge,
          types: {
            g_total_amount: typeof preservedOrderData.g_total_amount,
            total: typeof preservedOrderData.total,
            net_total_amount: typeof preservedOrderData.net_total_amount
          }
        });
        
        // Try to get amount from various possible field names (use original values first)
        // Handle both string and number types
        const gTotalAmountRaw = preservedOrderData.g_total_amount || 
          preservedOrderData.g_total || 
          preservedOrderData.total_amount ||
          preservedOrderData.total || 
          preservedOrderData.subtotal ||
          preservedOrderData.amount ||
          0;
        
        const gTotalAmount = typeof gTotalAmountRaw === 'string' 
          ? parseFloat(gTotalAmountRaw) || 0
          : (typeof gTotalAmountRaw === 'number' ? gTotalAmountRaw : 0);
        
        const netTotalAmountRaw = preservedOrderData.net_total_amount || 
          preservedOrderData.net_total || 
          preservedOrderData.netTotal ||
          preservedOrderData.net_amount ||
          preservedOrderData.grand_total ||
          gTotalAmount ||
          0;
          
        const netTotalAmount = typeof netTotalAmountRaw === 'string' 
          ? parseFloat(netTotalAmountRaw) || 0
          : (typeof netTotalAmountRaw === 'number' ? netTotalAmountRaw : 0);
        
        const discountAmountRaw = preservedOrderData.discount_amount || 
          preservedOrderData.discount || 
          preservedOrderData.disc_amount ||
          0;
          
        const discountAmount = typeof discountAmountRaw === 'string' 
          ? parseFloat(discountAmountRaw) || 0
          : (typeof discountAmountRaw === 'number' ? discountAmountRaw : 0);
        
        const serviceChargeRaw = preservedOrderData.service_charge || 
          preservedOrderData.service || 
          preservedOrderData.charge ||
          0;
          
        const serviceCharge = typeof serviceChargeRaw === 'string' 
          ? parseFloat(serviceChargeRaw) || 0
          : (typeof serviceChargeRaw === 'number' ? serviceChargeRaw : 0);
        
        console.log('🔢 Parsed amounts:', {
          gTotalAmount,
          netTotalAmount,
          discountAmount,
          serviceCharge,
          calculatedSubtotal
        });
        
        // Always preserve original API field names if they exist
        // Only set missing fields or calculate if completely missing
        
        // Handle g_total_amount and total fields
        // Always preserve original values if they exist, even if they're 0
        if (preservedOrderData.g_total_amount !== undefined && preservedOrderData.g_total_amount !== null) {
          orderData.g_total_amount = typeof preservedOrderData.g_total_amount === 'string' 
            ? parseFloat(preservedOrderData.g_total_amount) 
            : preservedOrderData.g_total_amount;
          console.log('✅ Preserved g_total_amount:', orderData.g_total_amount);
        } else if (gTotalAmount > 0) {
          orderData.g_total_amount = gTotalAmount;
          console.log('✅ Set g_total_amount from parsed value:', gTotalAmount);
        } else if (calculatedSubtotal > 0) {
          orderData.g_total_amount = calculatedSubtotal;
          console.log('✅ Used calculated subtotal:', calculatedSubtotal);
        }
        
        if (preservedOrderData.total !== undefined && preservedOrderData.total !== null) {
          orderData.total = typeof preservedOrderData.total === 'string' 
            ? parseFloat(preservedOrderData.total) 
            : preservedOrderData.total;
          console.log('✅ Preserved total:', orderData.total);
        } else if (orderData.g_total_amount) {
          orderData.total = orderData.g_total_amount;
        } else if (gTotalAmount > 0) {
          orderData.total = gTotalAmount;
        }
        
        if (preservedOrderData.subtotal !== undefined && preservedOrderData.subtotal !== null) {
          orderData.subtotal = typeof preservedOrderData.subtotal === 'string' 
            ? parseFloat(preservedOrderData.subtotal) 
            : preservedOrderData.subtotal;
        } else if (orderData.g_total_amount) {
          orderData.subtotal = orderData.g_total_amount;
        }
        
        // Handle net_total_amount fields - always preserve original if exists
        if (preservedOrderData.net_total_amount !== undefined && preservedOrderData.net_total_amount !== null) {
          orderData.net_total_amount = typeof preservedOrderData.net_total_amount === 'string' 
            ? parseFloat(preservedOrderData.net_total_amount) 
            : preservedOrderData.net_total_amount;
          console.log('✅ Preserved net_total_amount:', orderData.net_total_amount);
        } else if (netTotalAmount > 0) {
          orderData.net_total_amount = netTotalAmount;
        } else if (calculatedTotal > 0) {
          orderData.net_total_amount = calculatedTotal;
        }
        
        if (preservedOrderData.netTotal !== undefined && preservedOrderData.netTotal !== null) {
          orderData.netTotal = typeof preservedOrderData.netTotal === 'string' 
            ? parseFloat(preservedOrderData.netTotal) 
            : preservedOrderData.netTotal;
        } else if (orderData.net_total_amount) {
          orderData.netTotal = orderData.net_total_amount;
        } else if (netTotalAmount > 0) {
          orderData.netTotal = netTotalAmount;
        }
        
        if (preservedOrderData.grand_total !== undefined && preservedOrderData.grand_total !== null) {
          orderData.grand_total = typeof preservedOrderData.grand_total === 'string' 
            ? parseFloat(preservedOrderData.grand_total) 
            : preservedOrderData.grand_total;
        } else if (orderData.net_total_amount) {
          orderData.grand_total = orderData.net_total_amount;
        }
        
        // Handle discount_amount - preserve original if exists, even if 0
        if (preservedOrderData.discount_amount !== undefined && preservedOrderData.discount_amount !== null) {
          orderData.discount_amount = typeof preservedOrderData.discount_amount === 'string' 
            ? parseFloat(preservedOrderData.discount_amount) || 0
            : preservedOrderData.discount_amount;
          orderData.discount = orderData.discount_amount;
        } else if (preservedOrderData.discount !== undefined && preservedOrderData.discount !== null) {
          orderData.discount = typeof preservedOrderData.discount === 'string' 
            ? parseFloat(preservedOrderData.discount) || 0
            : preservedOrderData.discount;
          orderData.discount_amount = orderData.discount;
        } else {
          orderData.discount_amount = discountAmount;
          orderData.discount = discountAmount;
        }
        
        // Handle service_charge - preserve original if exists, even if 0
        if (preservedOrderData.service_charge !== undefined && preservedOrderData.service_charge !== null) {
          orderData.service_charge = typeof preservedOrderData.service_charge === 'string' 
            ? parseFloat(preservedOrderData.service_charge) || 0
            : preservedOrderData.service_charge;
          orderData.service = orderData.service_charge;
        } else if (preservedOrderData.service !== undefined && preservedOrderData.service !== null) {
          orderData.service = typeof preservedOrderData.service === 'string' 
            ? parseFloat(preservedOrderData.service) || 0
            : preservedOrderData.service;
          orderData.service_charge = orderData.service;
        } else {
          orderData.service_charge = serviceCharge;
          orderData.service = serviceCharge;
        }
        
        // Debug: Log the final order data to verify all fields are preserved
        console.log('✅ Final order amounts (after normalization):', {
          'g_total_amount (original)': preservedOrderData.g_total_amount,
          'g_total_amount (final)': orderData.g_total_amount,
          'total (original)': preservedOrderData.total,
          'total (final)': orderData.total,
          'subtotal (original)': preservedOrderData.subtotal,
          'subtotal (final)': orderData.subtotal,
          'net_total_amount (original)': preservedOrderData.net_total_amount,
          'net_total_amount (final)': orderData.net_total_amount,
          'netTotal (original)': preservedOrderData.netTotal,
          'netTotal (final)': orderData.netTotal,
          'discount_amount (original)': preservedOrderData.discount_amount,
          'discount_amount (final)': orderData.discount_amount,
          'service_charge (original)': preservedOrderData.service_charge,
          'service_charge (final)': orderData.service_charge
        });
        
        // Log full orderData to verify structure
        console.log('📋 Complete orderData object:', JSON.stringify(orderData, null, 2));
      }
      
      // If orderData is still null or missing key fields, try to construct from minimal data
      if (!orderData || !orderData.order_id) {
        console.warn('⚠️ Order data is missing or incomplete after all attempts:', {
          orderResult: orderResult,
          orderResultData: orderResult.data,
          orderData,
          orderIdParam,
          orderNumber,
          ordersListLength: orders.length,
          calculatedSubtotal,
          calculatedTotal
        });
        
        // Try one more time to get from orders list with more flexible matching
        if (!orderData && orders.length > 0) {
          const flexibleMatch = orders.find(o => {
            const oId = o.order_id || o.id;
            const oNum = o.orderid || o.order_number;
            return (
              oId == orderIdParam ||
              oNum === orderNumber ||
              oNum === `ORD-${orderIdParam}` ||
              (orderNumber && oNum && oNum.toString().includes(orderNumber.toString())) ||
              (orderIdParam && oId && oId.toString() === orderIdParam.toString())
            );
          });
          
          if (flexibleMatch) {
            console.log('✅ Found order with flexible matching:', flexibleMatch);
            orderData = {
              order_id: flexibleMatch.order_id || flexibleMatch.id,
              id: flexibleMatch.id || flexibleMatch.order_id,
              orderid: flexibleMatch.orderid || flexibleMatch.order_number || `ORD-${flexibleMatch.order_id || flexibleMatch.id}`,
              order_number: flexibleMatch.order_number || flexibleMatch.orderid,
              order_type: flexibleMatch.order_type || 'Dine In',
              order_status: flexibleMatch.order_status || flexibleMatch.status || 'Pending',
              status: flexibleMatch.status || flexibleMatch.order_status || 'Pending',
              table_id: flexibleMatch.table_id,
              table_number: flexibleMatch.table_number,
              hall_id: flexibleMatch.hall_id,
              hall_name: flexibleMatch.hall_name,
              customer_name: flexibleMatch.customer_name,
              g_total_amount: flexibleMatch.total || flexibleMatch.g_total_amount || 0,
              total: flexibleMatch.total || flexibleMatch.g_total_amount || 0,
              subtotal: flexibleMatch.total || flexibleMatch.g_total_amount || 0,
              net_total_amount: flexibleMatch.netTotal || flexibleMatch.net_total_amount || flexibleMatch.total || 0,
              netTotal: flexibleMatch.netTotal || flexibleMatch.net_total_amount || flexibleMatch.total || 0,
              discount_amount: flexibleMatch.discount || flexibleMatch.discount_amount || 0,
              discount: flexibleMatch.discount || flexibleMatch.discount_amount || 0,
              service_charge: flexibleMatch.service_charge || 0,
              payment_mode: flexibleMatch.payment_mode || 'Cash',
              created_at: flexibleMatch.created_at || '',
              terminal: flexibleMatch.terminal,
              branch_id: flexibleMatch.branch_id,
            };
          }
        }
        
        // If still no orderData, create minimal structure
        if (!orderData) {
          console.error('❌ Could not find order anywhere. Creating minimal structure.');
          orderData = {
            order_id: orderIdParam,
            orderid: orderNumber || `ORD-${orderIdParam}`,
            order_type: 'Dine In',
            order_status: 'Pending',
            status: 'Pending',
            payment_mode: 'Cash',
            created_at: new Date().toISOString(),
            g_total_amount: calculatedSubtotal || 0,
            total: calculatedSubtotal || 0,
            net_total_amount: calculatedTotal || 0,
            netTotal: calculatedTotal || 0,
            service_charge: 0,
            discount_amount: 0,
            discount: 0,
          };
          
          // Show warning to user
          setAlert({ 
            type: 'warning', 
            message: `Order details not found in API. Showing limited information. Order ID: ${orderIdParam || orderNumber}` 
          });
        }
      }
      
      // Ensure order number is set
      if (!orderData.orderid && orderData.order_id) {
        orderData.orderid = `ORD-${orderData.order_id}`;
      }
      
      // Debug: Log final order data BEFORE setting state
      console.log('=== Final Order Data for Modal (BEFORE setState) ===');
      console.log('Order Data Object:', orderData);
      console.log('Order Data JSON:', JSON.stringify(orderData, null, 2));
      console.log('Key Amount Fields:', {
        g_total_amount: orderData?.g_total_amount,
        total: orderData?.total,
        subtotal: orderData?.subtotal,
        net_total_amount: orderData?.net_total_amount,
        netTotal: orderData?.netTotal,
        discount_amount: orderData?.discount_amount,
        service_charge: orderData?.service_charge
      });
      console.log('Order Items:', itemsResult.data);
      console.log('Calculated Subtotal:', calculatedSubtotal);
      
      // Ensure we're setting a proper object
      if (orderData) {
        setOrderDetails(orderData);
        console.log('✅ setOrderDetails called with orderData');
      } else {
        console.error('❌ orderData is null or undefined! Cannot set state.');
      }
      setExistingBill(billData); // Store bill data
      
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
   * Also updates table status automatically when order is completed
   */
  const updateOrderStatus = async (orderId, orderNumber, newStatus) => {
    try {
      // Format orderid correctly - prefer numeric order_id, fallback to formatted orderid
      const orderidValue = orderNumber || (orderId ? `ORD-${orderId}` : null);
      const order_idValue = orderId || (orderNumber ? parseInt(orderNumber.replace(/ORD-?/i, '')) : null);
      
      // Get order details to check if it's a Dine In order with a table
      const order = orders.find(o => (o.order_id || o.id) == orderId || o.orderid == orderNumber);
      const isDineIn = order?.order_type === 'Dine In';
      const tableId = order?.table_id;
      
      // Send both order_id (numeric) and orderid (formatted string) for maximum compatibility
      const payload = { status: newStatus };
      if (order_idValue) {
        payload.order_id = order_idValue;
      }
      if (orderidValue) {
        payload.orderid = orderidValue;
      }
      
      const result = await apiPost('/chnageorder_status.php', payload);

      // Check response - API can return success in different formats
      const apiResponse = result.data;
      const isSuccess = result.success && apiResponse && (
        apiResponse.success === true || 
        apiResponse.status === 'success' ||
        (apiResponse.message && apiResponse.message.toLowerCase().includes('success'))
      );

      if (isSuccess) {
        // If order is completed and it's a Dine In order, update table status to Available
        if (newStatus.toLowerCase() === 'complete' && isDineIn && tableId) {
          try {
            // Fetch current table details first
            const terminal = getTerminal();
            const branchId = getBranchId();
            const tablesResult = await apiPost('/get_tables.php', { 
              terminal,
              branch_id: branchId || terminal
            });
            if (tablesResult.data && Array.isArray(tablesResult.data)) {
              const table = tablesResult.data.find(t => t.table_id == tableId);
              if (table) {
                // Update table status to Available
                console.log('Updating table status to Available for table:', tableId);
                const updateResult = await apiPost('/table_management.php', {
                  table_id: parseInt(tableId),
                  hall_id: table.hall_id,
                  table_number: table.table_number,
                  capacity: table.capacity,
                  status: 'Available',
                  terminal: terminal,
                  branch_id: branchId || terminal,
                  action: 'update'
                });
                console.log('Table status update result:', updateResult);
              }
            }
          } catch (error) {
            console.error('Error updating table status:', error);
            // Don't show error to user, table status update is secondary
          }
        }
        
        setAlert({ type: 'success', message: apiResponse.message || 'Order status updated successfully!' });
        
        // Update table status if order is completed
        if (newStatus.toLowerCase() === 'complete' && isDineIn && tableId) {
          try {
            const terminal = getTerminal();
            const branchId = getBranchId();
            const tablesResult = await apiPost('/get_tables.php', { 
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
              console.log('🔄 Updating table status to Available for table:', tableId);
              const updateResult = await apiPost('/table_management.php', {
                table_id: parseInt(tableId),
                hall_id: table.hall_id || table.hall_ID,
                table_number: table.table_number || table.table_name || table.number,
                capacity: table.capacity || table.Capacity || 0,
                status: 'available', // Use lowercase to match API
                terminal: terminal,
                branch_id: branchId || terminal
              });
              console.log('✅ Table status update result:', updateResult);
            } else {
              console.warn('⚠️ Table not found for table_id:', tableId);
            }
          } catch (error) {
            console.error('❌ Error updating table status:', error);
            // Don't show error to user, table status update is secondary
          }
        }
        
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
      const result = await apiGet('/get_products.php', { terminal });
      if (result.data && Array.isArray(result.data)) {
        setDishes(result.data.map(item => ({
          dish_id: item.dish_id,
          name: item.name,
          price: parseFloat(item.price || 0),
          category_id: item.category_id,
          category_name: item.catname || '',
          is_available: item.is_available || 1,
        })));
      }
    } catch (error) {
      console.error('Error fetching dishes:', error);
    }
  };

  /**
   * Fetch categories for edit modal
   */
  const fetchCategories = async () => {
    try {
      const terminal = getTerminal();
      const result = await apiGet('/get_categories.php', { terminal });
      if (result.data && Array.isArray(result.data)) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
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

    // Fetch current order items for editing
    try {
      const orderId = order.order_id || order.id;
      const orderNumber = order.orderid || order.order_number;
      
      // Fetch order details and items
      const orderResult = await apiPost('/get_ordersbyid.php', { 
        order_id: orderId,
        orderid: orderNumber
      });
      
      const itemsResult = await apiPost('/get_orderdetails.php', { 
        order_id: orderId,
        orderid: orderNumber
      });
      
      let orderData = null;
      if (orderResult.success && orderResult.data) {
        orderData = Array.isArray(orderResult.data) ? orderResult.data[0] : orderResult.data;
      }
      
      const orderItems = (itemsResult.success && itemsResult.data && Array.isArray(itemsResult.data)) 
        ? itemsResult.data 
        : [];
      
      setEditingOrder({
        ...order,
        ...orderData,
      });
      
      setFormData({
        status: order.status || 'Pending',
        table_id: order.table_id || '',
        discount: order.discount || 0,
        items: orderItems.map(item => ({
          dish_id: item.dish_id || item.product_id,
          name: item.title || item.dish_name || item.name,
          price: parseFloat(item.price || item.rate || 0),
          quantity: parseInt(item.quantity || item.qnty || 0),
          total: parseFloat(item.total_amount || item.total || 0),
        })),
      });
      setSelectedCategory('');
      setEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching order details for edit:', error);
      setAlert({ type: 'error', message: 'Failed to load order details for editing' });
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

      // Update order details
      const orderData = {
        order_id: editingOrder.order_id || editingOrder.id,
        order_type: editingOrder.order_type || 'Dine In',
        order_status: formData.status,
        table_id: formData.table_id || editingOrder.table_id,
        discount_amount: discount,
        g_total_amount: subtotal,
        service_charge: editingOrder.service_charge || 0,
        net_total_amount: netTotal,
        terminal: terminal,
      };

      // Update order first
      const orderResult = await apiPost('/order_management.php', orderData);

      if (!orderResult.success || !orderResult.data || !orderResult.data.success) {
        setAlert({ type: 'error', message: orderResult.data?.message || 'Failed to update order details' });
        return;
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
      const itemsResult = await apiPost('/upload_orderdetails.php', {
        order_id: orderId,
        items: itemsData,
        delete_existing: true, // Flag to delete existing items first
      });

      if (itemsResult.success) {
        setAlert({ type: 'success', message: 'Order updated successfully with all items!' });
        setEditModalOpen(false);
        setEditingOrder(null);
        setFormData({ status: 'Pending', table_id: '', discount: 0, items: [] });
        setSelectedCategory('');
        fetchOrders(); // Refresh list
      } else {
        // Even if items update fails, order was updated
        setAlert({ type: 'warning', message: 'Order details updated, but there was an issue updating items. Please check manually.' });
        setEditModalOpen(false);
        setEditingOrder(null);
        setFormData({ status: 'Pending', table_id: '', discount: 0, items: [] });
        setSelectedCategory('');
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
      const result = await apiDelete('/order_management.php', {
        order_id: orderId || orderNumber,
        orderid: orderNumber || orderId,
      });

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'Order deleted successfully!' });
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

    const grandTotal = parseFloat(generatedBill.grand_total || 0);
    let cashReceived = 0;
    let change = 0;

    // For Cash payments, validate cash received
    if (generatedBill.payment_method === 'Cash') {
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
          const billFetchResult = await apiPost('/bills_management.php', { 
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
              console.log('Bill ID fetched:', billIdToUse);
            } else if (billData && billData.id) {
              // Some APIs might return 'id' instead of 'bill_id'
              billIdToUse = billData.id;
              console.log('Bill ID fetched (from id field):', billIdToUse);
            }
          }
        } catch (fetchError) {
          console.error('Error fetching bill ID:', fetchError);
          // Don't return early - we'll try to use order_id as fallback
          console.warn('Could not fetch bill_id, will try with order_id');
        }
      }

      // If we still don't have bill_id, we can still proceed with order_id
      // The API should handle updating existing bill or creating one
      // But we'll log a warning
      if (!billIdToUse) {
        console.warn('Bill ID not found, proceeding with order_id. API should handle this.');
      }

      // Update bill payment_status to "Paid" via bills_management.php
      // Prefer bill_id if available, otherwise use order_id (API should handle updating existing bill)
      // IMPORTANT: Do NOT include total_amount - that would trigger bill creation instead of payment update
      const billUpdatePayload = {
        payment_status: 'Paid',
        payment_method: generatedBill.payment_method || 'Cash',
        // Do NOT include total_amount, service_charge, discount, grand_total
        // These would cause the API to treat this as bill creation, not payment update
      };

      // CRITICAL: Always include both bill_id AND order_id to ensure API finds existing bill
      // This prevents duplicate bill creation
      if (billIdToUse) {
        billUpdatePayload.bill_id = billIdToUse;
        console.log('Using bill_id for update:', billIdToUse);
      }
      // Always include order_id as well to help API find the bill
      billUpdatePayload.order_id = generatedBill.order_id;
      console.log('Bill update will use:', billIdToUse ? `bill_id=${billIdToUse}` : `order_id=${generatedBill.order_id}`);

      // If cash payment, include cash_received and change
      if (generatedBill.payment_method === 'Cash') {
        billUpdatePayload.cash_received = cashReceived;
        billUpdatePayload.change = change;
      }

      console.log('=== Bill Update Payload ===');
      console.log('Payload:', JSON.stringify(billUpdatePayload, null, 2));

      const billUpdateResult = await apiPost('/bills_management.php', billUpdatePayload);
      
      console.log('=== Bill Update Full Response ===');
      console.log('Success:', billUpdateResult.success);
      console.log('Status:', billUpdateResult.status);
      console.log('Data:', JSON.stringify(billUpdateResult.data, null, 2));

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
      
      const billUpdateSuccess = billUpdateResult.success && billApiResponse && (
        billApiResponse.success === true ||
        billApiResponse.data?.payment_status === 'Paid' ||
        billApiResponse.data?.bill?.payment_status === 'Paid' ||
        billApiResponse.payment_status === 'Paid' ||
        (billApiResponse.message && billApiResponse.message.toLowerCase().includes('success')) ||
        (billApiResponse.message && billApiResponse.message.toLowerCase().includes('paid')) ||
        billApiResponse.status === 'success'
      );
      
      if (!billUpdateSuccess) {
        const errorMsg = billUpdateErrorMsg || 'Unknown error occurred while updating bill';
        console.error('Bill update error:', errorMsg);
        if (billUpdateResult && billUpdateResult.data) {
          console.error('Bill Update Response:', JSON.stringify(billUpdateResult.data, null, 2));
        }
      }

      // Update order status to "Complete" since bill is paid
      // This MUST succeed for the payment to be considered complete
      const orderIdValue = generatedBill.order_id;
      const orderidValue = generatedBill.order_number || `ORD-${generatedBill.order_id}`;
      
      const orderStatusPayload = { 
        status: 'Complete',
        order_id: orderIdValue,
        orderid: orderidValue
      };
      
      console.log('=== Updating Order Status to Complete ===');
      console.log('Payload:', JSON.stringify(orderStatusPayload, null, 2));
      
      let orderUpdateSuccess = false;
      let orderUpdateError = null;
      try {
        const orderStatusResult = await apiPost('/chnageorder_status.php', orderStatusPayload);
        
        console.log('=== Order Status Update Result ===');
        console.log('Result:', JSON.stringify(orderStatusResult, null, 2));
        
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
          console.error('Order status update failed:', orderUpdateError);
          if (orderApiResponse && Object.keys(orderApiResponse).length > 0) {
            console.error('Order API Response:', JSON.stringify(orderApiResponse, null, 2));
          }
          if (orderStatusResult) {
            console.error('Order Status Result:', JSON.stringify(orderStatusResult, null, 2));
          }
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
      
      // If order is completed and it's a Dine In order, update table status to Available
      // This should happen regardless of orderUpdateSuccess since payment was successful
      // Use generatedBill data if orderDetails is not available
      const orderForTableUpdate = orderDetails || generatedBill;
      if (orderForTableUpdate && orderForTableUpdate.order_type === 'Dine In' && (orderForTableUpdate.table_id || orderForTableUpdate.table_number)) {
        try {
          const terminal = getTerminal();
          const branchId = getBranchId();
          const tableId = orderForTableUpdate.table_id || orderForTableUpdate.table_number;
          
          console.log('🔄 Updating table status to Available after order completion');
          console.log('Table ID:', tableId);
          console.log('Order type:', orderForTableUpdate.order_type);
          
          // Fetch current table details
          const tablesResult = await apiPost('/get_tables.php', { 
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
            const updateResult = await apiPost('/table_management.php', {
              table_id: parseInt(table.table_id || table.id || tableId),
              hall_id: table.hall_id || table.hall_ID || orderForTableUpdate.hall_id,
              table_number: table.table_number || table.table_name || table.number || orderForTableUpdate.table_number,
              capacity: table.capacity || table.Capacity || 0,
              status: 'available', // Use lowercase to match API
              terminal: terminal,
              branch_id: branchId || terminal,
              action: 'update'
            });
            console.log('✅ Table status updated to Available:', updateResult);
          } else {
            console.warn('⚠️ Table not found for table_id:', tableId);
            // Try to update anyway with available data
            if (tableId) {
              console.log('🔄 Attempting table update with available data...');
              try {
                await apiPost('/table_management.php', {
                  table_id: parseInt(tableId),
                  hall_id: orderForTableUpdate.hall_id || 0,
                  table_number: orderForTableUpdate.table_number || String(tableId),
                  capacity: 0,
                  status: 'available',
                  terminal: terminal,
                  branch_id: branchId || terminal,
                  action: 'update'
                });
                console.log('✅ Table status updated (fallback method)');
              } catch (fallbackError) {
                console.error('❌ Fallback table update failed:', fallbackError);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error updating table status after payment:', error);
          // Don't show error to user, table status update is secondary
        }
      }

      // Both bill update AND order status update must succeed
      if (billUpdateSuccess && orderUpdateSuccess) {
        // Update generatedBill with payment info - preserve all existing data
        setGeneratedBill({
          ...generatedBill,
          bill_id: billIdToUse || generatedBill.bill_id,
          payment_status: 'Paid',
          cash_received: cashReceived,
          change: change,
          // Ensure items are preserved
          items: generatedBill.items || [],
        });

        // Close payment modal automatically
        setPaymentModalOpen(false);
        setPaymentData({ cash_received: 0, change: 0 });
        
        // Refresh orders to show updated status and update table status if needed
        await fetchOrders();
        
        // After refreshing orders, check if any completed Dine In orders need table status updated
        // This handles cases where order was already complete in backend
        setTimeout(async () => {
          const completedDineInOrders = orders.filter(o => 
            (o.status === 'complete' || o.order_status === 'Complete' || o.order_status === 'complete') &&
            o.order_type === 'Dine In' &&
            o.table_id &&
            o.table_id !== '-' &&
            o.table_id !== null
          );
          
          if (completedDineInOrders.length > 0) {
            console.log('🔄 Found completed Dine In orders, checking table statuses...');
            const terminal = getTerminal();
            const branchId = getBranchId();
            
            try {
              const tablesResult = await apiPost('/get_tables.php', { 
                terminal,
                branch_id: branchId || terminal
              });
              
              let tablesData = [];
              if (tablesResult.data && Array.isArray(tablesResult.data)) {
                tablesData = tablesResult.data;
              } else if (tablesResult.data && tablesResult.data.data && Array.isArray(tablesResult.data.data)) {
                tablesData = tablesResult.data.data;
              }
              
              for (const order of completedDineInOrders) {
                const table = tablesData.find(t => (t.table_id || t.id) == order.table_id);
                if (table && (table.status || table.Status || '').toLowerCase() !== 'available') {
                  console.log(`🔄 Auto-updating table ${order.table_id} to Available (order ${order.orderid} is complete)`);
                  await apiPost('/table_management.php', {
                    table_id: parseInt(order.table_id),
                    hall_id: table.hall_id || table.hall_ID,
                    table_number: table.table_number || table.table_name || table.number,
                    capacity: table.capacity || table.Capacity || 0,
                    status: 'available',
                    terminal: terminal,
                    branch_id: branchId || terminal
                  });
                }
              }
            } catch (error) {
              console.error('❌ Error auto-updating table statuses:', error);
            }
          }
        }, 1000); // Wait 1 second for orders to be fetched
        
        // Update existingBill state to reflect payment
        if (existingBill) {
          setExistingBill({
            ...existingBill,
            payment_status: 'Paid',
            cash_received: cashReceived,
            change: change,
          });
        }
        
        // Show success message
        if (generatedBill.payment_method === 'Cash' && change > 0) {
          setAlert({ 
            type: 'success', 
            message: `Payment received successfully! Change: ${formatPKR(change)}. Order status updated to Complete.` 
          });
        } else {
          setAlert({ 
            type: 'success', 
            message: `Payment received successfully via ${generatedBill.payment_method}! Order status updated to Complete.` 
          });
        }
      } else {
        // Both updates failed - provide detailed error message
        const billError = billUpdateErrorMsg || billApiResponse?.message || billApiResponse?.error || 
                         (billUpdateResult.status === 404 ? 'Bill not found. Please generate the bill first.' : 
                          billUpdateResult.status ? `HTTP ${billUpdateResult.status} error` : 'Bill update failed');
        
        const orderError = orderUpdateError || 'Order status update failed';
        
        console.error('Both updates failed - Bill Error:', billError);
        console.error('Both updates failed - Order Error:', orderError);
        if (billApiResponse) {
          console.error('Bill Response:', JSON.stringify(billApiResponse, null, 2));
        }
        if (billUpdateResult) {
          console.error('Bill Update Result:', JSON.stringify(billUpdateResult, null, 2));
        }
        
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
   * Handle print receipt - Print directly to network printers based on category
   * No dialog, prints to two default printers automatically
   */
  const handlePrintReceipt = async () => {
    if (!generatedBill) {
      setAlert({ type: 'error', message: 'No receipt data available to print' });
      return;
    }
    
    // Validate that items are present
    const items = generatedBill.items || [];
    if (!items || items.length === 0) {
      console.error('❌ Cannot print: No items in generated bill');
      console.error('Generated bill:', generatedBill);
      setAlert({ 
        type: 'error', 
        message: 'Cannot print receipt: No order items found. Please regenerate the bill.' 
      });
      return;
    }
    
    console.log('=== Printing Receipt ===');
    console.log('Items count:', items.length);
    console.log('Items:', items);
    
    try {
      // Get the receipt print area content
      const printContent = document.getElementById('receipt-print-area');
      if (!printContent) {
        setAlert({ type: 'error', message: 'Receipt content not found' });
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
      
      // Call backend API to print directly to network printers
      // Backend will handle printing to two default printers based on category
      const printResult = await apiPost('/print_receipt_direct.php', {
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

      if (printResult.success && printResult.data) {
        const response = printResult.data;
        
        if (response.success === true) {
          // Show success message with printer info
          const printerNames = response.printers || ['Default Printers'];
          setAlert({ 
            type: 'success', 
            message: `Receipt sent to ${printerNames.join(' and ')} successfully` 
          });
          
          // If bill is unpaid, update status to "Bill Generated" when printed
          if (generatedBill.payment_status !== 'Paid' && generatedBill.bill_id && generatedBill.order_id) {
            try {
              const orderIdValue = generatedBill.order_id;
              const orderidValue = generatedBill.order_number || `ORD-${generatedBill.order_id}`;
              
              const statusPayload = { 
                status: 'Bill Generated',
                order_id: orderIdValue,
                orderid: orderidValue
              };
              
              await apiPost('/chnageorder_status.php', statusPayload);
              fetchOrders(); // Refresh orders list
            } catch (error) {
              console.error('Error updating order status on print:', error);
            }
          }
        } else {
          setAlert({ 
            type: 'warning', 
            message: response.message || 'Print job sent, but some printers may not be available' 
          });
        }
      } else {
        // Fallback to silent print if API fails
        console.warn('Direct print API failed, using fallback method');
        const printWindow = window.open('', '_blank', 'width=1,height=1');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Receipt - Restaurant Khas</title>
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
              <body>${receiptHTML}</body>
            </html>
          `);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
            setTimeout(() => printWindow.close(), 500);
          }, 250);
        }
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      setAlert({ 
        type: 'error', 
        message: 'Error printing receipt. Please try again or contact support.' 
      });
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
      accessor: (row) => {
        // Use netTotal if available, otherwise fallback to total, otherwise show 0
        const displayAmount = row.netTotal > 0 ? row.netTotal : (row.total > 0 ? row.total : 0);
        return (
          <span className="font-bold text-[#FF5F15] text-sm">{formatPKR(displayAmount)}</span>
        );
      },
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Status',
      accessor: (row) => {
        // Use order_status if available (from API), otherwise use normalized status
        const displayStatus = row.order_status || row.original_status || row.status || 'Pending';
        const statusForColor = (displayStatus || row.status || 'Pending').toLowerCase();
        return (
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(statusForColor)} border`}>
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
   * Reprint kitchen receipt for a specific kitchen
   */
  const reprintKitchenReceipt = async (orderId, kitchenId, branchId) => {
    try {
      setAlert({ type: '', message: '' });
      
      const result = await apiPost('/print_kitchen_receipt.php', {
        order_id: orderId,
        kitchen_id: kitchenId,
        branch_id: branchId || getBranchId() || getTerminal()
      });

      if (result.success && result.data) {
        const response = result.data;
        if (response.success === true) {
          setAlert({ 
            type: 'success', 
            message: `Kitchen receipt sent to ${response.kitchen_name || 'kitchen'} printer${response.printer_ip ? ` (${response.printer_ip})` : ''}` 
          });
        } else {
          setAlert({ 
            type: 'error', 
            message: response.message || 'Failed to print kitchen receipt' 
          });
        }
      } else {
        setAlert({ 
          type: 'error', 
          message: result.data?.message || 'Failed to print kitchen receipt' 
        });
      }
    } catch (error) {
      console.error('Error reprinting kitchen receipt:', error);
      setAlert({ 
        type: 'error', 
        message: 'Error printing kitchen receipt: ' + (error.message || 'Network error') 
      });
    }
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

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => {
        const orderStatus = (order.status || '').toLowerCase().trim();
        const filterStatus = filter.toLowerCase().trim();
        return orderStatus === filterStatus;
      });

  // Debug: Log filtered orders
  useEffect(() => {
    console.log('🔍 Filtered orders debug:', {
      filter: filter,
      totalOrders: orders.length,
      filteredCount: filteredOrders.length,
      orderStatuses: orders.map(o => o.status).slice(0, 5), // First 5 statuses
      filteredSample: filteredOrders.slice(0, 2)
    });
  }, [filteredOrders.length, filter, orders.length]);

  return (
    <AdminLayout>
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

        {/* Filter Buttons */}
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm font-medium text-gray-700 mr-2">Filter by Status:</span>
            {['all', 'Pending', 'Running', 'Bill Generated', 'Complete', 'Cancelled'].map((status) => {
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

          {/* Date Filter */}
          <div className="flex gap-2 flex-wrap items-center bg-white p-3 rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700 mr-2">Filter by Date:</span>
            {['today', 'week', 'month'].map((period) => (
              <Button
                key={period}
                variant={dateFilter === period ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setDateFilter(period);
                  setShowDatePicker(false);
                  setCustomDate('');
                }}
                className="capitalize"
              >
                {period === 'today' ? 'Today' : period === 'week' ? 'Last Week' : 'Last Month'}
              </Button>
            ))}
            <Button
              variant={dateFilter === 'custom' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Custom Date
            </Button>
            
            {/* Custom Date Picker */}
            {showDatePicker && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    if (e.target.value) {
                      setDateFilter('custom');
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15]"
                />
                {customDate && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setCustomDate('');
                      setDateFilter('today');
                      setShowDatePicker(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            
            {dateFilter !== 'today' && (
              <span className="text-xs text-gray-500 ml-2">
                {dateFilter === 'week' && 'Showing orders from last 7 days'}
                {dateFilter === 'month' && 'Showing orders from last 30 days'}
                {dateFilter === 'custom' && customDate && `Showing orders for ${new Date(customDate).toLocaleDateString()}`}
              </span>
            )}
          </div>
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
          {orderDetails && (
            <div className="space-y-6 text-gray-900">
              {/* Order Header with enhanced styling */}
              <div className="grid grid-cols-2 gap-4 pb-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Order Number</p>
                  <p className="font-bold text-xl text-gray-900">
                    {orderDetails.orderid || 
                     (orderDetails.order_id ? `ORD-${orderDetails.order_id}` : null) || 
                     (orderDetails.id ? `ORD-${orderDetails.id}` : null) || 
                     'N/A'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Order Type</p>
                  <span className="px-3 py-1.5 text-sm font-semibold rounded-lg inline-block mt-1 bg-blue-500 text-white shadow-sm">
                    {orderDetails.order_type || 'Dine In'}
                  </span>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Status</p>
                  <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg inline-block mt-1 ${getStatusColor((orderDetails.order_status || orderDetails.status || orderDetails.original_status || 'Pending').toLowerCase())} shadow-sm`}>
                    {orderDetails.order_status || orderDetails.status || orderDetails.original_status || 'Pending'}
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

              {/* Kitchen Receipt Reprint Section */}
              {(() => {
                // Get unique kitchen IDs from order items
                const kitchenIds = [...new Set(
                  orderItems
                    .map(item => item.kitchen_id || item.kitchen_ID)
                    .filter(Boolean)
                )];
                
                if (kitchenIds.length > 0) {
                  return (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm">
                      <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                        <Printer className="w-5 h-5 text-blue-600" />
                        Kitchen Receipts
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        This order has items from {kitchenIds.length} kitchen{kitchenIds.length > 1 ? 's' : ''}. 
                        Receipts are automatically printed when orders are created.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {kitchenIds.map((kitchenId) => (
                          <Button
                            key={kitchenId}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const orderId = orderDetails.order_id || orderDetails.id;
                              const branchId = orderDetails.branch_id || getBranchId() || getTerminal();
                              reprintKitchenReceipt(orderId, kitchenId, branchId);
                            }}
                            className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Reprint Kitchen {kitchenId}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Order Items with enhanced styling */}
              {orderItems.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-[#FF5F15] rounded-full"></span>
                    Order Items
                    {(() => {
                      const kitchenIds = [...new Set(
                        orderItems
                          .map(item => item.kitchen_id || item.kitchen_ID)
                          .filter(Boolean)
                      )];
                      if (kitchenIds.length > 0) {
                        return (
                          <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {kitchenIds.length} Kitchen{kitchenIds.length > 1 ? 's' : ''}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </h3>
                  <div className="space-y-3 bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    {orderItems.map((item, index) => {
                      const kitchenId = item.kitchen_id || item.kitchen_ID;
                      return (
                        <div key={index} className="flex justify-between items-center py-3 px-4 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 text-base">{item.title || item.dish_name || 'Item'}</p>
                              {kitchenId && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                                  Kitchen {kitchenId}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {formatPKR(item.price || item.rate || 0)} × {item.quantity || item.qnty || 0}
                            </p>
                          </div>
                          <p className="font-bold text-lg text-gray-900 ml-4">
                            {formatPKR(item.total_amount || item.total || 0)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Order Totals with enhanced styling */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-3">
                {(() => {
                  // Calculate subtotal from items if order totals are missing
                  const itemsSubtotal = orderItems.length > 0 
                    ? orderItems.reduce((sum, item) => {
                        const itemTotal = parseFloat(item.total_amount || item.total || item.total_price || 0);
                        return sum + itemTotal;
                      }, 0)
                    : 0;
                  
                  // Debug: Log orderDetails to see what fields are available
                  console.log('🔍 Modal Display - orderDetails:', {
                    g_total_amount: orderDetails.g_total_amount,
                    total: orderDetails.total,
                    subtotal: orderDetails.subtotal,
                    net_total_amount: orderDetails.net_total_amount,
                    netTotal: orderDetails.netTotal,
                    discount_amount: orderDetails.discount_amount,
                    service_charge: orderDetails.service_charge,
                    allKeys: Object.keys(orderDetails)
                  });
                  
                  // Use order totals if available, otherwise calculate from items
                  // Try multiple field names to ensure we get the value
                  const subtotal = parseFloat(
                    orderDetails.g_total_amount || 
                    orderDetails.g_total ||
                    orderDetails.total || 
                    orderDetails.subtotal ||
                    orderDetails.total_amount ||
                    itemsSubtotal ||
                    0
                  );
                  
                  const serviceCharge = parseFloat(
                    orderDetails.service_charge || 
                    orderDetails.service ||
                    0
                  );
                  
                  const discountAmount = parseFloat(
                    orderDetails.discount_amount || 
                    orderDetails.discount ||
                    0
                  );
                  
                  // Calculate net total - try multiple field names
                  const netTotal = parseFloat(
                    orderDetails.net_total_amount || 
                    orderDetails.net_total ||
                    orderDetails.netTotal || 
                    orderDetails.grand_total ||
                    (subtotal + serviceCharge - discountAmount) ||
                    0
                  );
                  
                  console.log('💰 Modal Display - Calculated values:', {
                    subtotal,
                    serviceCharge,
                    discountAmount,
                    netTotal,
                    itemsSubtotal
                  });
                  
                  return (
                    <>
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
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm py-2">
                          <span className="text-gray-600 font-medium">Discount:</span>
                          <span className="font-semibold text-red-600">-{formatPKR(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-200">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-[#FF5F15] text-2xl">
                          {formatPKR(netTotal)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Generate Bill Button - Show for Running, Preparing, Ready, or Pending status if no bill exists */}
              {(() => {
                // Case-insensitive status check - allow Generate Bill for Pending, Running, Preparing, or Ready
                const status = (orderDetails.order_status || orderDetails.status || '').toLowerCase();
                const canGenerateBill = status === 'running' || 
                                       status === 'preparing' || 
                                       status === 'ready' || 
                                       status === 'pending';
                const hasNoBill = !existingBill;
                
                // Debug logging
                console.log('Generate Bill Button Check:', {
                  status: orderDetails.order_status || orderDetails.status,
                  statusLower: status,
                  canGenerateBill,
                  hasNoBill,
                  existingBill: existingBill ? 'exists' : 'none',
                  shouldShow: canGenerateBill && hasNoBill
                });
                
                return canGenerateBill && hasNoBill;
              })() && (
                <div className="pt-2">
                  <Button
                    onClick={() => {
                      setBillOrder(orderDetails);
                      const subtotal = parseFloat(orderDetails.g_total_amount || orderDetails.total || 0);
                      // Auto-calculate 10% service charge for Dine In only (Take Away and Delivery have 0 service charge)
                      const autoServiceCharge = (orderDetails.order_type || '').toLowerCase() === 'dine in' ? subtotal * 0.10 : 0;
                      setBillData({
                        discount_percentage: 0,
                        service_charge: autoServiceCharge,
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

              {/* Pay Bill Button - Show if bill exists and is unpaid, OR if order status is "Bill Generated" (to allow payment) */}
              {(() => {
                // Check if order status is "Bill Generated" (case-insensitive)
                const orderStatus = (orderDetails.order_status || orderDetails.status || '').toLowerCase();
                const isBillGenerated = orderStatus === 'bill generated';
                
                // If order status is "Bill Generated", always show Pay Bill button (even if bill fetch failed)
                if (isBillGenerated && !existingBill) {
                  return true; // Show button to allow payment even if bill fetch failed
                }
                
                // If bill exists, check payment status (case-insensitive)
                if (existingBill) {
                  const paymentStatus = (existingBill.payment_status || 'Unpaid').toString().toLowerCase();
                  return paymentStatus !== 'paid';
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
                          
                          const billFetchResult = await apiPost('/bills_management.php', { 
                            order_id: orderDetails.order_id || orderDetails.id 
                          });
                          
                          console.log('Bill fetch result:', JSON.stringify(billFetchResult, null, 2));
                          
                          if (billFetchResult.success && billFetchResult.data) {
                            // Handle different response structures
                            if (billFetchResult.data.success === true && billFetchResult.data.data) {
                              billToPay = billFetchResult.data.data.bill || billFetchResult.data.data;
                            } else if (billFetchResult.data.bill) {
                              billToPay = billFetchResult.data.bill;
                            } else if (billFetchResult.data.bill_id || billFetchResult.data.order_id) {
                              billToPay = billFetchResult.data;
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
                        // Calculate service charge (10% for Dine In only)
                        serviceCharge = (orderDetails.order_type?.toLowerCase() === 'dine in') ? subtotal * 0.10 : 0;
                        // Get discount from order if available
                        discountAmount = parseFloat(orderDetails.discount_amount || orderDetails.discount || 0);
                        // Calculate grand total
                        grandTotal = subtotal + serviceCharge - discountAmount;
                      }
                      
                      // Calculate discount percentage
                      const discountPercentage = discountAmount > 0 && (subtotal + serviceCharge) > 0 
                        ? ((discountAmount / (subtotal + serviceCharge)) * 100).toFixed(2)
                        : 0;
                      
                      // Format order items for receipt
                      const formattedItems = (orderItems || []).map(item => ({
                        dish_id: item.dish_id || item.id,
                        dish_name: item.dish_name || item.name || item.title || 'Item',
                        name: item.dish_name || item.name || item.title || 'Item',
                        price: parseFloat(item.price || item.rate || item.unit_price || 0),
                        quantity: parseInt(item.quantity || item.qty || item.qnty || 1),
                        qty: parseInt(item.quantity || item.qty || item.qnty || 1),
                        total_amount: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || 0) * parseInt(item.quantity || 1))),
                        total: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || 0) * parseInt(item.quantity || 1))),
                      }));
                      
                      // Prepare bill data for payment modal
                      const receiptData = {
                        bill_id: billToPay?.bill_id || null,
                        order_id: orderDetails.order_id || orderDetails.id,
                        order_number: orderDetails.order_id ? `ORD-${orderDetails.order_id}` : (orderDetails.orderid || orderDetails.id),
                        order_type: orderDetails.order_type || 'Dine In',
                        table_number: orderDetails.table_number || orderDetails.table_id || '',
                        subtotal: subtotal,
                        service_charge: serviceCharge,
                        discount_percentage: parseFloat(discountPercentage) || 0,
                        discount_amount: discountAmount,
                        grand_total: grandTotal,
                        payment_method: billToPay?.payment_method || orderDetails.payment_mode || 'Cash',
                        payment_status: billToPay?.payment_status || 'Unpaid',
                        items: formattedItems,
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

              {/* View Receipt Button - Only show if bill is paid (case-insensitive check) */}
              {existingBill && (() => {
                // Case-insensitive payment status check
                const paymentStatus = (existingBill.payment_status || 'Unpaid').toString().toLowerCase();
                return paymentStatus === 'paid';
              })() && (
                <div className="pt-2">
                  <Button
                    onClick={async () => {
                      // Fetch order items if not already loaded
                      let itemsForReceipt = orderItems || [];
                      
                      if (itemsForReceipt.length === 0 || (itemsForReceipt.length > 0 && itemsForReceipt[0]?.order_id !== orderDetails.order_id)) {
                        try {
                          console.log('=== Fetching Order Items for Paid Receipt ===');
                          const orderId = orderDetails.order_id || orderDetails.id;
                          const orderNumber = orderDetails.orderid || orderDetails.order_number || (orderId ? `ORD-${orderId}` : '');
                          
                          const itemsResult = await apiPost('/get_orderdetails.php', { 
                            order_id: orderId,
                            orderid: orderNumber
                          });
                          
                          // Extract items from response
                          if (itemsResult.success && itemsResult.data) {
                            if (Array.isArray(itemsResult.data)) {
                              itemsForReceipt = itemsResult.data;
                            } else if (itemsResult.data.data && Array.isArray(itemsResult.data.data)) {
                              itemsForReceipt = itemsResult.data.data;
                            } else if (itemsResult.data.items && Array.isArray(itemsResult.data.items)) {
                              itemsForReceipt = itemsResult.data.items;
                            } else if (itemsResult.data.order_items && Array.isArray(itemsResult.data.order_items)) {
                              itemsForReceipt = itemsResult.data.order_items;
                            } else if (typeof itemsResult.data === 'object') {
                              for (const key in itemsResult.data) {
                                if (Array.isArray(itemsResult.data[key])) {
                                  itemsForReceipt = itemsResult.data[key];
                                  break;
                                }
                              }
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
                        bill_id: existingBill.bill_id,
                        order_id: orderDetails.order_id || orderDetails.id,
                        order_number: orderDetails.order_id ? `ORD-${orderDetails.order_id}` : (orderDetails.orderid || orderDetails.id),
                        order_type: orderDetails.order_type || 'Dine In',
                        table_number: orderDetails.table_number || orderDetails.table_id || '',
                        subtotal: parseFloat(existingBill.total_amount || orderDetails.g_total_amount || orderDetails.total || 0),
                        service_charge: parseFloat(existingBill.service_charge || 0),
                        discount_percentage: existingBill.discount > 0 && existingBill.total_amount > 0 
                          ? ((existingBill.discount / (existingBill.total_amount + existingBill.service_charge)) * 100).toFixed(2)
                          : 0,
                        discount_amount: parseFloat(existingBill.discount || 0),
                        grand_total: parseFloat(existingBill.grand_total || orderDetails.net_total_amount || orderDetails.total || 0),
                        payment_method: existingBill.payment_method || orderDetails.payment_mode || 'Cash',
                        payment_status: 'Paid',
                        cash_received: parseFloat(existingBill.cash_received || existingBill.grand_total || 0),
                        change: parseFloat(existingBill.change || 0),
                        items: formattedItems,
                        date: existingBill.created_at || existingBill.updated_at || new Date().toLocaleString(),
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
          )}
        </Modal>

        {/* Generate Bill Modal */}
        <Modal
          isOpen={billModalOpen}
          onClose={() => {
            setBillModalOpen(false);
            setBillOrder(null);
            setBillData({ discount_percentage: 0, service_charge: 0, payment_mode: 'Cash' });
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

                {/* Service Charge - 10% for Dine In only, Disabled */}
                {billOrder.order_type === 'Dine In' && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                    <label className="block text-sm font-medium text-green-600 mb-1.5 uppercase tracking-wide">
                      Service Charge (10% - Auto Calculated)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={billData.service_charge.toFixed(2)}
                      disabled={true}
                      className="bg-gray-100 cursor-not-allowed text-gray-900 font-semibold"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically calculated as 10% of subtotal (Dine In orders only - Non-editable)
                    </p>
                  </div>
                )}

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

                {/* Payment Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={billData.payment_mode}
                    onChange={(e) => setBillData({ ...billData, payment_mode: e.target.value })}
                    className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                {/* Bill Summary - Real-time Calculation */}
                {(() => {
                  const subtotal = parseFloat(billOrder.g_total_amount || billOrder.total || 0);
                  // Step 1: Service charge (10% for Dine In only)
                  const serviceCharge = billOrder.order_type === 'Dine In' ? subtotal * 0.10 : 0;
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
                      {billOrder.order_type === 'Dine In' && serviceCharge > 0 && (
                        <div className="flex justify-between text-sm py-2">
                          <span className="text-gray-600 font-medium">Service Charge (10%):</span>
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

                {/* Generate Bill Button - Always visible in Generate Bill Modal */}
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      const subtotal = parseFloat(billOrder.g_total_amount || billOrder.total || 0);
                      
                      // Step 1: Service charge (10% for Dine In only)
                      const serviceCharge = billOrder.order_type === 'Dine In' ? subtotal * 0.10 : 0;
                      
                      // Step 2: Discount amount (percentage of subtotal + service charge)
                      const discountAmount = ((subtotal + serviceCharge) * (billData.discount_percentage / 100));
                      
                      // Step 3: Grand total
                      const grandTotal = (subtotal + serviceCharge) - discountAmount;

                      // Create bill using bills_management.php API
                      const billPayload = {
                        order_id: billOrder.order_id || billOrder.id,
                        total_amount: subtotal,
                        service_charge: serviceCharge,
                        discount: discountAmount, // Store discount amount (not percentage)
                        grand_total: grandTotal,
                        payment_method: billData.payment_mode,
                        payment_status: 'Unpaid', // Bill starts as Unpaid
                      };

                      // Log the payload being sent
                      console.log('Bill payload being sent:', billPayload);
                      
                      const result = await apiPost('/bills_management.php', billPayload);
                      
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
                        
                        // ALWAYS fetch order items when generating bill to ensure we have the latest data
                        let itemsForReceipt = [];
                        try {
                          console.log('=== Fetching Order Items for Bill Generation ===');
                          const orderId = billOrder.order_id || billOrder.id;
                          const orderNumber = billOrder.orderid || billOrder.order_number || (orderId ? `ORD-${orderId}` : '');
                          
                          console.log('Order ID:', orderId);
                          console.log('Order Number:', orderNumber);
                          
                          const itemsResult = await apiPost('/get_orderdetails.php', { 
                            order_id: orderId,
                            orderid: orderNumber
                          });
                          
                          console.log('Items API response:', itemsResult);
                          console.log('Items API response data:', JSON.stringify(itemsResult.data, null, 2));
                          
                          // Extract items from response - handle multiple structures
                          if (itemsResult.success && itemsResult.data) {
                            if (Array.isArray(itemsResult.data)) {
                              itemsForReceipt = itemsResult.data;
                              console.log('✅ Found items in result.data (array):', itemsForReceipt.length);
                            } else if (itemsResult.data.data && Array.isArray(itemsResult.data.data)) {
                              itemsForReceipt = itemsResult.data.data;
                              console.log('✅ Found items in result.data.data:', itemsForReceipt.length);
                            } else if (itemsResult.data.items && Array.isArray(itemsResult.data.items)) {
                              itemsForReceipt = itemsResult.data.items;
                              console.log('✅ Found items in result.data.items:', itemsForReceipt.length);
                            } else if (itemsResult.data.order_items && Array.isArray(itemsResult.data.order_items)) {
                              itemsForReceipt = itemsResult.data.order_items;
                              console.log('✅ Found items in result.data.order_items:', itemsForReceipt.length);
                            } else if (typeof itemsResult.data === 'object') {
                              // Search for any array in the response
                              for (const key in itemsResult.data) {
                                if (Array.isArray(itemsResult.data[key])) {
                                  itemsForReceipt = itemsResult.data[key];
                                  console.log(`✅ Found items in result.data.${key}:`, itemsForReceipt.length);
                                  break;
                                }
                              }
                            }
                          }
                          
                          if (itemsForReceipt.length === 0) {
                            console.warn('⚠️ No items found in API response. Trying orderItems from state...');
                            // Fallback to orderItems from state if API returns empty
                            if (orderItems && orderItems.length > 0) {
                              itemsForReceipt = orderItems;
                              console.log('✅ Using orderItems from state:', itemsForReceipt.length);
                            }
                          }
                          
                          console.log('✅ Final items for receipt:', itemsForReceipt.length);
                          if (itemsForReceipt.length > 0) {
                            console.log('Sample item:', JSON.stringify(itemsForReceipt[0], null, 2));
                          }
                        } catch (error) {
                          console.error('❌ Error fetching order items for bill:', error);
                          // Fallback to orderItems from state if fetch fails
                          if (orderItems && orderItems.length > 0) {
                            itemsForReceipt = orderItems;
                            console.log('✅ Using orderItems from state as fallback:', itemsForReceipt.length);
                          } else {
                            console.error('❌ No items available - neither from API nor from state');
                          }
                        }
                        
                        // Store bill data for receipt - use calculated values from frontend
                        // Ensure orderItems are properly formatted for receipt
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
                        
                        console.log('✅ Formatted items for receipt:', formattedItems.length, formattedItems);
                        
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
                          payment_method: billData.payment_method || billData.payment_mode || 'Cash',
                          payment_status: 'Unpaid', // Bill starts as Unpaid
                          items: formattedItems,
                          date: new Date().toLocaleString(),
                        };
                        
                        console.log('=== Receipt Data Prepared ===');
                        console.log('Receipt data:', receiptData);
                        console.log('Items count:', formattedItems.length);
                        console.log('Items:', formattedItems);
                        
                        // Validate that items are present
                        if (!formattedItems || formattedItems.length === 0) {
                          console.error('❌ No items found in receipt data!');
                          setAlert({ 
                            type: 'error', 
                            message: 'Cannot generate receipt: No order items found. Please ensure the order has items before generating the bill.' 
                          });
                          return;
                        }
                        
                        // Store bill data for receipt
                        setGeneratedBill(receiptData);
                        
                        // Close bill modal
                        setBillModalOpen(false);
                        setBillOrder(null);
                        setBillData({ discount_percentage: 0, service_charge: 0, payment_mode: 'Cash' });
                        
                        // Update order status to "Bill Generated" when receipt is printed
                        const orderIdValue = billOrder.order_id || billOrder.id;
                        const orderidValue = billOrder.order_id ? `ORD-${billOrder.order_id}` : (billOrder.orderid || billOrder.id);
                        
                        // Update order status to "Bill Generated"
                        try {
                          const statusPayload = { 
                            status: 'Bill Generated',
                            order_id: orderIdValue,
                            orderid: orderidValue
                          };
                          await apiPost('/chnageorder_status.php', statusPayload);
                        } catch (error) {
                          console.error('Error updating order status:', error);
                          // Continue even if status update fails
                        }
                        
                        // Refresh orders list
                        fetchOrders();
                        
                        // Show receipt modal for printing (don't auto-print, let user click print button)
                        setReceiptModalOpen(true);
                        setDetailsModalOpen(false);
                        
                        setAlert({ type: 'success', message: 'Bill generated successfully! Click "Print Receipt" to print.' });
                      } else {
                        // More detailed error message - check all possible error locations
                        let errorMsg = 'Failed to generate bill';
                        
                        if (apiResponse && typeof apiResponse === 'object') {
                          errorMsg = apiResponse.message || 
                                    apiResponse.data?.message || 
                                    apiResponse.data?.error || 
                                    apiResponse.error ||
                                    (apiResponse.success === false ? 'Bill creation failed on server' : errorMsg);
                        } else if (result.data && typeof result.data === 'string') {
                          errorMsg = result.data;
                        } else if (result.message) {
                          errorMsg = result.message;
                        }
                        
                        console.error('=== Bill Generation Failed ===');
                        console.error('HTTP Success:', result.success);
                        console.error('HTTP Status:', result.status);
                        console.error('API Response:', apiResponse);
                        console.error('Error Message:', errorMsg);
                        console.error('Full Result:', result);
                        
                        // Show user-friendly error message
                        setAlert({ 
                          type: 'error', 
                          message: errorMsg || 'Failed to generate bill. Please check server logs or contact support.' 
                        });
                      }
                    } catch (error) {
                      console.error('Error generating bill:', error);
                      setAlert({ type: 'error', message: 'Failed to generate bill: ' + (error.message || 'Network error') });
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

                <Input
                  label="Table ID"
                  type="text"
                  value={formData.table_id}
                  onChange={(e) => setFormData({ ...formData, table_id: e.target.value })}
                  placeholder="Table ID"
                />

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
                      <span className="text-gray-600 font-medium">Service Charge (10%):</span>
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

              {/* Cash Payment Flow - Only show cash input for Cash payment method */}
              {generatedBill.payment_method === 'Cash' ? (
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
              ) : (
                /* For Card/Online payments - Just confirm payment */
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-5 rounded-xl border border-purple-200">
                  <div className="text-center">
                    <CreditCard className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                    <p className="text-purple-700 font-medium mb-2">
                      Payment Method: {generatedBill.payment_method}
                    </p>
                    <p className="text-sm text-gray-600">
                      Confirm that payment of {formatPKR(generatedBill.grand_total)} has been received via {generatedBill.payment_method}.
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
                    generatedBill.payment_method === 'Cash' 
                      ? (!paymentData.cash_received || paymentData.cash_received < generatedBill.grand_total)
                      : false
                  }
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 text-base shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  {generatedBill.payment_method === 'Cash' 
                    ? `Pay Bill${paymentData.change > 0 ? ` (Change: ${formatPKR(paymentData.change)})` : ''}` 
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
                  {/* Debug info - visible in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <strong>Debug Info:</strong>
                      <br />Items count: {receiptItems.length}
                      <br />Order ID: {generatedBill.order_id}
                      <br />Bill ID: {generatedBill.bill_id}
                      {receiptItems.length > 0 && (
                        <>
                          <br />First item: {receiptItems[0].dish_name || receiptItems[0].name || 'N/A'}
                          <br />
                          <pre className="mt-2 text-xs overflow-auto max-h-32">
                            {JSON.stringify(receiptItems.slice(0, 2), null, 2)}
                          </pre>
                        </>
                      )}
                      {receiptItems.length === 0 && (
                        <div className="text-red-600 font-bold mt-2">
                          ⚠️ NO ITEMS FOUND - Receipt will be empty!
                        </div>
                      )}
                    </div>
                  )}
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
                    className="flex-1 bg-gradient-to-r from-[#FF5F15] to-[#FF8C42] hover:from-[#FF6B2B] hover:to-[#FF9A5C] text-white font-semibold"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Receipt
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      </div>
    </AdminLayout>
  );
}
