'use client';

/**
 * Sales Report Page - Super Admin
 * Generate and print monthly sales reports for all branches
 * Shows sales from all branches with branch filter
 * Uses API: api/get_sales_report.php, api/branch_management.php
 */

import { useEffect, useState, useRef } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { apiPost, apiGet } from '@/utils/api';
import { formatPKR, formatDateTime } from '@/utils/format';
import { isCreditPayment, getPaymentMethodDisplay } from '@/utils/payment';
import { FileText, Printer, Download, Calendar, Building2 } from 'lucide-react';

export default function SalesReportPage() {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [branches, setBranches] = useState([]);
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
    
    fetchBranches();
  }, []);

  /**
   * Fetch all branches
   */
  const fetchBranches = async () => {
    try {
      const result = await apiPost('api/branch_management.php', { action: 'get' });
      console.log('=== Branches API Response (Sales Report) ===');
      console.log('Full result:', JSON.stringify(result, null, 2));
      
      let branchesData = [];
      
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          branchesData = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          branchesData = result.data.data;
        } else if (result.data.success && result.data.data && Array.isArray(result.data.data)) {
          branchesData = result.data.data;
        } else if (result.data.branches && Array.isArray(result.data.branches)) {
          branchesData = result.data.branches;
        }
      }
      
      // Normalize branch data to ensure consistent field names
      branchesData = branchesData.map(branch => ({
        ...branch,
        branch_id: branch.branch_id || branch.id || branch.branch_ID || branch.ID,
        branch_name: branch.branch_name || branch.name || branch.branchName || branch.BranchName || 'Unknown Branch',
      }));
      
      console.log('✅ Branches loaded for sales report:', branchesData.length);
      console.log('Sample branches:', branchesData.slice(0, 3));
      
      setBranches(branchesData);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
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
      // Parse month to get start and end dates
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const params = {
        start_date: startDate,
        end_date: endDate,
      };

      // Add branch_id only if not 'all'
      if (selectedBranchId !== 'all') {
        params.branch_id = selectedBranchId;
        // Set branch info for selected branch
        const selectedBranch = branches.find(b => b.branch_id == selectedBranchId);
        if (selectedBranch) {
          setBranchInfo({
            branch_id: selectedBranch.branch_id,
            branch_name: selectedBranch.branch_name,
            address: selectedBranch.address || '',
          });
        }
      } else {
        setBranchInfo({
          branch_id: null,
          branch_name: 'All Branches',
          address: '',
        });
      }

      // Fetch sales report including credit sales
      // The API should return all bills (paid, unpaid, and credit) in the date range
      params.include_credit = true; // Explicitly request credit sales to be included
      
      const result = await apiPost('api/get_sales_report.php', params);

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
      
      console.log('📊 Initial sales data from get_sales_report.php:', salesData.length, 'records');
      if (salesData.length > 0) {
        console.log('Sample sale from API:', {
          order_id: salesData[0].order_id,
          payment_status: salesData[0].payment_status,
          payment_method: salesData[0].payment_method,
          customer_id: salesData[0].customer_id,
          customer_name: salesData[0].customer_name,
          is_credit: salesData[0].is_credit
        });
      }
      
      // IMPORTANT: Also fetch from bills_management.php to ensure we get ALL bills including credit
      // This is the same API used by dayend to calculate credit sales
      try {
        const billsParams = {
          start_date: params.start_date,
          end_date: params.end_date,
        };
        if (params.branch_id) {
          billsParams.branch_id = params.branch_id;
        }
        
        const billsResult = await apiGet('api/bills_management.php', billsParams);
        
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
            // Get branch information for bill - try multiple field names
            const billBranchId = bill.branch_id || bill.branchId || bill.branch_ID || bill.BranchID;
            
            // Try to find branch by multiple ID field names
            let branch = null;
            if (billBranchId && branches.length > 0) {
              branch = branches.find(b => 
                (b.branch_id && b.branch_id == billBranchId) ||
                (b.id && b.id == billBranchId) ||
                (b.branch_ID && b.branch_ID == billBranchId) ||
                (b.ID && b.ID == billBranchId)
              );
            }
            
            // Get branch name from multiple possible sources
            const branchName = branch 
              ? (branch.branch_name || branch.name || branch.branchName || branch.BranchName || 'Unknown Branch')
              : (bill.branch_name || bill.branchName || (billBranchId ? `Branch ${billBranchId}` : 'Unknown Branch'));
            
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
                customer_name: bill.customer_name || bill.customerName || bill.name || bill.customer_name || null,
                customer_phone: bill.customer_phone || bill.customerPhone || bill.phone || bill.mobile || null,
                created_at: bill.created_at || bill.date,
                branch_id: billBranchId,
                branch_name: branchName,
              });
              existingOrderIds.add(orderId);
            } else {
              // Update existing sale with bill data if bill has more complete info
              const existingSale = salesData.find(s => (s.order_id || s.id) === orderId);
              if (existingSale) {
                // Update payment fields from bill if they're missing in sale
                // Prioritize bill data for payment information
                if (bill.payment_method) {
                  existingSale.payment_method = bill.payment_method;
                  existingSale.payment_mode = bill.payment_method; // Also update payment_mode
                }
                if (bill.payment_status) {
                  existingSale.payment_status = bill.payment_status;
                }
                // Always update is_credit if bill has it
                if (bill.is_credit !== undefined && bill.is_credit !== null) {
                  existingSale.is_credit = bill.is_credit;
                }
                // If bill has customer_id, it's likely a credit sale
                if (bill.customer_id) {
                  existingSale.customer_id = bill.customer_id;
                  existingSale.customer_name = bill.customer_name || bill.customerName || bill.name || existingSale.customer_name;
                  existingSale.customer_phone = bill.customer_phone || bill.customerPhone || bill.phone || bill.mobile || existingSale.customer_phone;
                  
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
                // Update branch information - always update if we have better info
                if (branchName && branchName !== 'Unknown Branch' && branchName !== 'N/A') {
                  existingSale.branch_id = billBranchId;
                  existingSale.branch_name = branchName;
                } else if (!existingSale.branch_name || existingSale.branch_name === 'Unknown Branch' || existingSale.branch_name === 'N/A') {
                  existingSale.branch_id = billBranchId;
                  existingSale.branch_name = branchName;
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
      
      // Deduplicate sales data first to avoid duplicate keys
      // Use a combination of order_id, bill_id, and created_at to identify unique records
      const seenKeys = new Set();
      const uniqueSalesData = [];
      
      salesData.forEach(sale => {
        // Create a unique key for this sale
        const orderId = sale.order_id || sale.id || '';
        const billId = sale.bill_id || sale.id || '';
        const createdAt = sale.created_at || sale.date || '';
        const uniqueKey = `${orderId}-${billId}-${createdAt}`;
        
        // Only add if we haven't seen this combination before
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          uniqueSalesData.push(sale);
        } else {
          console.warn('⚠️ Duplicate sale detected and removed:', { orderId, billId, createdAt });
        }
      });
      
      salesData = uniqueSalesData;
      
      // Enrich sales data with branch information if missing
      console.log('📊 Enriching sales data with branch information');
      console.log('Sales count (after deduplication):', salesData.length);
      console.log('Branches count:', branches.length);
      
      salesData = salesData.map((sale, index) => {
        // Normalize customer information - try multiple field names
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
        
        // Try multiple field names for branch_id
        const saleBranchId = sale.branch_id || sale.branchId || sale.branch_ID || sale.BranchID;
        
        // If branch_name is missing or we want to ensure it's correct
        if (!sale.branch_name || sale.branch_name === 'Unknown Branch' || sale.branch_name === 'N/A') {
          // Try to find branch by multiple ID field names
          let branch = null;
          if (saleBranchId && branches.length > 0) {
            branch = branches.find(b => 
              (b.branch_id && b.branch_id == saleBranchId) ||
              (b.id && b.id == saleBranchId) ||
              (b.branch_ID && b.branch_ID == saleBranchId) ||
              (b.ID && b.ID == saleBranchId)
            );
          }
          
          if (branch) {
            sale.branch_name = branch.branch_name || branch.name || branch.branchName || branch.BranchName || 'Unknown Branch';
            sale.branch_id = saleBranchId;
          } else if (saleBranchId) {
            console.warn(`⚠️ Branch not found for branch_id: ${saleBranchId} in sale`, {
              order_id: sale.order_id || sale.id,
              available_branch_ids: branches.map(b => b.branch_id || b.id)
            });
            sale.branch_name = `Branch ${saleBranchId}`;
            sale.branch_id = saleBranchId;
          } else {
            sale.branch_name = 'N/A';
          }
        } else {
          // Ensure branch_id is set if we have branch_name
          if (!sale.branch_id) {
            const branch = branches.find(b => 
              (b.branch_name || b.name) === sale.branch_name
            );
            if (branch) {
              sale.branch_id = branch.branch_id || branch.id;
            }
          }
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
          
          // If unpaid and has customer_id but no customer_name, try to get it
          if (hasCustomerId && !sale.customer_name) {
            console.warn('⚠️ Credit sale has customer_id but no customer_name:', {
              order_id: sale.order_id,
              customer_id: sale.customer_id
            });
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
      
      console.log('✅ Enriched sales data with branch information');
      
      // Log all sales data for debugging credit sales
      console.log('=== Sales Report Data ===');
      console.log('API Response:', result);
      console.log('Total records:', salesData.length);
      console.log('First 3 sales:', salesData.slice(0, 3));
      
      // Log ALL payment-related fields from each sale to understand the data structure
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
      console.log('Credit sale in totals:', {
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

  return (
    <SuperAdminLayout>
      <div className="space-y-4 sm:space-y-6 no-print">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sales Report</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Generate and print monthly sales reports for all branches
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
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Branch
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setReportGenerated(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
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
                    // Try multiple field names for customer name
                    const customerName = sale.customer_name || sale.customerName || sale.name || sale.customer || null;
                    
                    // Create a unique key combining order_id, bill_id, and index
                    const uniqueKey = `sale-${sale.order_id || sale.id || 'unknown'}-${sale.bill_id || sale.id || 'no-bill'}-${index}`;
                    
                    return (
                      <tr key={uniqueKey} className={`hover:bg-gray-50 ${isCredit ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sale.order_id || sale.id || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#FF5F15]" />
                            <span className="font-medium text-[#FF5F15]">{sale.branch_name || 'N/A'}</span>
                          </div>
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
                          {isCredit ? (
                            // For credit sales, always show customer name prominently
                            customerName ? (
                              <div className="bg-amber-50 px-2 py-1 rounded">
                                <div className="font-semibold text-amber-800">{customerName}</div>
                                {sale.customer_phone && (
                                  <div className="text-xs text-amber-600 mt-0.5">{sale.customer_phone}</div>
                                )}
                                <div className="text-xs text-amber-700 font-medium mt-0.5">Credit Sale</div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                Customer Missing
                              </span>
                            )
                          ) : (
                            // For non-credit sales, show customer name if available
                            customerName ? (
                              <div>
                                <div className="font-medium text-gray-700">{customerName}</div>
                                {sale.customer_phone && (
                                  <div className="text-xs text-gray-500">{sale.customer_phone}</div>
                                )}
                              </div>
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
                    <td colSpan="7" className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
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

        {/* Print View */}
        {reportGenerated && reportData.length > 0 && (
        <div ref={printRef} className="print-only">
          <style jsx global>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 2cm 1cm 1.5cm 1cm;
              }
              
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              /* Hide non-print elements */
              .no-print,
              .no-print * {
                display: none !important;
                visibility: hidden !important;
              }
              
              /* Hide all elements except print-only and its children */
              body * {
                visibility: hidden;
              }
              
              /* Show print content */
              .print-only,
              .print-only * {
                visibility: visible !important;
              }
              
              /* Ensure proper display for print-only */
              .print-only {
                display: block !important;
                position: relative !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
                page-break-after: auto;
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
              
              .print-footer .page-number {
                display: none;
              }
            }
          
          /* Screen styles - show print view when report is generated */
          @media screen {
            .print-only {
              display: block;
              max-width: 100%;
              overflow-x: auto;
              margin-top: 20px;
              padding: 20px;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .print-container {
              width: 100%;
            }
            
            .print-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-top: 10px;
            }
            
            .print-table th,
            .print-table td {
              padding: 8px 6px;
              border: 1px solid #d1d5db;
              text-align: left;
            }
            
            .print-table th {
              background-color: #f3f4f6;
              font-weight: bold;
            }
            
            .print-table tbody tr:nth-child(even) {
              background-color: #f9fafb;
            }
            
            .print-footer {
              text-align: center;
              font-size: 12px;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #d1d5db;
            }
          }
          `}</style>
          
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
                    {branchInfo?.branch_name || 'All Branches'}
                  </h1>
                  <p style={{ margin: '5px 0', fontSize: '12px' }}>
                    {branchInfo?.address || 'Sales Report'}
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
              <table className="print-table" style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '10px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #000' }}>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Order ID</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Branch</th>
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
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Customer</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Bill By</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((sale, index) => {
                    // Use standardized utility functions
                    const isCredit = isCreditPayment(sale);
                    const paymentDisplay = getPaymentMethodDisplay(sale);
                    // Try multiple field names for customer name
                    const customerName = sale.customer_name || sale.customerName || sale.name || sale.customer || null;
                    
                    // Create a unique key combining order_id, bill_id, and index
                    const uniqueKey = `sale-print-${sale.order_id || sale.id || 'unknown'}-${sale.bill_id || sale.id || 'no-bill'}-${index}`;
                    
                    return (
                      <tr key={uniqueKey} style={{ backgroundColor: isCredit ? '#fef3c7' : 'transparent' }}>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.order_id || sale.id || 'N/A'}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.branch_name || 'N/A'}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{formatDateTime(sale.created_at || sale.order_date)}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.order_type || 'N/A'}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.hall_name || sale.hall || 'N/A'}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.table_number || sale.table || 'N/A'}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.order_taker_name || sale.order_taker || 'N/A'}</td>
                        <td style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>{formatPKR(sale.bill_amount || sale.g_total_amount || sale.total || 0)}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc', textAlign: 'right' }}>{formatPKR(sale.service_charge || 0)}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc', textAlign: 'right' }}>{formatPKR(sale.discount_amount || sale.discount || 0)}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 'bold' }}>{formatPKR(sale.net_total || sale.net_total_amount || sale.grand_total || 0)}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc', fontWeight: isCredit ? 'bold' : 'normal', color: isCredit ? '#92400e' : '#000' }}>
                          {isCredit ? 'Credit' : paymentDisplay}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #ccc', backgroundColor: isCredit ? '#fef3c7' : 'transparent' }}>
                          {isCredit ? (
                            // For credit sales, always show customer name prominently
                            customerName ? (
                              <div style={{ padding: '4px', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
                                <div style={{ fontWeight: 'bold', color: '#92400e', fontSize: '11px' }}>{customerName}</div>
                                {sale.customer_phone && (
                                  <div style={{ fontSize: '8px', color: '#b45309', marginTop: '2px' }}>{sale.customer_phone}</div>
                                )}
                                <div style={{ fontSize: '8px', color: '#92400e', fontWeight: 'bold', marginTop: '2px' }}>Credit Sale</div>
                              </div>
                            ) : (
                              <span style={{ padding: '2px 6px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '9px', fontWeight: 'bold', borderRadius: '3px' }}>
                                Customer Missing
                              </span>
                            )
                          ) : (
                            // For non-credit sales, show customer name if available
                            customerName ? (
                              <div>
                                <div style={{ fontWeight: 'normal', color: '#000', fontSize: '10px' }}>{customerName}</div>
                                {sale.customer_phone && (
                                  <div style={{ fontSize: '8px', color: '#666' }}>{sale.customer_phone}</div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#999' }}>-</span>
                            )
                          )}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{sale.bill_by_name || sale.bill_by || 'N/A'}</td>
                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{formatDateTime(sale.updated_at || sale.last_update)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #000', fontWeight: 'bold' }}>
                    <td colSpan="7" style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Totals:</td>
                    <td style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>{formatPKR(totals.billAmount)}</td>
                    <td style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>{formatPKR(totals.serviceCharge)}</td>
                    <td style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>{formatPKR(totals.discount)}</td>
                    <td style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>{formatPKR(totals.netTotal)}</td>
                    <td colSpan="4" style={{ padding: '8px', border: '1px solid #000' }}></td>
                  </tr>
                  {totals.creditSales > 0 && (
                    <tr style={{ backgroundColor: '#fef3c7', borderTop: '1px solid #92400e', fontWeight: 'bold' }}>
                      <td colSpan="7" style={{ padding: '8px', border: '1px solid #000', textAlign: 'right', color: '#92400e' }}>Total Credit Sales:</td>
                      <td colSpan="4" style={{ padding: '8px', border: '1px solid #000', textAlign: 'right', color: '#92400e' }}>{formatPKR(totals.creditSales)}</td>
                      <td colSpan="4" style={{ padding: '8px', border: '1px solid #000' }}></td>
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
      </div>
    </SuperAdminLayout>
  );
}


