'use client';

/**
 * Admin Dashboard Main Page
 * Overview and statistics for admin users
 * Uses real API: get_dashboard_stats.php
 */

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiPost, getTerminal, getBranchId } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { LayoutDashboard, FileText, TrendingUp, Utensils, FolderOpen, Clock } from 'lucide-react';
import Link from 'next/link';
import logger from '@/utils/logger';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSales: 0,
    totalMenuItems: 0,
    totalCategories: 0,
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Auto-refresh dashboard stats periodically and when page becomes visible
  // This ensures sales reset is reflected when dayend happens
  useEffect(() => {
    // Refresh statistics every 5 minutes to catch dayend changes
    const refreshInterval = setInterval(() => {
      fetchDashboardStats();
    }, 5 * 60000); // Every 5 minutes

    // Also refresh when page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardStats();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
   * Fetch the last dayend closing_date_time for the current branch
   * Returns the closing_date_time if dayend exists, null otherwise
   */
  const fetchLastDayend = async (branchId) => {
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
   * Fetch dashboard statistics from API
   * API: get_dashboard_stats.php (POST with terminal and branch_id parameter)
   * Sales are fetched directly from sales API to ensure accurate daily sales
   * Sales are filtered to only show sales created after the last dayend closing_date_time
   * If no dayend exists, shows only today's sales
   */
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      const branchId = getBranchId();
      
      // Ensure branch_id is valid
      if (!branchId) {
        console.error('❌ Branch ID is missing for branch-admin dashboard');
        setStats({
          totalOrders: 0,
          totalSales: 0,
          totalMenuItems: 0,
          totalCategories: 0,
          recentOrders: [],
        });
        setLoading(false);
        return;
      }
      
      logger.info('Fetching Dashboard Stats', { terminal, branch_id: branchId });
      
      // Get the last dayend closing_date_time for this branch
      const lastDayendTime = await fetchLastDayend(branchId);
      const today = getTodayDate();
      
      // Fetch dashboard stats for menu items, categories, and recent orders
      const result = await apiPost('/get_dashboard_stats.php', { 
        terminal,
        branch_id: branchId,
        after_closing_date: lastDayendTime || null, // Pass dayend time if exists
        date: today, // Pass today's date for filtering
      });
      
      console.log('Dashboard stats API response:', result);
      
      let statsData = {
        totalOrders: 0,
        totalSales: 0,
        totalMenuItems: 0,
        totalCategories: 0,
        recentOrders: [],
      };
      
      if (result.success && result.data) {
        // Handle different response structures
        // Check if data is nested
        if (result.data.success && result.data.data) {
          statsData.totalMenuItems = result.data.data.totalMenuItems || result.data.data.total_menu_items || 0;
          statsData.totalCategories = result.data.data.totalCategories || result.data.data.total_categories || 0;
          statsData.recentOrders = result.data.data.recentOrders || result.data.data.recent_orders || [];
        } else {
          // Direct data structure
          statsData.totalMenuItems = result.data.totalMenuItems || result.data.total_menu_items || 0;
          statsData.totalCategories = result.data.totalCategories || result.data.total_categories || 0;
          statsData.recentOrders = result.data.recentOrders || result.data.recent_orders || [];
        }
      }
      
      // Fetch daily sales directly from sales API for accurate daily sales calculation
      try {
        const salesParams = {
          terminal,
          branch_id: branchId,
          period: 'daily',
          from_date: today,
          to_date: today,
          after_closing_date: lastDayendTime || null, // Pass dayend time to backend
        };
        
        console.log('📊 Fetching daily sales with params:', salesParams);
        const salesResult = await apiPost('api/get_sales.php', salesParams);
        console.log('📊 Sales API response:', salesResult);
        
        if (salesResult.success && salesResult.data) {
          let salesData = [];
          
          // Handle different response structures
          if (Array.isArray(salesResult.data)) {
            salesData = salesResult.data;
          } else if (salesResult.data.data && Array.isArray(salesResult.data.data)) {
            salesData = salesResult.data.data;
          } else if (salesResult.data.sales && Array.isArray(salesResult.data.sales)) {
            salesData = salesResult.data.sales;
          } else if (salesResult.data.orders && Array.isArray(salesResult.data.orders)) {
            salesData = salesResult.data.orders;
          }
          
          // Calculate total sales from sales data
          // Filter to ensure only today's sales (after dayend if dayend exists)
          const cutoffDateTime = lastDayendTime ? new Date(lastDayendTime) : new Date(today + 'T00:00:00');
          
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
          
          // Calculate total sales and orders from valid sales
          statsData.totalSales = validSales.reduce((sum, sale) => {
            const total = sale.total || sale.net_total || sale.grand_total || sale.amount || sale.total_sales || 0;
            return sum + (parseFloat(total) || 0);
          }, 0);
          
          statsData.totalOrders = validSales.length;
          
          console.log('📊 Calculated daily sales:', {
            totalSales: statsData.totalSales,
            totalOrders: statsData.totalOrders,
            validSalesCount: validSales.length,
            hasDayend: !!lastDayendTime
          });
        }
      } catch (salesError) {
        console.error('Error fetching daily sales:', salesError);
        // Continue with other stats even if sales fetch fails
      }
      
      // Filter recent orders to only show orders from this branch and after dayend
      if (statsData.recentOrders && Array.isArray(statsData.recentOrders)) {
        const cutoffDateTime = lastDayendTime ? new Date(lastDayendTime) : new Date(today + 'T00:00:00');
        
        const filteredRecentOrders = statsData.recentOrders.filter(order => {
          if (!order) return false;
          
          // 1. Branch ID must match
          const orderBranchId = order.branch_id || order.branchId || order.branch_ID || order.BranchID;
          if (!orderBranchId) {
            return false;
          }
          const orderBranchIdStr = String(orderBranchId).trim();
          const currentBranchIdStr = String(branchId).trim();
          if (orderBranchIdStr !== currentBranchIdStr) {
            return false; // Not from this branch
          }
          
          // 2. Order must be created after the last dayend (if dayend exists)
          if (lastDayendTime) {
            const orderDate = order.created_at || order.date || order.order_date;
            if (!orderDate) {
              return false; // Can't verify date, exclude
            }
            const orderDateTime = new Date(orderDate);
            if (orderDateTime <= cutoffDateTime) {
              return false; // Order is before dayend, exclude
            }
          } else {
            // No dayend exists, only show today's orders
            const orderDate = order.created_at || order.date || order.order_date;
            if (!orderDate) {
              return false;
            }
            const orderDateStr = new Date(orderDate).toISOString().split('T')[0];
            if (orderDateStr !== today) {
              return false; // Not from today
            }
          }
          
          return true;
        });
        
        statsData.recentOrders = filteredRecentOrders;
      }
      
      logger.logDataFetch('Dashboard Stats', statsData, statsData.totalOrders);
      logger.success('Dashboard stats loaded successfully', statsData);
      
      setStats(statsData);
    } catch (error) {
      logger.error('Failed to fetch dashboard stats', { error: error.message, stack: error.stack });
      setStats({
        totalOrders: 0,
        totalSales: 0,
        totalMenuItems: 0,
        totalCategories: 0,
        recentOrders: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Sales',
      value: formatPKR(stats.totalSales),
      icon: TrendingUp,
      color: 'bg-green-500',
      textColor: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Menu Items',
      value: stats.totalMenuItems,
      icon: Utensils,
      color: 'bg-orange-500',
      textColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Categories',
      value: stats.totalCategories,
      icon: FolderOpen,
      color: 'bg-purple-500',
      textColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.pending;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Welcome to your restaurant management dashboard</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className={`${stat.bgColor} rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition`}
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
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF5F15]" />
              Recent Orders
            </h2>
            {loading ? (
              <p className="text-gray-500 text-center py-4">Loading orders...</p>
            ) : stats.recentOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent orders</p>
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.order_number}</p>
                      <p className="text-sm text-gray-500">
                        Table {order.table_number} - {formatPKR(order.total)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF5F15]" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
              <Link
                href="/dashboard/branch-admin/create-order"
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
              >
                <div className="flex justify-center mb-2">
                  <LayoutDashboard className="w-6 h-6 text-[#FF5F15]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Create Order</p>
              </Link>
              <Link
                href="/dashboard/branch-admin/category"
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
              >
                <div className="flex justify-center mb-2">
                  <FolderOpen className="w-6 h-6 text-[#FF5F15]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Categories</p>
              </Link>
              <Link
                href="/dashboard/branch-admin/menu"
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
              >
                <div className="flex justify-center mb-2">
                  <Utensils className="w-6 h-6 text-[#FF5F15]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Menu Items</p>
              </Link>
              <Link
                href="/dashboard/branch-admin/order"
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
              >
                <div className="flex justify-center mb-2">
                  <FileText className="w-6 h-6 text-[#FF5F15]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Orders</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
