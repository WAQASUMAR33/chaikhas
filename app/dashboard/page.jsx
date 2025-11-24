'use client';

/**
 * Dashboard Router Page
 * Reads token and role from localStorage
 * Redirects users to appropriate dashboard based on role
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getRole } from '@/utils/api';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Only check on client side
    if (typeof window === 'undefined') return;

    // Check if user is authenticated
    const token = getToken();
    let role = getRole();

    // Debug logging with type information
    console.log('Dashboard Router:', { 
      token: token ? 'Present' : 'Missing', 
      role: role,
      roleType: typeof role,
      roleValue: role
    });

    if (!token) {
      // No token found, redirect to login
      console.log('No token found, redirecting to login');
      router.push('/login');
      return;
    }

    if (!role) {
      // No role found, redirect to login
      console.log('No role found, redirecting to login');
      router.push('/login');
      return;
    }

    // Ensure role is a string
    role = String(role);
    
    // Check if role is invalid (boolean converted to string)
    if (role === 'true' || role === 'false' || role === 'null' || role === 'undefined') {
      console.error('Invalid role value in localStorage:', role);
      // Clear invalid auth data
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      router.push('/login');
      return;
    }

    // Redirect based on role
    console.log('Redirecting based on role:', role);
    
    // Normalize role (handle case variations)
    const normalizedRole = role.toLowerCase().trim();
    
    switch (normalizedRole) {
      case 'super_admin':
        console.log('Redirecting to super-admin dashboard');
        router.push('/dashboard/super-admin');
        break;
      case 'branch_admin':
        console.log('Redirecting to branch-admin dashboard');
        router.push('/dashboard/branch-admin');
        break;
      case 'accountant':
        console.log('Redirecting to accountant dashboard');
        router.push('/dashboard/accountant');
        break;
      case 'order_taker':
        console.log('Redirecting to order-taker dashboard');
        router.push('/dashboard/order-taker');
        break;
      case 'kitchen':
        console.log('Redirecting to kitchen dashboard');
        // Kitchen staff should access through branch-admin or super-admin kitchen page
        // Check if there's a branch_id, if yes use branch-admin, else super-admin
        const kitchenBranchId = typeof window !== 'undefined' ? localStorage.getItem('branch_id') : null;
        if (kitchenBranchId) {
          router.push('/dashboard/branch-admin/kitchen');
        } else {
          router.push('/dashboard/super-admin/kitchen');
        }
        break;
      case 'admin': // Legacy support
      case 'administrator': // Legacy support
        console.log('Redirecting to branch-admin dashboard (legacy admin)');
        router.push('/dashboard/branch-admin');
        break;
      default:
        // Unknown role, redirect to login
        console.log('Unknown role, redirecting to login:', role);
        // Clear invalid auth data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
        }
        router.push('/login');
        break;
    }
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#FF5F15] border-t-transparent"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
        <p className="mt-2 text-sm text-gray-400">Redirecting to your dashboard</p>
      </div>
    </div>
  );
}

