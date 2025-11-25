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

  /**
   * Fetch dashboard statistics from API
   * API: get_dashboard_stats.php (POST with terminal and branch_id parameter)
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
      
      console.log('=== Fetching Dashboard Stats (Branch Admin) ===');
      console.log('Params:', { terminal, branch_id: branchId });
      
      const result = await apiPost('/get_dashboard_stats.php', { 
        terminal,
        branch_id: branchId 
      });
      
      console.log('Dashboard stats response:', result);
      
      if (result.success && result.data) {
        setStats({
          totalOrders: result.data.totalOrders || result.data.total_orders || 0,
          totalSales: result.data.totalSales || result.data.total_sales || 0,
          totalMenuItems: result.data.totalMenuItems || result.data.total_menu_items || 0,
          totalCategories: result.data.totalCategories || result.data.total_categories || 0,
          recentOrders: result.data.recentOrders || result.data.recent_orders || [],
        });
      } else {
        // If API returns empty or error, set defaults
        setStats({
          totalOrders: 0,
          totalSales: 0,
          totalMenuItems: 0,
          totalCategories: 0,
          recentOrders: [],
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
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
