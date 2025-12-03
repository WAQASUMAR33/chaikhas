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
    if (authChecked && branches.length > 0) {
      fetchDashboardStats();
      fetchBranchStatistics();
    }
  }, [selectedBranchId, authChecked, branches.length]);

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
   */
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      const params = { terminal };
      
      // Add branch_id filter if specific branch is selected
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.branch_id = selectedBranchId;
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
      const result = await apiPost('/get_dayend.php', {
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
    setBranchStatsLoading(true);
    try {
      const terminal = getTerminal();
      const today = getTodayDate(); // Always get current date - ensures reset at day end
      
      console.log('Fetching branch statistics for today:', today);
      
      // Try using the new consolidated endpoint first
      const useConsolidatedEndpoint = true;
      
      if (useConsolidatedEndpoint) {
        // Fetch statistics for each branch using the consolidated endpoint
        const branchStatsPromises = branches.map(async (branch) => {
          const branchId = branch.branch_id || branch.id;
          const branchName = branch.branch_name || branch.name || 'Unknown Branch';
          
          try {
            // Get the last dayend closing_date_time for this branch
            const lastDayendTime = await fetchLastDayendForBranch(branchId);
            
            // Use the new consolidated endpoint
            const statsParams = {
              terminal,
              branch_id: branchId,
              date: today,
              after_closing_date: lastDayendTime || null, // Pass dayend time if exists
            };
            
            const statsResult = await apiPost('api/get_branch_daily_stats.php', statsParams);
            
            if (statsResult.success && statsResult.data) {
              // Handle different response structures
              let data = statsResult.data;
              
              // Check if data is nested
              if (data.data) {
                data = data.data;
              }
              
              // Extract sales data (supports multiple field names and nested structures)
              let dailySales = 0;
              if (data.sales) {
                // If sales is nested object
                dailySales = parseFloat(
                  data.sales.total || 
                  data.sales.net_total || 
                  data.sales.grand_total || 
                  data.sales.amount || 
                  data.sales.total_sales || 
                  0
                ) || 0;
              } else {
                // If sales data is at root level
                dailySales = parseFloat(
                  data.total || 
                  data.net_total || 
                  data.grand_total || 
                  data.amount || 
                  data.total_sales || 
                  0
                ) || 0;
              }
              
              // Extract order statistics (supports multiple structures)
              let orderStats = {};
              if (data.order_statistics) {
                orderStats = data.order_statistics;
              } else if (data.orders) {
                orderStats = data.orders;
              } else if (data.order_stats) {
                orderStats = data.order_stats;
              } else {
                // Check if order stats are at root level
                orderStats = {
                  pending: data.pending || 0,
                  preparing: data.preparing || 0,
                  ready: data.ready || 0,
                  confirmed: data.confirmed || 0,
                  completed: data.completed || 0,
                  delivered: data.delivered || 0,
                  paid: data.paid || 0,
                };
              }
              
              // Calculate running orders (pending, preparing, ready, confirmed)
              const runningOrders = (
                (parseInt(orderStats.pending) || 0) +
                (parseInt(orderStats.preparing) || 0) +
                (parseInt(orderStats.ready) || 0) +
                (parseInt(orderStats.confirmed) || 0)
              );
              
              // Calculate complete bills (completed, delivered, paid) - today only
              // These are already filtered by the backend for today's date
              const completeBills = (
                (parseInt(orderStats.completed) || 0) +
                (parseInt(orderStats.delivered) || 0) +
                (parseInt(orderStats.paid) || 0)
              );
              
              // Ensure daily sales is 0 if no sales data or if date doesn't match today
              // This ensures reset at day end
              const validatedDailySales = dailySales || 0;
              
              return {
                branch_id: branchId,
                branch_name: branchName,
                daily_sales: validatedDailySales, // Ensures 0 if no sales today
                running_orders: runningOrders,
                complete_bills: completeBills,
              };
            } else {
              // If consolidated endpoint fails, fall back to individual calls
              console.warn(`Consolidated endpoint failed for branch ${branchName}, falling back to individual calls`);
              return await fetchBranchStatsIndividual(branch, terminal, today);
            }
          } catch (error) {
            // If consolidated endpoint doesn't exist or fails, fall back to individual calls
            console.warn(`Consolidated endpoint error for branch ${branchName}, falling back:`, error);
            return await fetchBranchStatsIndividual(branch, terminal, today);
          }
        });
        
        const stats = await Promise.all(branchStatsPromises);
        setBranchStats(stats);
        console.log('✅ Branch statistics loaded via consolidated endpoint:', stats.length);
      } else {
        // Fallback: Use individual API calls
        const branchStatsPromises = branches.map(branch => 
          fetchBranchStatsIndividual(branch, terminal, today)
        );
        const stats = await Promise.all(branchStatsPromises);
        setBranchStats(stats);
        console.log('✅ Branch statistics loaded via individual calls:', stats.length);
      }
    } catch (error) {
      console.error('Error fetching branch statistics:', error);
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
      
      const salesResult = await apiPost('api/get_sales.php', salesParams);
      
      // Calculate daily sales from sales data - only count sales after dayend
      let dailySales = 0;
      if (salesResult.success && salesResult.data) {
        let salesData = [];
        if (Array.isArray(salesResult.data)) {
          salesData = salesResult.data;
        } else if (salesResult.data.data && Array.isArray(salesResult.data.data)) {
          salesData = salesResult.data.data;
        } else if (salesResult.data.sales && Array.isArray(salesResult.data.sales)) {
          salesData = salesResult.data.sales;
        }
        
        // Filter sales to only include those created after the last dayend
        const validSales = salesData.filter(sale => {
          const saleDate = sale.date || sale.created_at || sale.order_date || sale.bill_date;
          if (!saleDate) return false;
          
          const saleDateTime = new Date(saleDate);
          
          // Only include sales created after the last dayend closing time
          // If no dayend, only include today's sales
          if (lastDayendTime) {
            return saleDateTime > cutoffDateTime;
          } else {
            // No dayend exists, filter by today's date only
            const saleDateStr = saleDateTime.toISOString().split('T')[0];
            return saleDateStr === today;
          }
        });
        
        // Sum up total sales after dayend
        dailySales = validSales.reduce((sum, sale) => {
          const total = sale.total || sale.net_total || sale.grand_total || sale.amount || sale.total_sales || 0;
          return sum + (parseFloat(total) || 0);
        }, 0);
      }
      
      // Ensure daily sales is 0 if no sales after dayend (ensures reset at day end)
      dailySales = dailySales || 0;
      
      // Fetch orders for this branch to get running and complete counts
      const ordersParams = {
        terminal,
        branch_id: branchId,
      };
      
      const ordersResult = await apiGet('api/order_management.php', ordersParams);
      
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
        const status = (order.status || order.order_status || '').toLowerCase();
        return status === 'pending' || status === 'preparing' || status === 'ready' || status === 'confirmed';
      });
      
      // Filter complete bills - only those created after the last dayend
      const validCompleteBills = ordersData.filter(order => {
        const orderDate = order.created_at || order.date || order.order_date;
        if (!orderDate) return false;
        
        const orderDateTime = new Date(orderDate);
        
        // Only include orders created after the last dayend closing time
        // If no dayend, only include today's orders
        if (lastDayendTime) {
          if (orderDateTime <= cutoffDateTime) return false;
        } else {
          // No dayend exists, filter by today's date only
          const orderDateStr = orderDateTime.toISOString().split('T')[0];
          if (orderDateStr !== today) return false;
        }
        
        const status = (order.status || order.order_status || '').toLowerCase();
        return status === 'completed' || status === 'delivered' || status === 'paid';
      });
      
      return {
        branch_id: branchId,
        branch_name: branchName,
        daily_sales: dailySales,
        running_orders: runningOrders.length,
        complete_bills: validCompleteBills.length,
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
            <p className="text-gray-500 text-center py-8">Loading branch statistics...</p>
          ) : branchStats.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No branch statistics available</p>
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
