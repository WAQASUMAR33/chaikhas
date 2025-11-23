'use client';

/**
 * Kitchen Dashboard Page
 * Kitchen staff view - shows orders for their assigned kitchen
 * Real-time updates with auto-refresh
 * Uses APIs: get_kitchen_orders.php, update_kitchen_item_status.php, get_kitchen_receipt.php
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getRole, clearAuth } from '@/utils/api';
import { apiPost, getTerminal } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { Clock, Printer, CheckCircle, ChefHat, Utensils, LogOut, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Modal from '@/components/ui/Modal';

export default function KitchenDashboardPage() {
  const router = useRouter();
  const [kitchenId, setKitchenId] = useState(null);
  const [kitchenName, setKitchenName] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Verify user has kitchen role
    const token = getToken();
    const role = getRole();

    if (!token) {
      router.push('/login');
      return;
    }

    // Get kitchen ID from localStorage or default to 1
    const savedKitchenId = localStorage.getItem('kitchen_id');
    if (savedKitchenId) {
      setKitchenId(parseInt(savedKitchenId));
    } else {
      // Default to Kitchen 1, can be changed later
      setKitchenId(1);
      localStorage.setItem('kitchen_id', '1');
    }

    fetchKitchenInfo();
  }, [router]);

  useEffect(() => {
    if (kitchenId) {
      fetchKitchenOrders();
      if (autoRefresh) {
        const interval = setInterval(fetchKitchenOrders, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
      }
    }
  }, [kitchenId, autoRefresh]);

  /**
   * Fetch kitchen information
   */
  const fetchKitchenInfo = async () => {
    try {
      const terminal = getTerminal();
      const result = await apiPost('/get_kitchens.php', { terminal });
      
      if (result.data && Array.isArray(result.data)) {
        const kitchen = result.data.find(k => k.kitchen_id == kitchenId) || result.data[0];
        if (kitchen) {
          setKitchenName(kitchen.title || `Kitchen ${kitchen.kitchen_id}`);
          setKitchenId(kitchen.kitchen_id);
        }
      }
    } catch (error) {
      console.error('Error fetching kitchen info:', error);
      setKitchenName(`Kitchen ${kitchenId}`);
    }
  };

  /**
   * Fetch orders for this kitchen
   */
  const fetchKitchenOrders = async () => {
    if (!kitchenId) return;
    
    setLoading(true);
    try {
      const result = await apiPost('/get_kitchen_orders.php', { 
        kitchen_id: kitchenId,
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
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update item status
   */
  const updateItemStatus = async (itemId, newStatus) => {
    try {
      const result = await apiPost('/update_kitchen_item_status.php', {
        id: itemId,
        status: newStatus
      });
      
      if (result.success) {
        setAlert({ type: 'success', message: 'Item status updated successfully!' });
        fetchKitchenOrders();
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to update status' });
      }
    } catch (error) {
      console.error('Error updating item status:', error);
      setAlert({ type: 'error', message: 'Failed to update status' });
    }
  };

  /**
   * Print kitchen receipt
   */
  const handlePrintReceipt = async (orderId) => {
    try {
      const result = await apiPost('/get_kitchen_receipt.php', {
        order_id: orderId,
        kitchen_id: kitchenId
      });
      
      if (result.success && result.data) {
        setReceiptData(result.data);
        setReceiptModalOpen(true);
        setTimeout(() => window.print(), 500);
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      setAlert({ type: 'error', message: 'Failed to load receipt' });
    }
  };

  /**
   * Format time
   */
  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
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
    };
    return colors[status] || colors['Pending'];
  };

  /**
   * Get next status
   */
  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'Pending': 'Preparing',
      'Preparing': 'Ready',
      'Ready': 'Completed',
    };
    return statusFlow[currentStatus] || null;
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-[#FF5F15]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FF5F15] rounded-lg flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{kitchenName}</h1>
                <p className="text-sm text-gray-600">Kitchen Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-[#FF5F15] rounded focus:ring-[#FF5F15]"
                />
                <span>Auto Refresh</span>
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchKitchenOrders}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert Message */}
        {alert.message && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert({ type: '', message: '' })}
          />
        )}

        {/* Orders Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Running Orders</h2>
          <p className="text-sm text-gray-600">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} in progress
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#FF5F15] border-t-transparent mb-3"></div>
            <p className="text-gray-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-300">
            <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Running Orders</h3>
            <p className="text-gray-600">All orders are completed or there are no active orders.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {orders.map((order) => (
              <div
                key={order.order_id}
                className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all"
              >
                {/* Order Header */}
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Order #{order.order_id}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 mt-2">
                      {order.table_number && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                          Table: {order.table_number}
                        </span>
                      )}
                      {order.hall_name && (
                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded font-medium">
                          {order.hall_name}
                        </span>
                      )}
                      <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded font-medium">
                        {order.order_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Running: {formatTime(order.minutes_running || 0)}</span>
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
                      className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-[#FF5F15] transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg">{item.dish_name}</h4>
                          {item.category_name && (
                            <p className="text-xs text-gray-500 mt-0.5">{item.category_name}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm font-semibold text-gray-700">
                              Qty: <span className="text-[#FF5F15] font-bold">{item.quantity}</span>
                            </span>
                            <span className="text-sm font-bold text-[#FF5F15]">
                              {formatPKR(item.price * item.quantity)}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded mt-2 italic border border-yellow-200">
                              📝 {item.notes}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${getStatusColor(item.status)}`}>
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
                            className="flex-1 text-sm font-semibold"
                          >
                            Mark as {getNextStatus(item.status)}
                          </Button>
                        )}
                        {item.status === 'Ready' && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => updateItemStatus(item.id, 'Completed')}
                            className="text-sm font-semibold"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Progress */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-700 font-medium">Order Progress:</span>
                    <span className="font-bold text-gray-900">
                      {order.items_completed || 0} / {order.items_total || 0} items
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-[#FF5F15] to-[#FF9500] h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${order.items_total > 0 ? ((order.items_completed || 0) / order.items_total) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>

                {order.order_comments && (
                  <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">Order Note:</p>
                    <p className="text-sm text-yellow-800">{order.order_comments}</p>
                  </div>
                )}
              </div>
            ))}
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
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Kitchen Receipt</h2>
                <p className="text-sm text-gray-600 font-semibold">{receiptData.kitchen.kitchen_name}</p>
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
      </main>
    </div>
  );
}
