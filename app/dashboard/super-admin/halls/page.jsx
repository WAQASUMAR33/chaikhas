'use client';

/**
 * Hall Management Page
 * Full CRUD operations for halls
 * Uses real APIs: get_halls.php, hall_management.php
 * Database: halls table (hall_id, name, capacity, terminal, created_at, updated_at)
 */

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, getTerminal } from '@/utils/api';
import { Building2, Plus, Edit, Trash2, Search, X, RefreshCw } from 'lucide-react';

export default function HallManagementPage() {
  const [halls, setHalls] = useState([]);
  const [filteredHalls, setFilteredHalls] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(''); // Filter by branch
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    branch_id: '', // For super-admin to select branch
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchBranches();
    fetchHalls();
    
    // Auto-refresh halls every 15 seconds for real-time updates
    const interval = setInterval(() => {
      fetchHalls(true);
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Re-fetch halls when branch filter changes
    fetchHalls();
  }, [selectedBranchFilter]);

  /**
   * Fetch branches for super admin
   */
  const fetchBranches = async () => {
    try {
      console.log('=== Fetching Branches (Super Admin - Halls) ===');
      const result = await apiPost('/branch_management.php', { action: 'get' });
      console.log('Branches API response:', result);
      
      let branchesData = [];
      if (result.data && Array.isArray(result.data)) {
        branchesData = result.data;
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        branchesData = result.data.data;
      } else if (result.data && Array.isArray(result.data.branches)) {
        branchesData = result.data.branches;
      }
      
      console.log(`Total branches found: ${branchesData.length}`);
      setBranches(branchesData);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  // Filter halls based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredHalls(halls);
    } else {
      const filtered = halls.filter(hall =>
        hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hall.id.toString().includes(searchTerm) ||
        (hall.capacity && hall.capacity.toString().includes(searchTerm))
      );
      setFilteredHalls(filtered);
    }
  }, [searchTerm, halls]);

  /**
   * Fetch all halls from API (Super-Admin)
   * API: get_halls.php (POST with terminal, branch_id is optional for filtering)
   * Super-admin: When branch_id is null/empty, fetch ALL halls from ALL branches
   * API should return branch_id and branch_name with each hall
   */
  const fetchHalls = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setAlert({ type: '', message: '' });
    
    try {
      const terminal = getTerminal();
      
      // Build payload - include branch_id only if filtering by branch
      const payload = { terminal };
      if (selectedBranchFilter) {
        payload.branch_id = selectedBranchFilter;
      }
      // If selectedBranchFilter is empty, don't include branch_id - API will return all
      
      console.log('=== Fetching Halls (Super Admin) ===');
      console.log('Params:', payload);
      
      const result = await apiPost('/get_halls.php', payload);
      
      console.log('get_halls.php response:', result);
      
      // Handle different response structures
      let hallsData = [];
      
      if (result.success && result.data) {
        // Check if data is an array directly
        if (Array.isArray(result.data)) {
          hallsData = result.data;
        }
        // Check if data is nested: { success: true, data: [...] }
        else if (result.data.data && Array.isArray(result.data.data)) {
          hallsData = result.data.data;
        }
        // Check if response has success field
        else if (result.data.success === false) {
          setAlert({ type: 'error', message: result.data.message || 'Failed to load halls' });
          setHalls([]);
          setFilteredHalls([]);
          if (showRefreshing) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
          return;
        }
      }

      // Map API response to match database schema
      const mappedHalls = hallsData.map((hall) => {
        // Format dates if available
        let formattedCreatedAt = hall.created_at || '';
        let formattedUpdatedAt = hall.updated_at || '';
        
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

        // Get branch info for super-admin
        const branchId = hall.branch_id || hall.branch_ID || null;
        const branchName = hall.branch_name || hall.branch_Name || null;
        
        // Try to find branch name from branches list if not provided by API
        let displayBranchName = branchName;
        if (!displayBranchName && branchId) {
          const branch = branches.find(b => (b.branch_id || b.id || b.ID) == branchId);
          displayBranchName = branch ? (branch.name || branch.branch_name || branch.title || `Branch ${branchId}`) : `Branch ${branchId}`;
        } else if (!displayBranchName && branchId) {
          displayBranchName = `Branch ${branchId}`;
        }
        
        return {
          id: hall.hall_id || hall.id,
          hall_id: hall.hall_id || hall.id,
          name: hall.name || '',
          capacity: hall.capacity || 0,
          terminal: hall.terminal || terminal,
          branch_id: branchId,
          branch_name: displayBranchName || 'Unknown Branch',
          created_at: formattedCreatedAt || hall.created_at || 'N/A',
          updated_at: formattedUpdatedAt || hall.updated_at || 'N/A',
          raw_created_at: hall.created_at || '',
          raw_updated_at: hall.updated_at || '',
        };
      });

      // Sort by branch_id first, then ID descending (newest first)
      mappedHalls.sort((a, b) => {
        if (a.branch_id !== b.branch_id) {
          return (a.branch_id || 0) - (b.branch_id || 0);
        }
        return (b.id || 0) - (a.id || 0);
      });
      
      setHalls(mappedHalls);
      setFilteredHalls(mappedHalls);
    } catch (error) {
      console.error('Error fetching halls:', error);
      setAlert({ 
        type: 'error', 
        message: 'Failed to load halls: ' + (error.message || 'Network error') 
      });
      setHalls([]);
      setFilteredHalls([]);
    } finally {
      if (showRefreshing) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  /**
   * Handle form submission (Create or Update)
   * API: hall_management.php (POST)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    // Validate form
    if (!formData.name || formData.name.trim() === '') {
      setAlert({ type: 'error', message: 'Hall name is required' });
      return;
    }

    try {
      const terminal = getTerminal();
      
      // Super-admin: Must select a branch when creating hall
      const branchId = formData.branch_id || (editingHall ? editingHall.branch_id : null);
      
      if (!branchId) {
        setAlert({ type: 'error', message: 'Please select a branch for this hall' });
        return;
      }
      
      const data = {
        hall_id: editingHall ? editingHall.id : '', // Empty for create
        name: formData.name.trim(),
        capacity: formData.capacity ? parseInt(formData.capacity) : 0,
        terminal: terminal,
        branch_id: branchId, // Include branch_id for super-admin
      };
      
      console.log('Saving hall with data:', data);

      const result = await apiPost('/hall_management.php', data);

      // Handle different response structures
      const isSuccess = result.success && result.data && (
        result.data.success === true || 
        (result.data.message && result.data.message.toLowerCase().includes('success'))
      );

      if (isSuccess) {
        setAlert({ 
          type: 'success', 
          message: result.data.message || (editingHall ? 'Hall updated successfully!' : 'Hall created successfully!')
        });
        setFormData({ name: '', capacity: '' });
        setEditingHall(null);
        setModalOpen(false);
        fetchHalls(); // Refresh list
      } else {
        setAlert({ 
          type: 'error', 
          message: result.data?.message || 'Failed to save hall' 
        });
      }
    } catch (error) {
      console.error('Error saving hall:', error);
      setAlert({ 
        type: 'error', 
        message: 'Failed to save hall: ' + (error.message || 'Network error') 
      });
    }
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (hall) => {
    setEditingHall(hall);
    setFormData({
      name: hall.name || '',
      capacity: hall.capacity || '',
      branch_id: hall.branch_id || '',
    });
    setModalOpen(true);
  };

  /**
   * Handle delete button click
   * API: hall_management.php (DELETE)
   */
  const handleDelete = async (hallId) => {
    if (!window.confirm('Are you sure you want to delete this hall? This action cannot be undone. All tables assigned to this hall will need to be reassigned.')) {
      return;
    }

    try {
      const result = await apiDelete('/hall_management.php', { hall_id: hallId });

      // Handle different response structures
      const isSuccess = result.success && result.data && (
        result.data.success === true || 
        (result.data.message && result.data.message.toLowerCase().includes('success'))
      );

      if (isSuccess) {
        setAlert({ 
          type: 'success', 
          message: result.data.message || 'Hall deleted successfully!' 
        });
        fetchHalls(); // Refresh list
      } else {
        setAlert({ 
          type: 'error', 
          message: result.data?.message || 'Failed to delete hall' 
        });
      }
    } catch (error) {
      console.error('Error deleting hall:', error);
      setAlert({ 
        type: 'error', 
        message: 'Failed to delete hall: ' + (error.message || 'Network error') 
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
      header: 'Hall Name',
      accessor: 'name',
      className: 'min-w-[200px] font-medium',
    },
    {
      header: 'Capacity',
      accessor: 'capacity',
      className: 'w-24 text-center',
      wrap: false,
    },
    {
      header: 'Branch',
      accessor: 'branch_name',
      render: (row) => row.branch_name || (row.branch_id ? `Branch ${row.branch_id}` : 'Unknown'),
      className: 'min-w-[120px]',
      wrap: false,
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Hall Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Manage restaurant halls and their capacity across all branches
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchHalls(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              onClick={() => {
                setEditingHall(null);
                setFormData({ name: '', capacity: '', branch_id: '' });
                setModalOpen(true);
              }}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Hall</span>
            </Button>
          </div>
        </div>

        {/* Alert Message */}
        {alert.message && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert({ type: '', message: '' })}
          />
        )}

        {/* Branch Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Branch
          </label>
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
          >
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.branch_id || branch.id || branch.ID} value={branch.branch_id || branch.id || branch.ID}>
                {branch.name || branch.branch_name || branch.title || `Branch ${branch.branch_id || branch.id}`}
              </option>
            ))}
          </select>
          {selectedBranchFilter && (
            <p className="text-xs text-gray-500 mt-2">Showing halls for selected branch only</p>
          )}
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID, or capacity..."
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
                <p className="text-sm font-medium text-gray-600">Total Halls</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {halls.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {filteredHalls.length}
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
                <Building2 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Halls Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#FF5F15] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500">Loading halls...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table
              columns={columns}
              data={filteredHalls}
              actions={actions}
              emptyMessage={
                searchTerm
                  ? `No halls found matching "${searchTerm}"`
                  : "No halls found. Click 'Add Hall' to create one."
              }
            />
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingHall(null);
            setFormData({ name: '', capacity: '', branch_id: '' });
            setAlert({ type: '', message: '' });
          }}
          title={editingHall ? 'Edit Hall' : 'Add New Hall'}
          size="md"
          showCloseButton={true}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Hall Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Hall, VIP Hall, Outdoor"
              required
              autoFocus
            />

            <Input
              label="Capacity (Optional)"
              name="capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="Total seating capacity"
              min="0"
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Branch <span className="text-red-500">*</span>
              </label>
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                required
                disabled={!!editingHall} // Can't change branch when editing
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select a branch</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id || branch.id || branch.ID} value={branch.branch_id || branch.id || branch.ID}>
                    {branch.name || branch.branch_name || branch.title || `Branch ${branch.branch_id || branch.id}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {editingHall ? 'Branch cannot be changed when editing' : 'Select which branch this hall belongs to'}
              </p>
            </div>

            {editingHall && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p><strong>ID:</strong> {editingHall.id}</p>
                <p><strong>Terminal:</strong> {editingHall.terminal}</p>
                {editingHall.raw_created_at && (
                  <p><strong>Created:</strong> {editingHall.created_at}</p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingHall(null);
                  setFormData({ name: '', capacity: '', branch_id: '' });
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
                {editingHall ? 'Update Hall' : 'Create Hall'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}

