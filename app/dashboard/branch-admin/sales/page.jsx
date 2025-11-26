'use client';

/**
 * Sales List Page - Enhanced Version
 * Show daily, weekly, monthly sales with real-time data
 * Uses real API: get_sales.php
 * Features:
 * - Real-time data sync
 * - Daily/Weekly/Monthly filters
 * - PDF download for monthly reports
 * - Auto-refresh functionality
 * - Responsive design
 */

import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, getTerminal, getBranchId } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { TrendingUp, FileText, DollarSign, BarChart3, Download, RefreshCw, Calendar, Search, X } from 'lucide-react';
import logger from '@/utils/logger';

export default function SalesListPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('daily'); // daily, weekly, monthly, custom
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageOrder: 0,
  });
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);
  
  // Date range filter state
  const [dateRange, setDateRange] = useState({
    fromDate: '',
    toDate: '',
  });
  const [showDateRange, setShowDateRange] = useState(false);

  /**
   * Fetch sales data from API
   * API: get_sales.php (POST with terminal and period)
   * Expected response: Array of sales data or { success: true, data: [...] }
   */
  const fetchSales = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setAlert({ type: '', message: '' });

    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      // Prepare API parameters
      // For custom date range, use 'custom' period and include dates
      const apiPeriod = period === 'custom' ? 'custom' : period;
      const apiParams = { terminal, period: apiPeriod, branch_id: branchId };
      
      // Add date range if custom period is selected
      if (period === 'custom' && dateRange.fromDate && dateRange.toDate) {
        apiParams.from_date = dateRange.fromDate;
        apiParams.to_date = dateRange.toDate;
      }
      
      logger.info('Fetching Sales Data', { 
        terminal, 
        branch_id: branchId,
        period: apiPeriod,
        dateRange: period === 'custom' ? { from: dateRange.fromDate, to: dateRange.toDate } : null
      });
      
      console.log('Fetching sales data with params:', apiParams);
      const result = await apiPost('/get_sales.php', apiParams);
      
      console.log('Sales API response:', result);
      
      // Handle different response structures
      let salesData = [];
      let dataSource = '';
      
      if (result.success && result.data) {
        // Check if data is an array directly
        if (Array.isArray(result.data)) {
          salesData = result.data;
          dataSource = 'result.data';
          console.log('Found sales data in result.data (array):', salesData.length);
        } 
        // Check if data is nested: { success: true, data: [...] }
        else if (result.data.data && Array.isArray(result.data.data)) {
          salesData = result.data.data;
          dataSource = 'result.data.data';
          console.log('Found sales data in result.data.data:', salesData.length);
        }
        // Check if data is wrapped: { success: true, data: { sales: [...] } }
        else if (result.data.sales && Array.isArray(result.data.sales)) {
          salesData = result.data.sales;
          dataSource = 'result.data.sales';
          console.log('Found sales data in result.data.sales:', salesData.length);
        }
        // Check if response has orders array
        else if (result.data.orders && Array.isArray(result.data.orders)) {
          salesData = result.data.orders;
          dataSource = 'result.data.orders';
          console.log('Found sales data in result.data.orders:', salesData.length);
        }
        // Check if response has success field with false
        else if (result.data.success === false) {
          logger.error('Sales API returned error', result.data);
          console.error('Sales API returned error:', result.data);
          setAlert({ type: 'error', message: result.data.message || 'Failed to load sales data' });
          setSales([]);
          setSummary({ totalSales: 0, totalOrders: 0, averageOrder: 0 });
          if (showRefreshing) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
          setLastUpdated(new Date());
          return;
        }
        // Try to find any array in the response
        else if (typeof result.data === 'object') {
          for (const key in result.data) {
            if (Array.isArray(result.data[key])) {
              salesData = result.data[key];
              dataSource = `result.data.${key}`;
              console.log(`Found sales data in result.data.${key}:`, salesData.length);
              break;
            }
          }
        }
      } else if (!result.success) {
        logger.error('Sales API request failed', result);
        console.error('Sales API request failed:', result);
        setAlert({ 
          type: 'error', 
          message: result.data?.message || 'Failed to load sales data. Please check your connection.' 
        });
        setSales([]);
        setSummary({ totalSales: 0, totalOrders: 0, averageOrder: 0 });
        if (showRefreshing) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        setLastUpdated(new Date());
        return;
      }
      
      if (salesData.length > 0) {
        logger.logDataFetch('Sales Data', salesData, salesData.length);
        logger.success(`Found ${salesData.length} sales records from ${dataSource}`, { dataSource });
      } else {
        logger.warning('No sales data found in API response', { 
          resultStructure: Object.keys(result.data || {}),
          fullResponse: result.data 
        });
        logger.logMissingData('sales data', 'get_sales.php response');
        console.warn('No sales data found in response. Full response:', result);
      }

      // Process and format sales data
      const processedSales = salesData.map((sale, index) => {
        // Format date based on period
        let formattedDate = sale.date || sale.date_period || sale.period || '';
        
        if (period === 'daily' && sale.date) {
          // Format: YYYY-MM-DD to DD/MM/YYYY or keep as is
          try {
            const date = new Date(sale.date);
            if (!isNaN(date.getTime())) {
              formattedDate = date.toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
              });
            }
          } catch (e) {
            formattedDate = sale.date;
          }
        } else if (period === 'weekly' && sale.week) {
          formattedDate = sale.week || `Week ${index + 1}`;
        } else if (period === 'monthly' && sale.month) {
          formattedDate = sale.month || `Month ${index + 1}`;
        }

        // Calculate values
        const totalSales = parseFloat(sale.total_sales || sale.total_revenue || sale.revenue || sale.amount || 0);
        const totalOrders = parseInt(sale.total_orders || sale.orders_count || sale.count || 0);
        const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

        return {
          id: sale.id || index,
          date: formattedDate,
          total_sales: totalSales,
          total_orders: totalOrders,
          average_order: averageOrder,
          raw_date: sale.date || sale.date_period || sale.period,
        };
      });

      setSales(processedSales);

      // Calculate summary
      const total = processedSales.reduce((sum, sale) => sum + (sale.total_sales || 0), 0);
      const orders = processedSales.reduce((sum, sale) => sum + (sale.total_orders || 0), 0);
      const average = orders > 0 ? total / orders : 0;

      setSummary({
        totalSales: total,
        totalOrders: orders,
        averageOrder: average,
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching sales:', error);
      setAlert({ 
        type: 'error', 
        message: 'Failed to load sales data: ' + (error.message || 'Network error') 
      });
      setSales([]);
      setSummary({ totalSales: 0, totalOrders: 0, averageOrder: 0 });
    } finally {
      if (showRefreshing) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [period, dateRange]);

  // Initial fetch and period change
  useEffect(() => {
    // Only auto-fetch if not custom period or if dates are set
    if (period !== 'custom' || (dateRange.fromDate && dateRange.toDate)) {
      fetchSales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);
  
  // Handle date range changes
  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Fetch sales for custom date range
  const fetchCustomDateRange = () => {
    if (!dateRange.fromDate || !dateRange.toDate) {
      setAlert({ 
        type: 'error', 
        message: 'Please select both start and end dates' 
      });
      return;
    }
    
    // Validate date range
    const fromDate = new Date(dateRange.fromDate);
    const toDate = new Date(dateRange.toDate);
    
    if (fromDate > toDate) {
      setAlert({ 
        type: 'error', 
        message: 'Start date cannot be after end date' 
      });
      return;
    }
    
    // Calculate days difference
    const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      setAlert({ 
        type: 'error', 
        message: 'Date range cannot exceed 365 days' 
      });
      return;
    }
    
    setPeriod('custom');
    fetchSales();
  };
  
  // Clear date range filter
  const clearDateRange = () => {
    setDateRange({ fromDate: '', toDate: '' });
    setShowDateRange(false);
    setPeriod('daily');
    fetchSales();
  };

  // Auto-refresh functionality (every 30 seconds when enabled)
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSales(true);
      }, 30000); // 30 seconds
      setAutoRefreshInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        setAutoRefreshInterval(null);
      }
    }
  }, [autoRefresh, fetchSales]);

  /**
   * Generate and download PDF report (monthly or custom date range)
   */
  const downloadPDFReport = async () => {
    if (period !== 'monthly' && period !== 'custom') {
      setAlert({ 
        type: 'error', 
        message: 'PDF download is only available for monthly reports or custom date ranges' 
      });
      return;
    }
    
    if (period === 'custom' && (!dateRange.fromDate || !dateRange.toDate)) {
      setAlert({ 
        type: 'error', 
        message: 'Please select a date range before downloading PDF' 
      });
      return;
    }

    try {
      // Dynamic import to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // PDF Styling
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(255, 95, 21); // #FF5F15
      const reportTitle = period === 'custom' 
        ? 'Custom Date Range Sales Report'
        : 'Monthly Sales Report';
      doc.text(reportTitle, margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += 5;
      doc.text(`Terminal: ${getTerminal()}`, margin, yPos);
      yPos += 5;
      
      if (period === 'custom' && dateRange.fromDate && dateRange.toDate) {
        doc.text(
          `Date Range: ${new Date(dateRange.fromDate).toLocaleDateString()} - ${new Date(dateRange.toDate).toLocaleDateString()}`,
          margin,
          yPos
        );
        yPos += 5;
      }
      yPos += 5;

      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Summary', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.text(`Total Sales: ${formatPKR(summary.totalSales)}`, margin, yPos);
      yPos += 6;
      doc.text(`Total Orders: ${summary.totalOrders}`, margin, yPos);
      yPos += 6;
      doc.text(`Average Order: ${formatPKR(summary.averageOrder)}`, margin, yPos);
      yPos += 10;

      // Table Header
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const tableTitle = period === 'custom' 
        ? 'Sales Details'
        : 'Monthly Sales Details';
      doc.text(tableTitle, margin, yPos);
      yPos += 8;

      // Table Headers
      const dateColumnHeader = period === 'custom' ? 'Date' : 'Month';
      const tableHeaders = [dateColumnHeader, 'Orders', 'Total Sales', 'Avg Order'];
      const colWidths = [50, 40, 50, 40];
      const colXPositions = [margin, margin + 50, margin + 90, margin + 140];

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(255, 95, 21); // #FF5F15
      doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
      
      tableHeaders.forEach((header, index) => {
        doc.text(header, colXPositions[index], yPos);
      });
      yPos += 8;

      // Table Rows
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      let rowCount = 0;
      const maxRowsPerPage = 20;

      sales.forEach((sale, index) => {
        // Check if we need a new page
        if (rowCount >= maxRowsPerPage) {
          doc.addPage();
          yPos = margin;
          rowCount = 0;
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos - 5, contentWidth, 6, 'F');
        }

        doc.text(sale.date || 'N/A', colXPositions[0], yPos);
        doc.text(String(sale.total_orders || 0), colXPositions[1], yPos);
        doc.text(formatPKR(sale.total_sales || 0), colXPositions[2], yPos);
        doc.text(formatPKR(sale.average_order || 0), colXPositions[3], yPos);
        
        yPos += 6;
        rowCount++;
      });

      // Footer
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Download PDF
      const fileName = period === 'custom'
        ? `Sales_Report_${dateRange.fromDate}_to_${dateRange.toDate}.pdf`
        : `Monthly_Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      setAlert({ 
        type: 'success', 
        message: period === 'custom' 
          ? 'Sales report downloaded successfully!' 
          : 'Monthly sales report downloaded successfully!' 
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setAlert({ 
        type: 'error', 
        message: 'Failed to generate PDF report: ' + (error.message || 'Unknown error') 
      });
    }
  };

  /**
   * Manual refresh
   */
  const handleRefresh = () => {
    fetchSales(true);
  };

  /**
   * Format date for display
   */
  const formatDateDisplay = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return date;
    }
  };

  /**
   * Table columns configuration
   */
  const columns = [
    {
      header: period === 'daily' ? 'Date' : period === 'weekly' ? 'Week' : 'Month',
      accessor: 'date',
      className: 'min-w-[120px]',
      wrap: false,
    },
    {
      header: 'Total Orders',
      accessor: 'total_orders',
      className: 'w-32 text-center',
      wrap: false,
    },
    {
      header: 'Total Sales',
      accessor: (row) => (
        <span className="font-semibold text-green-600">
          {formatPKR(row.total_sales || 0)}
        </span>
      ),
      className: 'w-40 text-right',
      wrap: false,
    },
    {
      header: 'Average Order',
      accessor: (row) => (
        <span className="font-medium text-gray-700">
          {formatPKR(row.average_order || 0)}
        </span>
      ),
      className: 'w-40 text-right',
      wrap: false,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sales List</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              View daily, weekly, and monthly sales reports
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            
            {(period === 'monthly' || period === 'custom') && (
              <Button
                variant="primary"
                size="sm"
                onClick={downloadPDFReport}
                className="flex items-center gap-2"
                disabled={period === 'custom' && (!dateRange.fromDate || !dateRange.toDate)}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            )}
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

        {/* Period Selector & Auto-Refresh Toggle */}
        <div className="flex flex-col gap-4 bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {['daily', 'weekly', 'monthly'].map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setPeriod(p);
                    setShowDateRange(false);
                    setDateRange({ fromDate: '', toDate: '' });
                  }}
                  className="capitalize"
                >
                  {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Monthly'}
                </Button>
              ))}
              
              <Button
                variant={period === 'custom' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowDateRange(!showDateRange)}
                className="flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Custom Range</span>
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-[#FF5F15] border-gray-300 rounded focus:ring-[#FF5F15]"
                />
                <span>Auto-refresh (30s)</span>
              </label>
              
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          
          {/* Date Range Selector */}
          {showDateRange && (
            <div className="border-t pt-4 mt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      From Date:
                    </label>
                    <input
                      type="date"
                      value={dateRange.fromDate}
                      onChange={(e) => handleDateRangeChange('fromDate', e.target.value)}
                      max={dateRange.toDate || new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      To Date:
                    </label>
                    <input
                      type="date"
                      value={dateRange.toDate}
                      onChange={(e) => handleDateRangeChange('toDate', e.target.value)}
                      min={dateRange.fromDate}
                      max={new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={fetchCustomDateRange}
                    disabled={!dateRange.fromDate || !dateRange.toDate}
                    className="flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </Button>
                  
                  {(dateRange.fromDate || dateRange.toDate) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={clearDateRange}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Clear</span>
                    </Button>
                  )}
                </div>
              </div>
              
              {period === 'custom' && dateRange.fromDate && dateRange.toDate && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-gray-600">
                    Showing sales from <span className="font-semibold">{new Date(dateRange.fromDate).toLocaleDateString()}</span> to <span className="font-semibold">{new Date(dateRange.toDate).toLocaleDateString()}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Sales</h3>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {formatPKR(summary.totalSales)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Orders</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {summary.totalOrders}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Average Order</h3>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {formatPKR(summary.averageOrder)}
            </p>
          </div>
        </div>

        {/* Sales Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
              <p className="text-gray-500">Loading sales data...</p>
            </div>
          </div>
        ) : sales.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-lg font-medium">No sales data found</p>
            <p className="text-gray-400 text-sm mt-1">
              {period === 'daily' 
                ? 'No sales recorded for the selected period' 
                : period === 'weekly'
                ? 'No weekly sales data available'
                : period === 'monthly'
                ? 'No monthly sales data available'
                : period === 'custom'
                ? 'No sales data found for the selected date range'
                : 'No sales data available'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table
              columns={columns}
              data={sales}
              emptyMessage="No sales data found"
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
