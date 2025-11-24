'use client';

/**
 * Admin Layout Component
 * Shared layout with sidebar navigation for all admin pages
 * Includes role protection and logout functionality
 * Uses Lucide icons throughout
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
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
  Menu,
  X,
  LogOut,
  PlusCircle,
  ShoppingCart,
  Settings
} from 'lucide-react';
import { getToken, getRole, getFullname, getUsername, getBranchName, getBranchId, clearAuth, apiGet } from '@/utils/api';

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
  { icon: BarChart3, label: 'Menu Sales', path: '/dashboard/branch-admin/menu-sales' },
  { icon: Receipt, label: 'Expenses', path: '/dashboard/branch-admin/expenses' },
  { icon: Building2, label: 'Halls', path: '/dashboard/branch-admin/halls' },
  { icon: Table2, label: 'Tables', path: '/dashboard/branch-admin/tables' },
  { icon: Users, label: 'Accounts', path: '/dashboard/branch-admin/accounts' },
];

export default function AdminLayout({ children }) {
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
    } else if (storedBranchName) {
      setBranchName(storedBranchName);
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

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          sidebarOpen && !isMobile ? 'w-64' : isMobile ? 'w-64' : 'w-20'
        } bg-white shadow-lg transition-all duration-300 ease-in-out fixed h-screen z-50 lg:z-30`}
      >
        {/* Logo / Toggle Button */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E0E0E0]">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-[#FF5F15]">Branch Admin</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-4 px-2 overflow-y-auto h-[calc(100vh-4rem)]">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all duration-200 ${
                  isActive
                    ? 'bg-[#FF5F15] text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={!sidebarOpen && !isMobile ? item.label : ''}
              >
                <IconComponent className="w-5 h-5 flex-shrink-0" />
                {(sidebarOpen || isMobile) && (
                  <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 w-full ${sidebarOpen && !isMobile ? 'lg:ml-64' : !isMobile ? 'lg:ml-20' : ''}`}>
        {/* Top Header Bar */}
        <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">
                  {menuItems.find((item) => item.path === pathname)?.label || 'Dashboard'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* User Info - Hidden on mobile */}
              <div className="hidden sm:flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FF5F15] rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                {!isMobile && (
                  <div className="text-sm min-w-0">
                    <p className="font-medium text-gray-800 truncate max-w-[120px] sm:max-w-[150px]" title={displayName}>
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize truncate">
                      {displayBranchName && typeof displayBranchName === 'string' 
                        ? `${displayBranchName} • ${role || 'Admin'}` 
                        : (role && typeof role === 'string' ? role : 'Admin')}
                    </p>
                  </div>
                )}
              </div>
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition flex items-center gap-1 sm:gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
