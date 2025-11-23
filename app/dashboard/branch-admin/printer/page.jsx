'use client';

/**
 * Printer Management Page
 * Manage printer settings for receipts and kitchen
 * Uses real APIs: get_printers.php, printer_management.php
 */

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, getTerminal } from '@/utils/api';
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
    try {
      const terminal = getTerminal();
      const result = await apiPost('/get_printers.php', { terminal });
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Map API response
        const mappedPrinters = result.data.map((printer) => ({
          id: printer.printer_id,
          printer_id: printer.printer_id,
          name: printer.name || '',
          type: printer.type || 'receipt',
          ip_address: printer.ip_address || '',
          port: printer.port || '9100',
          status: printer.status || 'active',
          terminal: printer.terminal || terminal,
        }));
        setPrinters(mappedPrinters);
      } else if (result.data && result.data.success === false) {
        setAlert({ type: 'error', message: result.data.message || 'Failed to load printers' });
        setPrinters([]);
      } else {
        setPrinters([]);
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

    try {
      const terminal = getTerminal();
      const data = {
        printer_id: editingPrinter ? editingPrinter.printer_id : '', // Empty for create
        name: formData.name,
        type: formData.type,
        ip_address: formData.ip_address,
        port: formData.port,
        status: formData.status,
        terminal: terminal,
      };

      const result = await apiPost('/printer_management.php', data);

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'Printer saved successfully!' });
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
        setAlert({ type: 'error', message: result.data?.message || 'Failed to save printer' });
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
      // This would call a test printer API endpoint
      setAlert({ type: 'success', message: 'Test print sent successfully! (Feature coming soon)' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to send test print' });
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
    <AdminLayout>
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
    </AdminLayout>
  );
}
