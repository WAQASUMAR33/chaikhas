'use client';

/**
 * Expense Management Page
 * Full CRUD operations for expense titles
 * Uses real APIs: get_expense_title.php, expense_title_management.php
 * Database: expense_title table (id, title, terminal, created_at, updated_at)
 */

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, getTerminal } from '@/utils/api';
import { Receipt, Plus, Edit, Trash2, Search, X } from 'lucide-react';

export default function ExpenseManagementPage() {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
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
      const filtered = expenses.filter(expense =>
        expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.id.toString().includes(searchTerm)
      );
      setFilteredExpenses(filtered);
    }
  }, [searchTerm, expenses]);

  /**
   * Fetch all expense titles from API
   * API: get_expense_title.php (POST with terminal parameter)
   */
  const fetchExpenses = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    
    try {
      const terminal = getTerminal();
      const result = await apiPost('/get_expense_title.php', { terminal });
      
      // Handle different response structures
      let expensesData = [];
      
      if (result.success && result.data) {
        // Check if data is an array directly
        if (Array.isArray(result.data)) {
          expensesData = result.data;
        }
        // Check if data is nested: { success: true, data: [...] }
        else if (result.data.data && Array.isArray(result.data.data)) {
          expensesData = result.data.data;
        }
        // Check if response has success field
        else if (result.data.success === false) {
          setAlert({ type: 'error', message: result.data.message || 'Failed to load expenses' });
          setExpenses([]);
          setFilteredExpenses([]);
          setLoading(false);
          return;
        }
      }

      // Map API response to match database schema
      const mappedExpenses = expensesData.map((expense) => {
        // Format dates
        let formattedCreatedAt = expense.created_at || '';
        let formattedUpdatedAt = expense.updated_at || '';
        
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
        
        if (formattedUpdatedAt) {
          try {
            const date = new Date(formattedUpdatedAt);
            if (!isNaN(date.getTime())) {
              formattedUpdatedAt = date.toLocaleDateString('en-GB', {
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
          title: expense.title || '',
          terminal: expense.terminal || terminal,
          created_at: formattedCreatedAt || expense.created_at || 'N/A',
          updated_at: formattedUpdatedAt || expense.updated_at || 'N/A',
          raw_created_at: expense.created_at || '',
          raw_updated_at: expense.updated_at || '',
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
   * API: expense_title_management.php (POST)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    // Validate form
    if (!formData.title || formData.title.trim() === '') {
      setAlert({ type: 'error', message: 'Expense title is required' });
      return;
    }

    try {
      const terminal = getTerminal();
      const data = {
        id: editingExpense ? editingExpense.id : '', // Empty for create
        title: formData.title.trim(),
        terminal: terminal,
      };

      const result = await apiPost('/expense_title_management.php', data);

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
        setFormData({ title: '' });
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
      title: expense.title || '',
    });
    setModalOpen(true);
  };

  /**
   * Handle delete button click
   * API: expense_title_management.php (DELETE)
   */
  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense title? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await apiDelete('/expense_title_management.php', { id: expenseId });

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
      accessor: 'title',
      className: 'min-w-[200px] font-medium',
    },
    {
      header: 'Terminal',
      accessor: 'terminal',
      className: 'w-24 text-center',
      wrap: false,
    },
    {
      header: 'Created At',
      accessor: 'created_at',
      className: 'w-48 text-sm text-gray-600',
      wrap: false,
    },
    {
      header: 'Updated At',
      accessor: 'updated_at',
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
              Manage expense titles and categories
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingExpense(null);
              setFormData({ title: '' });
              setModalOpen(true);
            }}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense Title</span>
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
                placeholder="Search by title or ID..."
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

        {/* Summary Card */}
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
                <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {filteredExpenses.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Terminal</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {getTerminal()}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Receipt className="w-6 h-6 text-orange-600" />
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
                  : "No expenses found. Click 'Add Expense Title' to create one."
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
            setFormData({ title: '' });
            setAlert({ type: '', message: '' });
          }}
          title={editingExpense ? 'Edit Expense Title' : 'Add New Expense Title'}
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

            {editingExpense && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p><strong>ID:</strong> {editingExpense.id}</p>
                <p><strong>Terminal:</strong> {editingExpense.terminal}</p>
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
                  setFormData({ title: '' });
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
