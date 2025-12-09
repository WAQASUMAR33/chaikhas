'use client';

/**
 * Super Admin Dashboard Main Page
 * Overview and statistics for super admin users
 * Enhanced with branch filtering and detailed order information
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { apiPost, apiGet, getTerminal, getToken, getRole } from '@/utils/api';
import { formatPKR, formatDateTime } from '@/utils/format';
import { LayoutDashboard, FileText, TrendingUp, Utensils, FolderOpen, Clock, Building2, Network, Filter } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSales: 0,
    totalMenuItems: 0,
    totalCategories: 0,
    totalBranches: 0,
  });
  const [branchStats, setBranchStats] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('all'); // 'all' or specific branch_id
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [branchStatsLoading, setBranchStatsLoading] = useState(false);
  const [branchStatsError, setBranchStatsError] = useState(null);

  // Check authentication first
  useEffect(() => {
    // Only check on client side
    if (typeof window === 'undefined') return;

    const token = getToken();
    const role = getRole();

    console.log('Super Admin Dashboard - Auth Check:', {
      token: token ? 'Present' : 'Missing',
      role: role || 'Missing',
      expectedRole: 'super_admin'
    });

    if (!token) {
      console.log('No token found, redirecting to login');
      router.push('/login');
      return;
    }

    // Normalize role for comparison
    const normalizedRole = role?.toLowerCase().trim();
    
    if (normalizedRole !== 'super_admin') {
      console.log('Role mismatch, redirecting to dashboard. Role:', role);
      router.push('/dashboard');
      return;
    }

    // Auth check passed
    setAuthChecked(true);
    fetchBranches();
  }, [router]);

  // Refetch data when branch filter changes or branches are loaded
  useEffect(() => {
    console.log('🔄 Dashboard useEffect triggered', { authChecked, branchesLength: branches.length, selectedBranchId });
    if (authChecked && branches.length > 0) {
      console.log('✅ Conditions met, fetching dashboard stats and branch statistics');
      fetchDashboardStats();
      fetchBranchStatistics();
    } else {
      console.log('⏳ Waiting for conditions:', { authChecked, branchesLength: branches.length });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, authChecked, branches.length]);

  // Debug: Log when branchStats changes
  useEffect(() => {
    console.log('📊 branchStats state updated:', branchStats.length, 'branches', branchStats);
  }, [branchStats]);

  // Auto-refresh branch statistics periodically and when page becomes visible
  // This ensures daily sales reset is reflected when date changes (day end)
  useEffect(() => {
    if (!authChecked || branches.length === 0) return;

    // Refresh statistics every 5 minutes to catch day end changes
    const refreshInterval = setInterval(() => {
      fetchBranchStatistics();
    }, 5 * 60000); // Every 5 minutes

    // Also refresh when page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBranchStatistics();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authChecked, branches.length]);

  /**
   * Fetch dashboard statistics from API
   * Supports branch filtering for super admin
   * Now includes date and dayend filtering for accurate daily orders and sales
   */
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      const today = getTodayDate();
      const params = { terminal, date: today };
      
      // Add branch_id filter if specific branch is selected
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.branch_id = selectedBranchId;
        
        // Get dayend for the selected branch to ensure accurate daily stats
        const lastDayendTime = await fetchLastDayendForBranch(selectedBranchId);
        if (lastDayendTime) {
          params.after_closing_date = lastDayendTime;
        }
      }
      
      console.log('Fetching dashboard stats with params:', params);
      
      // Use POST instead of GET for better compatibility
      const result = await apiPost('/get_dashboard_stats.php', params);
      
      console.log('Dashboard stats API response:', result);
      
      if (result.success && result.data) {
        // Handle different response structures
        let statsData = {};
        
        // Check if data is nested
        if (result.data.success && result.data.data) {
          statsData = {
            totalOrders: result.data.data.totalOrders || result.data.data.total_orders || 0,
            totalSales: result.data.data.totalSales || result.data.data.total_sales || 0,
            totalMenuItems: result.data.data.totalMenuItems || result.data.data.total_menu_items || 0,
            totalCategories: result.data.data.totalCategories || result.data.data.total_categories || 0,
          };
        } else {
          // Direct data structure
          statsData = {
            totalOrders: result.data.totalOrders || result.data.total_orders || 0,
            totalSales: result.data.totalSales || result.data.total_sales || 0,
            totalMenuItems: result.data.totalMenuItems || result.data.total_menu_items || 0,
            totalCategories: result.data.totalCategories || result.data.total_categories || 0,
          };
        }
        
        setStats(prev => ({
          ...prev,
          ...statsData,
        }));
        
        console.log('✅ Dashboard stats loaded:', statsData);
      } else {
        console.warn('⚠️ Dashboard stats API returned no data or error:', result);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get today's date in YYYY-MM-DD format
   * Ensures daily sales reset at day end by always using current date
   */
  const getTodayDate = () => {
    const now = new Date();
    // Use local date to match server timezone if needed, or UTC
    // Format: YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Fetch the last dayend closing_date_time for a branch
   * Returns the closing_date_time if dayend exists, null otherwise
   */
  const fetchLastDayendForBranch = async (branchId) => {
    try {
      const terminal = getTerminal();
      const result = await apiPost('api/get_dayend.php', {
        terminal,
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
          // Sort by closing_date_time descending and get the most recent
          const sortedDayends = [...dayendData].sort((a, b) => {
            const dateA = new Date(a.closing_date_time || a.created_at || 0);
            const dateB = new Date(b.closing_date_time || b.created_at || 0);
            return dateB - dateA;
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

  /**
   * Fetch branch statistics (daily sales, running orders, complete bills) for each branch
   * Uses the new consolidated endpoint api/get_branch_daily_stats.php if available
   * Falls back to individual API calls if the consolidated endpoint is not available
   * Daily sales are filtered to only show orders/sales created after the last dayend closing_date_time
   * If no dayend exists, shows only today's sales - resets at day end
   */
  const fetchBranchStatistics = async () => {
    console.log('🔄 fetchBranchStatistics called', { branchesCount: branches.length, authChecked });
    setBranchStatsLoading(true);
    setBranchStatsError(null);
    try {
      if (branches.length === 0) {
        console.warn('⚠️ No branches available to fetch statistics');
        setBranchStats([]);
        setBranchStatsLoading(false);
        return;
      }
      
      const terminal = getTerminal();
      const today = getTodayDate(); // Always get current date - ensures reset at day end
      
      console.log('📊 Fetching branch statistics for today:', today, 'Branches:', branches.length);
      
      // Always use individual API calls for accurate daily sales calculation
      // This ensures we get the correct daily sales from the sales API
      // Use Promise.allSettled to ensure all branches are processed even if some fail
      const branchStatsPromises = branches.map(branch => 
        fetchBranchStatsIndividual(branch, terminal, today).catch(error => {
          console.error(`Error fetching stats for branch ${branch.branch_name || branch.branch_id}:`, error);
          return {
            branch_id: branch.branch_id || branch.id,
            branch_name: branch.branch_name || branch.name || 'Unknown Branch',
            daily_sales: 0,
            running_orders: 0,
            complete_bills: 0,
            error: true,
          };
        })
      );
      const results = await Promise.allSettled(branchStatsPromises);
      const stats = results.map(result => 
        result.status === 'fulfilled' ? result.value : {
          branch_id: 'unknown',
          branch_name: 'Unknown Branch',
          daily_sales: 0,
          running_orders: 0,
          complete_bills: 0,
          error: true,
        }
      );
      console.log('📊 Branch statistics results:', stats);
      setBranchStats(stats);
      console.log('✅ Branch statistics loaded via individual calls:', stats.length, 'branches');
      console.log('📊 Sample stats:', stats.length > 0 ? stats[0] : 'No stats');
    } catch (error) {
      console.error('Error fetching branch statistics:', error);
      setBranchStatsError(error.message || 'Failed to load branch statistics. Please check your connection.');
      setBranchStats([]);
    } finally {
      setBranchStatsLoading(false);
    }
  };

  /**
   * Fallback function to fetch branch statistics using individual API calls
   * Used when the consolidated endpoint is not available
   * Filters sales to only show orders/sales created after the last dayend closing_date_time
   * If no dayend exists, shows only today's sales
   */
  const fetchBranchStatsIndividual = async (branch, terminal, today) => {
    const branchId = branch.branch_id || branch.id;
    const branchName = branch.branch_name || branch.name || 'Unknown Branch';
    
    try {
      // Get the last dayend closing_date_time for this branch
      const lastDayendTime = await fetchLastDayendForBranch(branchId);
      
      // Determine the cutoff date/time for filtering
      // If dayend exists, use closing_date_time; otherwise, use start of today
      let cutoffDateTime = null;
      if (lastDayendTime) {
        cutoffDateTime = new Date(lastDayendTime);
      } else {
        // No dayend exists, use start of today
        cutoffDateTime = new Date(today + 'T00:00:00');
      }
      
      // Fetch daily sales for this branch
      const salesParams = {
        terminal,
        branch_id: branchId,
        period: 'daily',
        from_date: today,
        to_date: today,
        after_closing_date: lastDayendTime || null, // Pass dayend time to backend
      };
      
      console.log(`📊 Fetching sales for branch ${branchName} (${branchId}):`, salesParams);
      let salesResult;
      try {
        salesResult = await apiPost('api/get_sales.php', salesParams);
        console.log(`📊 Sales API response for branch ${branchName}:`, salesResult);
      } catch (salesError) {
        console.error(`❌ Error fetching sales for branch ${branchName}:`, salesError);
        // If sales API fails, continue with 0 sales but log the error
        salesResult = { success: false, data: [] };
      }
      
      // Calculate daily sales from sales data - only count sales after dayend
      let dailySales = 0;
      if (salesResult.success && salesResult.data) {
        let salesData = [];
        
        // Handle multiple response structures
        if (Array.isArray(salesResult.data)) {
          salesData = salesResult.data;
        } else if (salesResult.data.data && Array.isArray(salesResult.data.data)) {
          salesData = salesResult.data.data;
        } else if (salesResult.data.sales && Array.isArray(salesResult.data.sales)) {
          salesData = salesResult.data.sales;
        } else if (salesResult.data.orders && Array.isArray(salesResult.data.orders)) {
          salesData = salesResult.data.orders;
        } else if (salesResult.data.bills && Array.isArray(salesResult.data.bills)) {
          // If API returns bills, use bills for calculation
          salesData = salesResult.data.bills;
        }
        
        console.log(`📊 Branch ${branchName} - Found ${salesData.length} sales/bills records from API`);
        
        // Filter sales to only include those created after the last dayend
        const validSales = salesData.filter(sale => {
          if (!sale) return false;
          
          // Try multiple date fields
          const saleDate = sale.date || sale.created_at || sale.order_date || sale.bill_date || sale.bill_created_at || sale.created_date;
          if (!saleDate) {
            console.warn(`⚠️ Sale/bill missing date field, excluding:`, sale);
            return false;
          }
          
          const saleDateTime = new Date(saleDate);
          if (isNaN(saleDateTime.getTime())) {
            console.warn(`⚠️ Invalid date format, excluding:`, saleDate);
            return false;
          }
          
          // Only include sales created after the last dayend closing time
          // If no dayend, only include today's sales
          if (lastDayendTime) {
            const isValid = saleDateTime > cutoffDateTime;
            if (!isValid) {
              console.log(`📅 Excluding sale before dayend:`, saleDate, 'cutoff:', cutoffDateTime.toISOString());
            }
            return isValid;
          } else {
            // No dayend exists, filter by today's date only
            const saleDateStr = saleDateTime.toISOString().split('T')[0];
            const isValid = saleDateStr === today;
            if (!isValid) {
              console.log(`📅 Excluding sale not from today:`, saleDateStr, 'today:', today);
            }
            return isValid;
          }
        });
        
        console.log(`📊 Branch ${branchName} - ${validSales.length} valid sales after filtering`);
        
        // Sum up total sales after dayend - try multiple amount fields
        dailySales = validSales.reduce((sum, sale) => {
          // Try multiple field names for the total amount
          const total = sale.grand_total || 
                       sale.net_total || 
                       sale.total || 
                       sale.amount || 
                       sale.total_amount ||
                       sale.total_sales ||
                       sale.bill_amount ||
                       sale.paid_amount ||
                       0;
          const saleAmount = parseFloat(total) || 0;
          
          if (saleAmount > 0) {
            console.log(`💰 Sale amount:`, saleAmount, 'from sale:', {
              id: sale.bill_id || sale.order_id || sale.id,
              date: sale.date || sale.created_at,
              total: sale.grand_total || sale.net_total || sale.total
            });
          }
          
          return sum + saleAmount;
        }, 0);
        
        console.log(`📊 Branch ${branchName} - Calculated daily sales from ${validSales.length} sales:`, dailySales);
      } else {
        console.warn(`⚠️ Branch ${branchName} - Sales API returned no data or error:`, salesResult);
        
        // If sales API fails, try to calculate from orders/bills directly
        console.log(`📊 Branch ${branchName} - Attempting to calculate from orders/bills as fallback`);
        try {
          const billsParams = {
            terminal,
            branch_id: branchId,
            date: today,
            after_closing_date: lastDayendTime || null,
          };
          
          const billsResult = await apiPost('api/bills_management.php', { action: 'get', ...billsParams });
          if (billsResult.success && billsResult.data) {
            let billsData = [];
            if (Array.isArray(billsResult.data)) {
              billsData = billsResult.data;
            } else if (billsResult.data.data && Array.isArray(billsResult.data.data)) {
              billsData = billsResult.data.data;
            } else if (billsResult.data.bills && Array.isArray(billsResult.data.bills)) {
              billsData = billsResult.data.bills;
            }
            
            // Filter bills by date and dayend
            const validBills = billsData.filter(bill => {
              const billDate = bill.created_at || bill.bill_date || bill.date;
              if (!billDate) return false;
              
              const billDateTime = new Date(billDate);
              if (lastDayendTime) {
                return billDateTime > cutoffDateTime;
              } else {
                const billDateStr = billDateTime.toISOString().split('T')[0];
                return billDateStr === today;
              }
            });
            
            dailySales = validBills.reduce((sum, bill) => {
              const total = bill.grand_total || bill.net_total || bill.total || bill.amount || 0;
              return sum + (parseFloat(total) || 0);
            }, 0);
            
            console.log(`📊 Branch ${branchName} - Calculated daily sales from ${validBills.length} bills:`, dailySales);
          }
        } catch (billsError) {
          console.error(`❌ Error calculating from bills for branch ${branchName}:`, billsError);
        }
      }
      
      // Ensure daily sales is 0 if no sales after dayend (ensures reset at day end)
      dailySales = dailySales || 0;
      console.log(`📊 Branch ${branchName} - Final daily sales:`, dailySales);
      
      // Fetch dashboard stats for this branch to get accurate orders count
      // The backend now calculates orders using the same logic as sales (after dayend or today)
      const dashboardStatsParams = {
        terminal,
        branch_id: branchId,
        date: today,
        after_closing_date: lastDayendTime || null, // Pass dayend time to backend
      };
      
      console.log(`📊 Fetching dashboard stats for branch ${branchName} (${branchId}):`, dashboardStatsParams);
      let dashboardStatsResult;
      try {
        dashboardStatsResult = await apiPost('/get_dashboard_stats.php', dashboardStatsParams);
        console.log(`📊 Dashboard stats response for branch ${branchName}:`, dashboardStatsResult);
      } catch (statsError) {
        console.error(`❌ Error fetching dashboard stats for branch ${branchName}:`, statsError);
        dashboardStatsResult = { success: false, data: {} };
      }
      
      // Always fetch and validate bills directly to ensure accurate count after dayend
      // Don't rely solely on dashboard stats - validate with actual bills data
      let completeBillsCount = 0;
      
      // Fetch bills directly to get accurate count (after dayend filtering)
      try {
        const billsParams = {
          terminal,
          branch_id: branchId,
          from_date: today,
          to_date: today,
          after_closing_date: lastDayendTime || null,
        };
        
        console.log(`📊 Fetching bills for complete count - branch ${branchName} (${branchId}):`, billsParams);
        let billsResult;
        try {
          billsResult = await apiPost('api/bills_management.php', { action: 'get', ...billsParams });
        } catch (billsError) {
          console.error(`❌ Error fetching bills for branch ${branchName}:`, billsError);
          billsResult = { success: false, data: [] };
        }
        
        if (billsResult.success && billsResult.data) {
          let billsData = [];
          if (Array.isArray(billsResult.data)) {
            billsData = billsResult.data;
          } else if (billsResult.data.data && Array.isArray(billsResult.data.data)) {
            billsData = billsResult.data.data;
          } else if (billsResult.data.bills && Array.isArray(billsResult.data.bills)) {
            billsData = billsResult.data.bills;
          }
          
          console.log(`📊 Branch ${branchName} - Found ${billsData.length} bills from API`);
          if (billsData.length > 0) {
            console.log(`📊 Sample bill structure:`, {
              bill_id: billsData[0].bill_id || billsData[0].id,
              branch_id: billsData[0].branch_id,
              status: billsData[0].order_status || billsData[0].status,
              amount: billsData[0].grand_total || billsData[0].net_total || billsData[0].total,
              date: billsData[0].created_at || billsData[0].bill_date || billsData[0].date
            });
          }
          
          // Filter bills by date, dayend, and payment status
          // Backend logic: Only count 'Bill Generated' or 'Complete' status, exclude 'Customer Registration' and 'Customer Created'
          const validBills = billsData.filter(bill => {
            if (!bill) return false;
            
            // Verify branch ID matches
            const billBranchId = bill.branch_id || bill.branchId || bill.branch_ID || bill.BranchID || bill.order_branch_id;
            if (billBranchId) {
              const billBranchIdStr = String(billBranchId).trim();
              const currentBranchIdStr = String(branchId).trim();
              if (billBranchIdStr !== currentBranchIdStr) {
                return false;
              }
            }
            
            // STRICT DATE FILTERING: Must have date and must be after dayend
            const billDate = bill.created_at || bill.bill_date || bill.date || bill.created_date || bill.bill_created_at;
            if (!billDate) {
              console.warn(`⚠️ Bill missing date, excluding:`, bill.bill_id || bill.id);
              return false; // Exclude bills without date
            }
            
            const billDateTime = new Date(billDate);
            if (isNaN(billDateTime.getTime())) {
              console.warn(`⚠️ Invalid date format, excluding:`, billDate);
              return false; // Exclude bills with invalid date
            }
            
            // CRITICAL: Only include bills created after the last dayend closing time
            // If no dayend, only include today's bills
            if (lastDayendTime) {
              if (billDateTime <= cutoffDateTime) {
                console.log(`📅 Excluding bill before dayend:`, billDate, 'cutoff:', cutoffDateTime.toISOString());
                return false; // Before dayend - exclude
              }
            } else {
              // No dayend exists, filter by today's date only
              const billDateStr = billDateTime.toISOString().split('T')[0];
              if (billDateStr !== today) {
                console.log(`📅 Excluding bill not from today:`, billDateStr, 'today:', today);
                return false; // Not from today - exclude
              }
            }
            
            // Check order status - exclude 'Customer Registration' and 'Customer Created'
            // But be more lenient with other statuses - if it has an amount, count it
            const orderStatus = (bill.order_status || bill.status || '').toLowerCase().trim();
            const excludedStatuses = ['customer registration', 'customer created', 'cancelled', 'canceled'];
            if (excludedStatuses.includes(orderStatus)) {
              console.log(`📅 Excluding bill with excluded status:`, orderStatus);
              return false;
            }
            
            // Must have amount > 0 to be considered a valid bill
            const amount = parseFloat(bill.grand_total || bill.net_total || bill.total || bill.net_total_amount || bill.amount || 0);
            const hasAmount = amount > 0;
            
            // If it has an amount and is not in excluded statuses, count it
            // This is more lenient - we count any bill with amount > 0 that's not explicitly excluded
            const isValid = hasAmount;
            
            if (!isValid) {
              console.log(`❌ Bill excluded:`, {
                bill_id: bill.bill_id || bill.id,
                order_status: orderStatus,
                amount: amount,
                date: billDate,
                reason: !hasAmount ? 'No amount' : 'Unknown reason'
              });
            }
            
            return isValid;
          });
          
          completeBillsCount = validBills.length;
          console.log(`📊 Branch ${branchName} - ${completeBillsCount} valid bills after filtering (from ${billsData.length} total bills)`);
          if (completeBillsCount === 0 && billsData.length > 0) {
            console.warn(`⚠️ All ${billsData.length} bills were filtered out for branch ${branchName}. Check filtering criteria.`);
          }
        }
      } catch (billsError) {
        console.warn(`⚠️ Error fetching bills for branch ${branchName}:`, billsError);
        // Fallback: Try to get count from dashboard stats
        if (dashboardStatsResult.success && dashboardStatsResult.data) {
          let statsData = dashboardStatsResult.data;
          if (statsData.data) {
            statsData = statsData.data;
          }
          completeBillsCount = parseInt(statsData.totalOrders || statsData.total_orders || 0);
          console.log(`📊 Branch ${branchName} - Using dashboard stats as fallback: ${completeBillsCount}`);
        }
      }
      
      // Fetch orders for running orders count (active orders regardless of date)
      const ordersParams = {
        terminal,
        branch_id: branchId,
      };
      
      console.log(`📊 Fetching orders for running count - branch ${branchName} (${branchId}):`, ordersParams);
      
      // Try POST first (better for complex parameters), fallback to GET
      let ordersResult;
      try {
        ordersResult = await apiPost('api/order_management.php', ordersParams);
      } catch (postError) {
        console.warn(`⚠️ POST failed for orders, trying GET:`, postError);
        try {
          ordersResult = await apiGet('api/order_management.php', ordersParams);
        } catch (getError) {
          console.error(`❌ Both POST and GET failed for orders for branch ${branchName}:`, getError);
          ordersResult = { success: false, data: [] };
        }
      }
      
      let ordersData = [];
      if (ordersResult.data && Array.isArray(ordersResult.data)) {
        ordersData = ordersResult.data;
      } else if (ordersResult.data && ordersResult.data.data && Array.isArray(ordersResult.data.data)) {
        ordersData = ordersResult.data.data;
      } else if (ordersResult.data && ordersResult.data.orders && Array.isArray(ordersResult.data.orders)) {
        ordersData = ordersResult.data.orders;
      }
      
      // Filter running orders (all active orders regardless of date - operationally useful)
      const runningOrders = ordersData.filter(order => {
        if (!order) return false;
        
        // Verify branch ID matches
        const orderBranchId = order.branch_id || order.branchId || order.branch_ID || order.BranchID;
        if (orderBranchId) {
          const orderBranchIdStr = String(orderBranchId).trim();
          const currentBranchIdStr = String(branchId).trim();
          if (orderBranchIdStr !== currentBranchIdStr) {
            return false;
          }
        }
        
        const status = (order.status || order.order_status || '').toLowerCase().trim();
        return status === 'pending' || status === 'preparing' || status === 'ready' || status === 'confirmed';
      });
      
      console.log(`📊 Branch ${branchName} - ${runningOrders.length} running orders`);
      
      // Fetch today's orders count (filtered by date and dayend)
      let todaysOrdersCount = 0;
      try {
        // Fetch orders with date filter for today
        const todaysOrdersParams = {
          terminal,
          branch_id: branchId,
          date: today,
          from_date: today,
          to_date: today,
        };
        
        // Add dayend filter if available
        if (lastDayendTime) {
          todaysOrdersParams.after_closing_date = lastDayendTime;
        }
        
        console.log(`📊 Fetching today's orders - branch ${branchName} (${branchId}):`, todaysOrdersParams);
        
        let todaysOrdersResult;
        try {
          todaysOrdersResult = await apiPost('api/order_management.php', todaysOrdersParams);
        } catch (postError) {
          console.warn(`⚠️ POST failed for today's orders, trying GET:`, postError);
          try {
            todaysOrdersResult = await apiGet('api/order_management.php', todaysOrdersParams);
          } catch (getError) {
            console.warn(`⚠️ GET also failed for today's orders:`, getError);
            // Will use fallback logic below
            throw new Error('Both POST and GET failed for today\'s orders');
          }
        }
        
        let todaysOrdersData = [];
        if (todaysOrdersResult && todaysOrdersResult.success !== false) {
          if (todaysOrdersResult.data) {
            if (Array.isArray(todaysOrdersResult.data)) {
              todaysOrdersData = todaysOrdersResult.data;
            } else if (todaysOrdersResult.data.data && Array.isArray(todaysOrdersResult.data.data)) {
              todaysOrdersData = todaysOrdersResult.data.data;
            } else if (todaysOrdersResult.data.orders && Array.isArray(todaysOrdersResult.data.orders)) {
              todaysOrdersData = todaysOrdersResult.data.orders;
            }
          } else if (Array.isArray(todaysOrdersResult)) {
            todaysOrdersData = todaysOrdersResult;
          }
        }
        
        // Filter today's orders by date and dayend
        const todaysOrders = todaysOrdersData.filter(order => {
          if (!order) return false;
          
          // Verify branch ID matches
          const orderBranchId = order.branch_id || order.branchId || order.branch_ID || order.BranchID;
          if (orderBranchId) {
            const orderBranchIdStr = String(orderBranchId).trim();
            const currentBranchIdStr = String(branchId).trim();
            if (orderBranchIdStr !== currentBranchIdStr) {
              return false;
            }
          }
          
          // Filter by date - must be today or after dayend
          const orderDate = order.created_at || order.date || order.order_date || order.created_date;
          if (!orderDate) {
            return false;
          }
          
          const orderDateTime = new Date(orderDate);
          if (isNaN(orderDateTime.getTime())) {
            return false;
          }
          
          // If dayend exists, only include orders after dayend
          if (lastDayendTime) {
            return orderDateTime > cutoffDateTime;
          } else {
            // No dayend, only include today's orders
            const orderDateStr = orderDateTime.toISOString().split('T')[0];
            return orderDateStr === today;
          }
        });
        
        todaysOrdersCount = todaysOrders.length;
        console.log(`📊 Branch ${branchName} - ${todaysOrdersCount} today's orders (after dayend filtering)`);
      } catch (todaysOrdersError) {
        console.error(`❌ Error fetching today's orders for branch ${branchName}:`, todaysOrdersError);
        // Fallback: try to count from all orders data we already fetched
        const todaysOrdersFromAll = ordersData.filter(order => {
          if (!order) return false;
          
          const orderBranchId = order.branch_id || order.branchId || order.branch_ID || order.BranchID;
          if (orderBranchId) {
            const orderBranchIdStr = String(orderBranchId).trim();
            const currentBranchIdStr = String(branchId).trim();
            if (orderBranchIdStr !== currentBranchIdStr) {
              return false;
            }
          }
          
          const orderDate = order.created_at || order.date || order.order_date || order.created_date;
          if (!orderDate) {
            return false;
          }
          
          const orderDateTime = new Date(orderDate);
          if (isNaN(orderDateTime.getTime())) {
            return false;
          }
          
          if (lastDayendTime) {
            return orderDateTime > cutoffDateTime;
          } else {
            const orderDateStr = orderDateTime.toISOString().split('T')[0];
            return orderDateStr === today;
          }
        });
        
        todaysOrdersCount = todaysOrdersFromAll.length;
        console.log(`📊 Branch ${branchName} - Fallback: ${todaysOrdersCount} today's orders (from all orders)`);
      }
      
      // Additional validation: If we got a count from dashboard stats, verify it matches our bills count
      // Use dashboard stats as fallback if bills count is 0 (bills API might be too strict or not returning data)
      if (dashboardStatsResult.success && dashboardStatsResult.data) {
        let statsData = dashboardStatsResult.data;
        if (statsData.data) {
          statsData = statsData.data;
        }
        const dashboardCount = parseInt(statsData.totalOrders || statsData.total_orders || 0);
        if (dashboardCount !== completeBillsCount) {
          if (completeBillsCount === 0 && dashboardCount > 0) {
            // Bills count is 0 but dashboard shows orders - use dashboard count as fallback
            console.log(`ℹ️ Bills count is 0 but dashboard shows ${dashboardCount} orders, using dashboard count as fallback`);
            completeBillsCount = dashboardCount;
          } else {
            console.warn(`⚠️ Dashboard stats count (${dashboardCount}) doesn't match bills count (${completeBillsCount}), using bills count`);
          }
        }
      }
      
      // Final validation: If dayend exists and no bills after dayend, count must be 0
      if (lastDayendTime && completeBillsCount > 0) {
        // Double-check: ensure all counted bills are actually after dayend
        // This is already done in the filter, but we log it for verification
        console.log(`📊 Branch ${branchName} - Verified ${completeBillsCount} bills are after dayend (${lastDayendTime})`);
      }
      
      // If no dayend and count > 0, ensure all bills are from today
      if (!lastDayendTime && completeBillsCount > 0) {
        console.log(`📊 Branch ${branchName} - Verified ${completeBillsCount} bills are from today (${today})`);
      }
      
      
      console.log(`📊 Branch ${branchName} - Final complete bills count: ${completeBillsCount}`);
      
      // Use today's orders count if it's available and more accurate
      // If complete_bills is 0 but we have today's orders, use today's orders count
      // This ensures we show today's orders even if bills haven't been generated yet
      const finalOrdersCount = todaysOrdersCount > 0 ? todaysOrdersCount : completeBillsCount;
      
      console.log(`📊 Branch ${branchName} - Today's orders: ${todaysOrdersCount}, Complete bills: ${completeBillsCount}, Final count: ${finalOrdersCount}`);
      
      return {
        branch_id: branchId,
        branch_name: branchName,
        daily_sales: dailySales,
        running_orders: runningOrders.length,
        complete_bills: finalOrdersCount,
        todays_orders: todaysOrdersCount, // Also include separate field for today's orders
      };
    } catch (error) {
      console.error(`Error fetching stats for branch ${branchName}:`, error);
      return {
        branch_id: branchId,
        branch_name: branchName,
        daily_sales: 0,
        running_orders: 0,
        complete_bills: 0,
        error: true,
      };
    }
  };

  /**
   * Fetch branches list for filter dropdown
   */
  const fetchBranches = async () => {
    try {
      // Use POST for branch_management.php
      const result = await apiPost('/branch_management.php', { action: 'get' });
      console.log('Branches API response:', result);
      
      let branchesData = [];
      
      // Handle different response structures
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
      
      console.log('✅ Branches loaded:', branchesData.length);
      setBranches(branchesData);
      setStats(prev => ({
        ...prev,
        totalBranches: branchesData.length
      }));
      
      // Fetch stats after branches are loaded
      fetchDashboardStats();
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  const statCards = [
    {
      title: 'Total Branches',
      value: stats.totalBranches,
      icon: Building2,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
      link: '/dashboard/super-admin/branches',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      link: '/dashboard/super-admin/order',
    },
    {
      title: 'Total Sales',
      value: formatPKR(stats.totalSales),
      icon: TrendingUp,
      color: 'bg-green-500',
      textColor: 'text-green-500',
      bgColor: 'bg-green-50',
      link: '/dashboard/super-admin/sales',
    },
    {
      title: 'Menu Items',
      value: stats.totalMenuItems,
      icon: Utensils,
      color: 'bg-orange-500',
      textColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      link: '/dashboard/super-admin/menu',
    },
    {
      title: 'Categories',
      value: stats.totalCategories,
      icon: FolderOpen,
      color: 'bg-purple-500',
      textColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
      link: '/dashboard/super-admin/category',
    },
  ];


  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#FF5F15] border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Page Header with Branch Filter */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Super Admin Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                {selectedBranchId === 'all' 
                  ? 'Viewing all branches - Global analytics' 
                  : `Viewing: ${branches.find(b => (b.branch_id || b.id) == selectedBranchId)?.branch_name || branches.find(b => (b.branch_id || b.id) == selectedBranchId)?.name || 'Selected Branch'}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] bg-white text-gray-900"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id || branch.id} value={branch.branch_id || branch.id}>
                    {branch.branch_name || branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          {statCards.map((stat, index) => {
            const IconComponent = stat.icon;
            const CardContent = (
              <div
                className={`${stat.bgColor} rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className={`${stat.textColor} text-2xl sm:text-3xl font-bold`}>
                    {stat.value}
                  </div>
                  <div className={`${stat.textColor} bg-white rounded-full p-2 sm:p-3`}>
                    <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">{stat.title}</h3>
              </div>
            );

            return stat.link ? (
              <Link key={index} href={stat.link}>
                {CardContent}
              </Link>
            ) : (
              <div key={index}>{CardContent}</div>
            );
          })}
        </div>

        {/* Branch Statistics Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF5F15]" />
              Branch Daily Statistics
            </h2>
            <button
              onClick={fetchBranchStatistics}
              disabled={branchStatsLoading}
              className="text-sm text-[#FF5F15] hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              <Clock className="w-4 h-4" />
              {branchStatsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {branchStatsLoading && branchStats.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#FF5F15] border-t-transparent mb-2"></div>
              <p className="text-gray-500">Loading branch statistics...</p>
            </div>
          ) : branchStatsError ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium mb-2">Error loading branch statistics</p>
              <p className="text-gray-500 text-sm">{branchStatsError}</p>
              <button
                onClick={fetchBranchStatistics}
                className="mt-4 px-4 py-2 bg-[#FF5F15] text-white rounded-lg hover:bg-[#FF8C42] transition"
              >
                Retry
              </button>
            </div>
          ) : branchStats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No branch statistics available</p>
              <button
                onClick={fetchBranchStatistics}
                className="px-4 py-2 bg-[#FF5F15] text-white rounded-lg hover:bg-[#FF8C42] transition"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Branch Name</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Daily Sales</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Running Orders</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Complete Bills</th>
                  </tr>
                </thead>
                <tbody>
                  {branchStats.map((branch, index) => (
                    <tr 
                      key={branch.branch_id || index} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#FF5F15]" />
                          <span className="font-medium text-gray-900">{branch.branch_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-bold text-green-600">
                          {formatPKR(branch.daily_sales || 0)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold text-blue-600">
                          {branch.running_orders || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold text-purple-600">
                          {branch.complete_bills || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-4 px-4 text-gray-900">Total</td>
                    <td className="py-4 px-4 text-right text-green-600">
                      {formatPKR(branchStats.reduce((sum, b) => sum + (b.daily_sales || 0), 0))}
                    </td>
                    <td className="py-4 px-4 text-right text-blue-600">
                      {branchStats.reduce((sum, b) => sum + (b.running_orders || 0), 0)}
                    </td>
                    <td className="py-4 px-4 text-right text-purple-600">
                      {branchStats.reduce((sum, b) => sum + (b.complete_bills || 0), 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF5F15]" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
              <Link
                href="/dashboard/super-admin/branches"
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
              >
                <div className="flex justify-center mb-2">
                  <Network className="w-6 h-6 text-[#FF5F15]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Branches</p>
              </Link>
              <Link
                href="/dashboard/super-admin/create-order"
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
              >
                <div className="flex justify-center mb-2">
                  <LayoutDashboard className="w-6 h-6 text-[#FF5F15]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Create Order</p>
              </Link>
              <Link
                href="/dashboard/super-admin/category"
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
              >
                <div className="flex justify-center mb-2">
                  <FolderOpen className="w-6 h-6 text-[#FF5F15]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Categories</p>
              </Link>
              <Link
                href="/dashboard/super-admin/menu"
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
              >
                <div className="flex justify-center mb-2">
                  <Utensils className="w-6 h-6 text-[#FF5F15]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Menu Items</p>
              </Link>
              <Link
                href="/dashboard/super-admin/order"
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
              >
                <div className="flex justify-center mb-2">
                  <FileText className="w-6 h-6 text-[#FF5F15]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Orders</p>
              </Link>
              <Link
                href="/dashboard/super-admin/accounts"
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
              >
                <div className="flex justify-center mb-2">
                  <Building2 className="w-6 h-6 text-[#FF5F15]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Accounts</p>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </SuperAdminLayout>
  );
}
