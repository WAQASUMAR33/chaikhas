'use client';

/**
 * Category Management Page
 * CRUD operations for categories
 * Uses existing API: get_categories.php, category_management.php
 */

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, getTerminal, getBranchId } from '@/utils/api';

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', kid: '', kitchen_id: '' });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchKitchens();
    fetchCategories();
  }, []);

  /**
   * Fetch kitchens from API
   * API: get_kitchens.php or kitchen_management.php
   */
  const fetchKitchens = async () => {
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      console.log('=== Fetching Kitchens for Categories ===');
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
        console.warn('Both API calls failed, using empty array');
        setKitchens([]);
        return;
      }
      
      let kitchensData = [];
      
      // Handle multiple possible response structures
      if (Array.isArray(result.data)) {
        kitchensData = result.data;
        console.log('Found kitchens in result.data (array)');
      } else if (result.data && Array.isArray(result.data.data)) {
        kitchensData = result.data.data;
        console.log('Found kitchens in result.data.data');
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        kitchensData = result.data.data;
        console.log('Found kitchens in result.data.success.data');
      } else if (result.data && Array.isArray(result.data.kitchens)) {
        kitchensData = result.data.kitchens;
        console.log('Found kitchens in result.data.kitchens');
      } else if (result.data && typeof result.data === 'object') {
        // Try to extract array from any property
        for (const key in result.data) {
          if (Array.isArray(result.data[key])) {
            kitchensData = result.data[key];
            console.log(`Found kitchens in result.data.${key}`);
            break;
          }
        }
      } else if (Array.isArray(result)) {
        kitchensData = result;
        console.log('Found kitchens in result (direct array)');
      }
      
      console.log(`Total kitchens found: ${kitchensData.length}`);
      
      // Ensure each kitchen has required fields
      const validKitchens = kitchensData.map(kitchen => ({
        kitchen_id: kitchen.kitchen_id || kitchen.id || kitchen.KitchenID,
        title: kitchen.title || kitchen.name || kitchen.kitchen_name || kitchen.Title || `Kitchen ${kitchen.kitchen_id || kitchen.id}`,
        code: kitchen.code || kitchen.kitchen_code || kitchen.Code || `K${kitchen.kitchen_id || kitchen.id}`,
        printer: kitchen.printer || kitchen.printer_name || kitchen.Printer || '',
        branch_id: kitchen.branch_id || branchId || 1
      })).filter(k => k.kitchen_id); // Filter out invalid entries
      
      setKitchens(validKitchens);
      console.log('Valid kitchens:', validKitchens);
    } catch (error) {
      console.error('❌ Error fetching kitchens:', error);
      setKitchens([]);
      setAlert({ type: 'error', message: 'Failed to load kitchens: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Fetch all categories from API
   * API: get_categories.php (POST with terminal and branch_id parameter)
   * Note: API returns a plain array, not wrapped in success object
   */
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      console.log('=== Fetching Categories ===');
      console.log('Params:', { terminal, branch_id: branchId || terminal });
      
      const result = await apiPost('/get_categories.php', { 
        terminal,
        branch_id: branchId || terminal
      });
      
      console.log('get_categories.php response:', result);
      console.log('result.data type:', typeof result.data);
      console.log('result.data is array:', Array.isArray(result.data));
      if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        console.log('result.data keys:', Object.keys(result.data));
      }
      
      let categoriesData = [];
      
      // Handle multiple possible response structures
      if (result.data && Array.isArray(result.data)) {
        categoriesData = result.data;
        console.log('Found categories in result.data (array)');
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        categoriesData = result.data.data;
        console.log('Found categories in result.data.success.data');
      } else if (result.data && Array.isArray(result.data.categories)) {
        categoriesData = result.data.categories;
        console.log('Found categories in result.data.categories');
      } else if (result.data && Array.isArray(result.data.data)) {
        categoriesData = result.data.data;
        console.log('Found categories in result.data.data');
      } else if (result.data && typeof result.data === 'object') {
        // Try to extract array from any property
        for (const key in result.data) {
          if (Array.isArray(result.data[key])) {
            categoriesData = result.data[key];
            console.log(`Found categories in result.data.${key}`);
            break;
          }
        }
      } else if (Array.isArray(result)) {
        categoriesData = result;
        console.log('Found categories in result (direct array)');
      }
      
      console.log(`Total categories found: ${categoriesData.length}`);
      
      if (categoriesData.length > 0) {
        // Map API response to match our table structure
        const mappedCategories = categoriesData.map((cat) => ({
          id: cat.category_id || cat.id || cat.CategoryID,
          category_id: cat.category_id || cat.id || cat.CategoryID,
          name: cat.name || cat.category_name || cat.Name || '',
          description: cat.description || cat.desc || cat.Description || '',
          kid: cat.kid || cat.KID || 0,
          kitchen_id: cat.kitchen_id || cat.kitchen_ID || null,
          kitchen_name: cat.kitchen_name || (cat.kitchen_id ? `Kitchen ${cat.kitchen_id}` : 'Not Assigned'),
          terminal: cat.terminal || terminal,
        })).filter(cat => cat.category_id); // Filter out invalid entries
        
        console.log('Mapped categories:', mappedCategories);
        setCategories(mappedCategories);
      } else if (result.data && result.data.success === false) {
        // Error response
        const errorMsg = result.data.message || result.data.error || 'Failed to load categories';
        console.error('API returned error:', errorMsg);
        setAlert({ type: 'error', message: errorMsg });
        setCategories([]);
      } else {
        // Empty result or unexpected format
        console.warn('⚠️ No categories found in response');
        console.warn('Full response structure:', JSON.stringify(result, null, 2));
        setCategories([]);
        if (!result.success) {
          setAlert({ type: 'warning', message: 'No categories found. Click "Add Category" to create one.' });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      setAlert({ type: 'error', message: 'Failed to load categories: ' + (error.message || 'Network error') });
      setLoading(false);
      setCategories([]);
    }
  };

  /**
   * Handle form submission (Create or Update)
   * API: category_management.php (POST for create/update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      const data = {
        category_id: editingCategory ? editingCategory.category_id : '', // Empty for create
        kid: formData.kid || 0, // Send 0 if not provided, API will auto-generate
        name: formData.name,
        description: formData.description || '',
        kitchen_id: formData.kitchen_id || null,
        terminal: terminal,
        branch_id: branchId || terminal, // Include branch_id
      };

      if (!data.kitchen_id) {
        setAlert({ type: 'error', message: 'Please select a kitchen for this category' });
        return;
      }

      const result = await apiPost('/category_management.php', data);

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'Category saved successfully!' });
        setFormData({ name: '', description: '', kid: '', kitchen_id: '' });
        setEditingCategory(null);
        setModalOpen(false);
        fetchCategories(); // Refresh list
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to save category' });
      }
    } catch (error) {
      console.error('Error saving category:', error);
      setAlert({ type: 'error', message: 'Failed to save category: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      kid: category.kid || '',
      kitchen_id: category.kitchen_id || '',
    });
    setModalOpen(true);
  };

  /**
   * Handle delete button click
   * API: category_management.php (DELETE method)
   */
  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const result = await apiDelete('/category_management.php', { category_id: categoryId });

      if (result.success && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'Category deleted successfully!' });
        fetchCategories(); // Refresh list
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to delete category' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to delete category' });
    }
  };

  /**
   * Table columns configuration
   */
  const columns = [
    {
      header: 'ID',
      accessor: 'category_id',
    },
    {
      header: 'Name',
      accessor: 'name',
    },
    {
      header: 'Description',
      accessor: 'description',
    },
    {
      header: 'Kitchen',
      accessor: 'kitchen_name',
      render: (row) => row.kitchen_name || (row.kitchen_id ? `Kitchen ${row.kitchen_id}` : 'Not Assigned'),
    },
  ];

  /**
   * Table actions (Edit and Delete buttons)
   */
  const actions = (row) => (
    <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleEdit(row)}
        className="text-xs sm:text-sm"
      >
        Edit
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={() => handleDelete(row.category_id)}
        className="text-xs sm:text-sm"
      >
        Delete
      </Button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Category Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage menu categories</p>
          </div>
          <Button
            onClick={() => {
              setEditingCategory(null);
              setFormData({ name: '', description: '', kid: '', kitchen_id: '' });
              setModalOpen(true);
            }}
            className="w-full sm:w-auto"
          >
            + Add Category
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

        {/* Categories Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
            <p className="text-sm sm:text-base text-gray-500">Loading categories...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={categories}
            actions={actions}
            emptyMessage="No categories found. Click 'Add Category' to create one."
          />
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingCategory(null);
            setFormData({ name: '', description: '', kid: '', kitchen_id: '' });
          }}
          title={editingCategory ? 'Edit Category' : 'Add New Category'}
          size="md"
        >
          <form onSubmit={handleSubmit}>
            <Input
              label="Category Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Appetizers, Main Course"
              required
            />

            <Input
              label="Description"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the category"
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kitchen <span className="text-red-500">*</span>
              </label>
              <select
                name="kitchen_id"
                value={formData.kitchen_id}
                onChange={(e) => setFormData({ ...formData, kitchen_id: e.target.value })}
                required
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
              >
                <option value="">Select a kitchen</option>
                {kitchens.map((kitchen) => (
                  <option key={kitchen.kitchen_id} value={kitchen.kitchen_id}>
                    {kitchen.title || `Kitchen ${kitchen.kitchen_id}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select which kitchen handles items in this category
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', kid: '', kitchen_id: '' });
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
