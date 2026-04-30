'use client';

/**
 * Admin Layout Component
 * Shared layout with sidebar navigation for all admin pages
 * Includes role protection and logout functionality
 * Uses Lucide icons throughout
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
  FileBarChart,
  Clock,
  Bug,
} from 'lucide-react';
import { getToken, getRole, getFullname, getUsername, getBranchName, getBranchId, clearAuth, apiGet } from '@/utils/api';
import LogPanel from '@/components/ui/LogPanel';
import { useLogger } from '@/hooks/useLogger';
import DashboardShell from '@/components/dashboard/DashboardShell';

/**
 * Sidebar Menu Items with Lucide icons
 */
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/branch-admin' },
  { icon: PlusCircle, label: 'Create Order', path: '/dashboard/branch-admin/create-order' },
  { icon: FolderOpen, label: 'Categories', path: '/dashboard/branch-admin/category' },
  { icon: Utensils, label: 'Menu', path: '/dashboard/branch-admin/menu' },
  { icon: ChefHat, label: 'Kitchen', path: '/dashboard/branch-admin/kitchen' },
  { icon: Printer, label: 'Printers', path: '/dashboard/branch-admin/printer' },
  { icon: FileText, label: 'Orders', path: '/dashboard/branch-admin/order' },
  { icon: TrendingUp, label: 'Sales List', path: '/dashboard/branch-admin/sales' },
  { icon: FileBarChart, label: 'Sales Report', path: '/dashboard/branch-admin/sales-report' },
  { icon: BarChart3, label: 'Menu Sales', path: '/dashboard/branch-admin/menu-sales' },
  { icon: Receipt, label: 'Expenses', path: '/dashboard/branch-admin/expenses' },
  { icon: Clock, label: 'Day End', path: '/dashboard/branch-admin/dayend' },
  { icon: Building2, label: 'Halls', path: '/dashboard/branch-admin/halls' },
  { icon: Table2, label: 'Tables', path: '/dashboard/branch-admin/tables' },
  { icon: Users, label: 'Customers', path: '/dashboard/branch-admin/customers' },
  { icon: Users, label: 'Accounts', path: '/dashboard/branch-admin/accounts' },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Closed by default on mobile
  const [isMobile, setIsMobile] = useState(false);
  const [logPanelOpen, setLogPanelOpen] = useState(false);
  const { logs, clearLogs } = useLogger();

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

  const [branchName, setBranchName] = useState(null);

  useEffect(() => {
    // Verify user has admin role
    const token = getToken();
    const role = getRole();

    if (!token) {
      router.push('/login');
      return;
    }

    // Check for branch admin roles (branch_admin, admin, Administrator, Admin, etc.)
    const adminRoles = ['branch_admin', 'admin', 'Administrator', 'Admin'];
    if (!adminRoles.includes(role)) {
      router.push('/dashboard');
      return;
    }

    // Fetch branch name if not in localStorage but branch_id exists
    const storedBranchName = getBranchName();
    const branchId = getBranchId();

    if (!storedBranchName && branchId) {
      // Try to fetch branch name from API
      const fetchBranchName = async () => {
        try {
          const result = await apiGet('/branch_management.php');
          if (result.success && result.data) {
            const branches = Array.isArray(result.data) ? result.data : (result.data.data || []);
            const branch = branches.find(b => parseInt(b.branch_id) === branchId);
            if (branch && branch.branch_name) {
              // Save to localStorage for future use
              if (typeof window !== 'undefined') {
                localStorage.setItem('branch_name', branch.branch_name);
              }
              setBranchName(branch.branch_name);
            }
          }
        } catch (error) {
          console.error('Error fetching branch name:', error);
        }
      };
      fetchBranchName();
    }
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

  const role = getRole();
  const fullname = getFullname();
  const username = getUsername();
  // Use state branchName if available, otherwise fallback to localStorage
  // Ensure branchName is a string, not boolean
  const storedBranchName = getBranchName();
  const displayBranchName = (branchName && typeof branchName === 'string') ? branchName : (storedBranchName && typeof storedBranchName === 'string' ? storedBranchName : null);
  // Display priority: fullname > username > role > 'User'
  // Ensure we never display boolean values
  const displayName = (fullname && typeof fullname === 'string') ? fullname :
                      (username && typeof username === 'string') ? username :
                      (role && typeof role === 'string') ? role.replace('_', ' ') :
                      'User';

  const userSubtitle =
    displayBranchName && typeof displayBranchName === 'string'
      ? `${displayBranchName} • ${role || 'Admin'}`
      : (role && typeof role === 'string' ? role : 'Admin');

  return (
    <>
      <DashboardShell
        menuItems={menuItems}
        pathname={pathname}
        portalTitle="Branch Admin"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        onNavLinkClick={handleLinkClick}
        userName={displayName}
        userSubtitle={userSubtitle}
        headerActions={
          <>
            <button
              type="button"
              onClick={() => setLogPanelOpen(!logPanelOpen)}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors flex items-center gap-1 sm:gap-2 relative shadow-sm"
              title="Developer Logs"
            >
              <Bug className="w-4 h-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Logs</span>
              {logs.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-bold tabular-nums">
                  {logs.length > 99 ? '99+' : logs.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors flex items-center gap-1 sm:gap-2 shadow-sm"
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </>
        }
      >
        {children}
      </DashboardShell>

      <LogPanel
        isOpen={logPanelOpen}
        onClose={() => setLogPanelOpen(false)}
        logs={logs}
        onClear={clearLogs}
      />
    </>
  );
}
