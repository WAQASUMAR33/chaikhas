'use client';

/**
 * Order Taker Layout Component
 * Shared layout with sidebar navigation for order taker dashboard
 * Includes role protection and logout functionality
 * Uses Lucide icons throughout
 * Order Taker can ONLY create orders (no order management)
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  LogOut,
} from 'lucide-react';
import { getToken, getRole, getFullname, getUsername, clearAuth } from '@/utils/api';
import DashboardShell from '@/components/dashboard/DashboardShell';

/**
 * Sidebar Menu Items with Lucide icons for Order Taker
 * Order Taker can only create orders
 */
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/order-taker' },
  { icon: PlusCircle, label: 'Create Order', path: '/dashboard/order-taker/create-order' },
];

export default function OrderTakerLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Derive viewport and initial sidebar visibility (order taker keeps manual control on desktop resize)
    const run = () => {
      const initialMobile = window.innerWidth < 768;
      setIsMobile(initialMobile);
      if (!initialMobile) {
        setSidebarOpen(true);
      }
    };

    queueMicrotask(run);

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  // Display priority: fullname > username > role > 'Order Taker'
  const displayName = fullname || username || (role ? role.replace('_', ' ') : 'Order Taker');

  return (
    <DashboardShell
      menuItems={menuItems}
      pathname={pathname}
      portalTitle="Order Taker"
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      isMobile={isMobile}
      onNavLinkClick={handleLinkClick}
      userName={displayName}
      userSubtitle={role || 'Order Taker'}
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
