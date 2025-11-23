'use client';

/**
 * Root Page
 * Redirects to login or dashboard based on authentication status
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getRole } from '@/utils/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = getToken();
    const role = getRole();

    if (token && role) {
      // User is logged in, redirect to dashboard router
      router.push('/dashboard');
    } else {
      // User is not logged in, redirect to login
      router.push('/login');
    }
  }, [router]);

  // Show loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#FF5F15] border-t-transparent"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

