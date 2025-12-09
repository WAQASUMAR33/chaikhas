'use client';

/**
 * Day End Management Page - Super Admin
 * Manage day-end records for all branches with opening/closing balances
 * Uses APIs: get_dayend.php, dayend_management.php, get_sales_by_shift.php
 */

import { useEffect, useState, useRef } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiGet, getTerminal, getBranchId, getBranchName as getStoredBranchName } from '@/utils/api';
import { formatPKR, formatDateTime } from '@/utils/format';
import { Calendar, Printer, CheckCircle, Search, X, Eye } from 'lucide-react';

export default function DayEndPage() {
  const [dayends, setDayends] = useState([]);
  const [filteredDayends, setFilteredDayends] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [dateFilter, setDateFilter] = useState({
    start_date: '',
    end_date: '',
  });
  const [selectedDayend, setSelectedDayend] = useState(null);
  const [viewOrdersModal, setViewOrdersModal] = useState(false);
  const [dayendOrders, setDayendOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedDayendId, setSelectedDayendId] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (branches.length > 0) {
      fetchDayends();
    }
  }, [branches, selectedBranchId]);

  // Filter dayends based on date range and branch
  useEffect(() => {
    let filtered = dayends;

    // Filter by branch
    if (selectedBranchId && selectedBranchId !== 'all') {
      filtered = filtered.filter(dayend => {
        const dayendBranchId = dayend.branch_id || dayend.branchId;
        return String(dayendBranchId) === String(selectedBranchId);
      });
    }

    // Filter by date range
    if (dateFilter.start_date || dateFilter.end_date) {
      filtered = filtered.filter(dayend => {
        const closingDate = new Date(dayend.closing_date_time);
        const startDate = dateFilter.start_date ? new Date(dateFilter.start_date) : null;
        const endDate = dateFilter.end_date ? new Date(dateFilter.end_date) : null;

        if (startDate && closingDate < startDate) return false;
        if (endDate && closingDate > endDate) return false;
        return true;
      });
    }

    setFilteredDayends(filtered);
  }, [dateFilter, dayends, selectedBranchId]);

  /**
   * Fetch branches list
   */
  const fetchBranches = async () => {
    try {
      const result = await apiPost('/branch_management.php', { action: 'get' });
      
      let branchesData = [];
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          branchesData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          branchesData = result.data.data;
        } else if (result.data.branches && Array.isArray(result.data.branches)) {
          branchesData = result.data.branches;
        }
      }
      
      setBranches(branchesData);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  /**
   * Fetch day-end records
   */
  const fetchDayends = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });

    try {
      const terminal = getTerminal();
      const params = { terminal };
      
      // If specific branch selected, filter by branch
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.branch_id = selectedBranchId;
      }

      if (dateFilter.start_date) params.start_date = dateFilter.start_date;
      if (dateFilter.end_date) params.end_date = dateFilter.end_date;

      const result = await apiPost('api/get_dayend.php', params);

      if (result.success && result.data) {
        let dayendData = [];
        
        if (Array.isArray(result.data)) {
          dayendData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          dayendData = result.data.data;
        }

        setDayends(dayendData);
        setFilteredDayends(dayendData);
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to load day-end records' });
        setDayends([]);
        setFilteredDayends([]);
      }
    } catch (error) {
      console.error('Error fetching day-ends:', error);
      setAlert({ type: 'error', message: 'Failed to load day-end records: ' + (error.message || 'Network error') });
      setDayends([]);
      setFilteredDayends([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * View orders for a specific dayend
   */
  const handleViewOrders = async (dayend) => {
    if (!dayend || !dayend.id) {
      setAlert({ type: 'error', message: 'Invalid day-end record' });
      return;
    }

    setSelectedDayendId(dayend.id);
    setSelectedDayend(dayend);
    setViewOrdersModal(true);
    setLoadingOrders(true);
    setDayendOrders([]);

    try {
      // Use GET API endpoint to get orders by sts, branch_id and dayend_id
      const branchId = dayend.branch_id || dayend.branchId;
      const result = await apiGet('api/get_sales_by_shift.php', { 
        sts: 0,
        branch_id: branchId,
        dayend_id: dayend.id
      });

      if (result.success && result.data) {
        let ordersData = [];
        
        if (Array.isArray(result.data)) {
          ordersData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          ordersData = result.data.data;
        } else if (result.data.orders && Array.isArray(result.data.orders)) {
          ordersData = result.data.orders;
        }

        setDayendOrders(ordersData);
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to load orders' });
        setDayendOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setAlert({ type: 'error', message: 'Failed to load orders: ' + (error.message || 'Network error') });
      setDayendOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  /**
   * Print shift report
   */
  const handlePrint = (dayend) => {
    if (!dayend) {
      setAlert({ type: 'error', message: 'Please select a day-end record to print' });
      return;
    }

    setSelectedDayend(dayend);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  /**
   * Apply date filter
   */
  const applyDateFilter = () => {
    fetchDayends();
  };

  /**
   * Clear date filter
   */
  const clearDateFilter = () => {
    setDateFilter({ start_date: '', end_date: '' });
    fetchDayends();
  };

  /**
   * Get branch name from branch_id
   */
  const getBranchName = (branchId) => {
    const branch = branches.find(b => (b.branch_id || b.id) == branchId);
    return branch ? (branch.branch_name || branch.name || 'Unknown') : 'Unknown Branch';
  };

  /**
   * Table columns configuration
   */
  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      className: 'w-20 text-center',
      wrap: false,
    },
    {
      header: 'Branch',
      accessor: (row) => getBranchName(row.branch_id || row.branchId),
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Date',
      accessor: (row) => formatDateTime(row.closing_date_time),
      className: 'w-40 text-sm',
      wrap: false,
    },
    {
      header: 'Opening Balance',
      accessor: (row) => <span className="font-medium">{formatPKR(row.opening_balance)}</span>,
      className: 'w-32 text-right',
      wrap: false,
    },
    {
      header: 'Expenses',
      accessor: (row) => <span className="text-red-600">{formatPKR(row.expences)}</span>,
      className: 'w-32 text-right',
      wrap: false,
    },
    {
      header: 'Total Cash',
      accessor: (row) => formatPKR(row.total_cash),
      className: 'w-32 text-right',
      wrap: false,
    },
    {
      header: 'Total Online',
      accessor: (row) => formatPKR(row.total_easypaisa),
      className: 'w-32 text-right',
      wrap: false,
    },
    {
      header: 'Total Bank',
      accessor: (row) => formatPKR(row.total_bank),
      className: 'w-32 text-right',
      wrap: false,
    },
    {
      header: 'Credit Sale',
      accessor: (row) => formatPKR(row.credit_sales),
      className: 'w-32 text-right',
      wrap: false,
    },
    {
      header: 'Total Sale',
      accessor: (row) => <span className="font-semibold">{formatPKR(row.total_sales)}</span>,
      className: 'w-32 text-right',
      wrap: false,
    },
    {
      header: 'Closing Balance',
      accessor: (row) => <span className="font-bold text-[#FF5F15]">{formatPKR(row.closing_balance)}</span>,
      className: 'w-32 text-right',
      wrap: false,
    },
    {
      header: 'Closed By',
      accessor: 'closing_by_name',
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Updated',
      accessor: (row) => formatDateTime(row.updated_at),
      className: 'w-40 text-sm',
      wrap: false,
    },
  ];

  /**
   * Table actions (View and Print buttons)
   */
  const actions = (row) => (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleViewOrders(row)}
        className="flex items-center gap-1"
      >
        <Eye className="w-4 h-4" />
        <span className="hidden sm:inline">View</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePrint(row)}
        className="flex items-center gap-1"
      >
        <Printer className="w-4 h-4" />
        <span className="hidden sm:inline">Print</span>
      </Button>
    </div>
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Day End Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              View and manage day-end records for all branches
            </p>
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

        {/* Branch and Date Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] bg-white text-gray-900"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id || branch.id} value={branch.branch_id || branch.id}>
                    {branch.branch_name || branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 max-w-[300px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={dateFilter.start_date}
                  onChange={(e) => setDateFilter({ ...dateFilter, start_date: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
                />
              </div>
            </div>
            <div className="flex-1 max-w-[300px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={dateFilter.end_date}
                  onChange={(e) => setDateFilter({ ...dateFilter, end_date: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
                />
              </div>
            </div>
            <Button
              onClick={applyDateFilter}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Filter</span>
            </Button>
            {(dateFilter.start_date || dateFilter.end_date) && (
              <Button
                onClick={clearDateFilter}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </Button>
            )}
          </div>
        </div>

        {/* Day End Records Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#FF5F15] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500">Loading day-end records...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden max-w-[1200px]">
            <Table
              columns={columns}
              data={filteredDayends}
              actions={actions}
              emptyMessage="No day-end records found."
            />
          </div>
        )}

        {/* View Orders Modal */}
        <Modal
          isOpen={viewOrdersModal}
          onClose={() => {
            setViewOrdersModal(false);
            setDayendOrders([]);
            setSelectedDayendId(null);
          }}
          title={`Orders for Dayend #${selectedDayendId || ''}`}
          size="xl"
          showCloseButton={true}
          className="min-w-[800px]"
        >
          {loadingOrders ? (
            <div className="py-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-[#FF5F15] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading orders...</p>
              </div>
            </div>
          ) : dayendOrders.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">No orders found for this dayend.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  Total Orders: <span className="font-semibold">{dayendOrders.length}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const branchName = selectedDayend ? getBranchName(selectedDayend.branch_id || selectedDayend.branchId) : 'Branch';
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Orders Report - ${branchName}</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
                            .print-header { 
                              text-align: center; 
                              border-bottom: 2px solid #000; 
                              padding-bottom: 15px; 
                              margin-bottom: 20px; 
                            }
                            .print-header h1 { 
                              font-size: 24px; 
                              margin: 0 0 5px 0; 
                              color: #FF5F15; 
                            }
                            .print-header h2 { 
                              font-size: 18px; 
                              margin: 0 0 10px 0; 
                              font-weight: normal;
                            }
                            .print-header .report-title {
                              font-size: 16px;
                              font-weight: bold;
                              margin: 10px 0 5px 0;
                            }
                            .print-header .info-row {
                              display: flex;
                              justify-content: center;
                              gap: 30px;
                              font-size: 12px;
                              color: #666;
                            }
                            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
                            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
                            th { background-color: #f5f5f5; font-weight: bold; }
                            .text-right { text-align: right; }
                            .total-row { background-color: #f5f5f5; font-weight: bold; }
                            .grand-total { color: #FF5F15; }
                            .footer { 
                              margin-top: 20px; 
                              padding-top: 10px;
                              border-top: 1px solid #ddd;
                              font-size: 10px; 
                              color: #666; 
                              text-align: center; 
                            }
                          </style>
                        </head>
                        <body>
                          <div class="print-header">
                            <h1>${branchName}</h1>
                            <div class="report-title">Orders Report - Dayend #${selectedDayendId}</div>
                            <div class="info-row">
                              <span>Total Orders: <strong>${dayendOrders.length}</strong></span>
                              <span>Grand Total: <strong>${formatPKR(dayendOrders.reduce((sum, o) => sum + (parseFloat(o.g_total_amount) || 0), 0))}</strong></span>
                              <span>Net Total: <strong>${formatPKR(dayendOrders.reduce((sum, o) => sum + (parseFloat(o.net_total_amount) || 0), 0))}</strong></span>
                            </div>
                            <div class="info-row" style="margin-top: 5px;">
                              <span>Printed on: ${new Date().toLocaleString()}</span>
                            </div>
                          </div>
                          <table>
                            <thead>
                              <tr>
                                <th>Order ID</th>
                                <th>Type</th>
                                <th>Payment</th>
                                <th class="text-right">Grand Total</th>
                                <th class="text-right">Discount</th>
                                <th class="text-right">Service</th>
                                <th class="text-right">Net Total</th>
                                <th>Created At</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${dayendOrders.map(order => `
                                <tr>
                                  <td>${order.order_id}</td>
                                  <td>${order.order_type || 'N/A'}</td>
                                  <td>${order.payment_mode || 'N/A'}</td>
                                  <td class="text-right">${formatPKR(order.g_total_amount || 0)}</td>
                                  <td class="text-right">${formatPKR(order.discount_amount || 0)}</td>
                                  <td class="text-right">${formatPKR(order.service_charge || 0)}</td>
                                  <td class="text-right">${formatPKR(order.net_total_amount || 0)}</td>
                                  <td>${formatDateTime(order.created_at)}</td>
                                </tr>
                              `).join('')}
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td colspan="3" class="text-right">Total:</td>
                                <td class="text-right">${formatPKR(dayendOrders.reduce((sum, o) => sum + (parseFloat(o.g_total_amount) || 0), 0))}</td>
                                <td class="text-right">${formatPKR(dayendOrders.reduce((sum, o) => sum + (parseFloat(o.discount_amount) || 0), 0))}</td>
                                <td class="text-right">${formatPKR(dayendOrders.reduce((sum, o) => sum + (parseFloat(o.service_charge) || 0), 0))}</td>
                                <td class="text-right grand-total">${formatPKR(dayendOrders.reduce((sum, o) => sum + (parseFloat(o.net_total_amount) || 0), 0))}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                          <div class="footer">
                            <p>Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
                          </div>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }}
                  className="flex items-center gap-1"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Orders</span>
                </Button>
              </div>
              <div id="orders-print-content" className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Order ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Payment</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Grand Total</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Discount</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Service</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Net Total</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dayendOrders.map((order) => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900 font-medium">{order.order_id}</td>
                        <td className="px-3 py-2 text-gray-700">{order.order_type || 'N/A'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.payment_mode?.toLowerCase() === 'cash'
                              ? 'bg-green-100 text-green-800'
                              : order.payment_mode?.toLowerCase() === 'credit'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {order.payment_mode || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatPKR(order.g_total_amount || 0)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatPKR(order.discount_amount || 0)}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatPKR(order.service_charge || 0)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-[#FF5F15]">{formatPKR(order.net_total_amount || 0)}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{formatDateTime(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 sticky bottom-0">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">Total:</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {formatPKR(dayendOrders.reduce((sum, o) => sum + (parseFloat(o.g_total_amount) || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-red-600">
                        {formatPKR(dayendOrders.reduce((sum, o) => sum + (parseFloat(o.discount_amount) || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {formatPKR(dayendOrders.reduce((sum, o) => sum + (parseFloat(o.service_charge) || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-[#FF5F15]">
                        {formatPKR(dayendOrders.reduce((sum, o) => sum + (parseFloat(o.net_total_amount) || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </Modal>

        {/* Print View - Hidden until print */}
        {selectedDayend && (
          <>
            <style jsx global>{`
              @media print {
                @page {
                  size: A4;
                  margin: 1.5cm 1cm;
                }
                
                body * {
                  visibility: hidden;
                }
                
                .print-container, .print-container * {
                  visibility: visible;
                }
                
                .print-container {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  font-family: Arial, sans-serif;
                }
                
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                .no-print {
                  display: none !important;
                }
              }
            `}</style>
            <div ref={printRef} className="hidden print:block">
              <div className="print-container">
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '20px',
                paddingBottom: '15px',
                borderBottom: '2px solid #000'
              }}>
                <div style={{ width: '20%' }}>
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    border: '1px solid #ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: '#666'
                  }}>
                    LOGO
                  </div>
                </div>
                <div style={{ width: '60%', textAlign: 'center' }}>
                  <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                    Shift Report
                  </h1>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    {selectedDayend.branch_name || getBranchName(selectedDayend.branch_id || selectedDayend.branchId) || 'Branch'}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '12px' }}>
                    Date: {formatDateTime(selectedDayend.closing_date_time)}
                  </p>
                </div>
                <div style={{ width: '20%', textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    <strong>Day End ID:</strong><br />
                    #{selectedDayend.id}
                  </p>
                </div>
              </div>

              {/* Report Details */}
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                marginBottom: '20px',
                fontSize: '12px'
              }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', width: '30%' }}>Opening Balance</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right' }}>{formatPKR(selectedDayend.opening_balance)}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', width: '30%' }}>Total Cash</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right' }}>{formatPKR(selectedDayend.total_cash)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold' }}>Expenses</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', color: '#dc2626' }}>{formatPKR(selectedDayend.expences)}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold' }}>Total Online</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right' }}>{formatPKR(selectedDayend.total_easypaisa)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold' }}>Total Bank</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right' }}>{formatPKR(selectedDayend.total_bank)}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold' }}>Credit Sales</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right' }}>{formatPKR(selectedDayend.credit_sales)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold' }}>Total Sales</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 'bold' }}>{formatPKR(selectedDayend.total_sales)}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold' }}>Total Receivings</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right' }}>{formatPKR(selectedDayend.total_receivings)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold' }}>Drawings</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', color: '#dc2626' }}>{formatPKR(selectedDayend.drawings)}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f3f4f6' }}>Closing Balance</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f3f4f6', color: '#FF5F15' }}>{formatPKR(selectedDayend.closing_balance)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Additional Info */}
              <div style={{ marginTop: '20px', fontSize: '11px' }}>
                <p><strong>Closed By:</strong> {selectedDayend.closing_by_name}</p>
                <p><strong>Closing Time:</strong> {formatDateTime(selectedDayend.closing_date_time)}</p>
                {selectedDayend.note && (
                  <p><strong>Note:</strong> {selectedDayend.note}</p>
                )}
                <p><strong>Last Updated:</strong> {formatDateTime(selectedDayend.updated_at)}</p>
              </div>

              {/* Footer */}
              <div style={{ 
                marginTop: '30px', 
                paddingTop: '10px', 
                borderTop: '1px solid #ccc',
                textAlign: 'center',
                fontSize: '10px',
                color: '#666'
              }}>
                <p>Generated on {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-GB')}</p>
              </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}

