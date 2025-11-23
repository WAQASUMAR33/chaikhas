'use client';

/**
 * Kitchen Management Page - Admin Dashboard
 * View and manage orders for all kitchens
 * Shows kitchen-specific orders with real-time updates
 * Uses APIs: get_kitchen_orders.php, update_kitchen_item_status.php, get_kitchen_receipt.php
 */

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Modal from '@/components/ui/Modal';
import { apiPost, getTerminal } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { Clock, Printer, CheckCircle, Circle, ChefHat, Utensils } from 'lucide-react';

export default function KitchenManagementPage() {
  const [kitchens, setKitchens] = useState([]);
  const [selectedKitchen, setSelectedKitchen] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

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
    try {
      const terminal = getTerminal();
      let result = await apiPost('/get_kitchens.php', { terminal });
      
      if (!result.success || !result.data) {
        result = await apiPost('/kitchen_management.php', { terminal, action: 'get' });
      }
      
      if (result.data && Array.isArray(result.data)) {
        setKitchens(result.data);
        if (result.data.length > 0 && !selectedKitchen) {
          setSelectedKitchen(result.data[0].kitchen_id);
        }
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        setKitchens(result.data.data);
        if (result.data.data.length > 0 && !selectedKitchen) {
          setSelectedKitchen(result.data.data[0].kitchen_id);
        }
      } else {
        // Fallback: default kitchens
        const defaultKitchens = [
          { kitchen_id: 1, title: 'Kitchen 1 - BBQ', code: 'K1' },
          { kitchen_id: 2, title: 'Kitchen 2 - Fast Food', code: 'K2' }
        ];
        setKitchens(defaultKitchens);
        setSelectedKitchen(1);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching kitchens:', error);
      // Fallback: default kitchens
      const defaultKitchens = [
        { kitchen_id: 1, title: 'Kitchen 1 - BBQ', code: 'K1' },
        { kitchen_id: 2, title: 'Kitchen 2 - Fast Food', code: 'K2' }
      ];
      setKitchens(defaultKitchens);
      setSelectedKitchen(1);
      setLoading(false);
    }
  };

  /**
   * Fetch orders for selected kitchen
   * API: get_kitchen_orders.php
   */
  const fetchKitchenOrders = async () => {
    if (!selectedKitchen) return;
    
    try {
      const result = await apiPost('/get_kitchen_orders.php', { 
        kitchen_id: selectedKitchen,
        terminal: getTerminal()
      });
      
      if (result.success && result.data && Array.isArray(result.data)) {
        setOrders(result.data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
      setOrders([]);
    }
  };

  /**
   * Update item status
   * API: update_kitchen_item_status.php
   */
  const updateItemStatus = async (itemId, newStatus) => {
    try {
      const result = await apiPost('/update_kitchen_item_status.php', {
        id: itemId,
        status: newStatus
      });
      
      if (result.success) {
        setAlert({ type: 'success', message: 'Item status updated successfully!' });
        fetchKitchenOrders(); // Refresh
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to update status' });
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
      const result = await apiPost('/get_kitchen_receipt.php', {
        order_id: orderId,
        kitchen_id: selectedKitchen
      });
      
      if (result.success && result.data) {
        setReceiptData(result.data);
        setReceiptModalOpen(true);
        
        // Auto print after a short delay
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kitchen Management</h1>
            <p className="text-gray-600 mt-1">View and manage orders for each kitchen</p>
          </div>
          <div className="flex items-center gap-3">
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
              Refresh Now
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

        {/* Kitchen Selection */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Select Kitchen</h3>
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

        {/* Kitchen Orders */}
        {selectedKitchen && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedKitchenData?.title || `Kitchen ${selectedKitchen}`} - Running Orders
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'} in progress
                </p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#FF5F15] border-t-transparent mb-3"></div>
                <p className="text-gray-500">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Running Orders</h3>
                <p className="text-gray-600">All orders for this kitchen are completed or there are no active orders.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {orders.map((order) => (
                  <div
                    key={order.order_id}
                    className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all bg-white"
                  >
                    {/* Order Header */}
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
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
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>Running: {formatTime(order.minutes_running || 0)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.kitchen_status)}`}>
                          {order.kitchen_status}
                        </span>
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
              {/* Receipt Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Kitchen Receipt</h2>
                <p className="text-sm text-gray-600">{receiptData.kitchen.kitchen_name}</p>
                <p className="text-xs text-gray-500 mt-1">Order #{receiptData.order.order_number}</p>
                <p className="text-xs text-gray-500">
                  {receiptData.order.order_type} | Table: {receiptData.order.table_number}
                </p>
                <p className="text-xs text-gray-500 mt-1">{receiptData.order.created_at}</p>
              </div>

              {/* Items */}
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

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-[#FF5F15]">{formatPKR(receiptData.total)}</span>
                </div>
              </div>

              {/* Actions */}
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
