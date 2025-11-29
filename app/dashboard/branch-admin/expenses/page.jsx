'use client';

/**
 * Expense Management Page - Branch Admin
 * Full CRUD operations for expenses with amounts
 * Shows only expenses for the current branch
 * Users can enter expense title directly - it will be created if it doesn't exist
 * Uses APIs: api/expense_management.php (POST with action='get'/'create'/'update'/'delete')
 * Database: expenses table (id, title, amount, description, branch_id, terminal, created_at, updated_at)
 */

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, apiGet, getBranchId } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { Receipt, Plus, Edit, Trash2, Search, X, DollarSign } from 'lucide-react';

export default function ExpenseManagementPage() {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    description: '',
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Filter expenses based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredExpenses(expenses);
    } else {
      const filtered = expenses.filter(expense => {
        const title = expense.title?.toLowerCase() || expense.expense_title?.toLowerCase() || '';
        const description = expense.description?.toLowerCase() || '';
        const amount = expense.amount?.toString() || '';
        const searchLower = searchTerm.toLowerCase();
        return (
          title.includes(searchLower) ||
          description.includes(searchLower) ||
          amount.includes(searchLower) ||
          expense.id.toString().includes(searchTerm)
        );
      });
      setFilteredExpenses(filtered);
    }
  }, [searchTerm, expenses]);

  /**
   * Fetch all expenses for current branch
   * API: api/expense_management.php (POST with action='get' and branch_id for fetching)
   */
  const fetchExpenses = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    
    try {
      const branchId = getBranchId();
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID not found. Please login again.' });
        setLoading(false);
        return;
      }

      // Use POST with action='get' to fetch expenses from unified expense_management.php
      const result = await apiPost('api/expense_management.php', { 
        action: 'get',
        branch_id: branchId 
      });
      
      // Handle different response structures
      let expensesData = [];
      
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          expensesData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          expensesData = result.data.data;
        } else if (result.data.success === false) {
          setAlert({ type: 'error', message: result.data.message || 'Failed to load expenses' });
          setExpenses([]);
          setFilteredExpenses([]);
          setLoading(false);
          return;
        }
      }

      // Map API response
      const mappedExpenses = expensesData.map((expense) => {
        let formattedCreatedAt = expense.created_at || '';
        
        if (formattedCreatedAt) {
          try {
            const date = new Date(formattedCreatedAt);
            if (!isNaN(date.getTime())) {
              formattedCreatedAt = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
            }
          } catch (e) {
            // Keep original format if parsing fails
          }
        }

        return {
          id: expense.id || expense.expense_id,
          expense_id: expense.id || expense.expense_id,
          title: expense.title || expense.expense_title || '',
          expense_title: expense.title || expense.expense_title || '', // Keep for backward compatibility
          amount: parseFloat(expense.amount || 0),
          description: expense.description || '',
          branch_id: expense.branch_id || branchId,
          branch_name: expense.branch_name || '',
          created_at: formattedCreatedAt || expense.created_at || 'N/A',
          raw_created_at: expense.created_at || '',
        };
      });

      // Sort by ID descending (newest first)
      mappedExpenses.sort((a, b) => (b.id || 0) - (a.id || 0));
      
      setExpenses(mappedExpenses);
      setFilteredExpenses(mappedExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setAlert({ 
        type: 'error', 
        message: 'Failed to load expenses: ' + (error.message || 'Network error') 
      });
      setExpenses([]);
      setFilteredExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form submission (Create or Update)
   * API: api/expense_management.php (POST with action='create' or 'update')
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    // Validate form
    if (!formData.title || formData.title.trim() === '') {
      setAlert({ type: 'error', message: 'Expense title is required' });
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setAlert({ type: 'error', message: 'Valid amount is required' });
      return;
    }

    try {
      const branchId = getBranchId();
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID not found. Please login again.' });
        return;
      }

      // Prepare data - include action and id for updates
      const data = {
        action: editingExpense && editingExpense.id ? 'update' : 'create',
        title: formData.title.trim(),
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        branch_id: branchId,
      };

      // Only add id field if editing (for update operation)
      if (editingExpense && editingExpense.id) {
        data.id = editingExpense.id;
      }

      console.log('=== Creating/Updating Expense ===');
      console.log('Payload:', JSON.stringify(data, null, 2));

      const result = await apiPost('api/expense_management.php', data);

      console.log('=== API Response ===');
      console.log('Full result:', JSON.stringify(result, null, 2));
      console.log('result type:', typeof result);
      console.log('result keys:', result ? Object.keys(result) : 'result is null/undefined');
      console.log('result.success:', result?.success);
      console.log('result.data:', result?.data);
      console.log('result.data type:', typeof result?.data);
      console.log('result.data keys:', result?.data ? Object.keys(result.data) : 'no data');

      // Handle different response structures
      // apiPost returns: { success: response.ok, data: parsedJson, status: response.status }
      // So if result.success === true, the HTTP request succeeded
      let isSuccess = false;
      let hasError = false;
      
      // Check for explicit errors first
      if (result) {
        // Explicit error indicators
        if (result.success === false) {
          hasError = true;
        } else if (result.error) {
          hasError = true;
        } else if (result.data && result.data.error) {
          hasError = true;
        } else if (result.data && result.data.success === false) {
          hasError = true;
        } else if (result.data && result.data.message) {
          const msg = String(result.data.message).toLowerCase();
          if (msg.includes('error') || msg.includes('fail') || msg.includes('invalid')) {
            hasError = true;
          }
        }
      }
      
      // If no explicit error, check for success
      if (!hasError && result) {
        // PRIMARY: If result.success === true, HTTP request succeeded
        // This means the API call was successful, even if data is empty {}
        if (result.success === true) {
          isSuccess = true;
        }
        // SECONDARY: Check result.data.success
        else if (result.data && (result.data.success === true || result.data.success === 'true')) {
          isSuccess = true;
        }
        // TERTIARY: Check result.data.status
        else if (result.data && (result.data.status === 'success' || result.data.status === 'Success')) {
          isSuccess = true;
        }
        // QUATERNARY: Check message for success keywords
        else if (result.data && result.data.message) {
          const msg = String(result.data.message).toLowerCase();
          if (msg.includes('success') || 
              msg.includes('created') || 
              msg.includes('updated') || 
              msg.includes('saved') ||
              msg.includes('inserted') ||
              msg.includes('added')) {
            isSuccess = true;
          }
        }
      }

      if (isSuccess) {
        setAlert({ 
          type: 'success', 
          message: result.data?.message || (editingExpense ? 'Expense updated successfully!' : 'Expense created successfully!')
        });
        setFormData({ title: '', amount: '', description: '' });
        setEditingExpense(null);
        setModalOpen(false);
        fetchExpenses(); // Refresh list
      } else {
        // Show detailed error message
        let errorMessage = 'Failed to save expense';
        
        if (result) {
          if (result.data) {
            errorMessage = result.data.message || 
                          result.data.error || 
                          result.data.msg ||
                          (result.data.success === false ? 'API returned failure status' : errorMessage);
          } else if (result.message) {
            errorMessage = result.message;
          } else if (result.error) {
            errorMessage = result.error;
          } else if (result.success === false) {
            errorMessage = 'API returned failure status';
          }
        }
        
        // Log detailed error information
        console.error('Expense save failed:', {
          result,
          errorMessage,
          data,
          resultType: typeof result,
          resultIsNull: result === null,
          resultIsUndefined: result === undefined,
          resultKeys: result ? Object.keys(result) : 'no keys',
          resultData: result?.data,
          resultDataKeys: result?.data ? Object.keys(result.data) : 'no data keys',
          resultSuccess: result?.success,
          resultDataSuccess: result?.data?.success,
          resultDataMessage: result?.data?.message,
          resultDataError: result?.data?.error
        });
        
        // If result is empty or malformed, provide specific message
        if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
          errorMessage = 'No response from server. The expense may have been created successfully. Please refresh the page to verify.';
        } else if (result && !result.data && !result.message && !result.error && result.success === undefined) {
          errorMessage = 'Unexpected response format. The expense may have been created successfully. Please refresh the page to verify.';
        }
        
        setAlert({ 
          type: 'error', 
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        error: error
      });
      setAlert({ 
        type: 'error', 
        message: 'Failed to save expense: ' + (error?.message || 'Network error. Please check console for details.') 
      });
    }
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title || expense.expense_title || '',
      amount: expense.amount?.toString() || '',
      description: expense.description || '',
    });
    setModalOpen(true);
  };

  /**
   * Handle delete button click
   * API: api/expense_management.php (POST with action='delete')
   */
  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await apiPost('api/expense_management.php', { 
        action: 'delete',
        id: expenseId 
      });

      // Handle different response structures
      const isSuccess = result.success && result.data && (
        result.data.success === true || 
        (result.data.message && result.data.message.toLowerCase().includes('success'))
      );

      if (isSuccess) {
        setAlert({ 
          type: 'success', 
          message: result.data.message || 'Expense deleted successfully!' 
        });
        fetchExpenses(); // Refresh list
      } else {
        setAlert({ 
          type: 'error', 
          message: result.data?.message || 'Failed to delete expense' 
        });
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      setAlert({ 
        type: 'error', 
        message: 'Failed to delete expense: ' + (error.message || 'Network error') 
      });
    }
  };

  /**
   * Clear search
   */
  const clearSearch = () => {
    setSearchTerm('');
  };

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const filteredTotal = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

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
      header: 'Expense Title',
      accessor: (row) => row.title || row.expense_title || '',
      className: 'min-w-[200px] font-medium',
    },
    {
      header: 'Amount',
      accessor: (row) => <span className="font-semibold text-[#FF5F15]">{formatPKR(row.amount || 0)}</span>,
      className: 'w-32 text-right',
      wrap: false,
    },
    {
      header: 'Description',
      accessor: 'description',
      className: 'min-w-[200px] text-gray-600',
    },
    {
      header: 'Date',
      accessor: 'created_at',
      className: 'w-48 text-sm text-gray-600',
      wrap: false,
    },
  ];

  /**
   * Table actions (Edit and Delete buttons)
   */
  const actions = (row) => (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleEdit(row)}
        className="flex items-center gap-1"
      >
        <Edit className="w-4 h-4" />
        <span className="hidden sm:inline">Edit</span>
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={() => handleDelete(row.id)}
        className="flex items-center gap-1"
      >
        <Trash2 className="w-4 h-4" />
        <span className="hidden sm:inline">Delete</span>
      </Button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Expense Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Manage expenses for your branch
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingExpense(null);
              setFormData({ title: '', amount: '', description: '' });
              setModalOpen(true);
            }}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
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
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, description, amount, or ID..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {expenses.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-[#FF5F15] mt-1">
                  {formatPKR(totalExpenses)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Filtered Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatPKR(filteredTotal)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#FF5F15] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500">Loading expenses...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table
              columns={columns}
              data={filteredExpenses}
              actions={actions}
              emptyMessage={
                searchTerm
                  ? `No expenses found matching "${searchTerm}"`
                  : "No expenses found. Click 'Add Expense' to create one."
              }
            />
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingExpense(null);
            setFormData({ title: '', amount: '', description: '' });
            setAlert({ type: '', message: '' });
          }}
          title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
          size="md"
          showCloseButton={true}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Expense Title"
              name="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Groceries, Utilities, Rent, Supplies"
              required
              autoFocus
            />

            <Input
              label="Amount (PKR)"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
              />
            </div>

            {editingExpense && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p><strong>ID:</strong> {editingExpense.id}</p>
                {editingExpense.raw_created_at && (
                  <p><strong>Created:</strong> {editingExpense.created_at}</p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingExpense(null);
                  setFormData({ title: '', amount: '', description: '' });
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
                {editingExpense ? 'Update Expense' : 'Create Expense'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
