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
import { getToken, getRole, getBranchId } from '@/utils/api';
import { apiPost, getTerminal } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  TrendingUp,
  Receipt,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

/**
 * Fetch the last dayend closing_date_time for the current branch
 * Returns the closing_date_time if dayend exists, null otherwise
 */
const fetchLastDayend = async (branchId) => {
  try {
    if (!branchId) {
      return null; // No branch ID, cannot fetch dayend
    }
    
    const result = await apiPost('api/get_dayend.php', {
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
   * Get today's date in YYYY-MM-DD format
   */
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Fetch dashboard statistics
   * Sales are filtered to only show sales created after the last dayend closing_date_time
   * If no dayend exists, shows only today's sales - resets at day end
   * Client-side filtering ensures sales reset even if API doesn't filter properly
   */
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      const branchId = getBranchId(); // Get branch ID if accountant has one
      const today = getTodayDate();
      
      // Get the last dayend closing_date_time for this branch (if branch_id exists)
      let lastDayendTime = null;
      if (branchId) {
        lastDayendTime = await fetchLastDayend(branchId);
        if (lastDayendTime) {
          console.log('📅 Found dayend, filtering sales after:', lastDayendTime);
        } else {
          console.log('📅 No dayend found, will filter by today only');
        }
      }
      
      // Prepare API parameters with dayend filtering
      const apiParams = { terminal, date: today };
      if (branchId) {
        apiParams.branch_id = branchId;
      }
      if (lastDayendTime) {
        apiParams.after_closing_date = lastDayendTime;
      }
      
      // PRIMARY METHOD: Fetch sales from bills directly (more accurate than orders)
      // Sales should come from bills, not orders
      let totalSales = 0;
      let totalOrders = 0;
      let todaySales = 0;
      let todayOrders = 0;
      
      try {
        const billsParams = {
          terminal,
          date: today,
        };
        if (branchId) {
          billsParams.branch_id = branchId;
        }
        if (lastDayendTime) {
          billsParams.after_closing_date = lastDayendTime;
        }
        
        console.log('📊 Fetching bills for accurate sales calculation:', billsParams);
        const billsResult = await apiPost('/api/bills_management.php', { action: 'get', ...billsParams });
        
        if (billsResult.success && billsResult.data) {
          let billsList = [];
          if (Array.isArray(billsResult.data)) {
            billsList = billsResult.data;
          } else if (billsResult.data.data && Array.isArray(billsResult.data.data)) {
            billsList = billsResult.data.data;
          } else if (billsResult.data.bills && Array.isArray(billsResult.data.bills)) {
            billsList = billsResult.data.bills;
          }
          
          if (billsList.length > 0) {
            // Filter bills to only include today's bills (after dayend if dayend exists)
            const todayStart = lastDayendTime ? new Date(lastDayendTime) : new Date(today + 'T00:00:00');
            const todayEnd = new Date();
            
            const todayBillsList = billsList.filter(bill => {
              if (!bill) return false;
              
              const billDate = bill.created_at || bill.bill_date || bill.date || bill.created_date || bill.bill_created_at;
              if (!billDate) return false;
              
              const billDateTime = new Date(billDate);
              if (isNaN(billDateTime.getTime())) return false;
              
              return billDateTime >= todayStart && billDateTime <= todayEnd;
            });
            
            if (todayBillsList.length > 0) {
              // Count unique orders from bills
              const uniqueOrderIds = new Set(todayBillsList.map(bill => bill.order_id || bill.order_ID || bill.orderId).filter(Boolean));
              todayOrders = uniqueOrderIds.size || todayBillsList.length;
              
              // Calculate sales from bills - use grand_total, net_total, or total
              todaySales = todayBillsList.reduce((sum, bill) => {
                const billTotal = parseFloat(
                  bill.grand_total || 
                  bill.net_total || 
                  bill.total || 
                  bill.amount || 
                  bill.total_amount ||
                  bill.bill_amount ||
                  bill.paid_amount ||
                  0
                );
                return sum + billTotal;
              }, 0);
              
              // Update totals to match today's values
              totalOrders = todayOrders;
              totalSales = todaySales;
              
              console.log('📊 ✅ Successfully calculated sales from bills:', {
                todayOrders,
                todaySales,
                billsCount: todayBillsList.length
              });
            }
          }
        }
      } catch (billsError) {
        console.error('📊 Error fetching bills for sales:', billsError);
        // Continue to fallback method
      }
      
      // FALLBACK: If bills method didn't work, try dashboard stats API
      if (todaySales === 0 && todayOrders === 0) {
        console.log('📊 Bills method returned no data, trying dashboard stats API...');
        console.log('Fetching dashboard stats with params:', apiParams);
        const result = await apiPost('/get_dashboard_stats.php', apiParams);
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
        
        console.log('📊 Raw statsData from API:', statsData);
        
        // Extract values from API response - handle various field name formats
        totalSales = parseFloat(statsData.totalSales || statsData.total_sales || statsData.sales || 0);
        totalOrders = parseInt(statsData.totalOrders || statsData.total_orders || statsData.orders || 0);
        
        // Try to get today-specific values, or calculate from recent orders
        todaySales = parseFloat(statsData.todaySales || statsData.today_sales || statsData.daily_sales || 0);
        todayOrders = parseInt(statsData.todayOrders || statsData.today_orders || statsData.daily_orders || 0);
        
        // If todayOrders/todaySales are not provided, try to calculate from recent orders
        // Check if there's a recentOrders array we can use
        const recentOrders = statsData.recentOrders || statsData.recent_orders || statsData.orders || [];
        
        if (Array.isArray(recentOrders) && recentOrders.length > 0) {
          console.log('📊 Found recentOrders array, calculating today\'s stats from orders');
          
          // Filter orders to only include today's orders (after dayend if dayend exists)
          const todayStart = lastDayendTime ? new Date(lastDayendTime) : new Date(today + 'T00:00:00');
          const todayEnd = new Date();
          
          const todayOrdersList = recentOrders.filter(order => {
            if (!order) return false;
            
            const orderDate = order.created_at || order.date || order.order_date || order.created_date;
            if (!orderDate) return false;
            
            const orderDateTime = new Date(orderDate);
            return orderDateTime >= todayStart && orderDateTime <= todayEnd;
          });
          
          // Calculate today's orders and sales from filtered orders
          // Note: Sales should ideally come from bills, but we'll use orders as fallback
          if (todayOrdersList.length > 0) {
            todayOrders = todayOrdersList.length;
            // Try to get sales from bills if available, otherwise use order totals
            todaySales = todayOrdersList.reduce((sum, order) => {
              // Prefer bill amount if available, otherwise use order total
              const orderTotal = parseFloat(
                order.bill_amount ||
                order.grand_total ||
                order.net_total ||
                order.total || 
                order.g_total_amount || 
                order.net_total_amount || 
                order.amount || 
                0
              );
              return sum + orderTotal;
            }, 0);
            
            console.log('📊 Calculated from recentOrders:', {
              todayOrders,
              todaySales,
              ordersCount: todayOrdersList.length
            });
          }
        }
        
        // FALLBACK: If todayOrders/todaySales are still 0 but we have totalOrders/totalSales,
        // and the API was called with after_closing_date, assume totals are today's values
        if (todayOrders === 0 && todaySales === 0 && totalOrders > 0 && lastDayendTime) {
          // API filtered by after_closing_date, so totals should be today's values
          todayOrders = totalOrders;
          todaySales = totalSales;
          console.log('📊 Fallback: Using totalOrders/totalSales as today\'s values (API filtered by dayend)');
        } else if (todayOrders === 0 && todaySales === 0 && totalOrders > 0 && !lastDayendTime) {
          // No dayend, so if totals exist and today's values are 0, use totals as today's values
          todayOrders = totalOrders;
          todaySales = totalSales;
          console.log('📊 Fallback: Using totalOrders/totalSales as today\'s values (no dayend)');
        }
      }
      
      // ADDITIONAL FALLBACK: If still no data, try fetching bills directly (sales should come from bills, not orders)
      if (todayOrders === 0 && todaySales === 0 && (totalOrders === 0 || !totalOrders)) {
        console.log('📊 No data from dashboard stats, attempting to fetch bills directly for accurate sales...');
        try {
          const billsParams = {
            terminal,
            date: today,
          };
          if (branchId) {
            billsParams.branch_id = branchId;
          }
          if (lastDayendTime) {
            billsParams.after_closing_date = lastDayendTime;
          }
          
          const billsResult = await apiPost('/api/bills_management.php', { action: 'get', ...billsParams });
          console.log('📊 Direct bills fetch response:', billsResult);
          
          if (billsResult.success && billsResult.data) {
            let billsList = [];
            if (Array.isArray(billsResult.data)) {
              billsList = billsResult.data;
            } else if (billsResult.data.data && Array.isArray(billsResult.data.data)) {
              billsList = billsResult.data.data;
            } else if (billsResult.data.bills && Array.isArray(billsResult.data.bills)) {
              billsList = billsResult.data.bills;
            }
            
            if (billsList.length > 0) {
              // Filter bills to only include today's bills (after dayend if dayend exists)
              const todayStart = lastDayendTime ? new Date(lastDayendTime) : new Date(today + 'T00:00:00');
              const todayEnd = new Date();
              
              const todayBillsList = billsList.filter(bill => {
                if (!bill) return false;
                
                const billDate = bill.created_at || bill.bill_date || bill.date || bill.created_date || bill.bill_created_at;
                if (!billDate) return false;
                
                const billDateTime = new Date(billDate);
                if (isNaN(billDateTime.getTime())) return false;
                
                return billDateTime >= todayStart && billDateTime <= todayEnd;
              });
              
              if (todayBillsList.length > 0) {
                // Count unique orders from bills
                const uniqueOrderIds = new Set(todayBillsList.map(bill => bill.order_id || bill.order_ID || bill.orderId).filter(Boolean));
                todayOrders = uniqueOrderIds.size || todayBillsList.length;
                
                // Calculate sales from bills - use grand_total, net_total, or total
                todaySales = todayBillsList.reduce((sum, bill) => {
                  const billTotal = parseFloat(
                    bill.grand_total || 
                    bill.net_total || 
                    bill.total || 
                    bill.amount || 
                    bill.total_amount ||
                    bill.bill_amount ||
                    bill.paid_amount ||
                    0
                  );
                  return sum + billTotal;
                }, 0);
                
                // Update totals to match today's values
                totalOrders = todayOrders;
                totalSales = todaySales;
                
                console.log('📊 ✅ Successfully fetched today\'s bills directly:', {
                  todayOrders,
                  todaySales,
                  billsCount: todayBillsList.length
                });
              }
            }
          }
        } catch (billsError) {
          console.error('📊 Error fetching bills directly:', billsError);
          // Continue with existing values (0)
        }
      }
      
      // Apply dayend filtering: if dayend exists, only show sales after dayend
      if (lastDayendTime) {
        console.log('📅 Dayend exists, filtering sales after:', lastDayendTime);
        
        // If todayOrders is 0, there are no orders after dayend - reset everything
        if (todayOrders === 0) {
          totalSales = 0;
          todaySales = 0;
          totalOrders = 0;
          console.log('📅 ✅ No orders after dayend - all stats reset to 0');
        } else {
          // There are orders after dayend - total should match today (since dayend was marked)
          totalSales = todaySales;
          totalOrders = todayOrders;
          console.log('📅 ✅ Orders exist after dayend - using today\'s values');
        }
      }
      
      console.log('📊 Final stats to display:', {
        totalOrders,
        totalSales,
        todayOrders,
        todaySales,
        hasDayend: !!lastDayendTime,
        dayendTime: lastDayendTime || 'None'
      });
      
      setStats({
        totalOrders,
        totalSales,
        todayOrders,
        todaySales,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set to 0 on error to ensure no stale data
      setStats({
        totalOrders: 0,
        totalSales: 0,
        todayOrders: 0,
        todaySales: 0,
      });
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
    {
      icon: Receipt,
      label: 'Expense Management',
      description: 'Add and manage expenses',
      path: '/dashboard/accountant/expenses',
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      icon: CheckCircle,
      label: 'Day End',
      description: 'Manage day-end records',
      path: '/dashboard/accountant/dayend',
      color: 'bg-purple-600 hover:bg-purple-700',
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
              As an Accountant, you can create orders, manage expenses, handle day-end operations, and process payments.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Available Features:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Create new orders</li>
                <li>View and manage all orders</li>
                <li>Add and manage expenses</li>
                <li>Manage day-end records</li>
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

