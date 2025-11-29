'use client';

/**
 * Customer Management Page - Branch Admin
 * Full CRUD operations for credit customers
 * Shows only customers for the current branch
 * Uses APIs: api/customer_management.php (GET for fetch, POST for create/update, DELETE for delete)
 */

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, apiGet, getBranchId, getTerminal } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { Users, Plus, Edit, Trash2, Search, X, Phone, Mail, MapPin } from 'lucide-react';

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '',
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer => {
        const name = customer.customer_name?.toLowerCase() || '';
        const phone = customer.phone?.toLowerCase() || '';
        const email = customer.email?.toLowerCase() || '';
        const searchLower = searchTerm.toLowerCase();
        return (
          name.includes(searchLower) ||
          phone.includes(searchLower) ||
          email.includes(searchLower) ||
          customer.id.toString().includes(searchTerm)
        );
      });
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  /**
   * Fetch all customers for current branch
   * API: api/customer_management.php (GET with branch_id for fetching)
   */
  const fetchCustomers = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    
    try {
      const branchId = getBranchId();
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID not found. Please login again.' });
        setLoading(false);
        return;
      }

      // Use GET method to fetch customers
      const result = await apiGet('api/customer_management.php', { 
        branch_id: branchId 
      });
      
      // Handle different response structures
      let customersData = [];
      
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          customersData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          customersData = result.data.data;
        } else if (result.data.success === false) {
          setAlert({ type: 'error', message: result.data.message || 'Failed to load customers' });
          setCustomers([]);
          setFilteredCustomers([]);
          setLoading(false);
          return;
        }
      }

      // Map API response - API returns: { id, customer_id, name, phone, email, address, credit, balance, ... }
      const mappedCustomers = customersData.map(customer => ({
        id: customer.id || customer.customer_id,
        customer_id: customer.customer_id || customer.id,
        customer_name: customer.name || customer.customer_name || '',
        phone: customer.phone || customer.mobileNo || '',
        email: customer.email || '',
        address: customer.address || '',
        credit_limit: parseFloat(customer.credit_limit || customer.credit || 0),
        balance: parseFloat(customer.balance || 0),
        branch_id: customer.branch_id,
        created_at: customer.created_at || '',
      }));

      setCustomers(mappedCustomers);
      setFilteredCustomers(mappedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setAlert({ type: 'error', message: 'Failed to load customers: ' + (error.message || 'Network error') });
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form submission (Create or Update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    // Validation
    if (!formData.customer_name.trim()) {
      setAlert({ type: 'error', message: 'Customer name is required' });
      return;
    }

    try {
      const branchId = getBranchId();
      const terminal = getTerminal();
      
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID not found. Please login again.' });
        return;
      }

      // API expects: name (not customer_name), credit (not credit_limit)
      const data = {
        name: formData.customer_name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        credit: parseFloat(formData.credit_limit) || 0,
        credit_limit: parseFloat(formData.credit_limit) || 0, // Send both for compatibility
        branch_id: branchId,
        terminal: terminal || 1,
      };

      console.log('Submitting customer data:', data);
      
      if (editingCustomer) {
        // Update existing customer
        data.id = editingCustomer.id;
        const result = await apiPost('api/customer_management.php', data);
        
        console.log('Update customer result:', result);
        
        // Improved success detection - handle various response formats
        let isSuccess = false;
        let errorMessage = 'Failed to update customer';
        
        if (result.success) {
          // HTTP request was successful
          if (result.data) {
            const apiResponse = result.data;
            
            // Check multiple success indicators
            if (apiResponse.success === true || 
                apiResponse.success === 'true' ||
                apiResponse.status === 'success' ||
                apiResponse.status === 'Success') {
              // Explicit success
              isSuccess = true;
            } else if (apiResponse.success === false || apiResponse.status === 'error') {
              // Explicit failure
              errorMessage = apiResponse.message || apiResponse.error || errorMessage;
            } else if (apiResponse.id || apiResponse.customer_id || apiResponse.name) {
              // If response contains customer data (id, customer_id, or name), assume success
              isSuccess = true;
            } else if (typeof apiResponse === 'object' && Object.keys(apiResponse).length === 0) {
              // Empty object might indicate success (some APIs return {} on success)
              isSuccess = true;
            }
          } else {
            // No data but HTTP success - might be empty response (success)
            isSuccess = true;
          }
        }
        
        if (isSuccess) {
          setAlert({ type: 'success', message: 'Customer updated successfully' });
          setModalOpen(false);
          setEditingCustomer(null);
          setFormData({ customer_name: '', phone: '', email: '', address: '', credit_limit: '' });
          fetchCustomers();
        } else {
          console.error('Customer update failed:', result);
          setAlert({ type: 'error', message: errorMessage });
        }
      } else {
        // Create new customer
        const result = await apiPost('api/customer_management.php', data);
        
        console.log('Create customer result:', result);
        
        // Improved success detection - handle various response formats
        let isSuccess = false;
        let errorMessage = 'Failed to create customer';
        
        if (result.success) {
          // HTTP request was successful
          if (result.data) {
            const apiResponse = result.data;
            
            // Check multiple success indicators
            if (apiResponse.success === true || 
                apiResponse.success === 'true' ||
                apiResponse.status === 'success' ||
                apiResponse.status === 'Success') {
              // Explicit success
              isSuccess = true;
            } else if (apiResponse.success === false || apiResponse.status === 'error') {
              // Explicit failure
              errorMessage = apiResponse.message || apiResponse.error || errorMessage;
            } else if (apiResponse.id || apiResponse.customer_id || apiResponse.name) {
              // If response contains customer data (id, customer_id, or name), assume success
              isSuccess = true;
            } else if (typeof apiResponse === 'object' && Object.keys(apiResponse).length === 0) {
              // Empty object might indicate success (some APIs return {} on success)
              isSuccess = true;
            }
          } else {
            // No data but HTTP success - might be empty response (success)
            isSuccess = true;
          }
        }
        
        if (isSuccess) {
          setAlert({ type: 'success', message: 'Customer created successfully' });
          setModalOpen(false);
          setFormData({ customer_name: '', phone: '', email: '', address: '', credit_limit: '' });
          fetchCustomers();
        } else {
          console.error('Customer creation failed:', result);
          setAlert({ type: 'error', message: errorMessage });
        }
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setAlert({ type: 'error', message: 'Failed to save customer: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Handle delete customer
   */
  const handleDelete = async (customerId) => {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      const result = await apiDelete('api/customer_management.php', { id: customerId });
      
      if (result.success) {
        setAlert({ type: 'success', message: 'Customer deleted successfully' });
        fetchCustomers();
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to delete customer' });
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      setAlert({ type: 'error', message: 'Failed to delete customer: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Open edit modal
   */
  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_name: customer.customer_name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      credit_limit: customer.credit_limit || '',
    });
    setModalOpen(true);
  };

  /**
   * Table columns configuration
   */
  const columns = [
    { 
      header: 'ID', 
      accessor: 'id',
      className: 'w-20',
      wrap: false,
    },
    { 
      header: 'Customer Name', 
      accessor: 'customer_name',
      className: 'min-w-[200px]',
    },
    { 
      header: 'Phone', 
      accessor: 'phone',
      className: 'min-w-[150px]',
    },
    { 
      header: 'Email', 
      accessor: 'email',
      className: 'min-w-[200px]',
    },
    { 
      header: 'Address', 
      accessor: 'address',
      className: 'min-w-[250px]',
    },
    {
      header: 'Credit Limit',
      accessor: (row) => <span className="font-semibold">{formatPKR(row.credit_limit || 0)}</span>,
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-24',
      wrap: false,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-gray-600 mt-1">Manage credit customers for your branch</p>
          </div>
          <Button
            onClick={() => {
              setEditingCustomer(null);
              setFormData({ customer_name: '', phone: '', email: '', address: '', credit_limit: '' });
              setModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Customer
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Customers Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Loading customers...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredCustomers}
            emptyMessage="No customers found. Click 'Add Customer' to create one."
          />
        )}

        {/* Add/Edit Customer Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingCustomer(null);
            setFormData({ customer_name: '', phone: '', email: '', address: '', credit_limit: '' });
          }}
          title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Enter customer name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <MapPin className="w-4 h-4 inline mr-1" />
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter customer address"
                rows={3}
                className="block w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Credit Limit (PKR)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum credit amount allowed for this customer
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingCustomer(null);
                  setFormData({ customer_name: '', phone: '', email: '', address: '', credit_limit: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingCustomer ? 'Update Customer' : 'Create Customer'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}

