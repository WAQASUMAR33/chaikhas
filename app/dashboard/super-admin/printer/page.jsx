'use client';

/**
 * Printer Management Page
 * Manage printer settings for receipts and kitchen
 * Uses real APIs: get_printers.php, printer_management.php
 */

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, getTerminal, getBranchId } from '@/utils/api';
import { Printer, TestTube } from 'lucide-react';

export default function PrinterManagementPage() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'receipt', // receipt or kitchen
    ip_address: '',
    port: '9100',
    status: 'active',
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchPrinters();
  }, []);

  /**
   * Fetch all printers from API
   * API: get_printers.php (POST with terminal parameter)
   */
  const fetchPrinters = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      const params = { terminal };
      if (branchId) {
        params.branch_id = branchId;
      }
      
      console.log('Fetching printers with params:', params);
      const result = await apiPost('/get_printers.php', params);
      console.log('Printers API response:', result);
      
      let printersData = [];
      
      if (result.success && result.data) {
        // Check if data is an array directly
        if (Array.isArray(result.data)) {
          printersData = result.data;
          console.log('Found printers in result.data (array):', printersData.length);
        } 
        // Check if data is nested: { success: true, data: [...] }
        else if (result.data.data && Array.isArray(result.data.data)) {
          printersData = result.data.data;
          console.log('Found printers in result.data.data:', printersData.length);
        }
        // Check if data is wrapped: { success: true, data: { printers: [...] } }
        else if (result.data.printers && Array.isArray(result.data.printers)) {
          printersData = result.data.printers;
          console.log('Found printers in result.data.printers:', printersData.length);
        }
        // Check if response has success field with false
        else if (result.data.success === false) {
          console.error('Printers API returned error:', result.data);
          setAlert({ type: 'error', message: result.data.message || 'Failed to load printers' });
          setPrinters([]);
          setLoading(false);
          return;
        }
        // Try to find any array in the response
        else if (typeof result.data === 'object') {
          for (const key in result.data) {
            if (Array.isArray(result.data[key])) {
              printersData = result.data[key];
              console.log(`Found printers in result.data.${key}:`, printersData.length);
              break;
            }
          }
        }
      } else if (!result.success) {
        console.error('Printers API request failed:', result);
        setAlert({ 
          type: 'error', 
          message: result.data?.message || 'Failed to load printers. Please check your connection.' 
        });
        setPrinters([]);
        setLoading(false);
        return;
      }
      
      // Map API response
      const mappedPrinters = printersData.map((printer) => ({
        id: printer.printer_id || printer.id,
        printer_id: printer.printer_id || printer.id,
        name: printer.name || printer.printer_name || '',
        type: printer.type || printer.printer_type || 'receipt',
        ip_address: printer.ip_address || printer.ip || '',
        port: printer.port || '9100',
        status: printer.status || 'active',
        terminal: printer.terminal || terminal,
        branch_id: printer.branch_id || branchId,
      }));
      
      setPrinters(mappedPrinters);
      if (mappedPrinters.length === 0) {
        console.warn('No printers found in response. Full response:', result);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching printers:', error);
      setAlert({ type: 'error', message: 'Failed to load printers: ' + (error.message || 'Network error') });
      setLoading(false);
      setPrinters([]);
    }
  };

  /**
   * Handle form submission (Create or Update)
   * API: printer_management.php (POST)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    // Validate required fields
    if (!formData.name || !formData.name.trim()) {
      setAlert({ type: 'error', message: 'Printer name is required' });
      return;
    }

    if (!formData.ip_address || !formData.ip_address.trim()) {
      setAlert({ type: 'error', message: 'IP address is required' });
      return;
    }

    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(formData.ip_address.trim())) {
      setAlert({ type: 'error', message: 'Please enter a valid IP address (e.g., 192.168.1.100)' });
      return;
    }

    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      // Ensure terminal is available
      if (!terminal) {
        setAlert({ type: 'error', message: 'Terminal ID is missing. Please log in again.' });
        return;
      }
      
      const data = {
        printer_id: editingPrinter ? editingPrinter.printer_id : '', // Empty for create
        name: formData.name.trim(),
        type: formData.type || 'receipt',
        ip_address: formData.ip_address.trim(),
        port: formData.port || '9100',
        status: formData.status || 'active',
        terminal: terminal, // Always include terminal
        action: editingPrinter ? 'update' : 'create'
      };
      
      // Always include branch_id if available
      if (branchId) {
        data.branch_id = branchId;
      }

      console.log('=== Saving Printer ===');
      console.log('Form data:', formData);
      console.log('Terminal:', terminal);
      console.log('Branch ID:', branchId);
      console.log('Payload being sent:', data);
      
      const result = await apiPost('/printer_management.php', data);
      
      console.log('=== Printer Save Result ===');
      console.log('Full result:', JSON.stringify(result, null, 2));
      console.log('Result success:', result.success);
      console.log('Result data:', result.data);

      // Handle different response structures
      // Check for success in multiple possible locations
      let isSuccess = false;
      let successMessage = '';
      let errorMessage = '';

      // First check: If result.data itself has success: true at top level
      if (result.data && result.data.success === true) {
        isSuccess = true;
        successMessage = result.data.message || 'Printer saved successfully!';
      }
      // Second check: If result.data.success exists and is true
      else if (result.success && result.data && (result.data.success === true || result.data.success === 'true')) {
        isSuccess = true;
        successMessage = result.data.message || 'Printer saved successfully!';
      } 
      // Third check: Check for success indicators in message
      else if (result.data && result.data.message) {
        const messageLower = result.data.message.toLowerCase();
        if (messageLower.includes('success') || 
            messageLower.includes('completed') || 
            messageLower.includes('saved') ||
            messageLower.includes('created') ||
            messageLower.includes('updated') ||
            messageLower.includes('setup completed')) {
          isSuccess = true;
          successMessage = result.data.message;
        } else {
          errorMessage = result.data.message;
        }
      }
      // Fourth check: Check for results array (for kitchen printer setup)
      else if (result.data && Array.isArray(result.data.results) && result.data.results.length > 0) {
        isSuccess = true;
        successMessage = result.data.message || 'Printer setup completed successfully';
      }
      // Fifth check: Check for kitchen_config array (indicates successful setup)
      else if (result.data && Array.isArray(result.data.kitchen_config) && result.data.kitchen_config.length > 0) {
        isSuccess = true;
        successMessage = result.data.message || 'Printer setup completed successfully';
      }
      // Check for error field
      else if (result.data && result.data.error) {
        errorMessage = result.data.error;
      }
      // Check if HTTP was successful but API returned error message
      else if (result.success && result.data && typeof result.data === 'object') {
        // If we have a message but it's not clearly success, check if it contains required fields error
        if (result.data.message && result.data.message.includes('required')) {
          errorMessage = result.data.message;
        }
      }

      if (isSuccess) {
        setAlert({ type: 'success', message: successMessage });
        setFormData({
          name: '',
          type: 'receipt',
          ip_address: '',
          port: '9100',
          status: 'active',
        });
        setEditingPrinter(null);
        setModalOpen(false);
        fetchPrinters(); // Refresh list
      } else {
        const finalErrorMessage = errorMessage || 
                                 result.data?.message || 
                                 result.data?.error || 
                                 'Failed to save printer. Please check all fields are filled correctly.';
        setAlert({ type: 'error', message: finalErrorMessage });
        console.error('Printer save failed:', {
          result,
          errorMessage: finalErrorMessage
        });
      }
    } catch (error) {
      console.error('Error saving printer:', error);
      setAlert({ type: 'error', message: 'Failed to save printer: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (printer) => {
    setEditingPrinter(printer);
    setFormData({
      name: printer.name,
      type: printer.type,
      ip_address: printer.ip_address,
      port: printer.port,
      status: printer.status || 'active',
    });
    setModalOpen(true);
  };

  /**
   * Handle delete button click
   * API: printer_management.php (DELETE)
   */
  const handleDelete = async (printerId) => {
    if (!confirm('Are you sure you want to delete this printer?')) return;

    try {
      const result = await apiDelete('/printer_management.php', { printer_id: printerId });

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'Printer deleted successfully!' });
        fetchPrinters(); // Refresh list
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to delete printer' });
      }
    } catch (error) {
      console.error('Error deleting printer:', error);
      setAlert({ type: 'error', message: 'Failed to delete printer: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Test printer connection
   */
  const testPrinter = async (printerId) => {
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      const params = {
        printer_id: printerId,
        terminal: terminal,
        action: 'test'
      };
      
      if (branchId) {
        params.branch_id = branchId;
      }
      
      console.log('Testing printer with params:', params);
      const result = await apiPost('/printer_management.php', params);
      console.log('Test printer result:', result);
      
      if (result.success && result.data) {
        const isSuccess = result.data.success === true || 
                         result.data.success === 'true' || 
                         (result.data.message && result.data.message.toLowerCase().includes('success'));
        
        if (isSuccess) {
          setAlert({ type: 'success', message: result.data.message || 'Test print sent successfully!' });
        } else {
          setAlert({ type: 'error', message: result.data.message || 'Failed to send test print' });
        }
      } else {
        setAlert({ type: 'error', message: 'Failed to send test print. Please check printer connection.' });
      }
    } catch (error) {
      console.error('Error testing printer:', error);
      setAlert({ type: 'error', message: 'Failed to send test print: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Table columns configuration
   */
  const columns = [
    { 
      header: 'ID', 
      accessor: 'printer_id',
      className: 'w-20',
      wrap: false,
    },
    { 
      header: 'Name', 
      accessor: 'name',
      className: 'min-w-[200px]',
    },
    {
      header: 'Type',
      accessor: (row) => (
        <span className="capitalize px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {row.type || 'receipt'}
        </span>
      ),
      className: 'w-32',
      wrap: false,
    },
    { 
      header: 'IP Address', 
      accessor: 'ip_address',
      className: 'w-40',
      wrap: false,
    },
    { 
      header: 'Port', 
      accessor: 'port',
      className: 'w-24',
      wrap: false,
    },
    {
      header: 'Status',
      accessor: (row) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
            row.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.status}
        </span>
      ),
      className: 'w-28',
      wrap: false,
    },
  ];

  /**
   * Table actions (Edit, Delete, Test buttons)
   */
  const actions = (row) => (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => testPrinter(row.printer_id)}
        title="Test Printer"
      >
        <TestTube className="w-4 h-4" />
      </Button>
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
        onClick={() => handleDelete(row.printer_id)}
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
          <div className="flex items-center gap-3">
            <Printer className="w-7 h-7 text-[#FF5F15]" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Printer Management</h1>
              <p className="text-gray-600 mt-1">Manage printer settings for receipts and kitchen</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingPrinter(null);
              setFormData({
                name: '',
                type: 'receipt',
                ip_address: '',
                port: '9100',
                status: 'active',
              });
              setModalOpen(true);
            }}
          >
            + Add Printer
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

        {/* Printers Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Loading printers...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={printers}
            actions={actions}
            emptyMessage="No printers found. Click 'Add Printer' to create one."
          />
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingPrinter(null);
            setFormData({
              name: '',
              type: 'receipt',
              ip_address: '',
              port: '9100',
              status: 'active',
            });
          }}
          title={editingPrinter ? 'Edit Printer' : 'Add New Printer'}
          size="md"
        >
          <form onSubmit={handleSubmit}>
            <Input
              label="Printer Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Receipt Printer 1"
              required
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
              >
                <option value="receipt">Receipt Printer</option>
                <option value="kitchen">Kitchen Printer</option>
              </select>
            </div>

            <Input
              label="IP Address"
              name="ip_address"
              type="text"
              value={formData.ip_address}
              onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
              placeholder="192.168.1.100"
              required
            />

            <Input
              label="Port"
              name="port"
              type="text"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: e.target.value })}
              placeholder="9100"
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingPrinter(null);
                  setFormData({
                    name: '',
                    type: 'receipt',
                    ip_address: '',
                    port: '9100',
                    status: 'active',
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingPrinter ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}
