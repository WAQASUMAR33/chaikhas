'use client';

/**
 * Menu Management Page
 * CRUD operations for menu items with price and category
 * Uses existing API: get_products.php, dishes_management.php, get_categories.php
 */

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiGet, apiPost, apiDelete, getTerminal, getBranchId } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import logger from '@/utils/logger';

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
   * Fetch all menu items from API (Branch-Admin)
   * API: get_products.php (POST with terminal and branch_id parameter)
   * Branch-Admin: Only fetch menu items for their branch
   */
  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      let branchId = getBranchId();
      
      // Ensure branch_id is valid (not null, undefined, or empty string)
      if (branchId) {
        branchId = branchId.toString().trim();
        if (branchId === 'null' || branchId === 'undefined' || branchId === '') {
          branchId = null;
        } else {
          // Try to convert to number for validation
          const numBranchId = parseInt(branchId, 10);
          if (isNaN(numBranchId) || numBranchId <= 0) {
            branchId = null;
          }
        }
      }
      
      // Branch-admin MUST have branch_id
      if (!branchId) {
        console.error('❌ Branch ID is missing for branch-admin');
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        setMenuItems([]);
        setLoading(false);
        return;
      }
      
      logger.info('Fetching Menu Items', { terminal, branch_id: branchId });
      
      const result = await apiGet('/get_products.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for branch-admin
      });
      
      let menuItemsData = [];
      let dataSource = '';
      
      // Handle multiple possible response structures
      if (result.data && Array.isArray(result.data)) {
        menuItemsData = result.data;
        dataSource = 'result.data';
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        menuItemsData = result.data.data;
        dataSource = 'result.data.success.data';
      } else if (result.data && Array.isArray(result.data.menu) || Array.isArray(result.data.items)) {
        menuItemsData = result.data.menu || result.data.items;
        dataSource = 'result.data.menu/items';
      } else if (result.data && typeof result.data === 'object') {
        // Try to extract array from any property
        for (const key in result.data) {
          if (Array.isArray(result.data[key])) {
            menuItemsData = result.data[key];
            dataSource = `result.data.${key}`;
            break;
          }
        }
      } else if (Array.isArray(result)) {
        menuItemsData = result;
        dataSource = 'result (direct array)';
      }
      
      if (menuItemsData.length > 0) {
        logger.logDataFetch('Menu Items', menuItemsData, menuItemsData.length);
        logger.success(`Found ${menuItemsData.length} menu items from ${dataSource}`, { dataSource });
      } else {
        logger.warning('No menu items found in API response', { 
          resultStructure: Object.keys(result.data || {}),
          fullResponse: result.data 
        });
        logger.logMissingData('menu items', 'get_products.php response');
      }
      
      if (menuItemsData.length > 0) {
        logger.info(`Mapping ${menuItemsData.length} menu items`);
        
        // Map API response - the API joins with categories so catname is available
        const mappedItems = menuItemsData.map((item) => {
          // Log missing fields
          if (!item.dish_id && !item.id && !item.DishID) {
            logger.logMissingData('dish_id', 'menu item');
          }
          if (!item.name && !item.dish_name && !item.Name) {
            logger.logMissingData('name', 'menu item');
          }
          if (!item.price && !item.Price) {
            logger.logMissingData('price', 'menu item');
          }
          
          return {
            id: item.dish_id || item.id || item.DishID,
            dish_id: item.dish_id || item.id || item.DishID,
            name: item.name || item.dish_name || item.Name || '',
            barcode: item.barcode || '',
            description: item.description || item.desc || '',
            price: parseFloat(item.price || item.Price || 0),
            qnty: item.qnty || item.qty || item.quantity || '1',
            category_id: item.category_id || item.CategoryID || null,
            category_name: item.catname || item.category_name || item.cat_name || '',
            is_available: item.is_available != null ? item.is_available : 1,
            is_frequent: item.is_frequent != null ? item.is_frequent : 1,
            status: (item.is_available != null ? item.is_available : 1) == 1 ? 'active' : 'inactive',
            discount: parseFloat(item.discount || 0),
            terminal: item.terminal || terminal,
            branch_id: item.branch_id || branchId,
          };
        }).filter(item => item.dish_id); // Filter out invalid entries
        
        logger.logDataMapping('API Menu Items', 'Mapped Menu Items', mappedItems.length);
        logger.success(`Successfully mapped ${mappedItems.length} menu items`, { 
          totalReceived: menuItemsData.length,
          successfullyMapped: mappedItems.length 
        });
        setMenuItems(mappedItems);
        setAlert({ type: '', message: '' }); // Clear any previous errors
      } else if (result.data && result.data.success === false) {
        // Error response
        const errorMsg = result.data.message || result.data.error || 'Failed to load menu items';
        console.error('❌ API returned error:', errorMsg);
        setAlert({ type: 'error', message: errorMsg });
        setMenuItems([]);
      } else {
        // Empty result
        console.warn('⚠️ No menu items found for this branch');
        setMenuItems([]);
        if (!result.success) {
          setAlert({ type: 'warning', message: 'No menu items found. Click "Add Menu Item" to create one.' });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching menu items:', error);
      setAlert({ type: 'error', message: 'Failed to load menu items: ' + (error.message || 'Network error') });
      setLoading(false);
      setMenuItems([]);
    }
  };

  /**
   * Fetch categories for dropdown (Branch-Admin)
   * API: get_categories.php (POST with terminal and branch_id parameter)
   * Branch-Admin: Only fetch categories for their branch
   */
  const fetchCategories = async () => {
    try {
      const terminal = getTerminal();
      let branchId = getBranchId();
      
      // Ensure branch_id is valid
      if (branchId) {
        branchId = branchId.toString().trim();
        if (branchId === 'null' || branchId === 'undefined' || branchId === '') {
          branchId = null;
        } else {
          const numBranchId = parseInt(branchId, 10);
          if (isNaN(numBranchId) || numBranchId <= 0) {
            branchId = null;
          }
        }
      }
      
      // Branch-admin MUST have branch_id
      if (!branchId) {
        console.error('❌ Branch ID is missing for fetching categories');
        setCategories([]);
        return;
      }
      
      console.log('=== Fetching Categories for Menu (Branch Admin) ===');
      console.log('Params:', { terminal, branch_id: branchId });
      
      const result = await apiGet('/get_categories.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for branch-admin
      });
      
      console.log('get_categories.php response:', result);
      
      let categoriesData = [];
      
      // Handle multiple possible response structures
      if (result.data && Array.isArray(result.data)) {
        categoriesData = result.data;
        console.log('✅ Found categories in result.data (array)');
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        categoriesData = result.data.data;
        console.log('✅ Found categories in result.data.success.data');
      } else if (result.data && Array.isArray(result.data.categories)) {
        categoriesData = result.data.categories;
        console.log('✅ Found categories in result.data.categories');
      } else if (result.data && typeof result.data === 'object') {
        for (const key in result.data) {
          if (Array.isArray(result.data[key])) {
            categoriesData = result.data[key];
            console.log(`✅ Found categories in result.data.${key}`);
            break;
          }
        }
      }
      
      if (categoriesData.length > 0) {
        const mappedCategories = categoriesData.map((cat) => ({
          id: cat.category_id || cat.id || cat.CategoryID,
          category_id: cat.category_id || cat.id || cat.CategoryID,
          name: cat.name || cat.category_name || cat.Name || '',
        })).filter(cat => cat.category_id); // Filter out invalid entries
        
        console.log('✅ Mapped categories:', mappedCategories);
        setCategories(mappedCategories);
      } else {
        console.warn('⚠️ No categories found for this branch');
        setCategories([]);
      }
    } catch (error) {
      console.error('❌ Failed to load categories:', error);
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
      let branchId = getBranchId();
      
      // Ensure branch_id is valid
      if (branchId) {
        branchId = branchId.toString().trim();
        if (branchId === 'null' || branchId === 'undefined' || branchId === '') {
          branchId = null;
        } else {
          const numBranchId = parseInt(branchId, 10);
          if (isNaN(numBranchId) || numBranchId <= 0) {
            branchId = null;
          }
        }
      }
      
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        return;
      }
      
      const data = {
        dish_id: editingItem ? editingItem.dish_id : '', // Empty for create
        category_id: formData.category_id,
        name: formData.name,
        description: formData.description || '',
        price: formData.price,
        is_available: formData.is_available ? 1 : 0,
        terminal: terminal,
        branch_id: branchId, // Always include branch_id for branch-admin
        discount: formData.discount || 0,
        kitchen_id: formData.kitchen_id || '',
      };
      
      console.log('Saving menu item with data:', data);

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
    <AdminLayout>
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
    </AdminLayout>
  );
}
