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
import { apiGet, getTerminal, getBranchId, getBranchName } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { BarChart3, Printer } from 'lucide-react';

export default function MenuSalesListPage() {
  const [menuSales, setMenuSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [branchInfo, setBranchInfo] = useState(null);
  const [reportNumber, setReportNumber] = useState('');
  const [dayendId, setDayendId] = useState(''); // Dayend ID (STS) input
  const printRef = useRef(null);

  useEffect(() => {
    fetchBranchInfo();
    
    // Generate report number
    const now = new Date();
    const reportNum = `MSR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    setReportNumber(reportNum);
  }, []);

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
   * API: api/get_menu_sales.php?sts={dayendId} (GET with dayend ID/STS)
   * Shows only menu sales for the current branch
   */
  const fetchMenuSales = async () => {
    // Validate dayend ID input
    if (!dayendId || dayendId.trim() === '') {
      setAlert({ type: 'error', message: 'Please enter Dayend ID (STS) first' });
      return;
    }
    
    setLoading(true);
    setAlert({ type: '', message: '' });
    
    try {
      // Build API params for GET request
      const apiParams = { 
        sts: dayendId.trim()
      };
      
      console.log('Fetching menu sales with dayend ID:', apiParams.sts);
      
      const result = await apiGet('api/get_menu_sales.php', apiParams);
      
      console.log('Menu sales API result:', result);
      console.log('Full API response structure:', JSON.stringify(result, null, 2));
      
      // Handle API response structure
      // API returns: { success: true, sts: 408, count: 23, data: [...] }
      // After apiGet wraps it: { success: true, data: { success: true, sts: 408, count: 23, data: [...] }, status: 200 }
      let menuSalesData = [];
      
      // Check if result.data.data is an array (most likely scenario)
      if (result && result.data && Array.isArray(result.data.data)) {
        menuSalesData = result.data.data;
        console.log('✅ Found menu sales in result.data.data (array), count:', menuSalesData.length);
        console.log('✅ STS:', result.data.sts, 'Total count:', result.data.count);
      }
      // Check if result.data is the actual API response object with data array
      else if (result && result.data && result.data.success && Array.isArray(result.data.data)) {
        menuSalesData = result.data.data;
        console.log('✅ Found menu sales in result.data.data, count:', menuSalesData.length);
      }
      // Check if result.data is an array directly (edge case)
      else if (result && result.data && Array.isArray(result.data)) {
        menuSalesData = result.data;
        console.log('✅ Found menu sales in result.data (direct array), count:', menuSalesData.length);
      }
      // Check for error in response
      else if (result && result.data && result.data.success === false) {
        const errorMsg = result.data.message || result.data.error || 'Failed to load menu sales data';
        setAlert({ type: 'error', message: errorMsg });
        setMenuSales([]);
        setLoading(false);
        return;
      } 
      else if (result && !result.success) {
        const errorMsg = result.data?.message || result.data?.error || 'Failed to load menu sales data. Please check your connection.';
        setAlert({ type: 'error', message: errorMsg });
        setMenuSales([]);
        setLoading(false);
        return;
      }
      
      // Debug: Log sample menu sale from API
      if (menuSalesData.length > 0) {
        console.log('✅ Sample menu sale from API:', JSON.stringify(menuSalesData[0], null, 2));
      } else {
        console.warn('⚠️ No menu sales found in API response');
        console.warn('Response structure:', {
          resultSuccess: result?.success,
          hasResultData: !!result?.data,
          resultDataSuccess: result?.data?.success,
          resultDataSts: result?.data?.sts,
          resultDataCount: result?.data?.count,
          resultDataType: typeof result?.data,
          resultDataKeys: result?.data ? Object.keys(result.data) : [],
        });
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
          setAlert({ type: 'error', message: errorMsg });
        } else if (result && result.data && result.data.success === false) {
          setAlert({ type: 'error', message: result.data.message || result.data.error || 'Failed to load menu sales data' });
        } else if (result && !result.success) {
          setAlert({ type: 'error', message: result.message || 'Failed to load menu sales data. Please check your connection and try again.' });
        } else if (result && result.success && result.data) {
          // API returned success but no data
          const message = `No menu sales data found for Dayend ID (STS) ${dayendId}. Please verify the Dayend ID is correct.`;
          
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

        {/* Dayend ID (STS) Input and Fetch Button */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dayend ID (STS) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dayendId}
                onChange={(e) => setDayendId(e.target.value)}
                placeholder="Enter Dayend ID / STS"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter the Dayend ID (STS number) to fetch menu sales</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchMenuSales}
                variant="primary"
                className="whitespace-nowrap"
                disabled={loading || !dayendId}
              >
                {loading ? 'Loading...' : 'Fetch Menu Sales'}
              </Button>
              {!loading && menuSales.length > 0 && (
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </Button>
              )}
            </div>
          </div>
          {!dayendId && (
            <p className="text-xs text-gray-500 mt-2">
              Please enter a Dayend ID (STS) to fetch menu sales data
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
              {!dayendId 
                ? 'Please enter a Dayend ID (STS) and click "Fetch Menu Sales" to load data.'
                : `No menu sales found for Dayend ID ${dayendId}. Please verify the Dayend ID is correct.`}
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
                      Menu Sales Report
                    </p>
                    {dayendId && (
                      <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                        Dayend ID (STS): {dayendId}
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
