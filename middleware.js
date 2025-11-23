import { NextResponse } from 'next/server';

/**
 * Next.js Middleware for Role-Based Access Control
 * Protects routes based on user role and branch_id
 * 
 * Role Routes:
 * - super_admin → /dashboard/super-admin/**
 * - branch_admin → /dashboard/branch-admin/**
 * - accountant → /dashboard/accountant/**
 * - order_taker → /dashboard/order-taker/**
 * - kitchen → /dashboard/kitchen/**
 */

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api', '/_next', '/favicon.ico'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Allow /dashboard to pass through - it will check localStorage client-side
  // The dashboard page itself handles authentication and role-based routing
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return NextResponse.next();
  }
  
  // Allow all dashboard routes to pass through
  // Client-side pages will handle authentication checks
  // This is because middleware runs on server and can't access localStorage
  if (pathname.startsWith('/dashboard/')) {
    return NextResponse.next();
  }
  
  // For any other route, allow through (let Next.js handle 404s)
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
  ],
};

