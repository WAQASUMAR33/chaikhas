'use client';

/**
 * Sales Report Page - Branch Admin
 * Generate and print monthly sales reports
 * Shows only sales for the current branch
 * Uses API: api/get_sales_report.php
 */

import { useEffect, useState, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { apiPost, apiGet, getBranchId, getBranchName } from '@/utils/api';
import { formatPKR, formatDateTime } from '@/utils/format';
import { isCreditPayment, getPaymentMethodDisplay } from '@/utils/payment';
import { FileText, Printer, Download, Calendar, Building2 } from 'lucide-react';

export default function SalesReportPage() {
  const [periodFilter, setPeriodFilter] = useState('daily'); // daily, weekly, monthly, all, custom
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [reportData, setReportData] = useState([]);
  const [branchInfo, setBranchInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [reportNumber, setReportNumber] = useState('');
  const printRef = useRef(null);

  /**
   * Get today's date in YYYY-MM-DD format
   */
  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Get start of week (Monday) date in YYYY-MM-DD format
   */
  const getWeekStartDate = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayStr = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  /**
   * Get end of week (Sunday) date in YYYY-MM-DD format
   */
  const getWeekEndDate = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(now.setDate(diff));
    const year = sunday.getFullYear();
    const month = String(sunday.getMonth() + 1).padStart(2, '0');
    const dayStr = String(sunday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  useEffect(() => {
    // Set defaults based on period filter
    const now = new Date();
    
    if (periodFilter === 'daily') {
      setSelectedDate(getTodayDate());
    } else if (periodFilter === 'monthly') {
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(currentMonth);
    }
    
    // Generate report number
    const reportNum = `SR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    setReportNumber(reportNum);
    
    fetchBranchInfo();
  }, [periodFilter]);

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
    setLoading(true);
    setAlert({ type: '', message: '' });

    try {
      const branchId = getBranchId();
      
      // STRICT BRANCH RESTRICTION: Branch-admin MUST have branch_id
      if (!branchId) {
        setAlert({ type: 'error', message: 'Branch ID not found. Please login again. Branch admin can only view their own branch sales reports.' });
        setLoading(false);
        return;
      }
      
      // Additional validation: Ensure branch_id is a valid number
      const numBranchId = parseInt(branchId, 10);
      if (isNaN(numBranchId) || numBranchId <= 0) {
        setAlert({ type: 'error', message: 'Invalid Branch ID. Please log in again.' });
        setLoading(false);
        return;
      }

      let startDate = '';
      let endDate = '';

      // Determine date range based on period filter
      if (periodFilter === 'daily') {
        if (!selectedDate) {
          setAlert({ type: 'error', message: 'Please select a date' });
          setLoading(false);
          return;
        }
        startDate = selectedDate;
        endDate = selectedDate;
        console.log('📅 Generating daily report for:', selectedDate);
      } else if (periodFilter === 'weekly') {
        startDate = getWeekStartDate();
        endDate = getWeekEndDate();
        console.log('📅 Generating weekly report from:', startDate, 'to', endDate);
      } else if (periodFilter === 'monthly') {
        if (!selectedMonth) {
          setAlert({ type: 'error', message: 'Please select a month' });
          setLoading(false);
          return;
        }
        const [year, month] = selectedMonth.split('-');
        startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        console.log('📅 Generating monthly report for:', selectedMonth);
      } else if (periodFilter === 'custom') {
        if (!customDateFrom || !customDateTo) {
          setAlert({ type: 'error', message: 'Please select both start and end dates' });
          setLoading(false);
          return;
        }
        startDate = customDateFrom;
        endDate = customDateTo;
        console.log('📅 Generating custom report from:', startDate, 'to', endDate);
      } else {
        // 'all' - no date filtering
        console.log('📅 Generating report for all time (no date filter)');
      }

      const params = {};
      
      // Only add date params if not 'all'
      if (periodFilter !== 'all') {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      
      params.branch_id = numBranchId;

      // Fetch sales report including credit sales
      // The API should return all bills (paid, unpaid, and credit) in the date range
      // ALWAYS include branch_id for branch-admin - strict restriction
      const result = await apiPost('api/get_sales_report.php', {
        branch_id: branchId,
        start_date: startDate,
        end_date: endDate,
        include_credit: true, // Explicitly request credit sales to be included
      });

      let salesData = [];
      
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          salesData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          salesData = result.data.data;
        } else if (result.data.sales && Array.isArray(result.data.sales)) {
          salesData = result.data.sales;
        }
      }
      
      // IMPORTANT: Also fetch from bills_management.php to ensure we get ALL bills including credit
      // This is the same API used by dayend to calculate credit sales
      try {
        const billsResult = await apiGet('api/bills_management.php', {
          branch_id: branchId,
          start_date: startDate,
          end_date: endDate,
        });
        
        if (billsResult.success && billsResult.data) {
          let billsData = [];
          if (Array.isArray(billsResult.data)) {
            billsData = billsResult.data;
          } else if (billsResult.data.data && Array.isArray(billsResult.data.data)) {
            billsData = billsResult.data.data;
          } else if (billsResult.data.bills && Array.isArray(billsResult.data.bills)) {
            billsData = billsResult.data.bills;
          }
          
          console.log('📋 Bills from bills_management.php:', billsData.length, 'bills');
          
          // Merge bills data with sales data, avoiding duplicates
          const existingOrderIds = new Set(salesData.map(s => s.order_id || s.id));
          billsData.forEach(bill => {
            const orderId = bill.order_id || bill.id;
            if (!existingOrderIds.has(orderId)) {
              // Determine if this is a credit sale
              const billPaymentStatus = (bill.payment_status || '').toString().toLowerCase().trim();
              const billPaymentMethod = (bill.payment_method || '').toString().toLowerCase().trim();
              const billIsCredit = bill.is_credit === true || bill.is_credit === 1 || bill.is_credit === '1' ||
                                   billPaymentMethod === 'credit' ||
                                   (billPaymentStatus === 'unpaid' && bill.customer_id && bill.customer_id > 0);
              
              // Add bill to sales data
              salesData.push({
                ...bill,
                order_id: orderId,
                bill_id: bill.bill_id || bill.id,
                // Map bill fields to sales report format
                bill_amount: bill.total_amount || bill.bill_amount,
                net_total: bill.grand_total || bill.net_total || bill.total_amount,
                grand_total: bill.grand_total || bill.total_amount,
                payment_method: billIsCredit ? 'Credit' : (bill.payment_method || 'N/A'),
                payment_status: billIsCredit ? 'Credit' : (bill.payment_status || 'N/A'),
                payment_mode: billIsCredit ? 'Credit' : (bill.payment_method || 'N/A'),
                is_credit: billIsCredit,
                customer_id: bill.customer_id,
                customer_name: bill.customer_name || bill.customerName || bill.name || bill.customer || bill.customer_full_name || bill.full_name || null,
                customer_phone: bill.customer_phone || bill.customerPhone || bill.phone || bill.mobile || bill.mobile_no || bill.contact_number || null,
                created_at: bill.created_at || bill.date,
              });
              existingOrderIds.add(orderId);
            } else {
              // Update existing sale with bill data if bill has more complete info
              const existingSale = salesData.find(s => (s.order_id || s.id) === orderId);
              if (existingSale) {
                // Update payment fields from bill if they're missing in sale
                if (!existingSale.payment_method && bill.payment_method) {
                  existingSale.payment_method = bill.payment_method;
                }
                if (!existingSale.payment_status && bill.payment_status) {
                  existingSale.payment_status = bill.payment_status;
                }
                if (existingSale.is_credit === undefined && bill.is_credit !== undefined) {
                  existingSale.is_credit = bill.is_credit;
                }
                // If bill has customer_id, it's likely a credit sale
                if (bill.customer_id) {
                  existingSale.customer_id = bill.customer_id;
                  // Update customer information with all possible field variations
                  const billCustomerName = bill.customer_name || bill.customerName || bill.name || bill.customer || bill.customer_full_name || bill.full_name;
                  const billCustomerPhone = bill.customer_phone || bill.customerPhone || bill.phone || bill.mobile || bill.mobile_no || bill.contact_number;
                  
                  if (billCustomerName) {
                    existingSale.customer_name = billCustomerName;
                  } else if (!existingSale.customer_name) {
                    existingSale.customer_name = null;
                  }
                  
                  if (billCustomerPhone) {
                    existingSale.customer_phone = billCustomerPhone;
                  } else if (!existingSale.customer_phone) {
                    existingSale.customer_phone = null;
                  }
                  
                  // If payment_status is unpaid but there's a customer_id, mark as credit
                  const billPaymentStatus = (bill.payment_status || '').toString().toLowerCase().trim();
                  const existingPaymentStatus = (existingSale.payment_status || '').toString().toLowerCase().trim();
                  
                  if (billPaymentStatus === 'unpaid' || existingPaymentStatus === 'unpaid' || 
                      billPaymentStatus === 'pending' || existingPaymentStatus === 'pending') {
                    existingSale.is_credit = true;
                    existingSale.payment_method = 'Credit';
                    existingSale.payment_mode = 'Credit';
                    existingSale.payment_status = 'Credit';
                    console.log('✅ Updated existing sale as credit from bill:', {
                      order_id: existingSale.order_id,
                      customer_id: bill.customer_id,
                      customer_name: bill.customer_name
                    });
                  }
                }
              }
            }
          });
          
          console.log('✅ Merged sales data:', salesData.length, 'total records');
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch from bills_management.php:', error);
        // Continue with sales data from get_sales_report.php
      }

      // Ensure all sales are included (paid, unpaid, and credit)
      // Filter out any null/undefined entries
      salesData = salesData.filter(sale => sale !== null && sale !== undefined);
      
      // Normalize customer information - try multiple field names
      salesData = salesData.map((sale, index) => {
        // Check all possible customer name fields
        const possibleCustomerNames = [
          sale.customer_name,
          sale.customerName,
          sale.name,
          sale.customer,
          sale.customer_name,
          sale.customer_full_name,
          sale.full_name
        ];
        sale.customer_name = possibleCustomerNames.find(name => name && name.trim() !== '') || null;
        
        // Check all possible customer phone fields
        const possibleCustomerPhones = [
          sale.customer_phone,
          sale.customerPhone,
          sale.phone,
          sale.mobile,
          sale.mobile_no,
          sale.contact_number
        ];
        sale.customer_phone = possibleCustomerPhones.find(phone => phone && phone.trim() !== '') || null;
        
        // Log if we have customer_id but no customer_name (for debugging)
        if (sale.customer_id && sale.customer_id > 0 && !sale.customer_name) {
          console.warn('⚠️ Sale has customer_id but no customer_name found:', {
            order_id: sale.order_id,
            customer_id: sale.customer_id,
            available_fields: Object.keys(sale).filter(k => 
              k.toLowerCase().includes('customer') || 
              k.toLowerCase().includes('name') || 
              k.toLowerCase() === 'phone' ||
              k.toLowerCase() === 'mobile'
            )
          });
        }
        
        // Ensure credit sales are properly marked
        // Check multiple conditions to identify credit sales
        const paymentStatus = (sale.payment_status || '').toString().toLowerCase().trim();
        const paymentMethod = (sale.payment_method || sale.payment_mode || '').toString().toLowerCase().trim();
        const hasCustomerId = sale.customer_id && sale.customer_id > 0;
        const isUnpaid = paymentStatus === 'unpaid' || paymentStatus === 'pending';
        const isCreditMethod = paymentMethod === 'credit';
        const isCreditFlag = sale.is_credit === true || sale.is_credit === 1 || sale.is_credit === '1';
        
        // Mark as credit if:
        // 1. Explicitly marked as credit (is_credit flag)
        // 2. Payment method is credit
        // 3. Payment status is unpaid AND has customer_id (credit sale)
        // 4. Payment status is unpaid AND payment method is credit
        // 5. Payment status is unpaid AND no payment method is set (likely credit if unpaid)
        const shouldBeCredit = isCreditFlag || isCreditMethod || (isUnpaid && hasCustomerId) || 
                               (isUnpaid && isCreditMethod) || 
                               (isUnpaid && !paymentMethod && !paymentStatus.match(/^(paid|complete|cash|easypaisa|card)$/i));
        
        if (shouldBeCredit) {
          if (!sale.is_credit) {
            sale.is_credit = true;
          }
          if (sale.payment_method !== 'Credit' && sale.payment_mode !== 'Credit') {
            sale.payment_method = 'Credit';
            sale.payment_mode = 'Credit';
          }
          if (sale.payment_status !== 'Credit') {
            sale.payment_status = 'Credit';
          }
          
          console.log('✅ Marked sale as credit:', {
            order_id: sale.order_id,
            customer_id: sale.customer_id,
            customer_name: sale.customer_name,
            payment_status: sale.payment_status,
            payment_method: sale.payment_method,
            reason: isCreditFlag ? 'is_credit flag' : isCreditMethod ? 'payment method' : 
                   (isUnpaid && hasCustomerId) ? 'unpaid with customer' : 'unpaid status'
          });
        }
        
        return sale;
      });
      
      // STRICT BRANCH FILTERING: Filter out any sales that don't belong to this branch
      // This is a safety measure in case the API returns data from other branches
      // CRITICAL: Only show sales that explicitly belong to this branch
      const filteredSalesData = salesData.filter(sale => {
        if (!sale) return false; // Filter out null/undefined
        const saleBranchId = sale.branch_id || sale.branchId || sale.branch_ID || sale.BranchID;
        // STRICT: Sale MUST have branch_id AND it MUST match the current branch
        // Do NOT include sales without branch_id - they might be from other branches
        if (!saleBranchId) {
          console.warn('⚠️ Sale missing branch_id, excluding:', sale.order_id || sale.id);
          return false;
        }
        // Convert both to strings for comparison to handle number/string mismatches
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
      
      console.log(`Branch filtering: ${salesData.length} total sales, ${filteredSalesData.length} from branch ${branchId}`);
      salesData = filteredSalesData;
      
      // Log all sales data for debugging credit sales
      console.log('=== Sales Report Data ===');
      console.log('API Response:', result);
      console.log('Total records:', salesData.length);
      console.log('First 3 sales:', salesData.slice(0, 3));
      
      // Log piLL payment-related fields from each sale to understand the data structure
      if (salesData.length > 0) {
        console.log('=== Payment Fields Analysis ===');
        salesData.slice(0, 5).forEach((sale, idx) => {
          console.log(`Sale ${idx + 1} payment fields:`, {
            order_id: sale.order_id,
            payment_mode: sale.payment_mode,
            payment_method: sale.payment_method,
            payment_status: sale.payment_status,
            is_credit: sale.is_credit,
            customer_id: sale.customer_id,
            customer_name: sale.customer_name,
            all_keys: Object.keys(sale).filter(k => k.toLowerCase().includes('payment') || k.toLowerCase().includes('credit') || k.toLowerCase().includes('customer'))
          });
        });
      }
      
      // Log credit sales count for debugging - use standardized utility
      const creditSalesCount = salesData.filter(sale => {
        const isCreditSale = isCreditPayment(sale);
        
        if (isCreditSale) {
          console.log('✅ Credit sale found:', {
            order_id: sale.order_id,
            bill_id: sale.bill_id,
            payment_mode: sale.payment_mode,
            payment_method: sale.payment_method,
            payment_status: sale.payment_status,
            is_credit: sale.is_credit,
            customer_id: sale.customer_id,
            customer_name: sale.customer_name,
            net_total: sale.net_total || sale.net_total_amount || sale.grand_total
          });
        }
        
        return isCreditSale;
      }).length;
      
      console.log(`📊 Sales Report Summary: Total records: ${salesData.length}, Credit sales detected: ${creditSalesCount}`);

      setReportData(salesData);
      setReportGenerated(true);
      setAlert({ type: 'success', message: `Report generated successfully. Found ${salesData.length} records (${creditSalesCount} credit sales).` });
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

    // Ensure print view is visible before printing
    if (printRef.current) {
      // Scroll to print view
      printRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Small delay to ensure DOM is ready and styles are applied
      setTimeout(() => {
        // Force print view to be visible
        const printElement = printRef.current;
        if (printElement) {
          printElement.style.display = 'block';
          printElement.style.visibility = 'visible';
        }
        window.print();
      }, 200);
    } else {
      // Fallback if ref is not available
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };

  // Calculate totals - use standardized credit detection
  const totals = reportData.reduce((acc, sale) => {
    // Use standardized utility for credit detection
    const isCreditSale = isCreditPayment(sale);
    
    const billAmount = parseFloat(sale.bill_amount || sale.g_total_amount || sale.total || sale.total_amount || 0);
    const serviceCharge = parseFloat(sale.service_charge || 0);
    const discount = parseFloat(sale.discount_amount || sale.discount || 0);
    const netTotal = parseFloat(sale.net_total || sale.net_total_amount || sale.grand_total || sale.final_amount || 0);
    
    acc.billAmount += billAmount;
    acc.serviceCharge += serviceCharge;
    acc.discount += discount;
    acc.netTotal += netTotal;
    
    // Calculate credit sales total
    if (isCreditSale) {
      acc.creditSales += netTotal;
      // Debug log for credit sales
      console.log('💰 Credit sale in totals calculation:', {
        order_id: sale.order_id,
        netTotal: netTotal,
        payment_method: getPaymentMethodDisplay(sale),
        customer_id: sale.customer_id,
        customer_name: sale.customer_name,
        accumulated_credit_total: acc.creditSales
      });
    }
    
    return acc;
  }, { billAmount: 0, serviceCharge: 0, discount: 0, netTotal: 0, creditSales: 0 });
  
  // Final debug log
  console.log('📈 Final Totals:', totals);

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 no-print">
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

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Period Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Report Period
              </label>
              <select
                value={periodFilter}
                onChange={(e) => {
                  setPeriodFilter(e.target.value);
                  setReportGenerated(false);
                }}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
              >
                <option value="daily">Daily (Today)</option>
                <option value="weekly">Weekly (This Week)</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom Date Range</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Date/Month Selection based on Period */}
            {periodFilter === 'daily' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setReportGenerated(false);
                  }}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                />
              </div>
            )}

            {periodFilter === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setReportGenerated(false);
                  }}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                />
              </div>
            )}

            {periodFilter === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => {
                      setCustomDateFrom(e.target.value);
                      setReportGenerated(false);
                    }}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => {
                      setCustomDateTo(e.target.value);
                      setReportGenerated(false);
                    }}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                  />
                </div>
              </>
            )}
          </div>

          {/* Generate Report Button */}
          <div className="mt-4 flex gap-3">
            <Button
              onClick={generateReport}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            {reportGenerated && (
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Report
              </Button>
            )}
          </div>
        </div>

        {/* Report Summary */}
        {reportGenerated && reportData.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
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
            <div className="bg-amber-50 rounded-lg shadow p-4 border-2 border-amber-200">
              <p className="text-sm font-medium text-amber-700">Credit Sales</p>
              <p className="text-2xl font-bold text-amber-800 mt-1">{formatPKR(totals.creditSales)}</p>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((sale, index) => {
                    // Use standardized utility functions
                    const isCredit = isCreditPayment(sale);
                    const paymentDisplay = getPaymentMethodDisplay(sale);
                    // Try multiple field names for customer name - use normalized value from data processing
                    const customerName = sale.customer_name || sale.customerName || sale.name || sale.customer || sale.customer_full_name || sale.full_name || null;
                    
                    return (
                      <tr key={sale.order_id || index} className={`hover:bg-gray-50 ${isCredit ? 'bg-amber-50' : ''}`}>
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
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {isCredit ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Credit
                            </span>
                          ) : (
                            <span className="text-gray-600">{paymentDisplay}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {customerName ? (
                            // Show customer name if available
                            <div className={isCredit ? "bg-amber-50 px-2 py-1 rounded" : ""}>
                              <div className={isCredit ? "font-semibold text-amber-800" : "font-medium text-gray-700"}>
                                {customerName}
                              </div>
                              {sale.customer_phone && (
                                <div className={isCredit ? "text-xs text-amber-600 mt-0.5" : "text-xs text-gray-500"}>
                                  {sale.customer_phone}
                                </div>
                              )}
                              {isCredit && (
                                <div className="text-xs text-amber-700 font-medium mt-0.5">Credit Sale</div>
                              )}
                            </div>
                          ) : (
                            // Show warning for credit sales without customer name
                            isCredit ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                Customer Missing
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {sale.bill_by_name || sale.bill_by || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
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
                    <td colSpan="3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Print View - Only visible when printing */}
        {reportGenerated && reportData.length > 0 && (
          <div ref={printRef} className="print-only">
            <div className="print-container">
              {/* Report Header - Repeats on each page */}
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
                      {(() => {
                        if (periodFilter === 'daily') {
                          return `Daily Sales Report - ${selectedDate || getTodayDate()}`;
                        } else if (periodFilter === 'weekly') {
                          return `Weekly Sales Report - ${getWeekStartDate()} to ${getWeekEndDate()}`;
                        } else if (periodFilter === 'monthly') {
                          const [year, month] = selectedMonth.split('-');
                          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' });
                          return `Monthly Sales Report - ${monthName} ${year}`;
                        } else if (periodFilter === 'custom') {
                          return `Custom Sales Report - ${customDateFrom} to ${customDateTo}`;
                        } else {
                          return 'All Time Sales Report';
                        }
                      })()}
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
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Hall</th>
                    <th>Table</th>
                    <th>Order Taker</th>
                    <th>Bill Amount</th>
                    <th>Service</th>
                    <th>Discount</th>
                    <th>Net Total</th>
                    <th>Payment</th>
                    <th>Customer</th>
                    <th>Bill By</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((sale, index) => {
                    // Use standardized utility functions
                    const isCredit = isCreditPayment(sale);
                    const paymentDisplay = getPaymentMethodDisplay(sale);
                    // Try multiple field names for customer name - use normalized value from data processing
                    const customerName = sale.customer_name || sale.customerName || sale.name || sale.customer || sale.customer_full_name || sale.full_name || null;
                    
                    return (
                      <tr key={sale.order_id || index} style={{ backgroundColor: isCredit ? '#fef3c7' : 'transparent' }}>
                        <td>{sale.order_id || sale.id || 'N/A'}</td>
                        <td>{formatDateTime(sale.created_at || sale.order_date)}</td>
                        <td>{sale.order_type || 'N/A'}</td>
                        <td>{sale.hall_name || sale.hall || 'N/A'}</td>
                        <td>{sale.table_number || sale.table || 'N/A'}</td>
                        <td>{sale.order_taker_name || sale.order_taker || 'N/A'}</td>
                        <td style={{ textAlign: 'right' }}>{formatPKR(sale.bill_amount || sale.g_total_amount || sale.total || 0)}</td>
                        <td style={{ textAlign: 'right' }}>{formatPKR(sale.service_charge || 0)}</td>
                        <td style={{ textAlign: 'right' }}>{formatPKR(sale.discount_amount || sale.discount || 0)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatPKR(sale.net_total || sale.net_total_amount || sale.grand_total || 0)}</td>
                        <td style={{ fontWeight: isCredit ? 'bold' : 'normal' }}>
                          {paymentDisplay}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #ccc', backgroundColor: isCredit ? '#fef3c7' : 'transparent' }}>
                          {customerName ? (
                            // Show customer name if available
                            <div style={isCredit ? { padding: '4px', backgroundColor: '#fef3c7', borderRadius: '4px' } : {}}>
                              <div style={{ 
                                fontWeight: isCredit ? 'bold' : 'normal', 
                                color: isCredit ? '#92400e' : '#000', 
                                fontSize: isCredit ? '11px' : '10px' 
                              }}>
                                {customerName}
                              </div>
                              {sale.customer_phone && (
                                <div style={{ 
                                  fontSize: '8px', 
                                  color: isCredit ? '#b45309' : '#666', 
                                  marginTop: '2px' 
                                }}>
                                  {sale.customer_phone}
                                </div>
                              )}
                              {isCredit && (
                                <div style={{ fontSize: '8px', color: '#92400e', fontWeight: 'bold', marginTop: '2px' }}>
                                  Credit Sale
                                </div>
                              )}
                            </div>
                          ) : (
                            // Show warning for credit sales without customer name
                            isCredit ? (
                              <span style={{ padding: '2px 6px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '9px', fontWeight: 'bold', borderRadius: '3px' }}>
                                Customer Missing
                              </span>
                            ) : (
                              <span style={{ color: '#999' }}>-</span>
                            )
                          )}
                        </td>
                        <td>{sale.bill_by_name || sale.bill_by || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'right', fontWeight: 'bold' }}>Totals:</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatPKR(totals.billAmount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatPKR(totals.serviceCharge)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatPKR(totals.discount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatPKR(totals.netTotal)}</td>
                    <td colSpan="3"></td>
                  </tr>
                  {totals.creditSales > 0 && (
                    <tr style={{ backgroundColor: '#fef3c7' }}>
                      <td colSpan="6" style={{ textAlign: 'right', fontWeight: 'bold', color: '#92400e' }}>Total Credit Sales:</td>
                      <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold', color: '#92400e' }}>{formatPKR(totals.creditSales)}</td>
                      <td colSpan="3"></td>
                    </tr>
                  )}
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
            
            /* Ensure tables display correctly */
            .print-only table {
              display: table !important;
              width: 100% !important;
              border-collapse: collapse !important;
            }
            
            .print-only thead {
              display: table-header-group !important;
            }
            
            .print-only tbody {
              display: table-row-group !important;
            }
            
            .print-only tfoot {
              display: table-footer-group !important;
            }
            
            .print-only tr {
              display: table-row !important;
            }
            
            .print-only td,
            .print-only th {
              display: table-cell !important;
            }
            
            /* Hide no-print elements even inside print-only */
            .print-only .no-print {
              display: none !important;
              visibility: hidden !important;
            }
            
            /* Hide non-print elements */
            .no-print,
            .no-print * {
              display: none !important;
              visibility: hidden !important;
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
            
            .print-table thead {
              display: table-header-group;
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

