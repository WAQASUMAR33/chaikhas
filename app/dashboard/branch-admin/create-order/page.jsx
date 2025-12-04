'use client';

/**
 * Create Order Page
 * Create new order: Select Hall → Select Table → Select Dishes → Place Order → Show Receipt
 * Uses real APIs: get_halls.php, get_tables.php, get_products.php, create_order.php
 */

import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import { apiGet, apiPost, getTerminal, getToken, getBranchId } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { ShoppingCart, Plus, Minus, X, Receipt, Check, Printer } from 'lucide-react';
import ThermalReceipt from '@/components/receipt/ThermalReceipt';
import logger from '@/utils/logger';

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

  // Remove this useEffect - we'll filter on client side instead
  // useEffect(() => {
  //   fetchDishes();
  // }, [selectedCategory]);

  /**
   * Fetch halls from API (Branch-Admin)
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
      
      // Branch-admin MUST have branch_id
      if (!branchId) {
        console.error('❌ Branch ID is missing for fetching halls');
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        setHalls([]);
        return;
      }
      
      console.log('=== Fetching Halls (Create Order - Branch Admin) ===');
      console.log('Params:', { terminal, branch_id: branchId });
      
      const result = await apiPost('api/get_halls.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for branch-admin
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
   * Fetch tables from API (Branch-Admin)
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
      
      // Branch-admin MUST have branch_id
      if (!branchId) {
        console.error('❌ Branch ID is missing for fetching tables');
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        setTables([]);
        return;
      }
      
      console.log('=== Fetching Tables (Create Order - Branch Admin) ===');
      console.log('Params:', { terminal, branch_id: branchId, hall_id: selectedHall });
      
      const result = await apiPost('api/get_tables.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for branch-admin
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
   * Fetch categories from API
   */
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const terminal = getTerminal();
      let branchId = getBranchId();
      
      // Ensure branch_id is valid (not null, undefined, or empty string)
      if (branchId) {
        branchId = branchId.toString().trim();
        if (branchId === 'null' || branchId === 'undefined' || branchId === '') {
          branchId = null;
        } else {
          // Try to convert to number for validation
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
        setCategories([]);
        setLoading(false);
        return;
      }
      
      console.log('=== Fetching Categories (Create Order - Branch Admin) ===');
      console.log('Params:', { terminal, branch_id: branchId });
      
      // Branch-admin: Only fetch categories for their branch
      const result = await apiPost('api/get_categories.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for branch-admin
      });
      
      console.log('get_categories.php full response:', JSON.stringify(result, null, 2));
      console.log('result.success:', result.success);
      console.log('result.data type:', typeof result.data);
      console.log('result.data is array:', Array.isArray(result.data));
      
      // Check for SQL errors in the response - only check for actual error messages, not successful responses
      // Only check if response indicates an error (not successful response with data)
      if (result.data && (result.data.success === false || result.data.error || result.data.message)) {
        const errorString = JSON.stringify(result.data).toLowerCase();
        // Only trigger error if it's an actual SQL error message pattern
        const isSQLError = (errorString.includes('unknown column') && 
                           (errorString.includes('in \'select\'') || errorString.includes('in \'field list\''))) ||
                          errorString.includes('sql syntax error') ||
                          errorString.includes('sqlstate');
        
        if (isSQLError) {
          console.error('❌ SQL Error detected in get_categories.php:', result.data);
          setAlert({ 
            type: 'error', 
            message: result.data.message || result.data.error || 'Database Error: SQL query error detected.' 
          });
          setCategories([]);
          setLoading(false);
          return;
        }
      }
      
      // Check if request failed
      if (!result.success) {
        const errorMessage = result.data?.message || result.data?.error || 'Failed to load categories';
        console.error('❌ Failed to fetch categories:', errorMessage);
        setAlert({ type: 'error', message: `Failed to load categories: ${errorMessage}` });
        setCategories([]);
        setLoading(false);
        return;
      }
      
      let categoriesData = [];
      
      // Handle multiple possible response structures
      // API returns: { success: true, data: [...], count: ... }
      // apiPost wraps it: { success: true, data: { success: true, data: [...], count: ... } }
      if (result.success && result.data) {
        // Check if data is an array directly
        if (Array.isArray(result.data)) {
          categoriesData = result.data;
          console.log('✅ Found categories in result.data (array)');
        } 
        // Check if data.success is true and data.data is an array (most common structure)
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
      
      console.log(`Total categories found: ${categoriesData.length}`);
      
      if (categoriesData.length > 0) {
        // Map to ensure consistent structure
        const mappedCategories = categoriesData.map((cat) => ({
          category_id: cat.category_id || cat.id || cat.CategoryID,
          name: cat.name || cat.category_name || cat.Name || '',
          description: cat.description || '',
        })).filter(cat => cat.category_id); // Filter out invalid entries
        
        console.log('✅ Mapped categories:', mappedCategories);
        setCategories(mappedCategories);
        setAlert({ type: '', message: '' }); // Clear any previous errors
      } else {
        console.warn('⚠️ No categories found for this branch');
        console.warn('Response structure:', JSON.stringify(result, null, 2));
        setCategories([]);
        
        if (result.data && result.data.success === false) {
          const errorMsg = result.data.message || result.data.error || 'Failed to load categories';
          setAlert({ type: 'error', message: errorMsg });
        } else if (!result.success) {
          setAlert({ type: 'warning', message: 'No categories found. Please add categories in the Category Management page.' });
        }
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
   * Fetch dishes from API (Branch-Admin)
   * Only fetch dishes for their branch
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
      
      // Branch-admin MUST have branch_id
      if (!branchId) {
        console.error('❌ Branch ID is missing for fetching dishes');
        setDishes([]);
        setLoading(false);
        return;
      }
      
      console.log('=== Fetching Dishes (Create Order - Branch Admin) ===');
      console.log('Params:', { terminal, branch_id: branchId });
      
      const result = await apiPost('api/get_products.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for branch-admin
      });
      
      console.log('get_products.php response:', result);
      
      // Check for SQL errors in the response - only check for actual error messages, not data fields
      // Don't check for "kitchen_id" as it's a normal field in product data
      if (result.data && (result.data.success === false || result.data.error)) {
        const errorString = JSON.stringify(result.data).toLowerCase();
        // Only trigger error if it's an actual SQL error message pattern
        // Not just the presence of "kitchen_id" which is a normal data field
        const isSQLError = errorString.includes('unknown column') && 
                          (errorString.includes('in \'select\'') || errorString.includes('in \'field list\'')) ||
                          errorString.includes('sql syntax error') ||
                          errorString.includes('sqlstate');
        
        if (isSQLError) {
          console.error('❌ SQL Error detected in get_products.php:', result.data);
          setAlert({ 
            type: 'error', 
            message: result.data.message || result.data.error || 'Database Error: SQL query error detected.' 
          });
          setDishes([]);
          setLoading(false);
          return;
        }
      }
      
      // Check if request failed
      if (!result.success) {
        const errorMessage = result.data?.message || result.data?.error || 'Failed to load products';
        console.error('❌ Failed to fetch products:', errorMessage);
        setAlert({ type: 'error', message: `Failed to load products: ${errorMessage}` });
        setDishes([]);
        setLoading(false);
        return;
      }
      
      let dishesData = [];
      
      // Handle multiple possible response structures
      // API returns: { success: true, data: [...], count: ... }
      if (result.success && result.data) {
        // Check if data is an array directly
        if (Array.isArray(result.data)) {
          dishesData = result.data;
          console.log('✅ Found dishes in result.data (array)');
        } 
        // Check if data.success is true and data.data is an array
        else if (result.data.success === true && Array.isArray(result.data.data)) {
          dishesData = result.data.data;
          console.log('✅ Found dishes in result.data.data');
        }
        // Check if data is an object with a data property that's an array
        else if (typeof result.data === 'object' && Array.isArray(result.data.data)) {
          dishesData = result.data.data;
          console.log('✅ Found dishes in result.data.data');
        }
        // Try to find any array property in result.data
        else if (typeof result.data === 'object') {
          for (const key in result.data) {
            if (Array.isArray(result.data[key]) && key !== 'details') {
              dishesData = result.data[key];
              console.log(`✅ Found dishes in result.data.${key}`);
              break;
            }
          }
        }
      }
      
      if (dishesData.length > 0) {
        console.log(`✅ Total dishes found: ${dishesData.length}`);
        setDishes(dishesData);
        setAlert({ type: '', message: '' }); // Clear any previous errors
      } else if (result.success && result.data && result.data.success === true) {
        // API returned success but no dishes (empty result)
        console.warn('⚠️ No dishes found for this branch (empty result)');
        setDishes([]);
        setAlert({ type: 'warning', message: 'No dishes found. Please add dishes in the Menu Management page.' });
      } else {
        // Actual error case
        console.warn('⚠️ No dishes found - API response structure:', result);
        setDishes([]);
        if (!result.success) {
          const errorMsg = result.data?.message || result.data?.error || 'Failed to load products';
          setAlert({ type: 'error', message: errorMsg });
        } else {
          setAlert({ type: 'warning', message: 'No dishes found. Please add dishes in the Menu Management page.' });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching dishes:', error);
      setAlert({ type: 'error', message: 'Failed to load products: ' + (error.message || 'Network error') });
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

    setPlacing(true);
    setAlert({ type: '', message: '' });

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
      
      // Branch-admin MUST have branch_id
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        setPlacing(false);
        return;
      }
      
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
        branch_id: branchId, // Include branch_id for branch-admin
        bill_by: 0,
        hall_id: orderType === 'Dine In' ? parseInt(selectedHall) : 0,
        table_id: orderType === 'Dine In' ? parseInt(selectedTable) : 0,
        comments: comments,
        terminal: terminal,
        items: items,
      };

      logger.info('Creating Order', { 
        orderType, 
        hall_id: selectedHall, 
        table_id: selectedTable,
        itemsCount: items.length,
        branch_id: branchId,
        terminal 
      });
      
      // Use kitchen routing API for automatic kitchen assignment
      const result = await apiPost('api/create_order_with_kitchen.php', orderData);

      console.log('🔍 Create Order API Response:', JSON.stringify(result, null, 2));
      console.log('🔍 result.success:', result.success);
      console.log('🔍 result.data:', result.data);
      console.log('🔍 result.status:', result.status);

      // Check 1: Verify HTTP response was successful
      if (!result.success && result.status !== 200) {
        logger.error('HTTP Error creating order', { 
          status: result.status, 
          data: result.data,
          orderData 
        });
        setAlert({ 
          type: 'error', 
          message: result.data?.message || result.data?.error || `HTTP Error ${result.status}: Failed to create order. Please check your connection.` 
        });
        setPlacing(false);
        return;
      }

      // Check 2: Verify response data exists
      if (!result.data) {
        logger.error('Empty response from create_order_with_kitchen.php', { orderData, result });
        setAlert({ 
          type: 'error', 
          message: 'Server returned an empty response. Please check your connection and try again.' 
        });
        setPlacing(false);
        return;
      }

      // Check 3: Verify API-level success flag
      if (result.data.success === false) {
        logger.error('API Error creating order', { 
          error: result.data.message || result.data.error, 
          orderData,
          fullResponse: result.data
        });
        setAlert({ 
          type: 'error', 
          message: result.data.message || result.data.error || 'Failed to create order. Please try again.' 
        });
        setPlacing(false);
        return;
      }

      // Check 4: Handle nested response structure: result.data.success and result.data.data
      let responseData = null;
      let orderId = null;

      if (result.data.success === true && result.data.data) {
        // Nested structure: { success: true, data: { order_id: ..., items: [...] } }
        responseData = result.data.data;
        orderId = responseData.order_id || (responseData.order ? responseData.order.order_id : null);
        console.log('✅ Found order in nested structure, order_id:', orderId);
      } else if (result.data.order_id || result.data.id) {
        // Direct structure: { order_id: ..., items: [...] }
        responseData = result.data;
        orderId = responseData.order_id || responseData.id;
        console.log('✅ Found order in direct structure, order_id:', orderId);
      } else if (result.data.order && (result.data.order.order_id || result.data.order.id)) {
        // Wrapped structure: { order: { order_id: ... }, items: [...] }
        responseData = result.data;
        orderId = result.data.order.order_id || result.data.order.id;
        console.log('✅ Found order in wrapped structure, order_id:', orderId);
      }

      // Check 5: CRITICAL - Verify order_id exists (order was actually created in database)
      if (!orderId) {
        logger.error('Order creation failed - No order_id in response', { 
          result: result,
          resultData: result.data,
          orderData 
        });
        setAlert({ 
          type: 'error', 
          message: 'Order creation failed: No order ID returned from server. The order may not have been saved to the database. Please check server logs and try again.' 
        });
        setPlacing(false);
        return;
      }

      // Check 6: Verify items were saved
      const itemsCount = responseData?.items?.length || result.data?.items?.length || 0;
      if (itemsCount === 0 && cart.length > 0) {
        logger.warning('Order created but no items returned', { 
          orderId, 
          cartLength: cart.length,
          responseData 
        });
        // Don't fail, but log warning
      }

      // ✅ All checks passed - Order was successfully created
      logger.success('Order created successfully', { 
        order_id: orderId,
        itemsCount: itemsCount,
        responseData 
      });

      // Use responseData if we extracted it, otherwise use result.data
      const finalResponseData = responseData || result.data;
          
      // Format items for receipt display
      const formattedItems = (finalResponseData.items || []).map(item => ({
        dish_id: item.dish_id || item.id,
        dish_name: item.dish_name || item.name || item.title || 'Item',
        name: item.dish_name || item.name || item.title || 'Item',
        price: parseFloat(item.price || item.rate || item.unit_price || 0),
        quantity: parseInt(item.quantity || item.qty || item.qnty || 1),
        qty: parseInt(item.quantity || item.qty || item.qnty || 1),
        total_amount: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || 0) * parseInt(item.quantity || 1))),
        total: parseFloat(item.total_amount || item.total || item.total_price || (parseFloat(item.price || 0) * parseInt(item.quantity || 1))),
      }));
      
      // Format order data for receipt
      const orderDataFromResponse = finalResponseData.order || finalResponseData;
      const formattedOrder = {
        ...orderDataFromResponse,
        order_id: orderId, // Use validated order_id
        id: orderId,
        orderid: orderDataFromResponse.orderid || `ORD-${orderId}`,
        order_number: orderDataFromResponse.order_number || `ORD-${orderId}`,
        order_type: orderDataFromResponse.order_type || orderType,
        table_number: orderDataFromResponse.table_number || (orderType === 'Dine In' && selectedTable ? tables.find(t => t.table_id == selectedTable)?.table_number : ''),
        g_total_amount: parseFloat(orderDataFromResponse.g_total_amount || orderDataFromResponse.total || subtotal || 0),
        total: parseFloat(orderDataFromResponse.total || orderDataFromResponse.g_total_amount || subtotal || 0),
        subtotal: parseFloat(orderDataFromResponse.subtotal || orderDataFromResponse.g_total_amount || orderDataFromResponse.total || subtotal || 0),
        service_charge: parseFloat(orderDataFromResponse.service_charge || 0),
        discount_amount: parseFloat(orderDataFromResponse.discount_amount || orderDataFromResponse.discount || 0),
        net_total_amount: parseFloat(orderDataFromResponse.net_total_amount || orderDataFromResponse.netTotal || orderDataFromResponse.grand_total || subtotal || 0),
        netTotal: parseFloat(orderDataFromResponse.netTotal || orderDataFromResponse.net_total_amount || orderDataFromResponse.grand_total || subtotal || 0),
        grand_total: parseFloat(orderDataFromResponse.grand_total || orderDataFromResponse.net_total_amount || orderDataFromResponse.netTotal || subtotal || 0),
        payment_method: orderDataFromResponse.payment_method || orderDataFromResponse.payment_mode || 'Cash',
        payment_status: orderDataFromResponse.payment_status || 'Unpaid',
        created_at: orderDataFromResponse.created_at || orderDataFromResponse.date || new Date().toISOString(),
      };
      
      console.log('✅ Formatted order for receipt:', formattedOrder);
      console.log('✅ Order ID confirmed:', orderId);
      
      setOrderReceipt({
        order: formattedOrder,
        items: formattedItems,
        order_id: orderId, // Use validated order_id
      });
      setReceiptModalOpen(true);
      
      // Update table status to "Running" for Dine In orders
      if (orderType === 'Dine In' && selectedTable) {
        try {
          const terminal = getTerminal();
          const branchId = getBranchId();
          logger.info('Updating table status to Running', { table_id: selectedTable, hall_id: selectedHall });
          const tableUpdateResult = await apiPost('api/table_management.php', {
            table_id: parseInt(selectedTable),
            hall_id: parseInt(selectedHall),
            table_number: tables.find(t => t.table_id == selectedTable)?.table_number || '',
            capacity: tables.find(t => t.table_id == selectedTable)?.capacity || 0,
            status: 'running', // Use lowercase to match API
            terminal: terminal,
            branch_id: branchId, // Include branch_id for branch-admin
          });
          console.log('✅ Table status updated:', tableUpdateResult);
        } catch (error) {
          logger.error('Error updating table status', { error: error.message, table_id: selectedTable });
          // Don't show error to user, table status update is secondary
        }
      }
      
      // Reset form
      setCart([]);
      setOrderType('Dine In');
      setSelectedHall('');
      setSelectedTable('');
      setComments('');
      setAlert({ 
        type: 'success', 
        message: result.data?.message || `Order #${orderId} placed successfully!` 
      });
      setPlacing(false);
    } catch (error) {
      // Handle any unexpected errors
      console.error('❌ Unexpected error creating order:', error);
      logger.error('Unexpected error creating order', { 
        error: error.message, 
        stack: error.stack,
        orderData 
      });
      setAlert({ 
        type: 'error', 
        message: `Failed to create order: ${error.message || 'Unknown error occurred. Please try again.'}` 
      });
      setPlacing(false);
    }
  };

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
      let items = orderReceipt.items || [];
      
      if (items.length === 0) {
        setAlert({ type: 'error', message: 'No items found to print KOT' });
        return;
      }

      const currentCategories = Array.isArray(categories) ? categories : [];
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
      
      const kitchenIds = [...new Set(
        items
          .map((item) => {
            if (item.kitchen_id) return item.kitchen_id;
            if (item.kitchen) return item.kitchen;
            const categoryId = item.category_id || item.cat_id;
            if (categoryId) {
              const kitchenId = categoryToKitchenMap[categoryId];
              if (kitchenId) return kitchenId;
            }
            if (item.category?.kitchen_id) return item.category.kitchen_id;
            if (item.category?.kitchen) return item.category.kitchen;
            return null;
          })
          .filter(Boolean)
      )];

      if (kitchenIds.length === 0) {
        setAlert({ 
          type: 'error', 
          message: 'No kitchen information found in items. Please ensure items have category/kitchen assigned.' 
        });
        return;
      }

      const branchId = getBranchId() || getTerminal();
      const terminal = getTerminal();
      const printPromises = kitchenIds.map(async (kitchenId) => {
        try {
          const result = await apiPost('api/print_kitchen_receipt.php', {
            order_id: orderId,
            kitchen_id: kitchenId,
            branch_id: branchId,
            terminal: terminal
          });

          if (!result || result.success === false) {
            const errorMsg = result?.data?.message || result?.message || 'Network error';
            return { kitchenId, success: false, message: errorMsg };
          }

          if (result.data) {
            const responseData = result.data;
            if (responseData.success === true || responseData.kitchen_name) {
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
            if (responseData.error || responseData.message) {
              return { 
                kitchenId, 
                success: false, 
                message: responseData.message || responseData.error || 'Failed to print' 
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
          
          return { 
            kitchenId, 
            success: false, 
            message: result?.data?.message || result?.message || 'Unexpected response from server' 
          };
        } catch (error) {
          const errorMessage = error?.message || error?.toString() || 'Unexpected error occurred';
          return { kitchenId, success: false, message: errorMessage };
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
        setAlert({ 
          type: 'error', 
          message: `KOT printing failed for all kitchens. ${errorMessages}` 
        });
      }
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Network error';
      setAlert({ 
        type: 'error', 
        message: `Error printing KOT: ${errorMessage}` 
      });
    }
  }, [orderReceipt, categories]);

  /**
   * Auto-print KOT when order is placed and receipt modal opens
   */
  useEffect(() => {
    if (receiptModalOpen && orderReceipt && orderReceipt.order_id) {
      const timer = setTimeout(() => {
        handlePrintReceipt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [receiptModalOpen, orderReceipt, handlePrintReceipt]);

  const { subtotal } = calculateTotals();
  
  // Filter dishes by selected category - only show items when category is selected
  const filteredDishes = selectedCategory 
    ? dishes.filter(dish => String(dish.category_id) === String(selectedCategory) && dish.is_available == 1)
    : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Order</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Select hall, table, and dishes to create a new order</p>
        </div>

        {/* Alert Message */}
        {alert.message && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert({ type: '', message: '' })}
          />
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
                  {tables.map((table) => (
                    <option key={table.table_id} value={table.table_id}>
                      {table.table_number} - Capacity: {table.capacity} ({table.status})
                    </option>
                  ))}
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
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Select Category</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Choose a category to view menu items</p>
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
                    <div className="col-span-full p-6 sm:p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <p className="text-xs sm:text-sm text-gray-500">No categories available</p>
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
                                <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-1 group-hover:text-[#FF5F15] transition-colors">{dish.name}</h3>
                                {dish.description && (
                                  <p className="text-xs text-gray-600 line-clamp-2 mt-1">{dish.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                              <div>
                                <p className="text-xl sm:text-2xl font-bold text-[#FF5F15]">{formatPKR(dish.price)}</p>
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
                      <span className="text-base sm:text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-xl sm:text-2xl font-bold text-[#FF5F15]">{formatPKR(subtotal)}</span>
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

              {/* Thermal Receipt - Print View */}
              <div id="receipt-print-area">
                <ThermalReceipt 
                  order={orderReceipt.order || orderReceipt}
                  items={orderReceipt.items || []}
                  branchName={typeof window !== 'undefined' ? localStorage.getItem('branch_name') || '' : ''}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
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
                  variant="outline"
                  onClick={handlePrintReceipt}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Re-Print KOT
                </Button>
                <Button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    const printContent = document.getElementById('receipt-print-area').innerHTML;
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
                                padding: 0;
                              }
                              html, body {
                                margin: 0 !important;
                                padding: 5px !important;
                                width: 80mm;
                                max-width: 80mm;
                                overflow: hidden;
                              }
                              * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                              }
                              .no-print {
                                display: none !important;
                              }
                              button, .no-print {
                                display: none !important;
                              }
                              * {
                                page-break-inside: avoid;
                                break-inside: avoid;
                              }
                              body {
                                height: auto !important;
                                min-height: auto !important;
                                max-height: none !important;
                              }
                            }
                            html, body {
                              font-family: 'Courier New', monospace;
                              margin: 0;
                              padding: 5px;
                              font-size: 11px;
                              line-height: 1.3;
                              width: 80mm;
                              max-width: 80mm;
                            }
                            * {
                              box-sizing: border-box;
                              margin: 0;
                              padding: 0;
                            }
                          </style>
                        </head>
                        <body>${printContent}</body>
                      </html>
                    `);
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 250);
                  }}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
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
    </AdminLayout>
  );
}
