'use client';

/**
 * Kitchen Management Page - Combined
 * View and manage orders for all kitchens + Kitchen CRUD operations
 * Only shows orders with "Running" status (excludes orders with bills generated)
 * Uses APIs: get_kitchen_orders.php, update_kitchen_item_status.php, get_kitchen_receipt.php, kitchen_management.php
 */

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import { apiPost, apiDelete, getTerminal, getBranchId } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { Clock, Printer, CheckCircle, ChefHat, Utensils, Plus, Edit, Trash2, RefreshCw } from 'lucide-react';

export default function KitchenManagementPage() {
  const [kitchens, setKitchens] = useState([]);
  const [selectedKitchen, setSelectedKitchen] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Kitchen Management Modal States
  const [kitchenModalOpen, setKitchenModalOpen] = useState(false);
  const [editingKitchen, setEditingKitchen] = useState(null);
  const [kitchenFormData, setKitchenFormData] = useState({ 
    title: '', 
    code: '', 
    printer: '' 
  });
  const [showKitchenManagement, setShowKitchenManagement] = useState(false);

  useEffect(() => {
    fetchKitchens();
  }, []);

  useEffect(() => {
    if (selectedKitchen) {
      fetchKitchenOrders();
      if (autoRefresh) {
        const interval = setInterval(fetchKitchenOrders, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
      }
    }
  }, [selectedKitchen, autoRefresh]);

  /**
   * Fetch kitchens from API
   */
  const fetchKitchens = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      console.log('=== Fetching Kitchens ===');
      console.log('Params:', { terminal, branch_id: branchId || 1, action: 'get' });
      
      let result;
      
      // Try kitchen_management.php first
      try {
        result = await apiPost('/kitchen_management.php', { 
          terminal, 
          branch_id: branchId || 1,
          action: 'get' 
        });
        console.log('kitchen_management.php response:', result);
      } catch (error) {
        console.error('Error calling kitchen_management.php:', error);
        result = null;
      }
      
      // If first API call didn't work, try alternative endpoint
      if (!result || !result.success || !result.data) {
        console.log('Trying alternative endpoint: get_kitchens.php');
        try {
          result = await apiPost('/get_kitchens.php', { 
            terminal, 
            branch_id: branchId || 1 
          });
          console.log('get_kitchens.php response:', result);
        } catch (error) {
          console.error('Error calling get_kitchens.php:', error);
        }
      }
      
      if (!result) {
        console.error('Both API calls failed');
        setKitchens([]);
        setLoading(false);
        setAlert({ type: 'error', message: 'Failed to fetch kitchens. Please check your connection.' });
        return;
      }
      
      // Log the raw response structure for debugging
      console.log('Raw result:', JSON.stringify(result, null, 2));
      console.log('result.data type:', typeof result.data);
      console.log('result.data is array:', Array.isArray(result.data));
      if (result.data && typeof result.data === 'object') {
        console.log('result.data keys:', Object.keys(result.data));
      }
      
      let kitchensData = [];
      
      // Handle multiple possible response structures
      if (Array.isArray(result.data)) {
        kitchensData = result.data;
      } else if (result.data && Array.isArray(result.data.data)) {
        kitchensData = result.data.data;
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        kitchensData = result.data.data;
      } else if (result.data && Array.isArray(result.data.kitchens)) {
        kitchensData = result.data.kitchens;
      } else if (result.data && result.data.kitchens && Array.isArray(result.data.kitchens)) {
        kitchensData = result.data.kitchens;
      } else if (result.success && Array.isArray(result)) {
        kitchensData = result;
      } else if (result && Array.isArray(result)) {
        kitchensData = result;
      } else if (result.data && typeof result.data === 'object') {
        // Try to extract array from object values
        const values = Object.values(result.data);
        if (values.length > 0 && Array.isArray(values[0])) {
          kitchensData = values[0];
          console.log('Found kitchens in object values (first)');
        } else if (values.some(v => Array.isArray(v))) {
          kitchensData = values.find(v => Array.isArray(v));
          console.log('Found kitchens in object values (search)');
        } else {
          // Try each key to find arrays
          for (const key in result.data) {
            if (Array.isArray(result.data[key])) {
              kitchensData = result.data[key];
              console.log(`Found kitchens in result.data.${key}`);
              break;
            }
          }
        }
      } else if (Array.isArray(result)) {
        // Result itself might be an array
        kitchensData = result;
        console.log('Found kitchens in result (direct array)');
      }
      
      console.log('Extracted kitchens data:', kitchensData);
      console.log(`Total kitchens found: ${kitchensData.length}`);
      
      if (kitchensData.length === 0 && result) {
        // If still no data, log all possible paths
        console.warn('⚠️ Could not extract kitchens from response');
        console.warn('Attempting to find any array in response...');
        const searchForArray = (obj, path = '') => {
          if (Array.isArray(obj)) {
            console.log(`Found array at path: ${path}`);
            return obj;
          }
          if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
              const result = searchForArray(obj[key], path ? `${path}.${key}` : key);
              if (result) return result;
            }
          }
          return null;
        };
        const foundArray = searchForArray(result);
        if (foundArray && foundArray.length > 0) {
          kitchensData = foundArray;
          console.log('Found array using deep search:', foundArray);
        }
      }
      
      if (Array.isArray(kitchensData) && kitchensData.length > 0) {
        // Ensure each kitchen has required fields
        const validKitchens = kitchensData.map(kitchen => ({
          kitchen_id: kitchen.kitchen_id || kitchen.id || kitchen.KitchenID,
          title: kitchen.title || kitchen.name || kitchen.kitchen_name || kitchen.Title,
          code: kitchen.code || kitchen.kitchen_code || kitchen.Code,
          printer: kitchen.printer || kitchen.printer_name || kitchen.Printer || '',
          branch_id: kitchen.branch_id || kitchen.branch_ID || branchId || 1
        })).filter(k => k.kitchen_id); // Filter out any invalid entries
        
        console.log('Valid kitchens:', validKitchens);
        setKitchens(validKitchens);
        
        if (validKitchens.length > 0 && !selectedKitchen) {
          setSelectedKitchen(validKitchens[0].kitchen_id);
        }
      } else {
        console.warn('⚠️ No kitchens found in API response');
        console.warn('Full response structure:', JSON.stringify(result, null, 2));
        setKitchens([]);
        setAlert({ type: 'warning', message: 'No kitchens found. Please check if kitchens exist for this branch.' });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching kitchens:', error);
      setAlert({ type: 'error', message: 'Failed to load kitchens: ' + (error.message || 'Network error') });
      setKitchens([]);
      setLoading(false);
    }
  };

  /**
   * Fetch orders for selected kitchen
   * Only shows orders with "Running" status (excludes orders with bills generated)
   * API: get_kitchen_orders.php
   */
  const fetchKitchenOrders = async () => {
    if (!selectedKitchen) return;
    
    setLoadingOrders(true);
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      console.log('Fetching kitchen orders:', { kitchen_id: selectedKitchen, branch_id: branchId, terminal });
      
      const result = await apiPost('/get_kitchen_orders.php', { 
        kitchen_id: selectedKitchen,
        branch_id: branchId || 1,
        terminal: terminal
      });
      
      console.log('Kitchen orders API response:', result);
      
      if (result.success && result.data) {
        let ordersData = [];
        
        // Handle different response structures
        if (Array.isArray(result.data)) {
          ordersData = result.data;
        } else if (result.data.orders && Array.isArray(result.data.orders)) {
          ordersData = result.data.orders;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          ordersData = result.data.data;
        }
        
        // Filter to only show "Running" status orders
        // Show all orders that are not completed/cancelled and don't have bills generated
        const runningOrders = ordersData.filter(order => {
          const orderStatus = (order.order_status || order.status || '').toLowerCase();
          const kitchenStatus = (order.kitchen_status || '').toLowerCase();
          
          // Exclude completed, cancelled, served, and paid orders
          const excludedStatuses = ['completed', 'cancelled', 'served', 'paid', 'complete'];
          if (excludedStatuses.includes(orderStatus) || excludedStatuses.includes(kitchenStatus)) {
            return false;
          }
          
          // Show running, pending, preparing, ready orders
          // Basically show any order that hasn't been completed or cancelled
          return true;
        });
        
        console.log(`Filtered ${runningOrders.length} running orders from ${ordersData.length} total orders`);
        setOrders(runningOrders);
      } else {
        console.warn('No orders data in response:', result);
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
      setAlert({ type: 'error', message: 'Failed to load kitchen orders: ' + (error.message || 'Network error') });
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  /**
   * Check if order has bill generated
   */
  const checkBillGenerated = async (orderId) => {
    try {
      const result = await apiPost('/bills_management.php', { order_id: orderId });
      return result.success && result.data && (
        result.data.bill_id || 
        result.data.bill || 
        (result.data.data && result.data.data.bill_id)
      );
    } catch (error) {
      return false;
    }
  };

  /**
   * Handle Kitchen Form Submission (Create or Update)
   */
  const handleKitchenSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    if (!kitchenFormData.title || !kitchenFormData.code) {
      setAlert({ type: 'error', message: 'Title and Code are required' });
      return;
    }

    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID is required. Please ensure you are logged into a branch.' });
        return;
      }
      
      const data = {
        kitchen_id: editingKitchen ? editingKitchen.kitchen_id : '',
        title: kitchenFormData.title.trim(),
        code: kitchenFormData.code.trim().toUpperCase(),
        printer: kitchenFormData.printer ? kitchenFormData.printer.trim() : '',
        terminal: terminal,
        branch_id: branchId,
        action: editingKitchen ? 'update' : 'create'
      };

      console.log('Saving kitchen with data:', data);
      const result = await apiPost('/kitchen_management.php', data);

      console.log('Kitchen save result:', result);

      if (result.success && result.data) {
        // Handle different response structures
        const isSuccess = result.data.success === true || 
                         result.data.success === 'true' || 
                         (result.data.message && result.data.message.toLowerCase().includes('success')) ||
                         (result.data.status && result.data.status === 'success');
        
        if (isSuccess) {
          setAlert({ type: 'success', message: result.data.message || 'Kitchen saved successfully!' });
          setKitchenFormData({ title: '', code: '', printer: '' });
          setEditingKitchen(null);
          setKitchenModalOpen(false);
          fetchKitchens();
        } else {
          setAlert({ type: 'error', message: result.data.message || result.data.error || 'Failed to save kitchen' });
        }
      } else {
        setAlert({ type: 'error', message: result.data?.message || result.data?.error || 'Failed to save kitchen. Please check your connection.' });
      }
    } catch (error) {
      console.error('Error saving kitchen:', error);
      setAlert({ type: 'error', message: 'Failed to save kitchen: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Handle Kitchen Edit
   */
  const handleKitchenEdit = (kitchen) => {
    setEditingKitchen(kitchen);
    setKitchenFormData({
      title: kitchen.title || '',
      code: kitchen.code || '',
      printer: kitchen.printer || '',
    });
    setKitchenModalOpen(true);
  };

  /**
   * Handle Kitchen Delete
   */
  const handleKitchenDelete = async (kitchenId) => {
    if (!confirm('Are you sure you want to delete this kitchen? This will affect all categories assigned to it.')) return;

    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      const result = await apiDelete('/kitchen_management.php', { 
        kitchen_id: kitchenId,
        terminal,
        branch_id: branchId
      });

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'Kitchen deleted successfully!' });
        fetchKitchens();
        // If deleted kitchen was selected, select first available
        if (selectedKitchen == kitchenId && kitchens.length > 1) {
          const remainingKitchens = kitchens.filter(k => k.kitchen_id != kitchenId);
          if (remainingKitchens.length > 0) {
            setSelectedKitchen(remainingKitchens[0].kitchen_id);
          }
        }
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to delete kitchen' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to delete kitchen' });
    }
  };

  /**
   * Update item status
   * API: update_kitchen_item_status.php
   */
  const updateItemStatus = async (itemId, newStatus) => {
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      console.log('=== Updating Item Status ===');
      console.log('Item ID:', itemId);
      console.log('New Status:', newStatus);
      
      // Try multiple parameter formats for maximum compatibility
      const result = await apiPost('/update_kitchen_item_status.php', {
        id: itemId,
        item_id: itemId,
        order_item_id: itemId,
        status: newStatus,
        kitchen_status: newStatus,
        terminal: terminal,
        branch_id: branchId || 1
      });
      
      console.log('Update status result:', result);
      
      // Check if update was successful
      const isSuccess = result.success && (
        result.data?.success === true ||
        result.data?.success === 'true' ||
        (result.data?.message && result.data.message.toLowerCase().includes('success')) ||
        (result.data?.status && result.data.status === 'success')
      );
      
      if (isSuccess) {
        setAlert({ type: 'success', message: result.data?.message || `Item marked as ${newStatus} successfully!` });
        // Refresh orders immediately
        setTimeout(() => {
          fetchKitchenOrders();
        }, 500);
      } else {
        const errorMsg = result.data?.message || result.data?.error || 'Failed to update status';
        console.error('Status update failed:', errorMsg);
        setAlert({ type: 'error', message: errorMsg });
      }
    } catch (error) {
      console.error('Error updating item status:', error);
      setAlert({ type: 'error', message: 'Failed to update status: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Print kitchen receipt
   */
  const handlePrintReceipt = async (orderId) => {
    try {
      const branchId = getBranchId();
      const result = await apiPost('/get_kitchen_receipt.php', {
        order_id: orderId,
        kitchen_id: selectedKitchen,
        branch_id: branchId || 1
      });
      
      if (result.success && result.data) {
        setReceiptData(result.data);
        setReceiptModalOpen(true);
        
        setTimeout(() => {
          window.print();
        }, 500);
      } else {
        setAlert({ type: 'error', message: 'Failed to load receipt data' });
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      setAlert({ type: 'error', message: 'Failed to load receipt' });
    }
  };

  /**
   * Format time (minutes to readable format)
   */
  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Preparing': 'bg-blue-100 text-blue-800 border-blue-300',
      'Ready': 'bg-green-100 text-green-800 border-green-300',
      'Completed': 'bg-gray-100 text-gray-800 border-gray-300',
      'Cancelled': 'bg-red-100 text-red-800 border-red-300',
      'Running': 'bg-blue-100 text-blue-800 border-blue-300',
      'Served': 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[status] || colors['Pending'];
  };

  /**
   * Get next status action
   */
  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'Pending': 'Preparing',
      'Preparing': 'Ready',
      'Ready': 'Completed',
    };
    return statusFlow[currentStatus] || null;
  };

  const selectedKitchenData = kitchens.find(k => k.kitchen_id == selectedKitchen);

  // Kitchen Management Table Columns
  const kitchenColumns = [
    {
      header: 'ID',
      accessor: 'kitchen_id',
    },
    {
      header: 'Title',
      accessor: 'title',
    },
    {
      header: 'Code',
      accessor: 'code',
    },
    {
      header: 'Printer',
      accessor: 'printer',
    },
  ];

  // Kitchen Management Table Actions
  const kitchenActions = (row) => (
    <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleKitchenEdit(row)}
        className="text-xs sm:text-sm"
      >
        <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
        Edit
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={() => handleKitchenDelete(row.kitchen_id)}
        className="text-xs sm:text-sm"
      >
        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
        Delete
      </Button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ChefHat className="w-5 h-5 sm:w-7 sm:h-7 text-[#FF5F15]" />
              Kitchen Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">View running orders and manage kitchens</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKitchenManagement(!showKitchenManagement)}
            >
              {showKitchenManagement ? 'Hide' : 'Manage'} Kitchens
            </Button>
            {showKitchenManagement && (
              <Button
                onClick={() => {
                  setEditingKitchen(null);
                  setKitchenFormData({ title: '', code: '', printer: '' });
                  setKitchenModalOpen(true);
                }}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Kitchen
              </Button>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-[#FF5F15] rounded focus:ring-[#FF5F15]"
              />
              <span>Auto Refresh (5s)</span>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchKitchenOrders}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Alert Message */}
        {alert.message && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert({ type: '', message: '' })}
          />
        )}

        {/* Kitchen Management Section */}
        {showKitchenManagement && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Manage Kitchens</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#FF5F15] border-t-transparent mb-3"></div>
                <p className="text-gray-500">Loading kitchens...</p>
              </div>
            ) : (
              <Table
                columns={kitchenColumns}
                data={kitchens}
                actions={kitchenActions}
                emptyMessage="No kitchens found. Click 'Add Kitchen' to create one."
              />
            )}
          </div>
        )}

        {/* Kitchen Selection */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Select Kitchen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {kitchens.map((kitchen) => {
              const isSelected = selectedKitchen == kitchen.kitchen_id;
              return (
                <button
                  key={kitchen.kitchen_id}
                  onClick={() => setSelectedKitchen(kitchen.kitchen_id)}
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
                      <div className="flex items-center gap-2">
                        <ChefHat className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#FF5F15]'}`} />
                        <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {kitchen.title || `Kitchen ${kitchen.kitchen_id}`}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-[#FF5F15]" />
                        </div>
                      )}
                    </div>
                    <div className={`text-xs ${isSelected ? 'text-orange-100' : 'text-gray-500'}`}>
                      Code: {kitchen.code || `K${kitchen.kitchen_id}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Kitchen Orders - Only Running Status */}
        {selectedKitchen && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {selectedKitchenData?.title || `Kitchen ${selectedKitchen}`} - Running Orders
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {orders.length} running {orders.length === 1 ? 'order' : 'orders'} (Bill generated orders are hidden)
                </p>
              </div>
            </div>

            {loadingOrders ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#FF5F15] border-t-transparent mb-3"></div>
                <p className="text-gray-500">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Running Orders</h3>
                <p className="text-gray-600">All orders for this kitchen are completed, have bills generated, or there are no active orders.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {orders.map((order) => (
                  <div
                    key={order.order_id}
                    className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all bg-white"
                  >
                    {/* Order Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-200">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                          Order #{order.order_id}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                          {order.table_number && (
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              Table: {order.table_number}
                            </span>
                          )}
                          {order.hall_name && (
                            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
                              {order.hall_name}
                            </span>
                          )}
                          <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded">
                            {order.order_type}
                          </span>
                          <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-semibold">
                            Running
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>Running: {formatTime(order.minutes_running || 0)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintReceipt(order.order_id)}
                          className="text-xs"
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          Print
                        </Button>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-3 mb-4">
                      {order.items && order.items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{item.dish_name}</h4>
                              {item.category_name && (
                                <p className="text-xs text-gray-500 mt-0.5">{item.category_name}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Qty: {item.quantity}
                                </span>
                                <span className="text-sm font-bold text-[#FF5F15]">
                                  {formatPKR(item.price * item.quantity)}
                                </span>
                              </div>
                              {item.notes && (
                                <p className="text-xs text-gray-600 mt-2 italic">
                                  Note: {item.notes}
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          
                          {/* Status Actions */}
                          <div className="flex gap-2 mt-3">
                            {getNextStatus(item.status) && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => updateItemStatus(item.id, getNextStatus(item.status))}
                                className="text-xs flex-1"
                              >
                                Mark as {getNextStatus(item.status)}
                              </Button>
                            )}
                            {item.status === 'Ready' && (
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => updateItemStatus(item.id, 'Completed')}
                                className="text-xs"
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Progress */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Progress:</span>
                        <span className="font-semibold text-gray-900">
                          {order.items_completed || 0} / {order.items_total || 0} items completed
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-[#FF5F15] h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${order.items_total > 0 ? ((order.items_completed || 0) / order.items_total) * 100 : 0}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {order.order_comments && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        <strong>Order Note:</strong> {order.order_comments}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Kitchen Management Modal */}
        <Modal
          isOpen={kitchenModalOpen}
          onClose={() => {
            setKitchenModalOpen(false);
            setEditingKitchen(null);
            setKitchenFormData({ title: '', code: '', printer: '' });
          }}
          title={editingKitchen ? 'Edit Kitchen' : 'Add New Kitchen'}
          size="md"
        >
          <form onSubmit={handleKitchenSubmit}>
            <Input
              label="Kitchen Title"
              name="title"
              value={kitchenFormData.title}
              onChange={(e) => setKitchenFormData({ ...kitchenFormData, title: e.target.value })}
              placeholder="e.g., Main Kitchen, BBQ Kitchen"
              required
            />

            <Input
              label="Kitchen Code"
              name="code"
              value={kitchenFormData.code}
              onChange={(e) => setKitchenFormData({ ...kitchenFormData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., K1, K2, BBQ"
              required
            />

            <Input
              label="Printer Name (Optional)"
              name="printer"
              value={kitchenFormData.printer}
              onChange={(e) => setKitchenFormData({ ...kitchenFormData, printer: e.target.value })}
              placeholder="e.g., Kitchen Printer 1"
            />

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setKitchenModalOpen(false);
                  setEditingKitchen(null);
                  setKitchenFormData({ title: '', code: '', printer: '' });
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                {editingKitchen ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Receipt Modal */}
        <Modal
          isOpen={receiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false);
            setReceiptData(null);
          }}
          title="Kitchen Receipt"
          size="lg"
          showCloseButton={true}
        >
          {receiptData && (
            <div className="space-y-4" id="kitchen-receipt-content">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Kitchen Receipt</h2>
                <p className="text-sm text-gray-600">{receiptData.kitchen.kitchen_name}</p>
                <p className="text-xs text-gray-500 mt-1">Order #{receiptData.order.order_number}</p>
                <p className="text-xs text-gray-500">
                  {receiptData.order.order_type} | Table: {receiptData.order.table_number}
                </p>
                <p className="text-xs text-gray-500 mt-1">{receiptData.order.created_at}</p>
              </div>

              <div className="space-y-2">
                {receiptData.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm py-2 border-b">
                    <div>
                      <p className="font-medium text-gray-900">{item.dish_name}</p>
                      <p className="text-xs text-gray-500">
                        {item.category_name} | Qty: {item.quantity} × {formatPKR(item.price)}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-yellow-700 italic mt-1">Note: {item.notes}</p>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900">{formatPKR(item.total)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-[#FF5F15]">{formatPKR(receiptData.total)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setReceiptModalOpen(false);
                    setReceiptData(null);
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="flex-1"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #kitchen-receipt-content,
            #kitchen-receipt-content * {
              visibility: visible;
            }
            #kitchen-receipt-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}
