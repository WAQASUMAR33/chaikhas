'use client';

/**
 * Category Management Page - Super Admin
 * CRUD operations for categories
 * Uses existing API: get_categories.php, category_management.php
 */

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, getTerminal } from '@/utils/api';

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
      // Try different possible API endpoints
      let result = await apiPost('/get_kitchens.php', { terminal });
      
      if (!result.success || !result.data) {
        result = await apiPost('/kitchen_management.php', { terminal, action: 'get' });
      }
      
      if (result.data && Array.isArray(result.data)) {
        setKitchens(result.data);
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        setKitchens(result.data.data);
      } else {
        // Fallback: create default kitchens if API doesn't exist
        setKitchens([
          { kitchen_id: 1, title: 'Kitchen 1 - BBQ', code: 'K1' },
          { kitchen_id: 2, title: 'Kitchen 2 - Fast Food', code: 'K2' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching kitchens:', error);
      // Fallback: create default kitchens
      setKitchens([
        { kitchen_id: 1, title: 'Kitchen 1 - BBQ', code: 'K1' },
        { kitchen_id: 2, title: 'Kitchen 2 - Fast Food', code: 'K2' }
      ]);
    }
  };

  /**
   * Fetch all categories from API
   * API: get_categories.php (POST with terminal parameter)
   * Note: API returns a plain array, not wrapped in success object
   */
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      const result = await apiPost('/get_categories.php', { terminal });
      
      // The API returns a plain JSON array, check if result.data is an array
      if (result.data && Array.isArray(result.data)) {
        // Map API response to match our table structure
        const mappedCategories = result.data.map((cat) => ({
          id: cat.category_id,
          category_id: cat.category_id,
          name: cat.name,
          description: cat.description || '',
          kid: cat.kid || 0,
          kitchen_id: cat.kitchen_id || null,
          kitchen_name: cat.kitchen_name || '-',
          terminal: cat.terminal || terminal,
        }));
        setCategories(mappedCategories);
      } else if (result.data && result.data.success === false) {
        // Error response
        setAlert({ type: 'error', message: result.data.message || 'Failed to load categories' });
        setCategories([]);
      } else {
        // Empty result or unexpected format
        setCategories([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
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
      const data = {
        category_id: editingCategory ? editingCategory.category_id : '', // Empty for create
        kid: formData.kid || 0, // Send 0 if not provided, API will auto-generate
        name: formData.name,
        description: formData.description || '',
        kitchen_id: formData.kitchen_id || null,
        terminal: terminal,
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
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleEdit(row)}
      >
        Edit
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={() => handleDelete(row.category_id)}
      >
        Delete
      </Button>
    </div>
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
            <p className="text-gray-600 mt-1">Manage menu categories</p>
          </div>
          <Button
            onClick={() => {
              setEditingCategory(null);
              setFormData({ name: '', description: '', kid: '', kitchen_id: '' });
              setModalOpen(true);
            }}
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
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Loading categories...</p>
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

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', kid: '', kitchen_id: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}

