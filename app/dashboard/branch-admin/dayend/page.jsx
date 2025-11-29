'use client';

/**
 * Day End Management Page - Branch Admin
 * Manage day-end records with opening/closing balances
 * Uses APIs: get_dayend.php, dayend_management.php
 */

import { useEffect, useState, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiGet, getBranchId, getFullname, getUsername, getTerminal } from '@/utils/api';
import { formatPKR, formatDateTime } from '@/utils/format';
import { isCreditPayment } from '@/utils/payment';
import { Calendar, Printer, CheckCircle, DollarSign, Search, X } from 'lucide-react';

export default function DayEndPage() {
  const [dayends, setDayends] = useState([]);
  const [filteredDayends, setFilteredDayends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [dateFilter, setDateFilter] = useState({
    start_date: '',
    end_date: '',
  });
  const [formData, setFormData] = useState({
    opening_balance: '',
    expences: '',
    total_cash: '',
    total_easypaisa: '',
    total_bank: '',
    credit_sales: '',
    total_sales: '',
    total_receivings: '',
    drawings: '',
    closing_balance: '',
    note: '',
  });
  const [calculatedTotals, setCalculatedTotals] = useState({
    total_cash: 0,
    total_easypaisa: 0,
    total_bank: 0,
    total_sales: 0,
    total_expenses: 0,
    total_receivings: 0,
    credit_sales: 0,
  });
  const [selectedDayend, setSelectedDayend] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    fetchDayends();
    calculateTodayTotals();
  }, []);

  // Filter dayends based on date range
  useEffect(() => {
    let filtered = dayends;

    if (dateFilter.start_date || dateFilter.end_date) {
      filtered = dayends.filter(dayend => {
        const closingDate = new Date(dayend.closing_date_time);
        const startDate = dateFilter.start_date ? new Date(dateFilter.start_date) : null;
        const endDate = dateFilter.end_date ? new Date(dateFilter.end_date) : null;

        if (startDate && closingDate < startDate) return false;
        if (endDate && closingDate > endDate) return false;
        return true;
      });
    }

    setFilteredDayends(filtered);
  }, [dateFilter, dayends]);

  /**
   * Calculate today's totals from orders and expenses
   */
  const calculateTodayTotals = async () => {
    try {
      const branchId = getBranchId();
      const terminal = getTerminal();
      if (!branchId) return;

      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Initialize totals
      let totalCash = 0;
      let totalEasypaisa = 0;
      let totalBank = 0;
      let totalSales = 0;
      let totalExpenses = 0;
      let totalReceivings = 0;
      let creditSales = 0;

      // Fetch today's bills to get accurate payment method data
      try {
        const billsResult = await apiGet('api/bills_management.php', { 
          branch_id: branchId 
        });
        
        let billsData = [];
        if (billsResult.success && billsResult.data) {
          if (Array.isArray(billsResult.data)) {
            billsData = billsResult.data;
          } else if (billsResult.data.data && Array.isArray(billsResult.data.data)) {
            billsData = billsResult.data.data;
          } else if (billsResult.data.bills && Array.isArray(billsResult.data.bills)) {
            billsData = billsResult.data.bills;
          }
        }

        // Filter today's bills and calculate totals by payment method
        const todayBills = billsData.filter(bill => {
          if (!bill.created_at && !bill.date) return false;
          const billDate = new Date(bill.created_at || bill.date);
          billDate.setHours(0, 0, 0, 0);
          return billDate.toISOString().split('T')[0] === todayStr;
        });

        todayBills.forEach(bill => {
          const paymentMode = (bill.payment_method || bill.payment_mode || 'Cash').toLowerCase();
          const netTotal = parseFloat(bill.grand_total || bill.net_total || bill.total_amount || 0);
          
          totalSales += netTotal;

          // Use standardized utility for credit detection
          if (isCreditPayment(bill)) {
            creditSales += netTotal;
          } else if (paymentMode.includes('cash')) {
            totalCash += netTotal;
          } else if (paymentMode.includes('easypaisa') || paymentMode.includes('easy') || paymentMode.includes('online')) {
            totalEasypaisa += netTotal;
          } else if (paymentMode.includes('bank') || paymentMode.includes('card')) {
            totalBank += netTotal;
          }
        });
      } catch (error) {
        console.error('Error fetching bills:', error);
        // Fallback to orders if bills API fails
        try {
          const ordersPayload = { terminal };
          const ordersResult = await apiPost('/getOrders.php', ordersPayload);
          
          let ordersData = [];
          if (ordersResult.success && ordersResult.data) {
            if (Array.isArray(ordersResult.data)) {
              ordersData = ordersResult.data;
            } else if (ordersResult.data.data && Array.isArray(ordersResult.data.data)) {
              ordersData = ordersResult.data.data;
            } else if (ordersResult.data.orders && Array.isArray(ordersResult.data.orders)) {
              ordersData = ordersResult.data.orders;
            }
          }

          // Filter today's orders and calculate totals by payment method
          const todayOrders = ordersData.filter(order => {
            if (!order.created_at && !order.date) return false;
            const orderDate = new Date(order.created_at || order.date);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.toISOString().split('T')[0] === todayStr;
          });

          todayOrders.forEach(order => {
            const paymentMode = (order.payment_mode || order.payment_method || 'Cash').toLowerCase();
            const netTotal = parseFloat(order.net_total_amount || order.netTotal || order.grand_total || order.g_total_amount || order.total || 0);
            
            totalSales += netTotal;

            // Use standardized utility for credit detection
            if (isCreditPayment(order)) {
              creditSales += netTotal;
            } else if (paymentMode.includes('cash')) {
              totalCash += netTotal;
            } else if (paymentMode.includes('easypaisa') || paymentMode.includes('easy') || paymentMode.includes('online')) {
              totalEasypaisa += netTotal;
            } else if (paymentMode.includes('bank') || paymentMode.includes('card')) {
              totalBank += netTotal;
            }
          });
        } catch (orderError) {
          console.error('Error fetching orders:', orderError);
        }
      }

      // Fetch today's expenses
      try {
        // Use GET method to fetch expenses from unified expense_management.php
        const expensesResult = await apiGet('api/expense_management.php', { 
          branch_id: branchId 
        });
        
        let expensesData = [];
        if (expensesResult.success && expensesResult.data) {
          if (Array.isArray(expensesResult.data)) {
            expensesData = expensesResult.data;
          } else if (expensesResult.data.data && Array.isArray(expensesResult.data.data)) {
            expensesData = expensesResult.data.data;
          }
        }

        // Filter today's expenses
        const todayExpenses = expensesData.filter(expense => {
          if (!expense.created_at && !expense.date) return false;
          const expenseDate = new Date(expense.created_at || expense.date);
          expenseDate.setHours(0, 0, 0, 0);
          return expenseDate.toISOString().split('T')[0] === todayStr;
        });

        todayExpenses.forEach(expense => {
          const amount = parseFloat(expense.amount || expense.expense_amount || 0);
          totalExpenses += amount;
        });
      } catch (error) {
        console.error('Error fetching expenses:', error);
      }

      // Update calculated totals
      setCalculatedTotals({
        total_cash: totalCash,
        total_easypaisa: totalEasypaisa,
        total_bank: totalBank,
        total_sales: totalSales,
        total_expenses: totalExpenses,
        total_receivings: totalReceivings,
        credit_sales: creditSales,
      });
    } catch (error) {
      console.error('Error calculating totals:', error);
      setCalculatedTotals({
        total_cash: 0,
        total_easypaisa: 0,
        total_bank: 0,
        total_sales: 0,
        total_expenses: 0,
        total_receivings: 0,
        credit_sales: 0,
      });
    }
  };

  /**
   * Fetch day-end records
   */
  const fetchDayends = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });

    try {
      const branchId = getBranchId();
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID not found. Please login again.' });
        setLoading(false);
        return;
      }

      const params = { branch_id: branchId };
      if (dateFilter.start_date) params.start_date = dateFilter.start_date;
      if (dateFilter.end_date) params.end_date = dateFilter.end_date;

      const result = await apiPost('/get_dayend.php', params);

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
   * Calculate closing balance automatically
   */
  const calculateClosingBalance = () => {
    const opening = parseFloat(formData.opening_balance || 0);
    const expenses = parseFloat(formData.expences || 0);
    const cash = parseFloat(formData.total_cash || 0);
    const easypaisa = parseFloat(formData.total_easypaisa || 0);
    const bank = parseFloat(formData.total_bank || 0);
    const receivings = parseFloat(formData.total_receivings || 0);
    const drawings = parseFloat(formData.drawings || 0);

    // Closing balance = Opening + Cash + Easypaisa + Bank + Receivings - Expenses - Drawings
    const closing = opening + cash + easypaisa + bank + receivings - expenses - drawings;

    setFormData(prev => ({
      ...prev,
      closing_balance: closing.toFixed(2),
    }));
  };

  // Auto-calculate closing balance when relevant fields change
  useEffect(() => {
    if (modalOpen) {
      calculateClosingBalance();
    }
  }, [
    formData.opening_balance,
    formData.expences,
    formData.total_cash,
    formData.total_easypaisa,
    formData.total_bank,
    formData.total_receivings,
    formData.drawings,
    modalOpen
  ]);

  /**
   * Handle mark as day-end
   */
  const handleMarkAsDayEnd = async () => {
    // Recalculate totals before opening modal
    await calculateTodayTotals();
    
    // Get the last dayend's closing balance as opening balance
    let openingBalance = '0';
    if (dayends.length > 0) {
      // Sort by closing_date_time descending and get the most recent
      const sortedDayends = [...dayends].sort((a, b) => {
        const dateA = new Date(a.closing_date_time || a.created_at || 0);
        const dateB = new Date(b.closing_date_time || b.created_at || 0);
        return dateB - dateA;
      });
      if (sortedDayends[0] && sortedDayends[0].closing_balance) {
        openingBalance = parseFloat(sortedDayends[0].closing_balance).toFixed(2);
      }
    }

    // Auto-populate form with calculated totals
    setFormData({
      opening_balance: openingBalance,
      expences: calculatedTotals.total_expenses.toFixed(2),
      total_cash: calculatedTotals.total_cash.toFixed(2),
      total_easypaisa: calculatedTotals.total_easypaisa.toFixed(2),
      total_bank: calculatedTotals.total_bank.toFixed(2),
      credit_sales: calculatedTotals.credit_sales.toFixed(2),
      total_sales: calculatedTotals.total_sales.toFixed(2),
      total_receivings: calculatedTotals.total_receivings.toFixed(2),
      drawings: '',
      closing_balance: '',
      note: '',
    });
    setModalOpen(true);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    // Validate required fields
    if (!formData.opening_balance || parseFloat(formData.opening_balance) < 0) {
      setAlert({ type: 'error', message: 'Opening balance is required' });
      return;
    }

    try {
      const branchId = getBranchId();
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID not found. Please login again.' });
        return;
      }

      const fullname = getFullname();
      const username = getUsername();
      const closingBy = fullname || username || 'Admin';

      const data = {
        opening_balance: parseFloat(formData.opening_balance || 0),
        expences: parseFloat(formData.expences || 0),
        total_cash: parseFloat(formData.total_cash || 0),
        total_easypaisa: parseFloat(formData.total_easypaisa || 0),
        total_bank: parseFloat(formData.total_bank || 0),
        credit_sales: parseFloat(formData.credit_sales || 0),
        total_sales: parseFloat(formData.total_sales || 0),
        total_receivings: parseFloat(formData.total_receivings || 0),
        drawings: parseFloat(formData.drawings || 0),
        closing_balance: parseFloat(formData.closing_balance || 0),
        closing_date_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
        closing_by: 1, // You may need to get actual user ID
        note: formData.note.trim(),
        branch_id: branchId,
      };

      const result = await apiPost('/dayend_management.php', data);

      if (result.status === 'success' || result.success) {
        setAlert({ type: 'success', message: result.message || 'Day-end marked successfully!' });
        setModalOpen(false);
        setFormData({
          opening_balance: '',
          expences: '',
          total_cash: '',
          total_easypaisa: '',
          total_bank: '',
          credit_sales: '',
          total_sales: '',
          total_receivings: '',
          drawings: '',
          closing_balance: '',
          note: '',
        });
        fetchDayends();
      } else {
        setAlert({ type: 'error', message: result.message || 'Failed to mark day-end' });
      }
    } catch (error) {
      console.error('Error marking day-end:', error);
      setAlert({ type: 'error', message: 'Failed to mark day-end: ' + (error.message || 'Network error') });
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
    // Small delay to ensure state is updated before print
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
   * Table actions (Print button)
   */
  const actions = (row) => (
    <div className="flex items-center justify-end gap-2">
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
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Day End Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Manage daily opening and closing balances
            </p>
          </div>
          <Button
            onClick={handleMarkAsDayEnd}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Mark as Day End</span>
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

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
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
            <div className="flex-1">
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table
              columns={columns}
              data={filteredDayends}
              actions={actions}
              emptyMessage="No day-end records found. Click 'Mark as Day End' to create one."
            />
          </div>
        )}

        {/* Mark as Day End Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setFormData({
              opening_balance: '',
              expences: '',
              total_cash: '',
              total_easypaisa: '',
              total_bank: '',
              credit_sales: '',
              total_sales: '',
              total_receivings: '',
              drawings: '',
              closing_balance: '',
              note: '',
            });
            setAlert({ type: '', message: '' });
          }}
          title="Mark as Day End"
          size="lg"
          showCloseButton={true}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Opening Balance (PKR)"
                name="opening_balance"
                type="number"
                step="0.01"
                min="0"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                placeholder="0.00"
                required
              />

              <Input
                label="Expenses (PKR)"
                name="expences"
                type="number"
                step="0.01"
                min="0"
                value={formData.expences}
                onChange={(e) => setFormData({ ...formData, expences: e.target.value })}
                placeholder="0.00"
              />

              <Input
                label="Total Cash (PKR)"
                name="total_cash"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_cash}
                onChange={(e) => setFormData({ ...formData, total_cash: e.target.value })}
                placeholder="0.00"
              />

              <Input
                label="Total Online/Easypaisa (PKR)"
                name="total_easypaisa"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_easypaisa}
                onChange={(e) => setFormData({ ...formData, total_easypaisa: e.target.value })}
                placeholder="0.00"
              />

              <Input
                label="Total Bank (PKR)"
                name="total_bank"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_bank}
                onChange={(e) => setFormData({ ...formData, total_bank: e.target.value })}
                placeholder="0.00"
              />

              <Input
                label="Credit Sales (PKR)"
                name="credit_sales"
                type="number"
                step="0.01"
                min="0"
                value={formData.credit_sales}
                onChange={(e) => setFormData({ ...formData, credit_sales: e.target.value })}
                placeholder="0.00"
              />

              <Input
                label="Total Sales (PKR)"
                name="total_sales"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_sales}
                onChange={(e) => setFormData({ ...formData, total_sales: e.target.value })}
                placeholder="0.00"
              />

              <Input
                label="Total Receivings (PKR)"
                name="total_receivings"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_receivings}
                onChange={(e) => setFormData({ ...formData, total_receivings: e.target.value })}
                placeholder="0.00"
              />

              <Input
                label="Drawings (PKR)"
                name="drawings"
                type="number"
                step="0.01"
                min="0"
                value={formData.drawings}
                onChange={(e) => setFormData({ ...formData, drawings: e.target.value })}
                placeholder="0.00"
              />

              <Input
                label="Closing Balance (PKR)"
                name="closing_balance"
                type="number"
                step="0.01"
                value={formData.closing_balance}
                onChange={(e) => setFormData({ ...formData, closing_balance: e.target.value })}
                placeholder="Auto-calculated"
                readOnly
                className="bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Optional note..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setFormData({
                    opening_balance: '',
                    expences: '',
                    total_cash: '',
                    total_easypaisa: '',
                    total_bank: '',
                    credit_sales: '',
                    total_sales: '',
                    total_receivings: '',
                    drawings: '',
                    closing_balance: '',
                    note: '',
                  });
                  setAlert({ type: '', message: '' });
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="w-full sm:w-auto"
              >
                Mark as Day End
              </Button>
            </div>
          </form>
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
                    {selectedDayend.branch_name || 'Branch'}
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
    </AdminLayout>
  );
}

