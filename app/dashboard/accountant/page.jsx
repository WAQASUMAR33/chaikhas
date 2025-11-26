'use client';

/**
 * Accountant Dashboard Page
 * Main dashboard page for accountant role
 * Shows overview statistics and quick actions
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AccountantLayout from '@/components/accountant/AccountantLayout';
import Button from '@/components/ui/Button';
import { getToken, getRole } from '@/utils/api';
import { apiPost, getTerminal } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

export default function AccountantDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSales: 0,
    todayOrders: 0,
    todaySales: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify user has accountant role
    const token = getToken();
    const role = getRole();

    if (!token) {
      router.push('/login');
      return;
    }

    // Only accountant can access this page
    if (role !== 'accountant') {
      router.push('/dashboard');
      return;
    }

    fetchDashboardStats();
  }, [router]);

  /**
   * Fetch dashboard statistics
   */
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      console.log('Fetching dashboard stats with terminal:', terminal);
      const result = await apiPost('/get_dashboard_stats.php', { terminal });
      console.log('Dashboard stats API response:', result);
      
      let statsData = {};
      
      if (result.success && result.data) {
        // Handle multiple response structures
        if (result.data.success && result.data.data) {
          statsData = result.data.data;
        } else if (result.data.data && typeof result.data.data === 'object') {
          statsData = result.data.data;
        } else if (typeof result.data === 'object' && !Array.isArray(result.data)) {
          statsData = result.data;
        }
      }
      
      setStats({
        totalOrders: statsData.totalOrders || statsData.total_orders || 0,
        totalSales: statsData.totalSales || statsData.total_sales || 0,
        todayOrders: statsData.todayOrders || statsData.today_orders || 0,
        todaySales: statsData.todaySales || statsData.today_sales || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: PlusCircle,
      label: 'Create Order',
      description: 'Create a new order',
      path: '/dashboard/accountant/create-order',
      color: 'bg-[#FF5F15] hover:bg-[#FF6B2B]',
    },
    {
      icon: FileText,
      label: 'Order Management',
      description: 'View and manage orders',
      path: '/dashboard/accountant/orders',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
  ];

  return (
    <AccountantLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Accountant Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Welcome to your accountant management dashboard</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Orders */}
          <div className="bg-blue-50 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-blue-500 text-2xl sm:text-3xl font-bold">
                {loading ? '...' : stats.totalOrders}
              </div>
              <div className="text-blue-500 bg-white rounded-full p-2 sm:p-3">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">Total Orders</h3>
          </div>

          {/* Total Sales */}
          <div className="bg-green-50 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-green-500 text-2xl sm:text-3xl font-bold">
                {loading ? '...' : formatPKR(stats.totalSales)}
              </div>
              <div className="text-green-500 bg-white rounded-full p-2 sm:p-3">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">Total Sales</h3>
          </div>

          {/* Today Orders */}
          <div className="bg-purple-50 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-purple-500 text-2xl sm:text-3xl font-bold">
                {loading ? '...' : stats.todayOrders || 0}
              </div>
              <div className="text-purple-500 bg-white rounded-full p-2 sm:p-3">
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">Today's Orders</h3>
          </div>

          {/* Today Sales */}
          <div className="bg-orange-50 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-orange-500 text-2xl sm:text-3xl font-bold">
                {loading ? '...' : formatPKR(stats.todaySales || 0)}
              </div>
              <div className="text-orange-500 bg-white rounded-full p-2 sm:p-3">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">Today's Sales</h3>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF5F15]" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <Link
                    key={action.path}
                    href={action.path}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
                  >
                    <div className="flex justify-center mb-2">
                      <IconComponent className="w-6 h-6 text-[#FF5F15]" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">{action.label}</p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Information Card */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF5F15]" />
              Information
            </h2>
            <p className="text-gray-600 mb-4">
              As an Accountant, you can create orders and manage them with bill generation and payment processing.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Available Features:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Create new orders</li>
                <li>View and manage all orders</li>
                <li>Generate bills with discounts</li>
                <li>Process payments</li>
                <li>Print receipts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AccountantLayout>
  );
}

