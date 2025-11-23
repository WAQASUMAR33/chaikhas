'use client';

/**
 * Login Page
 * Beautiful login page with Orange (#FF5F15) color theme
 * Compact design that fits on a single page without scrolling
 * Allows users to log in with username and password
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, saveAuth, getToken, getRole } from '@/utils/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    // Only check on client side
    if (typeof window === 'undefined') return;
    
    const token = getToken();
    const role = getRole();
    
    // Only redirect if we have both token and role
    if (token && role) {
      // User is already logged in, redirect to dashboard
      const redirectPath = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      // Use router.push for client-side navigation
      console.log('User already logged in, redirecting to:', redirectPath);
      router.push(redirectPath);
    }
  }, [router]);

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate inputs
    if (!username || !password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    // Attempt login
    let result;
    try {
      result = await login(username, password);

      // Check if login was successful
      // API response structure from apiPost:
      // { success: true, data: { success: true, token, role, branch_id, ... } }
      
      // Log the full result structure for debugging
      console.log('Login API Result:', {
        resultSuccess: result.success,
        hasData: !!result.data,
        dataType: typeof result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        fullResult: result
      });
      
      // Check if login was successful - try multiple response structures
      const isSuccess = result.success && result.data && (
        result.data.success === true || 
        result.data.success === 'true' ||
        (result.data.token && result.data.role)
      );
      
      if (!isSuccess) {
        // Login failed
        const errorMsg = result.data?.message || result.data?.error || result.message || 'Login failed. Please check your credentials.';
        console.error('Login failed:', { result, errorMsg });
        setError(errorMsg);
        setLoading(false);
        return;
      }
      
      // Extract data from result.data (which is the actual API response)
      const apiResponse = result.data;
      
      // Log the API response structure
      console.log('API Response Structure:', {
        hasToken: 'token' in apiResponse,
        hasRole: 'role' in apiResponse,
        hasUser: 'user' in apiResponse,
        hasData: 'data' in apiResponse,
        allKeys: Object.keys(apiResponse),
        tokenValue: apiResponse.token,
        roleValue: apiResponse.role,
        roleType: typeof apiResponse.role,
        fullResponse: apiResponse
      });
      
      // Get token and role from API response
      // Try multiple possible locations for token and role
      const token = apiResponse.token || apiResponse.data?.token || apiResponse.user?.token || null;
      
      // Try multiple possible locations for role
      let role = apiResponse.role || apiResponse.data?.role || apiResponse.user?.role || null;
      
      // If role is still not found, check nested structures
      if (!role && apiResponse.user) {
        role = apiResponse.user.role;
      }
      
      // If still not found, check if it's in a nested data object
      if (!role && apiResponse.data) {
        role = apiResponse.data.role;
      }
      
      // Validate token
      if (!token) {
        console.error('Token not found in API response:', apiResponse);
        setError('Login failed: Token not received from server. Please try again.');
        setLoading(false);
        return;
      }
      
      // Validate and process role
      if (role === null || role === undefined) {
        console.error('Role not found in API response. Full response:', apiResponse);
        setError('Login failed: Role information missing from server response. Please contact administrator.');
        setLoading(false);
        return;
      }
      
      // Check if role is actually a boolean (backend API issue)
      if (typeof role === 'boolean') {
        console.warn('API returned boolean role instead of string role. Attempting to fetch actual role from database...');
        console.error('Full API response:', JSON.stringify(apiResponse, null, 2));
        
        // Try to get the actual role from database using user ID
        const userId = apiResponse.user?.id || apiResponse.id || null;
        const userUsername = apiResponse.user?.username || apiResponse.username || username;
        
        if (userId && token) {
          // Try to fetch user role directly from database via API
          try {
            const roleFetchResult = await fetch('http://localhost/restuarent/api/get_user_role.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ user_id: userId, username: userUsername })
            });
            
            if (roleFetchResult.ok) {
              const roleData = await roleFetchResult.json();
              if (roleData.success && roleData.role) {
                role = roleData.role;
                console.log('Successfully fetched role from database:', role);
              } else if (roleData.data && roleData.data.role) {
                role = roleData.data.role;
                console.log('Successfully fetched role from database (nested):', role);
              }
            }
          } catch (fetchError) {
            console.error('Failed to fetch role from database:', fetchError);
          }
        }
        
        // If still boolean or invalid after trying to fetch
        if (typeof role === 'boolean' || !role || role === 'true' || role === 'false') {
          // Show detailed error with instructions
          console.error('Unable to get valid role. Backend API needs to be fixed.');
          setError(`Login Failed: Backend API Issue\n\nThe login API is returning "role": true (boolean) instead of "role": "super_admin" (string).\n\nTO FIX:\n1. Open: C:\\wamp64\\www\\restuarent\\api\\login.php\n2. Find where role is returned in the JSON response\n3. Change it to return the actual role string from database:\n   "role": $user['role']  (not true/false)\n\nOR copy get_user_role.php to your API folder as a temporary workaround.`);
          setLoading(false);
          return;
        }
      }
      
      // Convert to string and validate
      role = String(role).trim();
      
      // If role is "true" or "false" (boolean converted), there's an API issue
      if (role === 'true' || role === 'false' || role === '' || role === 'null' || role === 'undefined') {
        console.error('API returned invalid role value:', { 
          role, 
          originalType: typeof apiResponse.role,
          fullResponse: JSON.stringify(apiResponse, null, 2)
        });
        setError('Login failed: Invalid role value received from server. Please contact administrator.');
        setLoading(false);
        return;
      }
      
      // Extract branch_id from multiple possible locations
      const branchId = apiResponse.branch_id || 
                       apiResponse.data?.branch_id || 
                       apiResponse.user?.branch_id || 
                       apiResponse.data?.user?.branch_id || 
                       null;
      
      // Extract branch_name from multiple possible locations
      const branchName = apiResponse.branch_name || 
                         apiResponse.data?.branch_name || 
                         apiResponse.user?.branch_name || 
                         apiResponse.data?.user?.branch_name ||
                         apiResponse.branch?.branch_name ||
                         apiResponse.data?.branch?.branch_name ||
                         null;
        
        // Get user info
        const userData = apiResponse.user || apiResponse.data?.user || {};
        const fullname = userData.fullname || 
                        apiResponse.fullname || 
                        userData.full_name || 
                        userData.name || 
                        apiResponse.data?.fullname ||
                        null;
        const userUsername = userData.username || 
                             apiResponse.username || 
                             username || 
                             apiResponse.data?.username ||
                             null;
        
        // Debug: Log the response to console with detailed type information
        console.log('Login Response:', {
          success: isSuccess,
          token: token ? 'Present' : 'Missing',
          tokenType: typeof token,
          role: role || 'Missing',
          roleType: typeof role,
          roleValue: role,
          branchId: branchId,
          branchName: branchName,
          branchNameType: typeof branchName,
          fullname: fullname,
          username: userUsername,
          fullResponse: apiResponse
        });
        
        // Log branch_name extraction details
        console.log('Branch Name Extraction:', {
          'apiResponse.branch_name': apiResponse.branch_name,
          'apiResponse.data?.branch_name': apiResponse.data?.branch_name,
          'apiResponse.user?.branch_name': apiResponse.user?.branch_name,
          'apiResponse.data?.user?.branch_name': apiResponse.data?.user?.branch_name,
          'apiResponse.branch?.branch_name': apiResponse.branch?.branch_name,
          'apiResponse.data?.branch?.branch_name': apiResponse.data?.branch?.branch_name,
          'Final branchName': branchName
        });
        
        // Additional check: Log raw API response to see structure
        console.log('Raw API Response Structure:', {
          hasToken: 'token' in apiResponse,
          hasRole: 'role' in apiResponse,
          tokenValue: apiResponse.token,
          roleValue: apiResponse.role,
          allKeys: Object.keys(apiResponse)
        });
        
        // Save token, role, branch_id, and user info to localStorage
        // Role is already validated above, so use it directly
        const validRole = role; // role is already validated and converted to string above
        
        console.log('Saving auth data:', { 
          token: token.substring(0, 10) + '...', 
          role: validRole, 
          roleType: typeof validRole,
          branchId: branchId,
          branchName: branchName,
          branchNameType: typeof branchName,
          fullname: fullname,
          username: userUsername
        });
        saveAuth(token, validRole, branchId, fullname, userUsername, branchName);
        
        // Verify what was saved
        const savedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const savedRole = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
        const savedBranchId = typeof window !== 'undefined' ? localStorage.getItem('branch_id') : null;
        const savedBranchName = typeof window !== 'undefined' ? localStorage.getItem('branch_name') : null;
        console.log('Saved to localStorage:', { 
          token: savedToken ? 'Present' : 'Missing', 
          role: savedRole,
          roleType: typeof savedRole,
          roleValue: savedRole,
          branchId: savedBranchId,
          branchName: savedBranchName
        });
        
        // Double-check the saved role is valid
        if (savedRole === 'true' || savedRole === 'false' || !savedRole) {
          console.error('Invalid role saved to localStorage:', savedRole);
          // Clear invalid data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
          }
          setError('Login failed: Error saving authentication data. Please try again.');
          setLoading(false);
          return;
        }
        
        // Small delay to ensure localStorage is saved, then redirect
        setTimeout(() => {
          // Get redirect path from URL or default to dashboard
          const redirectPath = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
          console.log('Login successful, redirecting to:', redirectPath);
          // Use router.push for client-side navigation
          router.push(redirectPath);
        }, 150);
    } catch (error) {
      
      // Check if result has error details (from apiPost)
      if (result && result.data) {
        if (result.data.details) {
          setError(result.data.details);
        } else if (result.data.message) {
          setError(result.data.message);
        } else {
          setError('Login failed. Please check your credentials and try again.');
        }
      } else if (error.message === 'Failed to fetch') {
        setError('Cannot connect to server. Please ensure:\n1. WAMP server is running (Apache and MySQL should be green)\n2. API is accessible at http://localhost/restuarent/api/login.php\n3. Check browser console (F12) for more details');
      } else {
        setError('Network error: ' + (error.message || 'Unknown error') + '. Please check your connection and try again.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white overflow-hidden px-4 py-8 sm:py-12">
      {/* Background with orange gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FF5F15] via-[#FFB020] to-[#FFC040] opacity-20"></div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-2xl border border-[#E0E0E0] overflow-hidden">
          {/* Header Section - Orange */}
          <div className="bg-[#FF5F15] px-4 sm:px-6 py-5 sm:py-6 text-center">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mb-2 sm:mb-3 shadow-lg">
              <svg
                className="w-7 h-7 sm:w-9 sm:h-9 text-[#FF5F15]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
              Welcome Back
            </h1>
            <p className="text-white/95 text-xs sm:text-sm">
              Sign in to Restaurant Management
            </p>
          </div>

          {/* Form Section */}
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Username Field */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-4 w-4 text-[#E0E0E0]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] outline-none transition duration-200 text-gray-900 placeholder-gray-400 text-sm"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-4 w-4 text-[#E0E0E0]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="block w-full pl-10 pr-10 py-2.5 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] outline-none transition duration-200 text-gray-900 placeholder-gray-400 text-sm"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg
                        className="h-4 w-4 text-[#E0E0E0] hover:text-gray-600 transition"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4 text-[#E0E0E0] hover:text-gray-600 transition"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 animate-shake">
                  <div className="flex items-start">
                    <svg
                      className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-red-800 whitespace-pre-line">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#FF5F15] hover:bg-[#FF9500] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF5F15] disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 transform hover:scale-[1.01] active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>

              {/* Demo credentials - Only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-center pt-1">
                  <p className="text-xs text-gray-500">
                    Demo: <span className="font-semibold text-[#FF5F15]">admin@gmail.com</span> /{' '}
                    <span className="font-semibold text-[#FF5F15]">dev786</span>
                  </p>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-[#FFFFFF] border-t border-[#E0E0E0] text-center">
            <p className="text-xs text-gray-400">
              © 2024 Restaurant Management System
            </p>
          </div>
        </div>
      </div>

      {/* Custom styles for shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-3px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(3px);
          }
        }
        .animate-shake {
          animation: shake 0.4s;
        }
      `}</style>
    </div>
  );
}
