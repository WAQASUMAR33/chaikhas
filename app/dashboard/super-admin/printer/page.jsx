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
import { apiPost, apiDelete, getTerminal, getBranchId, getBranchName } from '@/utils/api';
import { Printer, TestTube } from 'lucide-react';

export default function PrinterManagementPage() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'receipt', // receipt or kitchen
    connection_type: 'network', // network or usb
    ip_address: '',
    port: '9100',
    usb_port: '', // USB port name (e.g., USB002)
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
      const result = await apiPost('api/get_printers.php', params);
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
        connection_type: printer.connection_type || (printer.ip_address && printer.ip_address !== 'USB' ? 'network' : 'usb'),
        ip_address: printer.ip_address || printer.ip || '',
        port: printer.port || '9100',
        usb_port: printer.usb_port || printer.printer_name || '',
        status: printer.status || 'active',
        terminal: printer.terminal || terminal,
        branch_id: printer.branch_id || branchId,
        branch_name: printer.branch_name || '',
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

    // For USB printers, validate USB port instead of IP address
    if (formData.connection_type === 'usb') {
      if (!formData.usb_port || !formData.usb_port.trim()) {
        setAlert({ type: 'error', message: 'USB port name is required for USB printers' });
        return;
      }
    } else {
      // For network printers, validate IP address and port
      if (!formData.ip_address || !formData.ip_address.trim()) {
        setAlert({ type: 'error', message: 'IP address is required for network printers' });
        return;
      }

      // Validate IP address format
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(formData.ip_address.trim())) {
        setAlert({ type: 'error', message: 'Please enter a valid IP address (e.g., 192.168.1.100)' });
        return;
      }
    }

    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      const branchName = getBranchName();
      
      // Ensure terminal is available
      if (!terminal) {
        setAlert({ type: 'error', message: 'Terminal ID is missing. Please log in again.' });
        return;
      }
      
      const data = {
        printer_id: editingPrinter ? editingPrinter.printer_id : '', // Empty for create
        name: formData.name.trim(),
        type: formData.type || 'receipt',
        connection_type: formData.connection_type || 'network',
        status: formData.status || 'active',
        terminal: terminal, // Always include terminal
        action: editingPrinter ? 'update' : 'create'
      };

      // Add network-specific fields only for network printers
      if (formData.connection_type === 'network') {
        data.ip_address = formData.ip_address.trim();
        data.port = formData.port || '9100';
      } else if (formData.connection_type === 'usb') {
        // For USB printers, use placeholder values for IP and port (required by database)
        data.ip_address = formData.ip_address.trim() || 'USB';
        data.port = formData.port || '0';
        data.usb_port = formData.usb_port.trim();
        data.printer_name = formData.usb_port.trim(); // Some APIs use printer_name for USB
      }
      
      // Always include branch_id and branch_name if available
      if (branchId) {
        data.branch_id = branchId;
      }
      if (branchName) {
        data.branch_name = branchName;
      }

      console.log('=== Saving Printer ===');
      console.log('Form data:', formData);
      console.log('Terminal:', terminal);
      console.log('Branch ID:', branchId);
      console.log('Branch Name:', branchName);
      console.log('Payload being sent:', data);
      
      const result = await apiPost('api/printer_management.php', data);
      
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
          connection_type: 'network',
          ip_address: '',
          port: '9100',
          usb_port: '',
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
    // Determine connection type based on IP address or connection_type field
    const connectionType = printer.connection_type || 
                          (printer.ip_address && printer.ip_address !== 'USB' ? 'network' : 'usb');
    setFormData({
      name: printer.name,
      type: printer.type,
      connection_type: connectionType,
      ip_address: printer.ip_address || '',
      port: printer.port || '9100',
      usb_port: printer.usb_port || printer.printer_name || '',
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
      const result = await apiDelete('api/printer_management.php', { printer_id: printerId });

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
   * Test USB printer using browser print dialog
   */
  const testUSBPrinter = async (printerId) => {
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      // Find the printer in the printers array to get its details
      const printer = printers.find(p => p.printer_id === printerId || p.id === printerId);
      
      if (!printer) {
        setAlert({ type: 'error', message: 'Printer not found. Please refresh the page and try again.' });
        return;
      }
      
      // Validate that printer is USB type
      const connectionType = printer.connection_type || (printer.ip_address && printer.ip_address !== 'USB' ? 'network' : 'usb');
      if (connectionType !== 'usb') {
        setAlert({ type: 'error', message: 'This test is only for USB printers. Use the regular test button for network printers.' });
        return;
      }
      
      console.log('Testing USB printer with browser print dialog...');
      console.log('Printer:', printer);
      console.log('USB Port:', printer.usb_port || printer.printer_name);
      
      // Show info message
      setAlert({ type: 'info', message: 'Opening print dialog. Please select your USB printer and click Print.' });
      
      // Create a test receipt HTML content
      const testReceiptHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Print - ${printer.name}</title>
            <style>
              @media print {
                @page { 
                  size: 80mm auto; 
                  margin: 0;
                  padding: 0;
                }
                html, body {
                  margin: 0 !important;
                  padding: 5px !important;
                  width: 80mm;
                  max-width: 80mm;
                  overflow: hidden;
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                .no-print { 
                  display: none !important; 
                }
                button, .no-print { 
                  display: none !important; 
                }
                /* Prevent page breaks */
                * {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                /* Prevent extra pages */
                body {
                  height: auto !important;
                  min-height: auto !important;
                  max-height: none !important;
                }
              }
              html, body {
                font-family: 'Courier New', monospace;
                margin: 0;
                padding: 5px;
                font-size: 11px;
                line-height: 1.3;
                width: 80mm;
                max-width: 80mm;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              .header {
                text-align: center;
                border-bottom: 2px dashed #000;
                padding-bottom: 10px;
                margin-bottom: 10px;
              }
              .title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .subtitle {
                font-size: 12px;
                margin-bottom: 5px;
              }
              .section {
                margin: 10px 0;
                padding: 5px 0;
                border-top: 1px dashed #000;
              }
              .line {
                display: flex;
                justify-content: space-between;
                margin: 3px 0;
              }
              .center {
                text-align: center;
              }
              .footer {
                margin-top: 15px;
                padding-top: 10px;
                border-top: 2px dashed #000;
                text-align: center;
                font-size: 10px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">RESTAURANT KHAS</div>
              <div class="subtitle">Test Print Receipt</div>
              <div class="subtitle">${new Date().toLocaleString()}</div>
            </div>
            
            <div class="section">
              <div class="line"><strong>Printer Name:</strong> <span>${printer.name}</span></div>
              <div class="line"><strong>USB Port:</strong> <span>${printer.usb_port || printer.printer_name || 'N/A'}</span></div>
              <div class="line"><strong>Type:</strong> <span>${printer.type || 'receipt'}</span></div>
              <div class="line"><strong>Status:</strong> <span>${printer.status || 'active'}</span></div>
            </div>
            
            <div class="section">
              <div class="center"><strong>--- TEST PRINT ---</strong></div>
              <div class="center">This is a test print to verify</div>
              <div class="center">USB printer connectivity</div>
            </div>
            
            <div class="section">
              <div class="line">Date: <span>${new Date().toLocaleDateString()}</span></div>
              <div class="line">Time: <span>${new Date().toLocaleTimeString()}</span></div>
              <div class="line">Terminal: <span>${terminal || 'N/A'}</span></div>
              <div class="line">Branch ID: <span>${branchId || 'N/A'}</span></div>
            </div>
            
            <div class="footer">
              <div>Thank you for testing!</div>
              <div>If you can see this, the printer is working.</div>
            </div>
            
            <div class="no-print" style="margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
              <p><strong>Print Preview</strong></p>
              <p>Click the Print button above or press Ctrl+P to print this test receipt.</p>
              <p>Make sure to select your USB printer: <strong>${printer.name}</strong></p>
            </div>
          </body>
        </html>
      `;
      
      // Open print window
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) {
        setAlert({ type: 'error', message: 'Please allow popups to test print.' });
        return;
      }
      
      printWindow.document.write(testReceiptHTML);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      setTimeout(() => {
        printWindow.focus();
        // Trigger print dialog
        printWindow.print();
        // Don't close the window automatically - let user close it after printing
        // The window will stay open so user can see the preview and close manually
      }, 300);
      
      setAlert({ 
        type: 'success', 
        message: 'Print dialog opened. Please select your USB printer and click Print. The preview window will stay open until you close it.' 
      });
      
    } catch (error) {
      console.error('Error testing USB printer:', error);
      setAlert({ 
        type: 'error', 
        message: 'Failed to open print dialog: ' + (error.message || 'Unknown error') 
      });
    }
  };

  /**
   * Test printer connection
   */
  const testPrinter = async (printerId) => {
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      // Find the printer in the printers array to get its details
      const printer = printers.find(p => p.printer_id === printerId || p.id === printerId);
      
      if (!printer) {
        setAlert({ type: 'error', message: 'Printer not found. Please refresh the page and try again.' });
        return;
      }
      
      // Validate that printer has required fields
      const connectionType = printer.connection_type || (printer.ip_address && printer.ip_address !== 'USB' ? 'network' : 'usb');
      if (!printer.name || !terminal) {
        setAlert({ type: 'error', message: 'Printer information is incomplete. Please check printer configuration.' });
        return;
      }
      
      if (connectionType === 'network' && !printer.ip_address) {
        setAlert({ type: 'error', message: 'Network printer must have an IP address.' });
        return;
      }
      
      if (connectionType === 'usb' && !printer.usb_port && !printer.printer_name) {
        setAlert({ type: 'error', message: 'USB printer must have a USB port name.' });
        return;
      }
      
      const params = {
        printer_id: printerId,
        name: printer.name,
        connection_type: connectionType,
        type: printer.type || 'receipt',
        terminal: terminal,
        action: 'test'
      };
      
      if (connectionType === 'network') {
        params.ip_address = printer.ip_address;
        params.port = printer.port || '9100';
      } else if (connectionType === 'usb') {
        params.usb_port = printer.usb_port || printer.printer_name;
        params.printer_name = printer.usb_port || printer.printer_name;
        // USB printers may still need placeholder IP/port for API compatibility
        params.ip_address = printer.ip_address || 'USB';
        params.port = printer.port || '0';
      }
      
      if (branchId) {
        params.branch_id = branchId;
      }
      
      console.log('Testing printer with params:', params);
      console.log('Printer data:', printer);
      const result = await apiPost('api/printer_management.php', params);
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
        setAlert({ type: 'error', message: result.data?.message || 'Failed to send test print. Please check printer connection.' });
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
      header: 'Connection',
      accessor: (row) => (
        <span className="capitalize px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
          {row.connection_type || 'network'}
        </span>
      ),
      className: 'w-32',
      wrap: false,
    },
    { 
      header: 'IP Address / USB Port', 
      accessor: (row) => row.connection_type === 'usb' ? (row.usb_port || row.printer_name || 'N/A') : (row.ip_address || 'N/A'),
      className: 'w-40',
      wrap: false,
    },
    { 
      header: 'Port', 
      accessor: (row) => row.connection_type === 'usb' ? '-' : (row.port || '9100'),
      className: 'w-24',
      wrap: false,
    },
    { 
      header: 'Branch', 
      accessor: 'branch_name',
      className: 'min-w-[150px]',
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
  const actions = (row) => {
    const connectionType = row.connection_type || (row.ip_address && row.ip_address !== 'USB' ? 'network' : 'usb');
    const isUSB = connectionType === 'usb';
    
    return (
      <div className="flex items-center justify-end gap-2">
        {isUSB && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => testUSBPrinter(row.printer_id)}
            title="Test USB Printer (Direct Print)"
            className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
          >
            <Printer className="w-4 h-4 mr-1" />
            Test USB
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => testPrinter(row.printer_id)}
          title={isUSB ? "Test Printer (General)" : "Test Printer"}
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
  };

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

            {/* Display Branch Name (read-only, auto-populated) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Branch Name
              </label>
              <input
                type="text"
                value={getBranchName() || 'Not set'}
                disabled
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-500 bg-gray-50 cursor-not-allowed"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">This will be automatically saved with the printer</p>
            </div>

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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Connection Type <span className="text-red-500">*</span>
              </label>
              <select
                name="connection_type"
                value={formData.connection_type}
                onChange={(e) => {
                  const newConnectionType = e.target.value;
                  setFormData({ 
                    ...formData, 
                    connection_type: newConnectionType,
                    // Clear IP/port when switching to USB, clear USB port when switching to network
                    ip_address: newConnectionType === 'usb' ? '' : formData.ip_address,
                    port: newConnectionType === 'usb' ? '9100' : formData.port,
                    usb_port: newConnectionType === 'network' ? '' : formData.usb_port
                  });
                }}
                required
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
              >
                <option value="network">Network (IP Address)</option>
                <option value="usb">USB</option>
              </select>
            </div>

            {formData.connection_type === 'usb' ? (
              <Input
                label="USB Port Name"
                name="usb_port"
                type="text"
                value={formData.usb_port}
                onChange={(e) => setFormData({ ...formData, usb_port: e.target.value })}
                placeholder="e.g., USB002"
                required
              />
            ) : (
              <>
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
              </>
            )}

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
