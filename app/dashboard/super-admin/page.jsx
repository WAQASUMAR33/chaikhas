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
import { LayoutDashboard, FileText, TrendingUp, Utensils, FolderOpen, Clock, Building2, Network, Filter, Eye } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

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
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('all'); // 'all' or specific branch_id
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [orderDetailsModal, setOrderDetailsModal] = useState({ open: false, order: null });

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
      fetchRecentOrders();
    }
  }, [selectedBranchId, authChecked, branches.length]);

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
   * Fetch recent orders from all branches or filtered by branch
   */
  const fetchRecentOrders = async () => {
    try {
      const terminal = getTerminal();
      const params = { terminal };
      
      // Add branch_id filter if specific branch is selected
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.branch_id = selectedBranchId;
      }
      
      console.log('Fetching recent orders with params:', params);
      
      // Fetch orders from order_management.php
      const result = await apiGet('api/order_management.php', params);
      
      console.log('Recent orders API response:', result);
      
      let ordersData = [];
      
      // Handle multiple possible response structures
      if (result.data && Array.isArray(result.data)) {
        ordersData = result.data;
      } else if (result.data && result.data.data && Array.isArray(result.data.data)) {
        ordersData = result.data.data;
      } else if (result.data && result.data.orders && Array.isArray(result.data.orders)) {
        ordersData = result.data.orders;
      } else if (result.data && result.data.success && Array.isArray(result.data.data)) {
        ordersData = result.data.data;
      }
      
      // Sort by created_at descending and take first 10
      ordersData = ordersData
        .sort((a, b) => {
          const dateA = new Date(a.created_at || a.date || 0);
          const dateB = new Date(b.created_at || b.date || 0);
          return dateB - dateA;
        })
        .slice(0, 10);
      
      // Enrich orders with branch information
      // First, log what we have for debugging
      console.log('📊 Enriching orders with branch information');
      console.log('Orders count:', ordersData.length);
      console.log('Branches count:', branches.length);
      console.log('Sample order branch_id:', ordersData[0]?.branch_id || ordersData[0]?.branchId);
      console.log('Sample branches:', branches.slice(0, 3).map(b => ({ id: b.branch_id || b.id, name: b.branch_name || b.name })));
      
      const enrichedOrders = ordersData.map(order => {
        // Try multiple field names for branch_id
        const branchId = order.branch_id || order.branchId || order.branch_ID || order.BranchID;
        
        // Try to find branch by multiple ID field names
        let branch = null;
        if (branchId) {
          branch = branches.find(b => 
            (b.branch_id && b.branch_id == branchId) ||
            (b.id && b.id == branchId) ||
            (b.branch_ID && b.branch_ID == branchId) ||
            (b.ID && b.ID == branchId)
          );
        }
        
        // Get branch name from multiple possible fields
        const branchName = branch 
          ? (branch.branch_name || branch.name || branch.branchName || branch.BranchName || 'Unknown Branch')
          : (order.branch_name || order.branchName || (branchId ? `Branch ${branchId}` : 'Unknown Branch'));
        
        if (!branch && branchId) {
          console.warn(`⚠️ Branch not found for branch_id: ${branchId}`, {
            order_id: order.order_id || order.id,
            available_branch_ids: branches.map(b => b.branch_id || b.id)
          });
        }
        
        return {
          ...order,
          branch_name: branchName,
          branch_id: branchId || order.branch_id || order.branchId,
        };
      });
      
      setStats(prev => ({
        ...prev,
        recentOrders: enrichedOrders,
      }));
      
      console.log('✅ Recent orders loaded:', enrichedOrders.length);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      setStats(prev => ({
        ...prev,
        recentOrders: [],
      }));
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
      
      // Fetch stats and orders after branches are loaded
      fetchDashboardStats();
      fetchRecentOrders();
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF5F15]" />
                Recent Orders
              </h2>
              <Link 
                href="/dashboard/super-admin/order"
                className="text-sm text-[#FF5F15] hover:underline"
              >
                View All
              </Link>
            </div>
            {loading ? (
              <p className="text-gray-500 text-center py-4">Loading orders...</p>
            ) : stats.recentOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent orders</p>
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map((order, index) => (
                  <div 
                    key={order.id || order.order_id || index} 
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    onClick={() => setOrderDetailsModal({ open: true, order })}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900">
                            {order.order_number || `Order #${order.order_id || order.id || index + 1}`}
                          </p>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {order.status || 'Pending'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span className="font-medium text-[#FF5F15]">{order.branch_name || 'Unknown Branch'}</span>
                          </p>
                          {order.order_type && (
                            <p className="text-xs text-gray-500">Type: {order.order_type}</p>
                          )}
                          {order.hall_name && (
                            <p className="text-xs text-gray-500">Hall: {order.hall_name}</p>
                          )}
                          {order.table_number && (
                            <p className="text-xs text-gray-500">Table: {order.table_number}</p>
                          )}
                          {order.order_taker_name && (
                            <p className="text-xs text-gray-500">Order Taker: {order.order_taker_name}</p>
                          )}
                          {order.created_at && (
                            <p className="text-xs text-gray-400">{formatDateTime(order.created_at)}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-bold text-[#FF5F15]">
                          {formatPKR(order.total || order.net_total || order.grand_total || 0)}
                        </p>
                        <button className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          View Details
                        </button>
                      </div>
                    </div>
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

        {/* Order Details Modal */}
        <Modal
          isOpen={orderDetailsModal.open}
          onClose={() => setOrderDetailsModal({ open: false, order: null })}
          title={`Order Details - ${orderDetailsModal.order?.order_number || `#${orderDetailsModal.order?.order_id || 'N/A'}`}`}
        >
          {orderDetailsModal.order && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Order ID</p>
                  <p className="text-base font-semibold text-gray-900">
                    {orderDetailsModal.order.order_id || orderDetailsModal.order.id || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(orderDetailsModal.order.status)}`}>
                    {orderDetailsModal.order.status || 'Pending'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Branch</p>
                  <p className="text-base font-semibold text-[#FF5F15]">
                    {orderDetailsModal.order.branch_name || 'Unknown Branch'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Order Type</p>
                  <p className="text-base text-gray-900">
                    {orderDetailsModal.order.order_type || 'N/A'}
                  </p>
                </div>
                {orderDetailsModal.order.hall_name && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Hall</p>
                    <p className="text-base text-gray-900">
                      {orderDetailsModal.order.hall_name}
                    </p>
                  </div>
                )}
                {orderDetailsModal.order.table_number && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Table</p>
                    <p className="text-base text-gray-900">
                      {orderDetailsModal.order.table_number}
                    </p>
                  </div>
                )}
                {orderDetailsModal.order.order_taker_name && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Order Taker</p>
                    <p className="text-base text-gray-900">
                      {orderDetailsModal.order.order_taker_name}
                    </p>
                  </div>
                )}
                {orderDetailsModal.order.created_at && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created At</p>
                    <p className="text-base text-gray-900">
                      {formatDateTime(orderDetailsModal.order.created_at)}
                    </p>
                  </div>
                )}
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-500 mb-2">Total Amount</p>
                <p className="text-2xl font-bold text-[#FF5F15]">
                  {formatPKR(orderDetailsModal.order.total || orderDetailsModal.order.net_total || orderDetailsModal.order.grand_total || 0)}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setOrderDetailsModal({ open: false, order: null })}
                >
                  Close
                </Button>
                <Link href={`/dashboard/super-admin/order?order_id=${orderDetailsModal.order.order_id || orderDetailsModal.order.id}`}>
                  <Button>
                    View Full Details
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}
