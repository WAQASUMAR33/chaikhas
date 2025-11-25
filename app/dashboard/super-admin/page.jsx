'use client';

/**
 * Super Admin Dashboard Main Page
 * Overview and statistics for super admin users
 * Similar to admin dashboard but with branch management
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { apiGet, apiPost, getTerminal, getToken, getRole } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { LayoutDashboard, FileText, TrendingUp, Utensils, FolderOpen, Clock, Building2, Network } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSales: 0,
    totalMenuItems: 0,
    totalCategories: 0,
    totalBranches: 0,
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

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
    fetchDashboardStats();
    fetchBranches();
  }, [router]);

  /**
   * Fetch dashboard statistics from API
   */
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      const result = await apiGet('/get_dashboard_stats.php', { terminal });
      
      if (result.success && result.data) {
        setStats(prev => ({
          ...prev,
          totalOrders: result.data.totalOrders || 0,
          totalSales: result.data.totalSales || 0,
          totalMenuItems: result.data.totalMenuItems || 0,
          totalCategories: result.data.totalCategories || 0,
          recentOrders: result.data.recentOrders || [],
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch branches count
   */
  const fetchBranches = async () => {
    try {
      const result = await apiGet('/branch_management.php');
      if (result.success && result.data) {
        const branches = Array.isArray(result.data) ? result.data : (result.data.data || []);
        setStats(prev => ({
          ...prev,
          totalBranches: branches.length
        }));
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
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

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status?.toLowerCase()] || colors.pending;
  };

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
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Super Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Manage all branches and view global analytics</p>
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
                {stats.recentOrders.map((order, index) => (
                  <div key={order.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.order_number || `Order #${order.order_id || index + 1}`}</p>
                      <p className="text-sm text-gray-500">
                        {order.table_number ? `Table ${order.table_number} - ` : ''}{formatPKR(order.total || 0)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status || 'Pending'}
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
