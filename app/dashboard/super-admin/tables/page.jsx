'use client';

/**
 * Table Management Page
 * CRUD operations for tables and assign them to halls
 */

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiGet, apiPost, apiDelete, getTerminal } from '@/utils/api';

export default function TableManagementPage() {
  const [tables, setTables] = useState([]);
  const [halls, setHalls] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(''); // Filter by branch
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({
    table_number: '',
    hall_id: '',
    capacity: '',
    status: 'available', // available, occupied, reserved, maintenance
    branch_id: '', // For super-admin to select branch
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchBranches();
    fetchTables();
    fetchHalls();
    
    // Auto-refresh tables every 10 seconds for real-time updates
    const interval = setInterval(() => {
      fetchTables();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Re-fetch tables and halls when branch filter changes
    fetchTables();
    fetchHalls();
  }, [selectedBranchFilter]);

  /**
   * Fetch branches for super admin
   */
  const fetchBranches = async () => {
    try {
      console.log('=== Fetching Branches (Super Admin - Tables) ===');
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

  /**
   * Fetch all tables from API (Super-Admin)
   * API: get_tables.php (POST with terminal, branch_id is optional for filtering)
   * Super-admin: When branch_id is null/empty, fetch ALL tables from ALL branches
   * API should return branch_id and branch_name with each table
   */
  const fetchTables = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      
      // Build payload - include branch_id only if filtering by branch
      const payload = { terminal };
      if (selectedBranchFilter) {
        payload.branch_id = selectedBranchFilter;
      }
      // If selectedBranchFilter is empty, don't include branch_id - API will return all
      
      console.log('=== Fetching Tables (Super Admin) ===');
      console.log('Params:', payload);
      
      const result = await apiPost('/get_tables.php', payload);
      
      console.log('get_tables.php response:', result);
      
      let tablesData = [];
      
      // Handle multiple possible response structures
      // Case 1: Direct array in result.data
      if (result.data && Array.isArray(result.data)) {
        tablesData = result.data;
        console.log('✅ Found tables in result.data (array), count:', tablesData.length);
      } 
      // Case 2: Array in result.data.data
      else if (result.data && result.data.data && Array.isArray(result.data.data)) {
        tablesData = result.data.data;
        console.log('✅ Found tables in result.data.data (array), count:', tablesData.length);
      }
      // Case 3: Array in result.data.tables
      else if (result.data && result.data.tables && Array.isArray(result.data.tables)) {
        tablesData = result.data.tables;
        console.log('✅ Found tables in result.data.tables (array), count:', tablesData.length);
      }
      // Case 4: Success object with data array
      else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        tablesData = result.data.data;
        console.log('✅ Found tables in result.data.success.data (array), count:', tablesData.length);
      }
      // Case 5: Search for any array in result.data object
      else if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        for (const key in result.data) {
          if (Array.isArray(result.data[key])) {
            tablesData = result.data[key];
            console.log(`✅ Found tables in result.data.${key} (array), count:`, tablesData.length);
            break;
          }
        }
      }
      
      if (tablesData.length > 0) {
        // Map API response - include branch_id and branch_name from API response
        const mappedTables = tablesData.map((table) => {
          const branchId = table.branch_id || table.branch_ID || null;
          const branchName = table.branch_name || table.branch_Name || null;
          
          // Try to find branch name from branches list if not provided by API
          let displayBranchName = branchName;
          if (!displayBranchName && branchId) {
            const branch = branches.find(b => (b.branch_id || b.id || b.ID) == branchId);
            displayBranchName = branch ? (branch.name || branch.branch_name || branch.title || `Branch ${branchId}`) : `Branch ${branchId}`;
          } else if (!displayBranchName && branchId) {
            displayBranchName = `Branch ${branchId}`;
          }
          
          return {
            id: table.table_id || table.id || table.TableID,
            table_id: table.table_id || table.id || table.TableID,
            table_number: table.table_number || table.table_name || table.number || '',
            hall_id: table.hall_id || table.HallID || null,
            hall_name: table.hall_name || table.hall_Name || '',
            capacity: table.capacity || table.Capacity || 0,
            status: table.status || table.Status || 'available',
            terminal: table.terminal || terminal,
            branch_id: branchId,
            branch_name: displayBranchName || 'Unknown Branch',
          };
        }).filter(table => table.table_id); // Filter out invalid entries
        
        // Sort by branch_id first, then table_id
        mappedTables.sort((a, b) => {
          if (a.branch_id !== b.branch_id) {
            return (a.branch_id || 0) - (b.branch_id || 0);
          }
          return (a.table_id || 0) - (b.table_id || 0);
        });
        
        console.log('✅ Mapped tables with branch info:', mappedTables);
        setTables(mappedTables);
        setAlert({ type: '', message: '' }); // Clear any previous errors
      } 
      // Case: Empty array - no tables found (valid response)
      else if (result.success && (Array.isArray(result.data) || (result.data && Array.isArray(result.data)))) {
        console.log('✅ Empty tables array (no tables found)');
        setTables([]);
        setAlert({ type: '', message: '' });
      }
      // Case: Error response
      else if (result.data && result.data.success === false) {
        // Error response
        const errorMsg = result.data.message || result.data.error || 'Failed to load tables';
        console.error('❌ API returned error:', errorMsg);
        setAlert({ type: 'error', message: errorMsg });
        setTables([]);
      } 
      // Case: Unexpected response structure
      else {
        // Empty result or unexpected structure
        console.warn('⚠️ No tables found or unexpected response structure:', result);
        setTables([]);
        if (!result.success) {
          setAlert({ type: 'warning', message: result.data?.message || 'No tables found. Click "Add Table" to create one.' });
        } else {
          // If API call succeeded but no data, it might just be empty
          setAlert({ type: '', message: '' });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tables:', error);
      setAlert({ type: 'error', message: 'Failed to load tables: ' + (error.message || 'Network error') });
      setLoading(false);
      setTables([]);
    }
  };

  /**
   * Fetch all halls from API (Super-Admin)
   * Fetch all halls or filter by selected branch
   */
  const fetchHalls = async () => {
    try {
      const terminal = getTerminal();
      
      // Build payload - include branch_id only if filtering by branch
      const payload = { terminal };
      if (selectedBranchFilter) {
        payload.branch_id = selectedBranchFilter;
      }
      // If selectedBranchFilter is empty, don't include branch_id - API will return all
      
      console.log('=== Fetching Halls for Tables (Super Admin) ===');
      console.log('Params:', payload);
      
      const result = await apiPost('/get_halls.php', payload);
      
      console.log('get_halls.php response:', result);
      
      let hallsData = [];
      
      // Handle multiple possible response structures
      if (result.data && Array.isArray(result.data)) {
        hallsData = result.data;
        console.log('✅ Found halls in result.data (array)');
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        hallsData = result.data.data;
        console.log('✅ Found halls in result.data.success.data');
      } else if (result.data && typeof result.data === 'object') {
        for (const key in result.data) {
          if (Array.isArray(result.data[key])) {
            hallsData = result.data[key];
            console.log(`✅ Found halls in result.data.${key}`);
            break;
          }
        }
      }
      
      if (hallsData.length > 0) {
        const mappedHalls = hallsData.map((hall) => ({
          id: hall.hall_id || hall.id || hall.HallID,
          hall_id: hall.hall_id || hall.id || hall.HallID,
          name: hall.name || hall.hall_name || hall.Name || '',
          branch_id: hall.branch_id || null,
        })).filter(hall => hall.hall_id); // Filter out invalid entries
        
        // Filter by selected branch if filter is set
        const filteredHalls = selectedBranchFilter 
          ? mappedHalls.filter(hall => hall.branch_id == selectedBranchFilter)
          : mappedHalls;
        
        console.log('✅ Mapped halls:', filteredHalls);
        setHalls(filteredHalls);
      } else {
        console.warn('⚠️ No halls found');
        setHalls([]);
      }
    } catch (error) {
      console.error('❌ Failed to load halls:', error);
      setHalls([]);
    }
  };

  /**
   * Handle form submission (Create or Update)
   * API: table_management.php (POST)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    try {
      const terminal = getTerminal();
      
      // Super-admin: Must select a branch when creating table
      const branchId = formData.branch_id || (editingTable ? editingTable.branch_id : null);
      
      if (!branchId) {
        setAlert({ type: 'error', message: 'Please select a branch for this table' });
        return;
      }
      
      const data = {
        table_id: editingTable ? editingTable.table_id : '', // Empty for create
        hall_id: formData.hall_id,
        table_number: formData.table_number,
        capacity: formData.capacity || 0,
        status: (formData.status || 'available').toLowerCase(), // Normalize status to lowercase
        terminal: terminal,
        branch_id: branchId, // Include branch_id for super-admin
        action: editingTable ? 'update' : 'create', // Specify action for API
      };
      
      console.log('Saving table with data:', data);
      console.log('Action:', editingTable ? 'Update' : 'Create');

      const result = await apiPost('/table_management.php', data);

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'Table saved successfully!' });
        setFormData({
          table_number: '',
          hall_id: '',
          capacity: '',
          status: 'available',
          branch_id: '',
        });
        setEditingTable(null);
        setModalOpen(false);
        fetchTables(); // Refresh list
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to save table' });
      }
    } catch (error) {
      console.error('Error saving table:', error);
      setAlert({ type: 'error', message: 'Failed to save table: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (table) => {
    setEditingTable(table);
    setFormData({
      table_number: table.table_number,
      hall_id: table.hall_id,
      capacity: table.capacity,
      status: (table.status || 'available').toLowerCase(), // Normalize status to lowercase
      branch_id: table.branch_id || '',
    });
    setModalOpen(true);
  };

  /**
   * Handle delete button click
   * API: table_management.php (DELETE)
   */
  const handleDelete = async (tableId) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      const result = await apiDelete('/table_management.php', { table_id: tableId });

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'Table deleted successfully!' });
        fetchTables(); // Refresh list
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to delete table' });
      }
    } catch (error) {
      console.error('Error deleting table:', error);
      setAlert({ type: 'error', message: 'Failed to delete table: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-red-100 text-red-800',
      reserved: 'bg-yellow-100 text-yellow-800',
      maintenance: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || colors.available;
  };

  /**
   * Table columns configuration
   */
  const columns = [
    { header: 'ID', accessor: 'table_id' },
    {
      header: 'Branch',
      accessor: 'branch_name',
      render: (row) => row.branch_name || (row.branch_id ? `Branch ${row.branch_id}` : 'Unknown'),
      className: 'min-w-[120px]',
      wrap: false,
    },
    { header: 'Table Number', accessor: 'table_number' },
    { header: 'Hall', accessor: 'hall_name' },
    { header: 'Capacity', accessor: 'capacity' },
    {
      header: 'Status',
      accessor: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(row.status)}`}>
          {row.status}
        </span>
      ),
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
        onClick={() => handleDelete(row.table_id)}
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
            <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
            <p className="text-gray-600 mt-1">Manage tables and assign them to halls across all branches</p>
          </div>
          <Button
            onClick={() => {
              setEditingTable(null);
              setFormData({
                table_number: '',
                hall_id: '',
                capacity: '',
                status: 'available',
                branch_id: '',
              });
              setModalOpen(true);
            }}
          >
            + Add Table
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
            <p className="text-xs text-gray-500 mt-2">Showing tables for selected branch only</p>
          )}
        </div>

        {/* Tables Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Loading tables...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={tables}
            actions={actions}
            emptyMessage="No tables found. Click 'Add Table' to create one."
          />
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingTable(null);
            setFormData({
              table_number: '',
              hall_id: '',
              capacity: '',
              status: 'available',
              branch_id: '',
            });
          }}
          title={editingTable ? 'Edit Table' : 'Add New Table'}
          size="md"
        >
          <form onSubmit={handleSubmit}>
            <Input
              label="Table Number"
              name="table_number"
              value={formData.table_number}
              onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
              placeholder="e.g., T1, T2"
              required
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
                disabled={!!editingTable} // Can't change branch when editing
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
                {editingTable ? 'Branch cannot be changed when editing' : 'Select which branch this table belongs to'}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hall <span className="text-red-500">*</span>
              </label>
              <select
                name="hall_id"
                value={formData.hall_id}
                onChange={(e) => setFormData({ ...formData, hall_id: e.target.value })}
                required
                disabled={!formData.branch_id && !editingTable} // Disable if no branch selected (when creating)
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select a hall</option>
                {halls
                  .filter(hall => !formData.branch_id || !editingTable || hall.branch_id == formData.branch_id || !hall.branch_id)
                  .map((hall) => (
                    <option key={hall.hall_id} value={hall.hall_id}>
                      {hall.name} {hall.branch_id ? `(Branch ${hall.branch_id})` : ''}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {!formData.branch_id && !editingTable ? 'Select a branch first' : 'Select which hall this table belongs to'}
              </p>
            </div>

            <Input
              label="Capacity"
              name="capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="Number of seats"
              required
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingTable(null);
                  setFormData({
                    table_number: '',
                    hall_id: '',
                    capacity: '',
                    status: 'available',
                    branch_id: '',
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingTable ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}
