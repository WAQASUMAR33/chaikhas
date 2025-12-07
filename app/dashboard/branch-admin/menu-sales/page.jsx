'use client';

/**
 * Menu Items Sales List Page
 * Show sales per menu item with print functionality
 * Uses real API: api/get_menu_sales.php
 */

import { useEffect, useState, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, getTerminal, getBranchId, getBranchName } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { BarChart3, Printer } from 'lucide-react';

export default function MenuSalesListPage() {
  const [menuSales, setMenuSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [branchInfo, setBranchInfo] = useState(null);
  const [reportNumber, setReportNumber] = useState('');
  const printRef = useRef(null);
  
  // Date range filter state - default to last 30 days
  const getDefaultDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
      fromDate: thirtyDaysAgo.toISOString().split('T')[0],
      toDate: today.toISOString().split('T')[0],
    };
  };
  
  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  useEffect(() => {
    fetchBranchInfo();
    
    // Generate report number
    const now = new Date();
    const reportNum = `MSR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    setReportNumber(reportNum);
  }, []);
  
  useEffect(() => {
    if (dateRange.fromDate && dateRange.toDate) {
      fetchMenuSales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  /**
   * Fetch branch information
   */
  const fetchBranchInfo = async () => {
    try {
      const branchId = getBranchId();
      const branchName = getBranchName();
      
      if (branchId) {
        setBranchInfo({
          branch_id: branchId,
          branch_name: branchName || 'Branch',
        });
      }
    } catch (error) {
      console.error('Error fetching branch info:', error);
    }
  };

  /**
   * Fetch menu sales data from API
   * API: api/get_menu_sales.php (POST with terminal, period, and branch_id)
   * Shows only menu sales for the current branch
   */
  const fetchMenuSales = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID not found. Please login again.' });
        setLoading(false);
        setMenuSales([]);
        return;
      }
      
      // Build API params with date range
      const apiParams = { 
        terminal, 
        branch_id: branchId,
        from_date: dateRange.fromDate,
        to_date: dateRange.toDate
      };
      
      // Validate date range
      if (!dateRange.fromDate || !dateRange.toDate) {
        setAlert({ 
          type: 'error', 
          message: 'Please select both start and end dates' 
        });
        setMenuSales([]);
        setLoading(false);
        return;
      }
      
      console.log('📅 Fetching menu sales for date range:', apiParams.from_date, 'to', apiParams.to_date);
      
      console.log('Fetching menu sales with:', apiParams);
      
      const result = await apiPost('api/get_menu_sales.php', apiParams);
      
      console.log('Menu sales API result:', result);
      console.log('Full API response structure:', JSON.stringify(result, null, 2));
      
      // Handle different response structures - be very thorough
      let menuSalesData = [];
      
      // First, check if result itself is an array
      if (Array.isArray(result)) {
        menuSalesData = result;
        console.log('✅ Found menu sales in result (direct array), count:', menuSalesData.length);
      }
      // Check if result.success and result.data is an array
      else if (result && result.success && result.data && Array.isArray(result.data)) {
        menuSalesData = result.data;
        console.log('✅ Found menu sales in result.success.data (array), count:', menuSalesData.length);
      }
      // Check if result.data is an array directly (without success field)
      else if (result && result.data && Array.isArray(result.data)) {
        menuSalesData = result.data;
        console.log('✅ Found menu sales in result.data (array), count:', menuSalesData.length);
      }
      // Check if data is nested (result.data.data)
      else if (result && result.data && result.data.data && Array.isArray(result.data.data)) {
        menuSalesData = result.data.data;
        console.log('✅ Found menu sales in result.data.data (nested array), count:', menuSalesData.length);
      }
      // Check if result.data.menu_sales is an array
      else if (result && result.data && result.data.menu_sales && Array.isArray(result.data.menu_sales)) {
        menuSalesData = result.data.menu_sales;
        console.log('✅ Found menu sales in result.data.menu_sales, count:', menuSalesData.length);
      }
      // Check if result.data.sales is an array
      else if (result && result.data && result.data.sales && Array.isArray(result.data.sales)) {
        menuSalesData = result.data.sales;
        console.log('✅ Found menu sales in result.data.sales, count:', menuSalesData.length);
      }
      // Check if result.data.items is an array (common pattern)
      else if (result && result.data && result.data.items && Array.isArray(result.data.items)) {
        menuSalesData = result.data.items;
        console.log('✅ Found menu sales in result.data.items, count:', menuSalesData.length);
      }
      // Check if result.data.result is an array
      else if (result && result.data && result.data.result && Array.isArray(result.data.result)) {
        menuSalesData = result.data.result;
        console.log('✅ Found menu sales in result.data.result, count:', menuSalesData.length);
      }
      // Check for error in response
      else if (result && result.data && result.data.success === false) {
        setAlert({ type: 'error', message: result.data.message || 'Failed to load menu sales data' });
        setMenuSales([]);
        setLoading(false);
        return;
      }
      // Try to find any array in result.data object (deep search)
      else if (result && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        // First level search
        for (const key in result.data) {
          if (Array.isArray(result.data[key]) && result.data[key].length > 0) {
            menuSalesData = result.data[key];
            console.log(`✅ Found menu sales in result.data.${key}, count:`, menuSalesData.length);
            break;
          }
        }
        // If still no data, try nested objects
        if (menuSalesData.length === 0) {
          for (const key in result.data) {
            if (result.data[key] && typeof result.data[key] === 'object' && !Array.isArray(result.data[key])) {
              for (const nestedKey in result.data[key]) {
                if (Array.isArray(result.data[key][nestedKey]) && result.data[key][nestedKey].length > 0) {
                  menuSalesData = result.data[key][nestedKey];
                  console.log(`✅ Found menu sales in result.data.${key}.${nestedKey}, count:`, menuSalesData.length);
                  break;
                }
              }
              if (menuSalesData.length > 0) break;
            }
          }
        }
      }
      
      // If still no data found, check if result itself has any arrays
      if (menuSalesData.length === 0 && result && typeof result === 'object' && !Array.isArray(result)) {
        for (const key in result) {
          if (Array.isArray(result[key]) && result[key].length > 0) {
            menuSalesData = result[key];
            console.log(`✅ Found menu sales in result.${key}, count:`, menuSalesData.length);
            break;
          }
        }
      }
      
      // Debug: Log sample menu sale from API
      if (menuSalesData.length > 0) {
        console.log('✅ Sample menu sale from API:', JSON.stringify(menuSalesData[0], null, 2));
      } else {
        console.warn('⚠️ No menu sales found in API response');
        console.warn('Response structure:', {
          success: result.success,
          hasData: !!result.data,
          dataType: typeof result.data,
          dataKeys: result.data ? Object.keys(result.data) : [],
          fullResponse: result
        });
        
        // Check if API returned an error message
        if (result.data && result.data.message) {
          console.warn('API error message:', result.data.message);
        }
        if (result.data && result.data.error) {
          console.warn('API error:', result.data.error);
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
        console.log('✅ Mapped menu sales:', mappedSales.length, 'items');
        setAlert({ type: '', message: '' }); // Clear any previous errors
      } else {
        setMenuSales([]);
        
        // Check if there's an explicit error message
        if (result && result.data && result.data.message) {
          const errorMsg = result.data.message;
          // Check for database column errors
          if (errorMsg.toLowerCase().includes("unknown column") || 
              errorMsg.toLowerCase().includes("orders.sts") ||
              errorMsg.toLowerCase().includes("column 'sts'")) {
            setAlert({ 
              type: 'error', 
              message: `Database Column Error: The API is trying to use column 'orders.sts' which doesn't exist. Please update api/get_menu_sales.php to use 'order_status' instead of 'sts'. Error: ${errorMsg}` 
            });
          } else {
            setAlert({ type: 'error', message: errorMsg });
          }
        } else if (result && result.data && result.data.success === false) {
          setAlert({ type: 'error', message: result.data.message || result.data.error || 'Failed to load menu sales data' });
        } else if (result && !result.success) {
          setAlert({ type: 'error', message: result.message || 'Failed to load menu sales data. Please check your connection and try again.' });
        } else if (result && result.success && result.data) {
          // API returned success but no data
          const dateRangeText = dateRange.fromDate && dateRange.toDate 
            ? `${new Date(dateRange.fromDate).toLocaleDateString()} to ${new Date(dateRange.toDate).toLocaleDateString()}`
            : 'the selected date range';
          
          const message = `No menu sales data found for ${dateRangeText}. Try selecting a different date range or check if there are any completed orders with bills generated.`;
          
          setAlert({ type: 'info', message });
        } else {
          // Unknown response structure - log full response for debugging
          console.error('❌ Unknown API response structure:', result);
          setAlert({ 
            type: 'warning', 
            message: 'API returned an unexpected response format. Check browser console (F12) for details. The API might need to be updated to return data in the expected format: { success: true, data: [...] }' 
          });
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
   * Get date range display name
   */
  const getDateRangeDisplayName = () => {
    if (dateRange.fromDate && dateRange.toDate) {
      const fromDate = new Date(dateRange.fromDate);
      const toDate = new Date(dateRange.toDate);
      if (fromDate.toDateString() === toDate.toDateString()) {
        return fromDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return `${fromDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${toDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    return 'Date Range';
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
    <AdminLayout>
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

        {/* Date Range Selector and Print Button */}
        <div className="flex flex-col gap-4 bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                From Date:
              </label>
              <input
                type="date"
                value={dateRange.fromDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
                max={dateRange.toDate || new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                To Date:
              </label>
              <input
                type="date"
                value={dateRange.toDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, toDate: e.target.value }))}
                min={dateRange.fromDate}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
              />
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDateRange(getDefaultDateRange())}
              className="flex items-center gap-2"
            >
              <span>Reset</span>
            </Button>
            
            {!loading && menuSales.length > 0 && (
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
          
          {dateRange.fromDate && dateRange.toDate && (
            <p className="text-sm text-gray-600">
              Showing menu sales from <span className="font-semibold">{new Date(dateRange.fromDate).toLocaleDateString()}</span> to <span className="font-semibold">{new Date(dateRange.toDate).toLocaleDateString()}</span>
            </p>
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
              No menu sales found for the selected date range. Try selecting a different date range or check if there are any completed orders.
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
                    {branchInfo?.branch_name && (
                      <p style={{ margin: '5px 0 0 0', fontSize: '14px', fontWeight: '600' }}>
                        {branchInfo.branch_name}
                      </p>
                    )}
                    <p style={{ margin: '8px 0 0 0', fontSize: '16px', fontWeight: 'bold' }}>
                      Menu Sales Report - {getDateRangeDisplayName()}
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
              padding-bottom: '10px';
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
    </AdminLayout>
  );
}
