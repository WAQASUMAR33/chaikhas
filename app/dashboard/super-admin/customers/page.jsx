'use client';

/**
 * Customer Management Page - Super Admin
 * Full CRUD operations for credit customers
 * Shows customers from all branches with branch filter
 * Uses APIs: api/customer_management.php (GET for fetch, POST for create/update, DELETE for delete)
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
import { Users, Plus, Edit, Trash2, Search, X, Phone, Mail, MapPin, Building2, FileText, Eye } from 'lucide-react';
import { getBranchId } from '@/utils/api';

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [creditBillsModalOpen, setCreditBillsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [creditBills, setCreditBills] = useState([]);
  const [loadingCreditBills, setLoadingCreditBills] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '',
    branch_id: '',
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    const loadData = async () => {
      await fetchBranches();
      await fetchCustomers();
    };
    loadData();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [selectedBranch]);

  // Filter customers based on search term and branch
  // Also re-map branch names when branches are loaded
  useEffect(() => {
    let filtered = customers.map(customer => {
      // Re-map branch name if branches are now loaded
      if (branches.length > 0 && (!customer.branch_name || customer.branch_name === 'N/A')) {
        const customerBranchId = customer.branch_id;
        const branch = branches.find(b => {
          const branchId = b.branch_id || b.id || b.branchId || b.branch_ID;
          return branchId == customerBranchId || branchId === customerBranchId;
        });
        const branchName = branch?.branch_name || branch?.name || branch?.branchName || 'N/A';
        return { ...customer, branch_name: branchName };
      }
      return customer;
    });

    // Filter by branch
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(customer => {
        const customerBranchId = customer.branch_id;
        const selectedBranchId = parseInt(selectedBranch);
        return customerBranchId == selectedBranchId || customerBranchId === selectedBranchId;
      });
    }

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => {
        const name = customer.customer_name?.toLowerCase() || '';
        const phone = customer.phone?.toLowerCase() || '';
        const email = customer.email?.toLowerCase() || '';
        return (
          name.includes(searchLower) ||
          phone.includes(searchLower) ||
          email.includes(searchLower) ||
          customer.id.toString().includes(searchTerm)
        );
      });
    }

    setFilteredCustomers(filtered);
  }, [searchTerm, selectedBranch, customers, branches]);

  /**
   * Fetch all branches
   */
  const fetchBranches = async () => {
    try {
      const result = await apiGet('api/branch_management.php');
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
   * Fetch credit statistics for a specific customer
   * API: api/bills_management.php or api/get_sales_report.php
   */
  const fetchCustomerCreditStats = async (customerId, branchId) => {
    try {
      if (!branchId || !customerId) {
        return { count: 0, total: 0 };
      }

      // Fetch credit bills for this customer
      const result = await apiGet('api/bills_management.php', {
        customer_id: customerId,
        branch_id: branchId,
        payment_status: 'Credit',
      });

      let billsData = [];
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          billsData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          billsData = result.data.data;
        } else if (result.data.bills && Array.isArray(result.data.bills)) {
          billsData = result.data.bills;
        }
      }

      // Filter to only credit bills
      const creditBills = billsData.filter(bill => {
        const paymentStatus = (bill.payment_status || '').toString().toLowerCase().trim();
        const paymentMethod = (bill.payment_method || '').toString().toLowerCase().trim();
        const isCredit = bill.is_credit === true || bill.is_credit === 1 || bill.is_credit === '1' ||
                        paymentStatus === 'credit' || paymentMethod === 'credit' ||
                        (paymentStatus === 'unpaid' && bill.customer_id && bill.customer_id == customerId);
        return isCredit && (bill.customer_id == customerId || bill.customer_id === customerId);
      });

      const total = creditBills.reduce((sum, bill) => {
        return sum + parseFloat(bill.grand_total || bill.total_amount || bill.net_total || 0);
      }, 0);

      return {
        count: creditBills.length,
        total: total,
      };
    } catch (error) {
      console.error('Error fetching customer credit stats:', error);
      return { count: 0, total: 0 };
    }
  };

  /**
   * Fetch credit bills for a specific customer
   */
  const fetchCustomerCreditBills = async (customerId, branchId) => {
    setLoadingCreditBills(true);
    try {
      if (!branchId || !customerId) {
        setCreditBills([]);
        setLoadingCreditBills(false);
        return;
      }

      // Fetch credit bills for this customer
      const result = await apiGet('api/bills_management.php', {
        customer_id: customerId,
        branch_id: branchId,
        payment_status: 'Credit',
      });

      let billsData = [];
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          billsData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          billsData = result.data.data;
        } else if (result.data.bills && Array.isArray(result.data.bills)) {
          billsData = result.data.bills;
        }
      }

      // Filter to only credit bills for this customer
      const creditBills = billsData.filter(bill => {
        const paymentStatus = (bill.payment_status || '').toString().toLowerCase().trim();
        const paymentMethod = (bill.payment_method || '').toString().toLowerCase().trim();
        const isCredit = bill.is_credit === true || bill.is_credit === 1 || bill.is_credit === '1' ||
                        paymentStatus === 'credit' || paymentMethod === 'credit' ||
                        (paymentStatus === 'unpaid' && bill.customer_id && bill.customer_id == customerId);
        return isCredit && (bill.customer_id == customerId || bill.customer_id === customerId);
      });

      // Sort by date (newest first)
      creditBills.sort((a, b) => {
        const dateA = new Date(a.created_at || a.date || 0);
        const dateB = new Date(b.created_at || b.date || 0);
        return dateB - dateA;
      });

      setCreditBills(creditBills);
    } catch (error) {
      console.error('Error fetching customer credit bills:', error);
      setCreditBills([]);
      setAlert({ type: 'error', message: 'Failed to load credit bills: ' + (error.message || 'Network error') });
    } finally {
      setLoadingCreditBills(false);
    }
  };

  /**
   * Open credit bills modal for a customer
   */
  const handleViewCreditBills = async (customer) => {
    setSelectedCustomer(customer);
    setCreditBillsModalOpen(true);
    await fetchCustomerCreditBills(customer.customer_id || customer.id, customer.branch_id);
  };

  /**
   * Fetch all customers
   */
  const fetchCustomers = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    
    try {
      const result = await apiGet('api/customer_management.php');
      
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
      const mappedCustomers = customersData.map(customer => {
        const customerBranchId = customer.branch_id || customer.branchId || customer.branch_ID;
        
        // Find branch name - check multiple possible field names
        const branch = branches.find(b => {
          const branchId = b.branch_id || b.id || b.branchId || b.branch_ID;
          return branchId == customerBranchId || branchId === customerBranchId;
        });
        
        const branchName = branch?.branch_name || branch?.name || branch?.branchName || 'N/A';
        
        return {
          id: customer.id || customer.customer_id,
          customer_id: customer.customer_id || customer.id,
          customer_name: customer.name || customer.customer_name || '',
          phone: customer.phone || customer.mobileNo || '',
          email: customer.email || '',
          address: customer.address || '',
          credit_limit: parseFloat(customer.credit_limit || customer.credit || 0),
          balance: parseFloat(customer.balance || 0),
          branch_id: customerBranchId,
          branch_name: branchName,
          created_at: customer.created_at || '',
          // Credit statistics (will be populated after fetching credit bills)
          credit_orders_count: customer.credit_orders_count || customer.total_credit_orders || 0,
          total_credit_amount: parseFloat(customer.total_credit_amount || customer.credit_amount || 0),
        };
      });

      // Fetch credit statistics for each customer in parallel
      const customersWithStats = await Promise.all(mappedCustomers.map(async (customer) => {
        try {
          const creditStats = await fetchCustomerCreditStats(customer.customer_id || customer.id, customer.branch_id);
          return {
            ...customer,
            credit_orders_count: creditStats.count,
            total_credit_amount: creditStats.total,
          };
        } catch (error) {
          console.error(`Error fetching credit stats for customer ${customer.id}:`, error);
          return {
            ...customer,
            credit_orders_count: 0,
            total_credit_amount: 0,
          };
        }
      }));

      setCustomers(customersWithStats);
      setFilteredCustomers(customersWithStats);
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

    if (!formData.customer_name.trim()) {
      setAlert({ type: 'error', message: 'Customer name is required' });
      return;
    }

    if (!formData.branch_id) {
      setAlert({ type: 'error', message: 'Please select a branch' });
      return;
    }

    try {
      // API expects: name (not customer_name), credit (not credit_limit)
      const data = {
        name: formData.customer_name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        credit: parseFloat(formData.credit_limit) || 0,
        credit_limit: parseFloat(formData.credit_limit) || 0, // Send both for compatibility
        branch_id: parseInt(formData.branch_id),
        terminal: 1,
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
          setFormData({ customer_name: '', phone: '', email: '', address: '', credit_limit: '', branch_id: '' });
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
          setFormData({ customer_name: '', phone: '', email: '', address: '', credit_limit: '', branch_id: '' });
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
      branch_id: customer.branch_id?.toString() || '',
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
      header: 'Credit Orders',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-600">{row.credit_orders_count || 0}</span>
          {row.credit_orders_count > 0 && (
            <button
              onClick={() => handleViewCreditBills(row)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
              title="View Credit Bills"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Total Credit Amount',
      accessor: (row) => (
        <span className="font-semibold text-amber-600">{formatPKR(row.total_credit_amount || 0)}</span>
      ),
      className: 'w-40',
      wrap: false,
    },
    {
      header: 'Branch',
      accessor: 'branch_name',
      className: 'min-w-[150px]',
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
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-gray-600 mt-1">Manage credit customers across all branches</p>
          </div>
          <Button
            onClick={() => {
              setEditingCustomer(null);
              setFormData({ customer_name: '', phone: '', email: '', address: '', credit_limit: '', branch_id: '' });
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Filter by Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15]"
              >
                <option value="all">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Search
              </label>
              <Input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
            setFormData({ customer_name: '', phone: '', email: '', address: '', credit_limit: '', branch_id: '' });
          }}
          title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Branch <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                required
              >
                <option value="">Select Branch</option>
                {branches.map(branch => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>

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
                  setFormData({ customer_name: '', phone: '', email: '', address: '', credit_limit: '', branch_id: '' });
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

        {/* Credit Bills Modal */}
        <Modal
          isOpen={creditBillsModalOpen}
          onClose={() => {
            setCreditBillsModalOpen(false);
            setSelectedCustomer(null);
            setCreditBills([]);
          }}
          title={selectedCustomer ? `Credit Bills - ${selectedCustomer.customer_name} (${selectedCustomer.branch_name})` : 'Credit Bills'}
          size="xl"
        >
          {loadingCreditBills ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Loading credit bills...</p>
            </div>
          ) : creditBills.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No credit bills found for this customer.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-amber-800 font-medium">Total Credit Bills: {creditBills.length}</p>
                    <p className="text-sm text-amber-700">
                      Total Amount: <span className="font-semibold">{formatPKR(creditBills.reduce((sum, bill) => sum + parseFloat(bill.grand_total || bill.total_amount || bill.net_total || 0), 0))}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {creditBills.map((bill, index) => (
                      <tr key={bill.bill_id || bill.id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {bill.bill_id || bill.id || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {bill.order_id || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {bill.created_at || bill.date ? new Date(bill.created_at || bill.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-amber-600">
                          {formatPKR(bill.grand_total || bill.total_amount || bill.net_total || 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                            Credit
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}

