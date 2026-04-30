'use client';

/**
 * Super Admin Layout Component
 * Shared layout with sidebar navigation for all super admin pages
 * Includes role protection and logout functionality
 * Similar to AdminLayout but with Branches management added
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Utensils,
  ChefHat,
  Printer,
  FileText,
  TrendingUp,
  BarChart3,
  Receipt,
  Table2,
  Building2,
  Users,
  LogOut,
  PlusCircle,
  Network,
  FileBarChart,
  Clock,
} from 'lucide-react';
import { getToken, getRole, getFullname, getUsername, clearAuth } from '@/utils/api';
import DashboardShell from '@/components/dashboard/DashboardShell';

/**
 * Sidebar Menu Items with Lucide icons
 * Includes all admin features + Branches management
 */
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/super-admin' },
  { icon: Network, label: 'Branches', path: '/dashboard/super-admin/branches' },
  { icon: PlusCircle, label: 'Create Order', path: '/dashboard/super-admin/create-order' },
  { icon: FolderOpen, label: 'Categories', path: '/dashboard/super-admin/category' },
  { icon: Utensils, label: 'Menu', path: '/dashboard/super-admin/menu' },
  { icon: ChefHat, label: 'Kitchen', path: '/dashboard/super-admin/kitchen' },
  { icon: Printer, label: 'Printers', path: '/dashboard/super-admin/printer' },
  { icon: FileText, label: 'Orders', path: '/dashboard/super-admin/order' },
  { icon: TrendingUp, label: 'Sales List', path: '/dashboard/super-admin/sales' },
  { icon: FileBarChart, label: 'Sales Report', path: '/dashboard/super-admin/sales-report' },
  { icon: BarChart3, label: 'Menu Sales', path: '/dashboard/super-admin/menu-sales' },
  { icon: Receipt, label: 'Expenses', path: '/dashboard/super-admin/expenses' },
  { icon: Clock, label: 'Day End', path: '/dashboard/super-admin/dayend' },
  { icon: Building2, label: 'Halls', path: '/dashboard/super-admin/halls' },
  { icon: Table2, label: 'Tables', path: '/dashboard/super-admin/tables' },
  { icon: Users, label: 'Customers', path: '/dashboard/super-admin/customers' },
  { icon: Users, label: 'Users', path: '/dashboard/super-admin/accounts' },
];

export default function SuperAdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Closed by default on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true); // Open on desktop
      } else {
        setSidebarOpen(false); // Closed on mobile
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Only check on client side
    if (typeof window === 'undefined') return;

    // Verify user is super_admin
    const token = getToken();
    const role = getRole();

    console.log('SuperAdminLayout - Auth Check:', {
      token: token ? 'Present' : 'Missing',
      role: role || 'Missing',
      expectedRole: 'super_admin'
    });

    if (!token) {
      console.log('SuperAdminLayout: No token found, redirecting to login');
      router.push('/login');
      return;
    }

    // Normalize role for comparison
    const normalizedRole = role?.toLowerCase().trim();

    // Only super_admin can access
    if (normalizedRole !== 'super_admin') {
      console.log('SuperAdminLayout: Role mismatch, redirecting to dashboard. Role:', role);
      router.push('/dashboard');
      return;
    }

    console.log('SuperAdminLayout: Auth check passed');
  }, [router]);

  /**
   * Handle logout
   */
  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  /**
   * Close sidebar on mobile when clicking outside or on a link
   */
  const handleLinkClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const fullname = getFullname();
  const username = getUsername();
  // Display priority: fullname > username > 'Super Admin'
  // Ensure we never display boolean values
  const displayName = (fullname && typeof fullname === 'string') ? fullname :
                      (username && typeof username === 'string') ? username :
                      'Super Admin';

  return (
    <DashboardShell
      menuItems={menuItems}
      pathname={pathname}
      portalTitle="Super Admin"
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      isMobile={isMobile}
      onNavLinkClick={handleLinkClick}
      userName={displayName}
      userSubtitle="Super Admin"
      headerActions={
        <button
          type="button"
          onClick={handleLogout}
          className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors flex items-center gap-1 sm:gap-2 shadow-sm"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Logout</span>
        </button>
      }
    >
      {children}
    </DashboardShell>
  );
}
