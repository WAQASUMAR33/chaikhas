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
import { apiPost, getTerminal } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { BarChart3, Printer } from 'lucide-react';

export default function MenuSalesListPage() {
  const [menuSales, setMenuSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily'); // daily, weekly, monthly
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [reportNumber, setReportNumber] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(''); // Filter by branch
  const printRef = useRef(null);

  useEffect(() => {
    fetchBranches();
    fetchMenuSales();
    
    // Generate report number
    const now = new Date();
    const reportNum = `MSR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    setReportNumber(reportNum);
  }, [period, selectedBranchFilter]);

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
   * API: api/get_menu_sales.php (POST with terminal, period, and optional branch_id)
   */
  const fetchMenuSales = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    try {
      const terminal = getTerminal();
      
      // Build params - include branch_id only if filtering by branch
      const params = { terminal, period };
      if (selectedBranchFilter) {
        params.branch_id = selectedBranchFilter;
      }
      // If selectedBranchFilter is empty, don't include branch_id - API will return all branches
      
      // For daily period, fetch last dayend to filter sales after dayend
      if (period === 'daily') {
        try {
          const branchIdToCheck = selectedBranchFilter || null;
          
          if (branchIdToCheck) {
            // Single branch selected - fetch dayend for that branch
            const dayendResult = await apiPost('/get_dayend.php', {
              branch_id: branchIdToCheck,
            });
            
            if (dayendResult.success && dayendResult.data) {
              let dayendData = [];
              if (Array.isArray(dayendResult.data)) {
                dayendData = dayendResult.data;
              } else if (dayendResult.data.data && Array.isArray(dayendResult.data.data)) {
                dayendData = dayendResult.data.data;
              }
              
              if (dayendData.length > 0) {
                const sortedDayends = [...dayendData].sort((a, b) => {
                  const dateA = new Date(a.closing_date_time || 0);
                  const dateB = new Date(b.closing_date_time || 0);
                  return dateB - dateA;
                });
                const lastDayend = sortedDayends[0];
                if (lastDayend && lastDayend.closing_date_time) {
                  params.after_closing_date = lastDayend.closing_date_time;
                  console.log('📅 Filtering daily menu sales after dayend for branch:', branchIdToCheck, lastDayend.closing_date_time);
                }
              }
            }
          }
          // For "all branches", the API should handle dayend filtering per branch
          // If the API doesn't support it, we'd need to fetch per branch, but for now
          // we'll let the API handle it if it supports after_closing_date without branch_id
        } catch (error) {
          console.error('Error fetching dayend for menu sales:', error);
        }
      }
      
      console.log('Fetching menu sales with:', params);
      
      const result = await apiPost('api/get_menu_sales.php', params);
      
      console.log('Menu sales API result:', result);
      console.log('Full API response structure:', JSON.stringify(result, null, 2));
      
      // Handle different response structures
      let menuSalesData = [];
      
      // Check if result is directly an array
      if (Array.isArray(result)) {
        menuSalesData = result;
        console.log('✅ Found menu sales in result (direct array), count:', menuSalesData.length);
      }
      // Check if result.success and result.data is an array
      else if (result.success && result.data && Array.isArray(result.data)) {
        menuSalesData = result.data;
        console.log('✅ Found menu sales in result.success.data (array), count:', menuSalesData.length);
      }
      // Check if result.data is an array directly
      else if (result.data && Array.isArray(result.data)) {
        menuSalesData = result.data;
        console.log('✅ Found menu sales in result.data (array), count:', menuSalesData.length);
      }
      // Check if data is nested (result.data.data)
      else if (result.data && result.data.data && Array.isArray(result.data.data)) {
        menuSalesData = result.data.data;
        console.log('✅ Found menu sales in result.data.data (nested array), count:', menuSalesData.length);
      }
      // Check if result.data.menu_sales or result.data.sales is an array
      else if (result.data && result.data.menu_sales && Array.isArray(result.data.menu_sales)) {
        menuSalesData = result.data.menu_sales;
        console.log('✅ Found menu sales in result.data.menu_sales, count:', menuSalesData.length);
      }
      else if (result.data && result.data.sales && Array.isArray(result.data.sales)) {
        menuSalesData = result.data.sales;
        console.log('✅ Found menu sales in result.data.sales, count:', menuSalesData.length);
      }
      // Check for error in response
      else if (result.data && result.data.success === false) {
        setAlert({ type: 'error', message: result.data.message || 'Failed to load menu sales data' });
        setMenuSales([]);
        setLoading(false);
        return;
      }
      // Try to find any array in result.data object
      else if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        for (const key in result.data) {
          if (Array.isArray(result.data[key])) {
            menuSalesData = result.data[key];
            console.log(`✅ Found menu sales in result.data.${key}, count:`, menuSalesData.length);
            break;
          }
        }
      }
      
      // Debug: Log sample menu sale from API
      if (menuSalesData.length > 0) {
        console.log('Sample menu sale from API:', JSON.stringify(menuSalesData[0], null, 2));
      } else {
        console.warn('⚠️ No menu sales found in API response. Response structure:', Object.keys(result));
        if (result.data) {
          console.warn('result.data keys:', Object.keys(result.data));
        }
      }
      
      // Map API response to consistent format
      if (menuSalesData.length > 0) {
        const mappedSales = menuSalesData.map((item) => ({
          id: item.dish_id || item.id || item.menu_id,
          dish_id: item.dish_id || item.id || item.menu_id,
          name: item.name || item.dish_name || item.menu_name || item.title || '-',
          category: item.category || item.category_name || item.category_title || '-',
          quantity_sold: parseInt(item.quantity_sold || item.quantity || item.qty || item.sold_quantity || 0),
          total_revenue: parseFloat(item.total_revenue || item.revenue || item.amount || item.total_amount || item.sales_amount || 0),
        }));
        setMenuSales(mappedSales);
        console.log('Mapped menu sales:', mappedSales);
        setAlert({ type: '', message: '' }); // Clear any previous errors
      } else {
        setMenuSales([]);
        // Check if there's an explicit error message
        if (result.data && result.data.message) {
          setAlert({ type: 'error', message: result.data.message });
        } else if (result.data && result.data.success === false) {
          setAlert({ type: 'error', message: result.data.message || 'Failed to load menu sales data' });
        } else if (!result.success) {
          setAlert({ type: 'error', message: result.message || 'Failed to load menu sales data. Please check your connection and try again.' });
        } else {
          // No error message, just no data - this is normal if there are no sales
          console.log('No menu sales data found for the selected period');
          const branchText = selectedBranchFilter ? ' for selected branch' : '';
          setAlert({ type: 'info', message: `No menu sales data found for ${period} period${branchText}. Try selecting a different period or check if there are any completed orders.` });
        }
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
    acc.totalQuantity += parseInt(item.quantity_sold || 0);
    acc.totalRevenue += parseFloat(item.total_revenue || 0);
    return acc;
  }, { totalQuantity: 0, totalRevenue: 0 });

  /**
   * Get period display name
   */
  const getPeriodDisplayName = () => {
    const now = new Date();
    if (period === 'daily') {
      return now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } else if (period === 'weekly') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (period === 'monthly') {
      return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return period;
  };

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
      header: 'ID', 
      accessor: 'dish_id',
      className: 'w-20',
      wrap: false,
    },
    { 
      header: 'Menu Item', 
      accessor: 'name',
      className: 'min-w-[200px]',
    },
    { 
      header: 'Category', 
      accessor: 'category',
      className: 'min-w-[150px]',
    },
    { 
      header: 'Quantity Sold', 
      accessor: 'quantity_sold',
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Total Revenue',
      accessor: (row) => <span className="font-semibold">{formatPKR(row.total_revenue || 0)}</span>,
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

        {/* Branch Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
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
            <p className="text-xs text-gray-500 mt-2">Showing menu sales for selected branch only</p>
          )}
        </div>

        {/* Period Selector and Print Button */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            {['daily', 'weekly', 'monthly'].map((p) => (
              <Button
                key={p}
                variant={period === p ? 'primary' : 'secondary'}
                onClick={() => setPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
          {menuSales.length > 0 && (
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </Button>
          )}
        </div>

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
              {selectedBranchFilter 
                ? `There are no menu sales for the selected branch in the ${period} period. Try selecting a different period or branch.`
                : period === 'daily' 
                ? 'There are no menu sales for today across all branches. Sales data will appear here once orders are completed.' 
                : period === 'weekly'
                ? 'There are no menu sales for this week across all branches. Try selecting a different period.'
                : 'There are no menu sales for this month across all branches. Try selecting a different period.'}
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
                      Menu Sales Report - {getPeriodDisplayName()}
                    </p>
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
                    <th>ID</th>
                    <th>Menu Item</th>
                    <th>Category</th>
                    <th>Quantity Sold</th>
                    <th>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {menuSales.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>{item.dish_id || item.id || 'N/A'}</td>
                      <td>{item.name || 'N/A'}</td>
                      <td>{item.category || 'N/A'}</td>
                      <td style={{ textAlign: 'right' }}>{item.quantity_sold || 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatPKR(item.total_revenue || 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #000', fontWeight: 'bold' }}>
                    <td colSpan="3" style={{ padding: '8px 4px', border: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>Totals:</td>
                    <td style={{ padding: '8px 4px', border: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>{totals.totalQuantity}</td>
                    <td style={{ padding: '8px 4px', border: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>{formatPKR(totals.totalRevenue)}</td>
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
