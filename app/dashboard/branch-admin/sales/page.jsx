'use client';

/**
 * Sales List Page - Enhanced Version
 * Show daily, weekly, monthly sales with real-time data
 * Uses real API: api/get_sales.php (sales reports by period)
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

/**
 * Fetch the last dayend closing_date_time for the current branch
 * Returns the closing_date_time if dayend exists, null otherwise
 */
const fetchLastDayend = async (branchId) => {
  try {
    const result = await apiPost('api/get_dayend.php', {
      branch_id: branchId,
    });
    
    if (result.success && result.data) {
      let dayendData = [];
      if (Array.isArray(result.data)) {
        dayendData = result.data;
      } else if (result.data.data && Array.isArray(result.data.data)) {
        dayendData = result.data.data;
      }
      
      if (dayendData.length > 0) {
        // Sort by closing_date_time descending to get the most recent
        const sortedDayends = [...dayendData].sort((a, b) => {
          const dateA = new Date(a.closing_date_time || 0);
          const dateB = new Date(b.closing_date_time || 0);
          return dateB - dateA; // Descending order
        });
        const lastDayend = sortedDayends[0];
        if (lastDayend && lastDayend.closing_date_time) {
          return lastDayend.closing_date_time;
        }
      }
    }
    return null; // No dayend found
  } catch (error) {
    console.error(`Error fetching dayend for branch ${branchId}:`, error);
    return null;
  }
};

export default function SalesListPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageOrder: 0,
  });
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);
  
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

  /**
   * Fetch sales data from API
   * API: api/get_sales.php (POST with terminal and period)
   * Expected response: Array of sales data or { success: true, data: [...] }
   * Note: api/get_sales.php is for sales reports by period (daily/weekly/monthly)
   *      pos/get_sales.php is for raw order data (not used here)
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
      
      // STRICT BRANCH RESTRICTION: Branch-admin MUST have branch_id
      if (!branchId) {
        setAlert({ 
          type: 'error', 
          message: 'Branch ID not found. Please login again. Branch admin can only view their own branch data.' 
        });
        setSales([]);
        setSummary({ totalSales: 0, totalOrders: 0, averageOrder: 0 });
        if (showRefreshing) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }
      
      // Prepare API parameters - always use date range
      // ALWAYS include branch_id for branch-admin - strict restriction
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
        setSales([]);
        setSummary({ totalSales: 0, totalOrders: 0, averageOrder: 0 });
        if (showRefreshing) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }
      
      console.log('📅 Fetching sales for date range:', apiParams.from_date, 'to', apiParams.to_date);
      
      logger.info('Fetching Sales Data', { 
        terminal, 
        branch_id: branchId,
        dateRange: { from: dateRange.fromDate, to: dateRange.toDate }
      });
      
      console.log('Fetching sales data with params:', apiParams);
      // Use api/get_sales.php for sales reports by period (daily/weekly/monthly)
      const result = await apiPost('api/get_sales.php', apiParams);
      
      console.log('=== Sales API Response ===');
      console.log('Full result:', JSON.stringify(result, null, 2));
      console.log('result.success:', result?.success);
      console.log('result.data:', result?.data);
      console.log('result.status:', result?.status);
      console.log('result.data type:', typeof result?.data);
      console.log('result.data keys:', result?.data ? Object.keys(result.data) : 'no data');
      
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
          const errorMessage = result.data.message || result.data.error || 'Failed to load sales data';
          
          // Check for specific database column errors
          if (errorMessage.toLowerCase().includes("unknown column") || 
              errorMessage.toLowerCase().includes("orders.sts") ||
              errorMessage.toLowerCase().includes("column 'sts'")) {
            setAlert({ 
              type: 'error', 
              message: `Database Column Error: The API is trying to use column 'orders.sts' which doesn't exist. Please update api/get_sales.php to use 'order_status' instead of 'sts'. Error: ${errorMessage}` 
            });
          }
          // Check for database connection errors
          else if (errorMessage.toLowerCase().includes('database') || 
              errorMessage.toLowerCase().includes('connection') ||
              errorMessage.toLowerCase().includes('db')) {
            setAlert({ 
              type: 'error', 
              message: `Database Connection Error: ${errorMessage}. Please check your database configuration.` 
            });
          } else {
            setAlert({ type: 'error', message: errorMessage });
          }
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
        console.error('Full result object:', JSON.stringify(result, null, 2));
        
        // Handle empty response
        if (!result.data || (typeof result.data === 'object' && Object.keys(result.data).length === 0)) {
          console.error('Empty response from API - checking status and raw response');
          const statusMessage = result.status ? `HTTP ${result.status}` : 'Unknown status';
          const rawResponse = result.data?.rawResponse || result.data?.error || '';
          
          // Check if it's a 404 (endpoint not found)
          if (result.status === 404) {
            setAlert({ 
              type: 'error', 
              message: `API Endpoint Not Found: api/get_sales.php does not exist or is not accessible. Please verify the API file exists at the correct path.` 
            });
          }
          // Check if it's a 500 (server error)
          else if (result.status === 500) {
            setAlert({ 
              type: 'error', 
              message: `Server Error (${statusMessage}): The API endpoint returned an error. Please check the server logs. This might be due to the 'orders.sts' column issue - update api/get_sales.php to use 'order_status' instead of 'sts'.` 
            });
          }
          // Check for database column errors in raw response
          else if (rawResponse && (rawResponse.toLowerCase().includes("unknown column") || 
              rawResponse.toLowerCase().includes("orders.sts") ||
              rawResponse.toLowerCase().includes("column 'sts'"))) {
            setAlert({ 
              type: 'error', 
              message: `Database Column Error: The API is trying to use column 'orders.sts' which doesn't exist. Please update api/get_sales.php to use 'order_status' instead of 'sts'.` 
            });
          }
          // Generic empty response error
          else {
            setAlert({ 
              type: 'error', 
              message: `Empty response from API (${statusMessage}). The server returned no data. This could mean: 1) The API endpoint doesn't exist, 2) There's a server error, or 3) The API needs to be fixed (check for 'orders.sts' column issue).` 
            });
          }
        } else {
          // Handle non-empty error response
          const errorMessage = result.data?.message || result.data?.error || result.data?.rawResponse || 'Failed to load sales data. Please check your connection.';
          
          // Check for specific database column errors
          if (errorMessage.toLowerCase().includes("unknown column") || 
              errorMessage.toLowerCase().includes("orders.sts") ||
              errorMessage.toLowerCase().includes("column 'sts'")) {
            setAlert({ 
              type: 'error', 
              message: `Database Column Error: The API is trying to use column 'orders.sts' which doesn't exist. Please update api/get_sales.php to use 'order_status' instead of 'sts'. Error: ${errorMessage}` 
            });
          }
          // Check for database connection errors
          else if (errorMessage.toLowerCase().includes('database') || 
              errorMessage.toLowerCase().includes('connection') ||
              errorMessage.toLowerCase().includes('db')) {
            setAlert({ 
              type: 'error', 
              message: `Database Connection Error: ${errorMessage}. Please verify the API endpoint and database configuration.` 
            });
          } else {
            setAlert({ 
              type: 'error', 
              message: errorMessage 
            });
          }
        }
        
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
      
      // Handle case where result.success is true but result.data is empty or undefined
      // Try to fetch from bills as fallback if sales API returns empty
      if (result.success && (!result.data || (typeof result.data === 'object' && Object.keys(result.data).length === 0))) {
        console.warn('API returned success but no data (empty object)');
        console.warn('Attempting fallback: Fetching from bills API...');
        
        // Fallback: Try fetching from bills API
        try {
          const billsParams = {
            terminal,
            branch_id: branchId,
          };
          
          // Add date range to bills params
          if (dateRange.fromDate && dateRange.toDate) {
            billsParams.from_date = dateRange.fromDate;
            billsParams.to_date = dateRange.toDate;
          }
          
          const billsResult = await apiPost('api/bills_management.php', { action: 'get', ...billsParams });
          
          if (billsResult.success && billsResult.data) {
            let billsList = [];
            if (Array.isArray(billsResult.data)) {
              billsList = billsResult.data;
            } else if (billsResult.data.data && Array.isArray(billsResult.data.data)) {
              billsList = billsResult.data.data;
            } else if (billsResult.data.bills && Array.isArray(billsResult.data.bills)) {
              billsList = billsResult.data.bills;
            }
            
            if (billsList.length > 0) {
              console.log('✅ Fallback: Found', billsList.length, 'bills, converting to sales format');
              
              // Group bills by date and calculate totals
              const salesByDate = {};
              billsList.forEach(bill => {
                const billDate = bill.created_at || bill.bill_date || bill.date || new Date().toISOString().split('T')[0];
                const dateKey = billDate.split('T')[0]; // Get YYYY-MM-DD
                
                if (!salesByDate[dateKey]) {
                  salesByDate[dateKey] = {
                    date: dateKey,
                    total_sales: 0,
                    total_orders: 0,
                  };
                }
                
                const billTotal = parseFloat(bill.grand_total || bill.net_total || bill.total_amount || 0);
                salesByDate[dateKey].total_sales += billTotal;
                salesByDate[dateKey].total_orders += 1;
              });
              
              // Convert to array format
              salesData = Object.values(salesByDate);
              console.log('✅ Converted bills to sales data:', salesData.length, 'records');
            }
          }
        } catch (fallbackError) {
          console.error('Fallback bills fetch failed:', fallbackError);
        }
        
        // If still no data after fallback, show message
        if (salesData.length === 0) {
          if (result.data && typeof result.data === 'object' && Object.keys(result.data).length === 0) {
            setAlert({ 
              type: 'info', 
              message: 'No sales data available for the selected period. Try selecting a different date range.' 
            });
          } else {
            setAlert({ 
              type: 'warning', 
              message: 'API returned success but no data. The server may have returned an empty response.' 
            });
          }
          
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

      // BRANCH FILTERING: Filter out sales that explicitly belong to other branches
      // Since we called the API with branch_id, we trust the API filtered correctly
      // Only filter out sales that explicitly have a different branch_id
      const filteredSalesData = salesData.filter(sale => {
        if (!sale) return false; // Filter out null/undefined
        
        const saleBranchId = sale.branch_id || sale.branchId || sale.branch_ID || sale.BranchID;
        
        // If sale has no branch_id, include it (API was called with branch_id, so it should be filtered)
        if (!saleBranchId) {
          console.log('ℹ️ Sale missing branch_id, including (API was called with branch_id):', sale.order_id || sale.id || sale.date);
          return true; // Include sales without branch_id since API was called with branch_id
        }
        
        // If sale has branch_id, check if it matches current branch
        const saleBranchIdStr = String(saleBranchId).trim();
        const currentBranchIdStr = String(branchId).trim();
        const matches = saleBranchIdStr === currentBranchIdStr;
        
        if (!matches) {
          console.warn('⚠️ Sale from different branch excluded:', {
            order_id: sale.order_id || sale.id,
            sale_branch_id: saleBranchId,
            current_branch_id: branchId
          });
        }
        return matches;
      });
      
      console.log(`📊 Branch filtering: ${salesData.length} total sales, ${filteredSalesData.length} after filtering for branch ${branchId}`);
      
      // Log if no sales data found
      if (salesData.length === 0) {
        console.warn('⚠️ No sales data found in API response');
        console.warn('Full API response:', JSON.stringify(result, null, 2));
        setAlert({ 
          type: 'info', 
          message: 'No sales data available for the selected period. Try selecting a different date range or period.' 
        });
      } else if (filteredSalesData.length === 0 && salesData.length > 0) {
        console.warn('⚠️ All sales filtered out - this might indicate a data issue');
        console.warn('Sample sale data:', salesData[0]);
        setAlert({ 
          type: 'warning', 
          message: `Found ${salesData.length} sales records, but none match your branch (${branchId}). Check console for details.` 
        });
      }
      
      // Process and format sales data (even if empty, so UI can show "no data" message)
      const processedSales = filteredSalesData.map((sale, index) => {
        // Format date - always format as date
        let formattedDate = sale.date || sale.date_period || sale.period || '';
        
        if (sale.date) {
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

      // Always set sales data, even if empty (so UI can show "no data" message)
      setSales(processedSales);
      console.log('✅ Sales data set:', processedSales.length, 'records');

      // Calculate summary
      const total = processedSales.reduce((sum, sale) => sum + (sale.total_sales || 0), 0);
      const orders = processedSales.reduce((sum, sale) => sum + (sale.total_orders || 0), 0);
      const average = orders > 0 ? total / orders : 0;

      setSummary({
        totalSales: total,
        totalOrders: orders,
        averageOrder: average,
      });

      console.log('✅ Summary calculated:', { total, orders, average });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching sales:', error);
      const errorMessage = error.message || 'Network error';
      // Check for database connection errors in error message
      if (errorMessage.toLowerCase().includes('database') || 
          errorMessage.toLowerCase().includes('connection') ||
          errorMessage.toLowerCase().includes('db')) {
        setAlert({ 
          type: 'error', 
          message: `Database Connection Error: ${errorMessage}. Please check your API endpoint path (api/ or pos/) and database configuration.` 
        });
      } else {
        setAlert({ 
          type: 'error', 
          message: 'Failed to load sales data: ' + errorMessage 
        });
      }
      setSales([]);
      setSummary({ totalSales: 0, totalOrders: 0, averageOrder: 0 });
    } finally {
      if (showRefreshing) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [dateRange]);

  // Initial fetch on mount
  useEffect(() => {
    if (dateRange.fromDate && dateRange.toDate) {
      fetchSales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle date range changes
  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Apply date range filter
  const applyDateRange = () => {
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
    
    fetchSales();
  };
  
  // Reset to default date range (last 30 days)
  const resetDateRange = () => {
    setDateRange(getDefaultDateRange());
    // fetchSales will be triggered by useEffect when dateRange changes
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
    if (!dateRange.fromDate || !dateRange.toDate) {
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
      const reportTitle = 'Sales Report';
      doc.text(reportTitle, margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += 5;
      doc.text(`Terminal: ${getTerminal()}`, margin, yPos);
      yPos += 5;
      
      if (dateRange.fromDate && dateRange.toDate) {
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
      const tableTitle = 'Sales Details';
      doc.text(tableTitle, margin, yPos);
      yPos += 8;

      // Table Headers
      const dateColumnHeader = 'Date';
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
      const fileName = `Sales_Report_${dateRange.fromDate}_to_${dateRange.toDate}.pdf`;
      doc.save(fileName);

      setAlert({ 
        type: 'success', 
        message: 'Sales report downloaded successfully!' 
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
      header: 'Date',
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
              View sales reports by date range
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={downloadPDFReport}
              className="flex items-center gap-2 w-full sm:w-auto justify-center"
              disabled={!dateRange.fromDate || !dateRange.toDate}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
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

        {/* Date Range Selector & Auto-Refresh Toggle */}
        <div className="flex flex-col gap-4 bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap w-full sm:w-auto">
                  From Date:
                </label>
                <input
                  type="date"
                  value={dateRange.fromDate}
                  onChange={(e) => handleDateRangeChange('fromDate', e.target.value)}
                  max={dateRange.toDate || new Date().toISOString().split('T')[0]}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap w-full sm:w-auto">
                  To Date:
                </label>
                <input
                  type="date"
                  value={dateRange.toDate}
                  onChange={(e) => handleDateRangeChange('toDate', e.target.value)}
                  min={dateRange.fromDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
                />
              </div>
              
              <Button
                variant="primary"
                size="sm"
                onClick={applyDateRange}
                disabled={!dateRange.fromDate || !dateRange.toDate}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={resetDateRange}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <X className="w-4 h-4" />
                <span>Reset</span>
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-[#FF5F15] border-gray-300 rounded focus:ring-[#FF5F15]"
                />
                <span className="whitespace-nowrap">Auto-refresh (30s)</span>
              </label>
              
              {lastUpdated && (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          
          {dateRange.fromDate && dateRange.toDate && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs sm:text-sm text-gray-600 break-words">
                Showing sales from <span className="font-semibold">{new Date(dateRange.fromDate).toLocaleDateString()}</span> to <span className="font-semibold">{new Date(dateRange.toDate).toLocaleDateString()}</span>
              </p>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Total Sales</h3>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words">
              {formatPKR(summary.totalSales)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Total Orders</h3>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
              {summary.totalOrders}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Average Order</h3>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words">
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
              No sales data found for the selected date range. Try selecting a different date range.
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
