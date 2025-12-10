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
    if (authChecked) {
      if (branches.length > 0) {
        console.log('✅ Conditions met, fetching dashboard stats and branch statistics');
      fetchDashboardStats();
      fetchBranchStatistics();
      } else {
        console.log('⏳ Waiting for branches to load...');
    }
    } else {
      console.log('⏳ Waiting for auth check...');
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
   * Uses get_sales.php for all branch selections
   */
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Use branch_id format: "0" for all branches, or specific branch_id
      const branchId = selectedBranchId && selectedBranchId !== 'all' ? selectedBranchId : '0';
      
      console.log('Fetching dashboard stats for branch:', branchId);
      
      // Always use get_sales.php API
      console.log('📡 Calling get_sales.php with params:', { branch_id: branchId });
      let salesResult;
      try {
        salesResult = await apiPost('api/get_sales.php', { branch_id: branchId });
        console.log('✅ Sales API response:', salesResult);
      } catch (error) {
        console.error('❌ Error calling get_sales.php:', error);
        salesResult = { success: false, data: [], error: error.message };
      }
      
      // Transform get_sales.php response to dashboard stats format
      let result;
      if (salesResult.success && salesResult.data) {
        let salesData = [];
        
        // Handle different response structures
        if (Array.isArray(salesResult.data)) {
          salesData = salesResult.data;
        } else if (salesResult.data.data && Array.isArray(salesResult.data.data)) {
          salesData = salesResult.data.data;
        }
        
        console.log('📊 Sales data array length:', salesData.length);
        
        if (salesData.length > 0) {
          const totalSales = salesData.reduce((sum, sale) => sum + (parseFloat(sale.cash_sales || sale.total || sale.total_amount || sale.net_total || sale.grand_total || sale.amount || 0)), 0);
          const totalOrders = salesData.reduce((sum, sale) => sum + (parseInt(sale.total_orders || 0)), 0);
          
          console.log('📊 Calculated totals:', { totalSales, totalOrders });
          
          result = {
            success: true,
            data: {
              totalOrders: totalOrders,
              totalSales: totalSales,
              totalMenuItems: stats.totalMenuItems || 0,
              totalCategories: stats.totalCategories || 0,
              totalBranches: branches.length || 0,
            }
          };
        } else {
          console.warn('⚠️ No sales data found in response');
          result = {
            success: true,
            data: {
              totalOrders: 0,
              totalSales: 0,
              totalMenuItems: stats.totalMenuItems || 0,
              totalCategories: stats.totalCategories || 0,
              totalBranches: branches.length || 0,
            }
          };
        }
      } else {
        console.warn('⚠️ Sales API returned error or no data:', salesResult);
        // Fallback: return zero values
        result = {
          success: true,
          data: {
            totalOrders: 0,
            totalSales: 0,
            totalMenuItems: stats.totalMenuItems || 0,
            totalCategories: stats.totalCategories || 0,
            totalBranches: branches.length || 0,
          }
        };
      }
      
      console.log('Dashboard stats result:', result);
      
      if (result.success && result.data) {
        // Use the data we already transformed
        const statsData = {
          totalOrders: result.data.totalOrders || 0,
          totalSales: result.data.totalSales || 0,
          totalMenuItems: result.data.totalMenuItems || stats.totalMenuItems || 0,
          totalCategories: result.data.totalCategories || stats.totalCategories || 0,
          totalBranches: result.data.totalBranches || branches.length || 0,
        };
        
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
      
      // Immediately show branches with loading state
      const loadingStats = branches.map(branch => ({
        branch_id: branch.branch_id || branch.id,
        branch_name: branch.branch_name || branch.name || 'Unknown Branch',
        daily_sales: 0,
        running_orders: 0,
        complete_bills: 0,
        loading: true,
      }));
      setBranchStats(loadingStats);
      console.log('📊 Set loading state for', loadingStats.length, 'branches');
      
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
      const stats = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          // If promise was rejected, use the branch info to create a default entry
          const branch = branches[index];
          console.error(`❌ Promise rejected for branch ${branch?.branch_name || index}:`, result.reason);
          return {
            branch_id: branch?.branch_id || branch?.id || 'unknown',
            branch_name: branch?.branch_name || branch?.name || 'Unknown Branch',
            daily_sales: 0,
            running_orders: 0,
            complete_bills: 0,
            error: true,
          };
        }
      });
      
      // Filter out any null/undefined entries and ensure we have data for all branches
      let validStats = stats.filter(stat => stat && stat.branch_id);
      
      // If we have fewer stats than branches, add missing branches with zero values
      if (validStats.length < branches.length) {
        console.warn(`⚠️ Only ${validStats.length} branches returned stats out of ${branches.length} branches`);
        const existingBranchIds = new Set(validStats.map(s => String(s.branch_id)));
        branches.forEach(branch => {
          const branchId = String(branch.branch_id || branch.id);
          if (!existingBranchIds.has(branchId)) {
            validStats.push({
              branch_id: branch.branch_id || branch.id,
              branch_name: branch.branch_name || branch.name || 'Unknown Branch',
              daily_sales: 0,
              running_orders: 0,
              complete_bills: 0,
              error: true,
            });
          }
        });
      }
      
      console.log('📊 Branch statistics results:', validStats);
      console.log('📊 Total branches processed:', validStats.length, 'out of', branches.length);
      if (validStats.length > 0) {
        console.log('📊 Sample stats entry:', validStats[0]);
        console.log('📊 All branch IDs:', validStats.map(s => s.branch_id));
        console.log('📊 All branch names:', validStats.map(s => s.branch_name));
      } else {
        console.error('❌ No valid stats returned! Stats array:', stats);
      }
      
      setBranchStats(validStats);
      console.log('✅ Branch statistics loaded via individual calls:', validStats.length, 'branches');
    } catch (error) {
      console.error('❌ Error fetching branch statistics:', error);
      setBranchStatsError(error.message || 'Failed to load branch statistics. Please check your connection.');
      
      // Even on error, show branches with zero values so table is visible
      const fallbackStats = branches.map(branch => ({
        branch_id: branch.branch_id || branch.id,
        branch_name: branch.branch_name || branch.name || 'Unknown Branch',
        daily_sales: 0,
        running_orders: 0,
        complete_bills: 0,
        error: true,
      }));
      console.log('📊 Using fallback stats due to error:', fallbackStats.length, 'branches');
      setBranchStats(fallbackStats);
    } finally {
      setBranchStatsLoading(false);
    }
  };

  /**
   * Fetch branch statistics using get_sales.php API
   * Simplified version without dayend or date filtering
   */
  const fetchBranchStatsIndividual = async (branch, terminal, today) => {
    const branchId = branch.branch_id || branch.id;
    const branchName = branch.branch_name || branch.name || 'Unknown Branch';
    
    try {
      
      // Fetch sales data for this branch using get_sales.php
      const salesParams = {
        branch_id: branchId
      };
      
      console.log(`📊 Fetching sales for branch ${branchName} (${branchId}):`, salesParams);
      let salesResult;
      try {
        salesResult = await apiPost('api/get_sales.php', salesParams);
      console.log(`📊 Sales API response for branch ${branchName}:`, salesResult);
      } catch (salesError) {
        console.error(`❌ Error fetching sales for branch ${branchName}:`, salesError);
        salesResult = { success: false, data: [] };
      }
      
      // Calculate daily sales from sales data
      // API response: { success: true, data: [{ total, total_amount, net_total, grand_total, amount, cash_sales, total_orders, ... }], count, message }
      let dailySales = 0;
      let totalOrders = 0;
      
      if (salesResult.success && salesResult.data && Array.isArray(salesResult.data)) {
        const salesData = salesResult.data;
        
        // Filter by branch_id if needed (API should already filter, but double-check)
        const branchSales = salesData.filter(sale => {
          if (!sale) return false;
          const saleBranchId = String(sale.branch_id || '').trim();
          const currentBranchIdStr = String(branchId).trim();
          return !saleBranchId || saleBranchId === currentBranchIdStr;
        });
        
        // Sum up total sales
        dailySales = branchSales.reduce((sum, sale) => {
          const total = sale.cash_sales || sale.total || sale.total_amount || sale.net_total || sale.grand_total || sale.amount || 0;
          return sum + (parseFloat(total) || 0);
        }, 0);
        
        // Sum up total orders
        totalOrders = branchSales.reduce((sum, sale) => {
          return sum + (parseInt(sale.total_orders || 0));
            }, 0);
            
        console.log(`📊 Branch ${branchName} - Daily sales: ${dailySales}, Total orders: ${totalOrders}`);
      }
      
      // Fetch running orders (active orders)
      const ordersParams = { branch_id: branchId };
      let runningOrders = [];
      
      try {
      let ordersResult;
      try {
        ordersResult = await apiPost('api/order_management.php', ordersParams);
      } catch (postError) {
        ordersResult = await apiGet('api/order_management.php', ordersParams);
      }
      
      let ordersData = [];
      if (ordersResult.data && Array.isArray(ordersResult.data)) {
        ordersData = ordersResult.data;
        } else if (ordersResult.data?.data && Array.isArray(ordersResult.data.data)) {
        ordersData = ordersResult.data.data;
        } else if (ordersResult.data?.orders && Array.isArray(ordersResult.data.orders)) {
        ordersData = ordersResult.data.orders;
      }
      
        // Filter running orders (active orders)
        runningOrders = ordersData.filter(order => {
        if (!order) return false;
          const orderBranchId = String(order.branch_id || order.branchId || '').trim();
          const currentBranchIdStr = String(branchId).trim();
          if (orderBranchId && orderBranchId !== currentBranchIdStr) return false;
        
        const status = (order.status || order.order_status || '').toLowerCase().trim();
        return status === 'pending' || status === 'preparing' || status === 'ready' || status === 'confirmed';
      });
      
        console.log(`📊 Branch ${branchName} - Running orders: ${runningOrders.length}`);
      } catch (ordersError) {
        console.error(`❌ Error fetching orders for branch ${branchName}:`, ordersError);
      }
      
      // Use total_orders from sales API as complete bills count
      const completeBillsCount = totalOrders || 0;
      
      return {
        branch_id: branchId,
        branch_name: branchName,
        daily_sales: dailySales,
        running_orders: runningOrders.length,
        complete_bills: completeBillsCount,
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
          ) : branchStats.length > 0 ? (
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
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No branch statistics available</p>
              <p className="text-gray-400 text-sm mb-4">Branches loaded: {branches.length}</p>
              <button
                onClick={fetchBranchStatistics}
                className="px-4 py-2 bg-[#FF5F15] text-white rounded-lg hover:bg-[#FF8C42] transition"
              >
                Load Statistics
              </button>
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
