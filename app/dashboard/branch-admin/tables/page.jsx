'use client';

/**
 * Table Management Page
 * CRUD operations for tables and assign them to halls
 */

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, getTerminal, getBranchId } from '@/utils/api';

export default function TableManagementPage() {
  const [tables, setTables] = useState([]);
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({
    table_number: '',
    hall_id: '',
    capacity: '',
    status: 'available', // available, occupied, reserved, maintenance
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchTables();
    fetchHalls();
    
    // Auto-refresh tables every 10 seconds for real-time updates
    const interval = setInterval(() => {
      fetchTables();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  /**
   * Fetch all tables from API (Branch-Admin)
   * API: get_tables.php (POST with terminal and branch_id parameter)
   * Branch-Admin: Only fetch tables for their branch
   */
  const fetchTables = async () => {
    setLoading(true);
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
        console.error('❌ Branch ID is missing for branch-admin');
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        setTables([]);
        setLoading(false);
        return;
      }
      
      console.log('=== Fetching Tables (Branch Admin) ===');
      console.log('Params:', { terminal, branch_id: branchId });
      
      const result = await apiPost('/get_tables.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for branch-admin
      });
      
      console.log('get_tables.php response:', result);
      
      // The API returns a plain JSON array
      if (result.data && Array.isArray(result.data)) {
        // Map API response to match our table structure
        const mappedTables = result.data.map((table) => ({
          id: table.table_id || table.id || table.TableID,
          table_id: table.table_id || table.id || table.TableID,
          table_number: table.table_number || table.table_name || table.number || '',
          hall_id: table.hall_id || table.HallID || null,
          hall_name: table.hall_name || table.hall_Name || '',
          capacity: table.capacity || table.Capacity || 0,
          status: table.status || table.Status || 'available',
          terminal: table.terminal || terminal,
          branch_id: table.branch_id || branchId,
        })).filter(table => table.table_id); // Filter out invalid entries
        setTables(mappedTables);
      } else if (result.data && result.data.success === false) {
        // Error response
        setAlert({ type: 'error', message: result.data.message || 'Failed to load tables' });
        setTables([]);
      } else {
        // Empty result
        setTables([]);
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
   * Fetch all halls from API (Branch-Admin)
   * Only fetch halls for their branch
   */
  const fetchHalls = async () => {
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
        console.error('❌ Branch ID is missing for fetching halls');
        setHalls([]);
        return;
      }
      
      console.log('=== Fetching Halls for Tables (Branch Admin) ===');
      console.log('Params:', { terminal, branch_id: branchId });
      
      const result = await apiPost('/get_halls.php', { 
        terminal,
        branch_id: branchId  // Always include branch_id for branch-admin
      });
      
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
        })).filter(hall => hall.hall_id); // Filter out invalid entries
        
        console.log('✅ Mapped halls:', mappedHalls);
        setHalls(mappedHalls);
      } else {
        console.warn('⚠️ No halls found for this branch');
        setHalls([]);
      }
    } catch (error) {
      console.error('Failed to load halls:', error);
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
        table_id: editingTable ? editingTable.table_id : '', // Empty for create
        hall_id: formData.hall_id,
        table_number: formData.table_number,
        capacity: formData.capacity || 0,
        status: formData.status,
        terminal: terminal,
        branch_id: branchId, // Always include branch_id for branch-admin
      };
      
      console.log('Saving table with data:', data);

      const result = await apiPost('/table_management.php', data);

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'Table saved successfully!' });
        setFormData({
          table_number: '',
          hall_id: '',
          capacity: '',
          status: 'available',
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
      status: table.status || 'available',
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
      const branchId = getBranchId();
      
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID is missing. Please log in again.' });
        return;
      }
      
      const result = await apiDelete('/table_management.php', { 
        table_id: tableId,
        branch_id: branchId // Include branch_id for branch-admin
      });

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
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
            <p className="text-gray-600 mt-1">Manage tables and assign them to halls</p>
          </div>
          <Button
            onClick={() => {
              setEditingTable(null);
              setFormData({
                table_number: '',
                hall_id: '',
                capacity: '',
                status: 'available',
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
                Hall <span className="text-red-500">*</span>
              </label>
              <select
                name="hall_id"
                value={formData.hall_id}
                onChange={(e) => setFormData({ ...formData, hall_id: e.target.value })}
                required
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
              >
                <option value="">Select a hall</option>
                {halls.map((hall) => (
                  <option key={hall.hall_id} value={hall.hall_id}>
                    {hall.name}
                  </option>
                ))}
              </select>
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
    </AdminLayout>
  );
}
