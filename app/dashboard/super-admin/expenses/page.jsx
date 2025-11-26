'use client';

/**
 * Expense Management Page - Super Admin
 * Full CRUD operations for expenses with amounts
 * Shows expenses from all branches with branch filter
 * Users can enter expense title directly - it will be created if it doesn't exist
 * Uses APIs: get_expenses.php, expense_management.php, expense_title_management.php, get_expense_title.php, branch_management.php
 * Database: expenses table (id, expense_title_id, amount, branch_id, description, created_at, updated_at)
 */

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, apiGet } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { Receipt, Plus, Edit, Trash2, Search, X, DollarSign, Building2 } from 'lucide-react';

export default function ExpenseManagementPage() {
  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('all'); // 'all' or branch_id
  const [formData, setFormData] = useState({
    expense_title: '',
    amount: '',
    description: '',
    branch_id: '',
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchBranches();
    fetchExpenses();
  }, []);

  // Filter expenses based on search term and branch
  useEffect(() => {
    let filtered = expenses;

    // Filter by branch
    if (selectedBranchId !== 'all') {
      filtered = filtered.filter(expense => 
        expense.branch_id?.toString() === selectedBranchId.toString()
      );
    }

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(expense => {
        const title = expense.expense_title?.toLowerCase() || '';
        const description = expense.description?.toLowerCase() || '';
        const branchName = expense.branch_name?.toLowerCase() || '';
        const amount = expense.amount?.toString() || '';
        return (
          title.includes(searchLower) ||
          description.includes(searchLower) ||
          branchName.includes(searchLower) ||
          amount.includes(searchLower) ||
          expense.id.toString().includes(searchTerm)
        );
      });
    }

    setFilteredExpenses(filtered);
  }, [searchTerm, selectedBranchId, expenses]);

  /**
   * Fetch all branches for filter dropdown
   */
  const fetchBranches = async () => {
    try {
      const result = await apiGet('/branch_management.php');
      let branchesData = [];
      
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          branchesData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          branchesData = result.data.data;
        }
      }
      
      setBranches(branchesData);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  /**
   * Get or create expense title and return its ID
   */
  const getOrCreateExpenseTitle = async (title) => {
    if (!title || title.trim() === '') {
      return null;
    }

    try {
      // First, try to find existing expense title
      const searchResult = await apiPost('/get_expense_title.php', { terminal: 1 });
      let titlesData = [];
      
      if (searchResult.success && searchResult.data) {
        if (Array.isArray(searchResult.data)) {
          titlesData = searchResult.data;
        } else if (searchResult.data.data && Array.isArray(searchResult.data.data)) {
          titlesData = searchResult.data.data;
        }
      }

      // Check if title already exists
      const existingTitle = titlesData.find(
        t => (t.title || t.expense_title || '').toLowerCase().trim() === title.toLowerCase().trim()
      );

      if (existingTitle) {
        return existingTitle.id || existingTitle.expense_id;
      }

      // Create new expense title if it doesn't exist
      const createResult = await apiPost('/expense_title_management.php', {
        id: '',
        title: title.trim(),
        terminal: 1,
      });

      if (createResult.success && createResult.data) {
        // Try to get the ID from response
        if (createResult.data.id) {
          return createResult.data.id;
        }
        // If ID not in response, fetch again to get it
        const refreshResult = await apiPost('/get_expense_title.php', { terminal: 1 });
        let refreshData = [];
        if (refreshResult.success && refreshResult.data) {
          if (Array.isArray(refreshResult.data)) {
            refreshData = refreshResult.data;
          } else if (refreshResult.data.data && Array.isArray(refreshResult.data.data)) {
            refreshData = refreshResult.data.data;
          }
        }
        const newTitle = refreshData.find(
          t => (t.title || t.expense_title || '').toLowerCase().trim() === title.toLowerCase().trim()
        );
        return newTitle ? (newTitle.id || newTitle.expense_id) : null;
      }

      return null;
    } catch (error) {
      console.error('Error getting/creating expense title:', error);
      return null;
    }
  };

  /**
   * Fetch all expenses from all branches
   * API: get_expenses.php (POST without branch_id or with branch_id=null for all)
   */
  const fetchExpenses = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    
    try {
      // For superadmin, fetch all expenses (don't pass branch_id or pass null)
      const result = await apiPost('/get_expenses.php', { branch_id: null });
      
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
          expense_title_id: expense.expense_title_id || '',
          expense_title: expense.expense_title || expense.title || '',
          amount: parseFloat(expense.amount || 0),
          description: expense.description || '',
          branch_id: expense.branch_id || '',
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
   * API: expense_management.php (POST)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    // Validate form
    if (!formData.expense_title || formData.expense_title.trim() === '') {
      setAlert({ type: 'error', message: 'Expense title is required' });
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setAlert({ type: 'error', message: 'Valid amount is required' });
      return;
    }

    if (!formData.branch_id || formData.branch_id === '') {
      setAlert({ type: 'error', message: 'Branch is required' });
      return;
    }

    try {
      // Get or create expense title
      const expenseTitleId = await getOrCreateExpenseTitle(formData.expense_title.trim());
      
      if (!expenseTitleId) {
        setAlert({ type: 'error', message: 'Failed to create or find expense title. Please try again.' });
        return;
      }

      const data = {
        id: editingExpense ? editingExpense.id : '', // Empty for create
        expense_title_id: expenseTitleId,
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        branch_id: formData.branch_id,
      };

      const result = await apiPost('/expense_management.php', data);

      // Handle different response structures
      const isSuccess = result.success && result.data && (
        result.data.success === true || 
        (result.data.message && result.data.message.toLowerCase().includes('success'))
      );

      if (isSuccess) {
        setAlert({ 
          type: 'success', 
          message: result.data.message || (editingExpense ? 'Expense updated successfully!' : 'Expense created successfully!')
        });
        setFormData({ expense_title: '', amount: '', description: '', branch_id: '' });
        setEditingExpense(null);
        setModalOpen(false);
        fetchExpenses(); // Refresh list
      } else {
        setAlert({ 
          type: 'error', 
          message: result.data?.message || 'Failed to save expense' 
        });
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      setAlert({ 
        type: 'error', 
        message: 'Failed to save expense: ' + (error.message || 'Network error') 
      });
    }
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      expense_title: expense.expense_title || '',
      amount: expense.amount?.toString() || '',
      description: expense.description || '',
      branch_id: expense.branch_id?.toString() || '',
    });
    setModalOpen(true);
  };

  /**
   * Handle delete button click
   * API: expense_management.php (DELETE)
   */
  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await apiDelete('/expense_management.php', { id: expenseId });

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
      header: 'Branch',
      accessor: 'branch_name',
      className: 'min-w-[150px] font-medium',
    },
    {
      header: 'Expense Title',
      accessor: 'expense_title',
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
    <SuperAdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Expense Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Manage expenses for all branches
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingExpense(null);
              setFormData({ expense_title: '', amount: '', description: '', branch_id: '' });
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Branch Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Branch
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Bar */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title, description, branch, amount, or ID..."
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
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {filteredExpenses.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-purple-600" />
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
                <Building2 className="w-6 h-6 text-orange-600" />
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
                searchTerm || selectedBranchId !== 'all'
                  ? `No expenses found matching your filters`
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
            setFormData({ expense_title: '', amount: '', description: '', branch_id: '' });
            setAlert({ type: '', message: '' });
          }}
          title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
          size="md"
          showCloseButton={true}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
                required
                disabled={!!editingExpense}
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
              {editingExpense && (
                <p className="text-xs text-gray-500 mt-1">Branch cannot be changed when editing</p>
              )}
            </div>

            <Input
              label="Expense Title"
              name="expense_title"
              value={formData.expense_title}
              onChange={(e) => setFormData({ ...formData, expense_title: e.target.value })}
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
                  setFormData({ expense_title: '', amount: '', description: '', branch_id: '' });
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
    </SuperAdminLayout>
  );
}
