'use client';

/**
 * Accountant Layout Component
 * Shared layout with sidebar navigation for accountant dashboard
 * Includes role protection and logout functionality
 * Uses Lucide icons throughout
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  LogOut,
  Receipt,
  CheckCircle,
} from 'lucide-react';
import { getToken, getRole, getFullname, getUsername, clearAuth } from '@/utils/api';
import DashboardShell from '@/components/dashboard/DashboardShell';

/**
 * Sidebar Menu Items with Lucide icons for Accountant
 */
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/accountant' },
  { icon: PlusCircle, label: 'Create Order', path: '/dashboard/accountant/create-order' },
  { icon: FileText, label: 'Order Management', path: '/dashboard/accountant/orders' },
  { icon: Receipt, label: 'Expense Management', path: '/dashboard/accountant/expenses' },
  { icon: CheckCircle, label: 'Day End', path: '/dashboard/accountant/dayend' },
];

export default function AccountantLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
  }, [router]);

  /**
   * Handle logout
   */
  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const role = getRole();
  const fullname = getFullname();
  const username = getUsername();
  // Display priority: fullname > username > role > 'Accountant'
  const displayName = fullname || username || (role ? role.replace('_', ' ') : 'Accountant');

  return (
    <DashboardShell
      menuItems={menuItems}
      pathname={pathname}
      portalTitle="Accountant"
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      isMobile={isMobile}
      onNavLinkClick={handleLinkClick}
      userName={displayName}
      userSubtitle={role || 'Accountant'}
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
