'use client';

/**
 * Menu Items Sales List Page
 * Show sales per menu item with print functionality
 * Uses real API: api/get_menu_sales.php
 */

import { useEffect, useState, useRef } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiGet, apiPost } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { BarChart3, Printer } from 'lucide-react';

export default function MenuSalesListPage() {
  const [menuSales, setMenuSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [reportNumber, setReportNumber] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(''); // Filter by branch
  const [dayendId, setDayendId] = useState(''); // Dayend ID input
  const printRef = useRef(null);

  useEffect(() => {
    fetchBranches();
    
    // Generate report number
    const now = new Date();
    const reportNum = `MSR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    setReportNumber(reportNum);
  }, []);

  /**
   * Fetch branches for super admin
   */
  const fetchBranches = async () => {
    try {
      console.log('=== Fetching Branches (Super Admin - Menu Sales) ===');
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
   * Fetch menu sales data from API
   * API: pos/getsaledetails.php (GET with branch_id and sts)
   */
  const fetchMenuSales = async () => {
    // Validate inputs - STS first
    if (!dayendId || dayendId.trim() === '') {
      setAlert({ type: 'error', message: 'Please enter STS (Dayend ID) first' });
      return;
    }
    
    if (!selectedBranchFilter) {
      setAlert({ type: 'error', message: 'Please select a branch' });
      return;
    }
    
    setLoading(true);
    setAlert({ type: '', message: '' });
    
    try {
      // Build params for GET request
      const params = {
        branch_id: selectedBranchFilter,
        sts: dayendId.trim()
      };
      
      console.log('Fetching menu sales with:', params);
      
      // Use apiGet for GET request
      const result = await apiGet('pos/getsaledetails.php', params);
      
      console.log('Menu sales API result:', result);
      
      // Handle response - API returns array directly
      let menuSalesData = [];
      
      if (Array.isArray(result)) {
        menuSalesData = result;
        console.log('✅ Found menu sales in result (direct array), count:', menuSalesData.length);
      } else if (result && result.data && Array.isArray(result.data)) {
        menuSalesData = result.data;
        console.log('✅ Found menu sales in result.data (array), count:', menuSalesData.length);
      } else if (result && result.success && result.data && Array.isArray(result.data)) {
        menuSalesData = result.data;
        console.log('✅ Found menu sales in result.success.data (array), count:', menuSalesData.length);
      } else {
        console.warn('⚠️ No menu sales found in API response');
        console.warn('Response structure:', result);
      }
      
      // Map API response to display format
      if (menuSalesData.length > 0) {
        const mappedSales = menuSalesData.map((item) => ({
          dish_id: item.dish_id || item.id || 'N/A',
          item_id: item.item_id || 'N/A',
          title: item.title || '-',
          name: item.name || '-',
          catname: item.catname || item.category || '-',
          order_id: item.order_id || 'N/A',
          tnc: parseInt(item.tnc || 0), // quantity (non-credit)
          tc: parseInt(item.tc || 0), // credit quantity
          tnc_total: parseFloat(item.tnc_total || 0), // total for non-credit
          tc_total: parseFloat(item.tc_total || 0), // total for credit
          price: parseFloat(item.price || 0),
          created_at: item.created_at || '-',
          updated_at: item.updated_at || '-',
        }));
        setMenuSales(mappedSales);
        console.log('✅ Mapped menu sales:', mappedSales.length, 'items');
        setAlert({ type: '', message: '' }); // Clear any previous errors
      } else {
        setMenuSales([]);
        setAlert({ type: 'info', message: 'No menu sales data found for the selected branch and dayend ID.' });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu sales:', error);
      setAlert({ type: 'error', message: 'Failed to load menu sales data: ' + (error.message || 'Network error') });
      setLoading(false);
      setMenuSales([]);
    }
  };

  /**
   * Calculate totals for menu sales
   */
  const totals = menuSales.reduce((acc, item) => {
    acc.totalQuantity += parseInt(item.tnc || 0) + parseInt(item.tc || 0);
    acc.totalRevenue += parseFloat(item.tnc_total || 0) + parseFloat(item.tc_total || 0);
    return acc;
  }, { totalQuantity: 0, totalRevenue: 0 });


  /**
   * Print report
   */
  const handlePrint = () => {
    if (menuSales.length === 0) {
      setAlert({ type: 'error', message: 'No data to print. Please load menu sales data first.' });
      return;
    }

    // Wait for DOM to be ready and ensure print view is visible
    setTimeout(() => {
      // Force print view to be visible
      const printElement = printRef.current;
      if (printElement) {
        printElement.style.display = 'block';
      }
      
      // Trigger print
      window.print();
      
      // After print dialog closes, hide it again (for screen view)
      setTimeout(() => {
        if (printElement) {
          printElement.style.display = 'none';
        }
      }, 100);
    }, 200);
  };

  /**
   * Table columns configuration
   */
  const columns = [
    { 
      header: 'Dish ID', 
      accessor: 'dish_id',
      className: 'w-20',
      wrap: false,
    },
    { 
      header: 'Item Name', 
      accessor: 'name',
      className: 'min-w-[150px]',
    },
    { 
      header: 'Category', 
      accessor: 'catname',
      className: 'min-w-[120px]',
    },
    { 
      header: 'Quantity (TNC)', 
      accessor: 'tnc',
      className: 'w-28',
      wrap: false,
    },
    { 
      header: 'Quantity (TC)', 
      accessor: 'tc',
      className: 'w-28',
      wrap: false,
    },
    {
      header: 'Price',
      accessor: (row) => <span>{formatPKR(row.price || 0)}</span>,
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Total (TNC)',
      accessor: (row) => <span className="font-semibold">{formatPKR(row.tnc_total || 0)}</span>,
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Total (TC)',
      accessor: (row) => <span className="font-semibold">{formatPKR(row.tc_total || 0)}</span>,
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Created At',
      accessor: 'created_at',
      className: 'w-40',
      wrap: false,
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-[#FF5F15]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Items Sales List</h1>
            <p className="text-gray-600 mt-1">View sales statistics for each menu item</p>
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

        {/* STS and Branch Input */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                STS (Dayend ID) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dayendId}
                onChange={(e) => setDayendId(e.target.value)}
                placeholder="Enter STS / Dayend ID"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter the Dayend ID (STS number)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Branch <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                required
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id || branch.id || branch.ID} value={branch.branch_id || branch.id || branch.ID}>
                    {branch.name || branch.branch_name || branch.title || `Branch ${branch.branch_id || branch.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={fetchMenuSales}
              variant="primary"
              className="w-full sm:w-auto"
              disabled={loading || !dayendId || !selectedBranchFilter}
            >
              {loading ? 'Loading...' : 'Fetch Menu Sales'}
            </Button>
            {(!dayendId || !selectedBranchFilter) && (
              <p className="text-xs text-gray-500 mt-2">
                Please enter STS (Dayend ID) and select a branch to fetch data
              </p>
            )}
          </div>
        </div>

        {/* Print Button */}
        {menuSales.length > 0 && (
          <div className="flex justify-end">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </Button>
          </div>
        )}

        {/* Summary Cards */}
        {!loading && menuSales.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-600">Total Items Sold</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totals.totalQuantity}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-[#FF5F15] mt-1">{formatPKR(totals.totalRevenue)}</p>
            </div>
          </div>
        )}

        {/* Menu Sales Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5F15] mb-4"></div>
            <p className="text-gray-500 font-medium">Loading menu sales data...</p>
          </div>
        ) : menuSales.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium text-lg mb-2">No menu sales data found</p>
            <p className="text-gray-500 text-sm">
              {!dayendId || !selectedBranchFilter
                ? 'Please enter STS (Dayend ID) and select a branch, then click "Fetch Menu Sales" to load data.'
                : 'No menu sales data found for the entered STS and selected branch. Please verify the STS (Dayend ID) is correct.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden no-print">
            <Table
              columns={columns}
              data={menuSales}
              emptyMessage="No menu sales data found"
            />
          </div>
        )}

        {/* Print View - Only visible when printing */}
        {menuSales.length > 0 && (
          <div ref={printRef} className="print-only">
            <div className="print-container">
              {/* Report Header */}
              <div className="print-header">
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '15px',
                  paddingBottom: '10px',
                  borderBottom: '2px solid #000'
                }}>
                  <div style={{ width: '15%', textAlign: 'left' }}>
                    {/* Restaurant Logo */}
                    <img 
                      src="/assets/CHAIKHAS.PNG" 
                      alt="Resturant Khas Logo"
                      style={{ 
                        maxWidth: '80px', 
                        maxHeight: '80px',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        // Fallback if image doesn't load
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div style={{ 
                      width: '70px', 
                      height: '70px', 
                      border: '2px solid #000',
                      display: 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      backgroundColor: '#f9f9f9'
                    }}>
                      LOGO
                    </div>
                  </div>
                  <div style={{ width: '70%', textAlign: 'center' }}>
                    <h1 style={{ 
                      margin: 0, 
                      fontSize: '28px', 
                      fontWeight: 'bold',
                      color: '#000',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      Resturant Khas
                    </h1>
                    <p style={{ margin: '8px 0 0 0', fontSize: '16px', fontWeight: 'bold' }}>
                      Menu Sales Report
                    </p>
                    {dayendId && (
                      <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                        STS (Dayend ID): {dayendId}
                      </p>
                    )}
                    {selectedBranchFilter && (
                      <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                        Branch: {branches.find(b => (b.branch_id || b.id) == selectedBranchFilter)?.branch_name || branches.find(b => (b.branch_id || b.id) == selectedBranchFilter)?.name || 'Selected Branch'}
                      </p>
                    )}
                  </div>
                  <div style={{ width: '15%', textAlign: 'right', fontSize: '11px' }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                      Report No: {reportNumber}
                    </p>
                    <p style={{ margin: '5px 0 0 0' }}>
                      Print Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Report Table */}
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Dish ID</th>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Qty (TNC)</th>
                    <th>Qty (TC)</th>
                    <th>Price</th>
                    <th>Total (TNC)</th>
                    <th>Total (TC)</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {menuSales.map((item, index) => (
                    <tr key={item.dish_id || index}>
                      <td>{item.dish_id || 'N/A'}</td>
                      <td>{item.name || 'N/A'}</td>
                      <td>{item.catname || 'N/A'}</td>
                      <td style={{ textAlign: 'right' }}>{item.tnc || 0}</td>
                      <td style={{ textAlign: 'right' }}>{item.tc || 0}</td>
                      <td style={{ textAlign: 'right' }}>{formatPKR(item.price || 0)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPKR(item.tnc_total || 0)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPKR(item.tc_total || 0)}</td>
                      <td>{item.created_at || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #000', fontWeight: 'bold' }}>
                    <td colSpan="3" style={{ padding: '8px 4px', border: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>Totals:</td>
                    <td style={{ padding: '8px 4px', border: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>{totals.totalQuantity}</td>
                    <td style={{ padding: '8px 4px', border: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>-</td>
                    <td style={{ padding: '8px 4px', border: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>-</td>
                    <td style={{ padding: '8px 4px', border: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>{formatPKR(totals.totalRevenue)}</td>
                    <td style={{ padding: '8px 4px', border: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>-</td>
                    <td style={{ padding: '8px 4px', border: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>-</td>
                  </tr>
                </tfoot>
              </table>
              
              {/* Footer with Page Number */}
              <div className="print-footer">
                Page <span className="page-number"></span>
              </div>
            </div>
          </div>
        )}
        
        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4 landscape;
              margin: 2cm 1cm 1.5cm 1cm;
            }
            
            body * {
              visibility: hidden;
            }
            
            .print-only,
            .print-only * {
              visibility: visible;
            }
            
            .print-only {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              display: block !important;
            }
            
            .no-print,
            .no-print * {
              display: none !important;
            }
            
            .print-container {
              width: 100%;
            }
            
            .print-header {
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #000;
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            
            /* Repeat table header on each page */
            .print-table thead {
              display: table-header-group;
            }
            
            .print-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
              margin-top: 10px;
            }
            
            .print-table thead tr {
              page-break-after: avoid;
              page-break-inside: avoid;
            }
            
            .print-table tfoot {
              display: table-footer-group;
            }
            
            .print-table tfoot tr {
              page-break-inside: avoid;
            }
            
            .print-table th,
            .print-table td {
              padding: 6px 4px;
              border: 1px solid #000;
              text-align: left;
            }
            
            .print-table th {
              background-color: #f3f4f6;
              font-weight: bold;
            }
            
            .print-table tbody tr {
              page-break-inside: avoid;
            }
            
            .print-table tbody tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            
            .print-table tfoot tr {
              background-color: #f3f4f6;
              border-top: 2px solid #000;
              font-weight: bold;
            }
            
            /* Page number footer */
            .print-footer {
              position: fixed;
              bottom: 0.5cm;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 10px;
              border-top: 1px solid #ccc;
              padding-top: 5px;
              margin-top: 15px;
            }
            
            .print-footer::after {
              content: "Page " counter(page) " of " counter(pages);
            }
            
            /* Hide the span inside footer, use ::after instead */
            .print-footer .page-number {
              display: none;
            }
          }
          
          /* Screen styles - hide print view */
          @media screen {
            .print-only {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </SuperAdminLayout>
  );
}
