'use client';

/**
 * Create Order Page for Order Taker
 * Create new order: Select Hall → Select Table → Select Dishes → Place Order → Show Receipt
 * Uses real APIs: get_halls.php, get_tables.php, get_products.php, create_order.php
 */

import { useEffect, useState } from 'react';
import OrderTakerLayout from '@/components/order-taker/OrderTakerLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import { apiPost, getTerminal, getToken } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { ShoppingCart, Plus, Minus, X, Receipt, Check } from 'lucide-react';

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
   * Fetch halls from API
   */
  const fetchHalls = async () => {
    try {
      const terminal = getTerminal();
      const result = await apiPost('/get_halls.php', { terminal });
      if (result.data && Array.isArray(result.data)) {
        setHalls(result.data);
      }
    } catch (error) {
      console.error('Error fetching halls:', error);
    }
  };

  /**
   * Fetch tables from API (filtered by hall)
   */
  const fetchTables = async () => {
    try {
      const terminal = getTerminal();
      const result = await apiPost('/get_tables.php', { terminal });
      if (result.data && Array.isArray(result.data)) {
        // Filter tables by selected hall
        const filtered = result.data.filter(table => table.hall_id == selectedHall);
        setTables(filtered);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  /**
   * Fetch categories from API
   */
  const fetchCategories = async () => {
    try {
      const terminal = getTerminal();
      const result = await apiPost('/get_categories.php', { terminal });
      if (result.data && Array.isArray(result.data)) {
        setCategories(result.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setLoading(false);
    }
  };

  /**
   * Fetch dishes from API
   */
  const fetchDishes = async () => {
    try {
      const terminal = getTerminal();
      const result = await apiPost('/get_products.php', { terminal });
      if (result.data && Array.isArray(result.data)) {
        setDishes(result.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dishes:', error);
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
        items: items,
      };

      // Use kitchen routing API for automatic kitchen assignment
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
          setOrderReceipt({
            order: responseData.order || responseData,
            items: responseData.items || [],
            order_id: responseData.order_id || (responseData.order ? responseData.order.order_id : null),
          });
          setReceiptModalOpen(true);
          
          // Update table status to "Running" for Dine In orders
          if (orderType === 'Dine In' && selectedTable) {
            try {
              await apiPost('/table_management.php', {
                table_id: parseInt(selectedTable),
                hall_id: parseInt(selectedHall),
                table_number: tables.find(t => t.table_id == selectedTable)?.table_number || '',
                capacity: tables.find(t => t.table_id == selectedTable)?.capacity || 0,
                status: 'Running',
                terminal: getTerminal(),
              });
            } catch (error) {
              console.error('Error updating table status:', error);
            }
          }
          
          // Reset form
          setCart([]);
          setOrderType('Dine In');
          setSelectedHall('');
          setSelectedTable('');
          setComments('');
          setAlert({ type: 'success', message: result.data.message || 'Order placed successfully!' });
        } else if (result.data.success === false) {
          // API returned an error
          setAlert({ type: 'error', message: result.data.message || 'Failed to place order' });
        } else {
          // Direct data response (no nested structure)
          setOrderReceipt({
            order: result.data.order || result.data,
            items: result.data.items || [],
            order_id: result.data.order_id || (result.data.order ? result.data.order.order_id : null),
          });
          setReceiptModalOpen(true);
          
          // Update table status to "Running" for Dine In orders
          if (orderType === 'Dine In' && selectedTable) {
            try {
              await apiPost('/table_management.php', {
                table_id: parseInt(selectedTable),
                hall_id: parseInt(selectedHall),
                table_number: tables.find(t => t.table_id == selectedTable)?.table_number || '',
                capacity: tables.find(t => t.table_id == selectedTable)?.capacity || 0,
                status: 'Running',
                terminal: getTerminal(),
              });
            } catch (error) {
              console.error('Error updating table status:', error);
            }
          }
          
          // Reset form
          setCart([]);
          setOrderType('Dine In');
          setSelectedHall('');
          setSelectedTable('');
          setComments('');
          setAlert({ type: 'success', message: 'Order placed successfully!' });
        }
      } else {
        setAlert({ type: 'error', message: result.data?.message || result.data?.rawResponse || 'Failed to place order' });
      }
    } catch (error) {
      console.error('Error placing order:', error);
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
    <OrderTakerLayout>
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
              {/* Receipt Header */}
              <div className="text-center border-b pb-4">
                <h3 className="text-xl font-bold text-gray-900">Order Receipt</h3>
                <p className="text-sm text-gray-600 mt-1">Order #{orderReceipt.order_id || orderReceipt.orderid || 'N/A'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Type: {orderReceipt.order?.order_type || 'Dine In'} | 
                  Status: {orderReceipt.order?.order_status || 'Running'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {orderReceipt.order?.created_at || new Date().toLocaleString()}
                </p>
              </div>

              {/* Order Items */}
              <div className="space-y-2">
                {orderReceipt.items && orderReceipt.items.length > 0 && orderReceipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm py-2 border-b">
                    <div>
                      <p className="font-medium">{item.dish_name || item.title || 'Item'}</p>
                      <p className="text-xs text-gray-500">
                        {formatPKR(item.price || item.rate || 0)} x {item.quantity || item.qnty || 0}
                      </p>
                    </div>
                    <p className="font-semibold">{formatPKR(item.total_amount || item.total || 0)}</p>
                  </div>
                ))}
              </div>

              {/* Receipt Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatPKR(orderReceipt.order?.g_total_amount || orderReceipt.order?.total || 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-[#FF5F15]">
                    {formatPKR(orderReceipt.order?.net_total_amount || orderReceipt.order?.netTotal || orderReceipt.order?.total || 0)}
                  </span>
                </div>
              </div>

              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800 font-medium">Order placed successfully and sent to kitchen!</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
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
                  onClick={() => window.print()}
                  className="flex-1"
                >
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
    </OrderTakerLayout>
  );
}

