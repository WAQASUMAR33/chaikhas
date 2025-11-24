'use client';

/**
 * Order Taker Dashboard Page
 * Main dashboard page for order_taker role
 * Order Taker can ONLY create orders
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OrderTakerLayout from '@/components/order-taker/OrderTakerLayout';
import Button from '@/components/ui/Button';
import { getToken, getRole } from '@/utils/api';
import { apiPost, getTerminal } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { 
  LayoutDashboard, 
  PlusCircle, 
  TrendingUp,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

export default function OrderTakerDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    todayOrders: 0,
    todaySales: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify user has order_taker role
    const token = getToken();
    const role = getRole();

    if (!token) {
      router.push('/login');
      return;
    }

    // Only order_taker can access this page
    if (role !== 'order_taker') {
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
      const result = await apiPost('/get_dashboard_stats.php', { terminal });
      
      if (result.success && result.data && result.data.success) {
        const data = result.data.data || {};
        setStats({
          todayOrders: data.todayOrders || 0,
          todaySales: data.todaySales || 0,
        });
      }
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
      path: '/dashboard/order-taker/create-order',
      color: 'bg-[#FF5F15] hover:bg-[#FF6B2B]',
    },
  ];

  return (
    <OrderTakerLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Order Taker Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Welcome to your order taker dashboard</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="grid grid-cols-1 gap-3">
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
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF5F15]" />
              Order Creation Process
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Select the order type (Dine In, Take Away, or Delivery)</li>
                <li>Choose hall and table (for Dine In orders)</li>
                <li>Browse menu items and add them to cart</li>
                <li>Review cart and add any special comments</li>
                <li>Place the order and print receipt</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </OrderTakerLayout>
  );
}
