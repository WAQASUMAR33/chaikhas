'use client';

/**
 * Sales Report Page - Branch Admin
 * Generate and print monthly sales reports
 * Shows only sales for the current branch
 * Uses API: get_sales_report.php
 */

import { useEffect, useState, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { apiPost, getBranchId, getBranchName } from '@/utils/api';
import { formatPKR, formatDateTime } from '@/utils/format';
import { FileText, Printer, Download, Calendar, Building2 } from 'lucide-react';

export default function SalesReportPage() {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [reportData, setReportData] = useState([]);
  const [branchInfo, setBranchInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [reportNumber, setReportNumber] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    // Set current month as default
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
    
    // Generate report number
    const reportNum = `SR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    setReportNumber(reportNum);
    
    fetchBranchInfo();
  }, []);

  /**
   * Fetch branch information
   */
  const fetchBranchInfo = async () => {
    try {
      const branchId = getBranchId();
      const branchName = getBranchName();
      
      if (branchId) {
        // You may need to fetch full branch details from API
        setBranchInfo({
          branch_id: branchId,
          branch_name: branchName || 'Branch',
          address: '', // Add address if available in your system
        });
      }
    } catch (error) {
      console.error('Error fetching branch info:', error);
    }
  };

  /**
   * Generate sales report
   */
  const generateReport = async () => {
    if (!selectedMonth) {
      setAlert({ type: 'error', message: 'Please select a month' });
      return;
    }

    setLoading(true);
    setAlert({ type: '', message: '' });

    try {
      const branchId = getBranchId();
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID not found. Please login again.' });
        setLoading(false);
        return;
      }

      // Parse month to get start and end dates
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const result = await apiPost('/get_sales_report.php', {
        branch_id: branchId,
        start_date: startDate,
        end_date: endDate,
      });

      if (result.success && result.data) {
        let salesData = [];
        
        if (Array.isArray(result.data)) {
          salesData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          salesData = result.data.data;
        } else if (result.data.sales && Array.isArray(result.data.sales)) {
          salesData = result.data.sales;
        }

        setReportData(salesData);
        setReportGenerated(true);
        setAlert({ type: 'success', message: `Report generated successfully. Found ${salesData.length} records.` });
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to generate report' });
        setReportData([]);
        setReportGenerated(false);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setAlert({ type: 'error', message: 'Failed to generate report: ' + (error.message || 'Network error') });
      setReportData([]);
      setReportGenerated(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Print report
   */
  const handlePrint = () => {
    if (!reportGenerated || reportData.length === 0) {
      setAlert({ type: 'error', message: 'Please generate a report first' });
      return;
    }

    window.print();
  };

  // Calculate totals
  const totals = reportData.reduce((acc, sale) => {
    acc.billAmount += parseFloat(sale.bill_amount || sale.g_total_amount || sale.total || 0);
    acc.serviceCharge += parseFloat(sale.service_charge || 0);
    acc.discount += parseFloat(sale.discount_amount || sale.discount || 0);
    acc.netTotal += parseFloat(sale.net_total || sale.net_total_amount || sale.grand_total || 0);
    return acc;
  }, { billAmount: 0, serviceCharge: 0, discount: 0, netTotal: 0 });

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sales Report</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Generate and print monthly sales reports
            </p>
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

        {/* Report Controls */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Month
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setReportGenerated(false);
                  }}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
                />
              </div>
            </div>
            <Button
              onClick={generateReport}
              disabled={loading || !selectedMonth}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Generate Report</span>
                </>
              )}
            </Button>
            {reportGenerated && reportData.length > 0 && (
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
        </div>

        {/* Report Summary */}
        {reportGenerated && reportData.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{reportData.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-600">Total Bill Amount</p>
              <p className="text-2xl font-bold text-[#FF5F15] mt-1">{formatPKR(totals.billAmount)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-600">Total Service Charge</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatPKR(totals.serviceCharge)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-600">Net Total</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatPKR(totals.netTotal)}</p>
            </div>
          </div>
        )}

        {/* Report Table - Hidden in print, shown on screen */}
        {reportGenerated && reportData.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hall</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Taker</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Service Charge</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((sale, index) => (
                    <tr key={sale.order_id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sale.order_id || sale.id || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(sale.created_at || sale.order_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {sale.order_type || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {sale.hall_name || sale.hall || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {sale.table_number || sale.table || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {sale.order_taker_name || sale.order_taker || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {formatPKR(sale.bill_amount || sale.g_total_amount || sale.total || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-blue-600">
                        {formatPKR(sale.service_charge || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600">
                        {formatPKR(sale.discount_amount || sale.discount || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-[#FF5F15]">
                        {formatPKR(sale.net_total || sale.net_total_amount || sale.grand_total || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {sale.payment_mode || sale.payment_method || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {sale.bill_by_name || sale.bill_by || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="6" className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      Totals:
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatPKR(totals.billAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-600 text-right">
                      {formatPKR(totals.serviceCharge)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-red-600 text-right">
                      {formatPKR(totals.discount)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-[#FF5F15] text-right">
                      {formatPKR(totals.netTotal)}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Print View */}
        <div ref={printRef} className="hidden print:block">
          <style jsx global>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 1.5cm 1cm;
                @top-center {
                  content: element(header);
                }
                @bottom-center {
                  content: "Page " counter(page) " of " counter(pages);
                  font-size: 10px;
                }
              }
              
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .no-print {
                display: none !important;
              }
              
              .print-header {
                position: running(header);
              }
              
              .print-footer {
                position: running(footer);
              }
              
              .print-page-break {
                page-break-after: always;
              }
              
              table {
                page-break-inside: auto;
                border-collapse: collapse;
              }
              
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              
              thead {
                display: table-header-group;
              }
              
              thead tr {
                page-break-after: avoid;
                page-break-inside: avoid;
              }
              
              tfoot {
                display: table-footer-group;
              }
              
              tbody tr:last-child {
                page-break-after: avoid;
              }
            }
          `}</style>
          
          {reportGenerated && reportData.length > 0 && (
            <div className="print-container">
              {/* Report Header - Repeats on each page */}
              <div className="print-header" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '20px',
                paddingBottom: '10px',
                borderBottom: '2px solid #000',
                position: 'running(header)'
              }}>
                <div style={{ width: '20%' }}>
                  {/* Logo placeholder - replace with your logo */}
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    border: '1px solid #ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: '#666'
                  }}>
                    LOGO
                  </div>
                </div>
                <div style={{ width: '60%', textAlign: 'center' }}>
                  <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                    {branchInfo?.branch_name || 'Branch Name'}
                  </h1>
                  <p style={{ margin: '5px 0', fontSize: '12px' }}>
                    {branchInfo?.address || 'Branch Address'}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 'bold' }}>
                    Monthly Sales Report - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div style={{ width: '20%', textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    <strong>Report No:</strong><br />
                    {reportNumber}
                  </p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '12px' }}>
                    Generated: {new Date().toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>

              {/* Report Table */}
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '10px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #000' }}>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Order ID</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Created At</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Order Type</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Hall</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Table</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Order Taker</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Bill Amount</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Service Charge</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Discount</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Net Total</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Payment Mode</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Bill By</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((sale, index) => (
                    <tr key={sale.order_id || index}>
                      <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.order_id || sale.id || 'N/A'}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc' }}>{formatDateTime(sale.created_at || sale.order_date)}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.order_type || 'N/A'}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.hall_name || sale.hall || 'N/A'}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.table_number || sale.table || 'N/A'}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.order_taker_name || sale.order_taker || 'N/A'}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc', textAlign: 'right' }}>{formatPKR(sale.bill_amount || sale.g_total_amount || sale.total || 0)}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc', textAlign: 'right' }}>{formatPKR(sale.service_charge || 0)}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc', textAlign: 'right' }}>{formatPKR(sale.discount_amount || sale.discount || 0)}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 'bold' }}>{formatPKR(sale.net_total || sale.net_total_amount || sale.grand_total || 0)}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.payment_mode || sale.payment_method || 'N/A'}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.bill_by_name || sale.bill_by || 'N/A'}</td>
                      <td style={{ padding: '6px', border: '1px solid #ccc' }}>{formatDateTime(sale.updated_at || sale.last_update)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #000', fontWeight: 'bold' }}>
                    <td colSpan="6" style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Totals:</td>
                    <td style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>{formatPKR(totals.billAmount)}</td>
                    <td style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>{formatPKR(totals.serviceCharge)}</td>
                    <td style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>{formatPKR(totals.discount)}</td>
                    <td style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>{formatPKR(totals.netTotal)}</td>
                    <td colSpan="3" style={{ padding: '8px', border: '1px solid #000' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

