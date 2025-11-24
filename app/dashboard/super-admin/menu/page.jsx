'use client';

/**
 * Menu Management Page
 * CRUD operations for menu items with price and category
 * Uses existing API: get_products.php, dishes_management.php, get_categories.php
 */

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, getTerminal, getBranchId } from '@/utils/api';
import { formatPKR } from '@/utils/format';

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_available: 1,
    kitchen_id: '',
    discount: 0,
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
  }, []);

  /**
   * Fetch all menu items from API
   * API: get_products.php (POST with terminal parameter)
   * Note: API returns a plain array, not wrapped in success object
   */
  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      const result = await apiPost('/get_products.php', { 
        terminal,
        branch_id: branchId || terminal
      });
      
      // The API returns a plain JSON array
      if (result.data && Array.isArray(result.data)) {
        // Map API response - the API joins with categories so catname is available
        const mappedItems = result.data.map((item) => ({
          id: item.dish_id,
          dish_id: item.dish_id,
          name: item.name,
          barcode: item.barcode || '',
          description: item.description || '',
          price: item.price,
          qnty: item.qnty || '1',
          category_id: item.category_id,
          category_name: item.catname || '',
          is_available: item.is_available || 1,
          is_frequent: item.is_frequent || 1,
          status: item.is_available == 1 ? 'active' : 'inactive',
          discount: item.discount || 0,
          terminal: item.terminal || terminal,
        }));
        setMenuItems(mappedItems);
      } else if (result.data && result.data.success === false) {
        // Error response
        setAlert({ type: 'error', message: result.data.message || 'Failed to load menu items' });
        setMenuItems([]);
      } else {
        // Empty result
        setMenuItems([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setAlert({ type: 'error', message: 'Failed to load menu items: ' + (error.message || 'Network error') });
      setLoading(false);
      setMenuItems([]);
    }
  };

  /**
   * Fetch categories for dropdown
   * API: get_categories.php (POST with terminal parameter)
   * Note: API returns a plain array
   */
  const fetchCategories = async () => {
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      const result = await apiPost('/get_categories.php', { 
        terminal,
        branch_id: branchId || terminal
      });
      
      // The API returns a plain JSON array
      if (result.data && Array.isArray(result.data)) {
        const mappedCategories = result.data.map((cat) => ({
          id: cat.category_id,
          category_id: cat.category_id,
          name: cat.name,
        }));
        setCategories(mappedCategories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  /**
   * Handle form submission (Create or Update)
   * API: dishes_management.php (POST for create/update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      const data = {
        dish_id: editingItem ? editingItem.dish_id : '', // Empty for create
        category_id: formData.category_id,
        name: formData.name,
        description: formData.description || '',
        price: formData.price,
        is_available: formData.is_available ? 1 : 0,
        terminal: terminal,
        branch_id: branchId || terminal,
        discount: formData.discount || 0,
        kitchen_id: formData.kitchen_id || '',
      };

      const result = await apiPost('/dishes_management.php', data);

      if (result.success && result.data?.success) {
        setAlert({ type: 'success', message: result.data.message || 'Menu item saved successfully!' });
        setFormData({
          name: '',
          description: '',
          price: '',
          category_id: '',
          is_available: 1,
          kitchen_id: '',
          discount: 0,
        });
        setEditingItem(null);
        setModalOpen(false);
        fetchMenuItems(); // Refresh list
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to save menu item' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save menu item' });
    }
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category_id: item.category_id,
      is_available: item.is_available || 1,
      kitchen_id: item.kitchen_id || '',
      discount: item.discount || 0,
    });
    setModalOpen(true);
  };

  /**
   * Handle delete button click
   * API: dishes_management.php (DELETE method)
   */
  const handleDelete = async (dishId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      const result = await apiDelete('/dishes_management.php', { dish_id: dishId });

      if (result.success && result.data?.success) {
        setAlert({ type: 'success', message: result.data.message || 'Menu item deleted successfully!' });
        fetchMenuItems(); // Refresh list
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to delete menu item' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to delete menu item' });
    }
  };

  /**
   * Table columns configuration
   * Fixed: Added width constraints and text truncation to prevent UI collision
   */
  const columns = [
    {
      header: 'ID',
      accessor: 'dish_id',
      className: 'w-20',
      wrap: false,
    },
    {
      header: 'Name',
      accessor: (row) => (
        <span className="font-medium text-gray-900" title={row.name || ''}>
          {row.name || '-'}
        </span>
      ),
      className: 'min-w-[150px] max-w-[180px]',
      wrap: true,
    },
    {
      header: 'Description',
      accessor: (row) => (
        <span 
          className="text-gray-600 line-clamp-2 block" 
          title={row.description || ''}
          style={{ maxWidth: '250px' }}
        >
          {row.description || '-'}
        </span>
      ),
      className: 'max-w-[250px]',
      wrap: true,
    },
    {
      header: 'Category',
      accessor: 'category_name',
      className: 'min-w-[120px] max-w-[150px]',
      wrap: true,
    },
    {
      header: 'Price',
      accessor: (row) => <span className="font-semibold text-gray-900 whitespace-nowrap">{formatPKR(row.price || 0)}</span>,
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Status',
      accessor: (row) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
            row.is_available == 1 || row.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.is_available == 1 || row.status === 'active' ? 'active' : 'inactive'}
        </span>
      ),
      className: 'w-24',
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
      >
        Edit
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={() => handleDelete(row.dish_id)}
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
            <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
            <p className="text-gray-600 mt-1">Manage menu items, prices, and categories</p>
          </div>
          <Button
            onClick={() => {
              setEditingItem(null);
              setFormData({
                name: '',
                description: '',
                price: '',
                category_id: '',
                is_available: 1,
                kitchen_id: '',
                discount: 0,
              });
              setModalOpen(true);
            }}
          >
            + Add Menu Item
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

        {/* Menu Items Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Loading menu items...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={menuItems}
            actions={actions}
            emptyMessage="No menu items found. Click 'Add Menu Item' to create one."
          />
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingItem(null);
            setFormData({
              name: '',
              description: '',
              price: '',
              category_id: '',
              is_available: 1,
              kitchen_id: '',
              discount: 0,
            });
          }}
          title={editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          size="md"
        >
          <form onSubmit={handleSubmit}>
            <Input
              label="Item Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Caesar Salad"
              required
            />

            <Input
              label="Description"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the item"
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                required
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Price"
              name="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              required
            />

            <Input
              label="Discount (%)"
              name="discount"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
              placeholder="0"
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Status
              </label>
              <select
                name="is_available"
                value={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: parseInt(e.target.value) })}
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingItem(null);
                  setFormData({
                    name: '',
                    description: '',
                    price: '',
                    category_id: '',
                    is_available: 1,
                    kitchen_id: '',
                    discount: 0,
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}
