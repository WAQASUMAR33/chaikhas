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
  const printRef = useRef(null);

  useEffect(() => {
    fetchMenuSales();
    
    // Generate report number
    const now = new Date();
    const reportNum = `MSR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    setReportNumber(reportNum);
  }, [period]);

  /**
   * Fetch menu sales data from API
   * API: api/get_menu_sales.php (POST with terminal and period)
   */
  const fetchMenuSales = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    try {
      const terminal = getTerminal();
      const result = await apiPost('api/get_menu_sales.php', { terminal, period });
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Map API response
        const mappedSales = result.data.map((item) => ({
          id: item.dish_id,
          dish_id: item.dish_id,
          name: item.name || '-',
          category: item.category || '-',
          quantity_sold: item.quantity_sold || 0,
          total_revenue: item.total_revenue || 0,
        }));
        setMenuSales(mappedSales);
      } else if (result.data && result.data.success === false) {
        setAlert({ type: 'error', message: result.data.message || 'Failed to load menu sales data' });
        setMenuSales([]);
      } else {
        setMenuSales([]);
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
            <p className="text-gray-500">Loading menu sales data...</p>
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
