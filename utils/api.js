/**
 * API Helper Utility
 * Handles GET/POST requests to the PHP backend
 * Manages authentication tokens in headers
 */

// Get API base URL from environment variable, fallback to default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/restuarent/api';

// Development mode flag - only log in development and client-side
const IS_DEVELOPMENT = typeof window !== 'undefined' && process.env.NODE_ENV === 'development';

// Helper to log only in development (silent in production)
const devLog = (...args) => {
  if (IS_DEVELOPMENT) {
    console.log(...args);
  }
};

// Helper to log errors only in development (silent in production)
const devError = (...args) => {
  if (IS_DEVELOPMENT) {
    console.error(...args);
  }
};

/**
 * Get stored token from localStorage
 * @returns {string|null} Token or null if not found
 */
export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

/**
 * Get stored role from localStorage
 * @returns {string|null} Role or null if not found
 */
export const getRole = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('role');
  }
  return null;
};

/**
 * Get stored branch_id from localStorage
 * @returns {number|null} Branch ID or null if not found
 */
export const getBranchId = () => {
  if (typeof window !== 'undefined') {
    const branchId = localStorage.getItem('branch_id');
    return branchId ? parseInt(branchId) : null;
  }
  return null;
};

/**
 * Save branch_id to localStorage
 * @param {number} branchId - Branch ID
 */
export const saveBranchId = (branchId) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('branch_id', String(branchId));
  }
};

/**
 * Get terminal number from localStorage (default: 1)
 * @returns {number} Terminal number
 */
export const getTerminal = () => {
  if (typeof window !== 'undefined') {
    const terminal = localStorage.getItem('terminal');
    return terminal ? parseInt(terminal) : 1;
  }
  return 1;
};

/**
 * Save token, role, branch_id, branch_name, and user info to localStorage
 * @param {string} token - Authentication token
 * @param {string} role - User role
 * @param {number|null} branchId - Branch ID (optional, null for super_admin)
 * @param {string} fullname - User full name (optional)
 * @param {string} username - User username (optional)
 * @param {string} branchName - Branch name (optional)
 */
export const saveAuth = (token, role, branchId = null, fullname = null, username = null, branchName = null) => {
  if (typeof window !== 'undefined') {
    // Ensure token is a string
    if (token) {
      localStorage.setItem('token', String(token));
    }
    
    // Ensure role is a string - convert boolean/other types
    if (role !== null && role !== undefined) {
      // Convert to string, handling boolean true/false
      let roleString = String(role);
      // If it's "true" or "false" (boolean converted to string), we need to get actual role
      // This shouldn't happen, but handle it just in case
      if (roleString === 'true' || roleString === 'false') {
        console.warn('Role is boolean, this should not happen. Role value:', role);
        // Don't save boolean role
        return;
      }
      localStorage.setItem('role', roleString);
    }
    
    if (branchId !== null && branchId !== undefined) {
      localStorage.setItem('branch_id', String(branchId));
    }
    if (branchName) {
      localStorage.setItem('branch_name', String(branchName));
    }
    if (fullname) {
      localStorage.setItem('fullname', String(fullname));
    }
    if (username) {
      localStorage.setItem('username', String(username));
    }
    
    // Debug: Log what was actually saved
    console.log('saveAuth - Saved to localStorage:', {
      token: token ? 'Present' : 'Missing',
      role: role !== null && role !== undefined ? String(role) : 'Missing',
      branchId: branchId,
      branchName: branchName,
      fullname: fullname,
      username: username
    });
  }
};

/**
 * Get stored fullname from localStorage
 * @returns {string|null} Fullname or null if not found
 */
export const getFullname = () => {
  if (typeof window !== 'undefined') {
    const fullname = localStorage.getItem('fullname');
    // Ensure we never return boolean values
    if (fullname === 'true' || fullname === 'false' || fullname === null || fullname === undefined) {
      return null;
    }
    return fullname;
  }
  return null;
};

/**
 * Get stored branch_name from localStorage
 * @returns {string|null} Branch name or null if not found
 */
export const getBranchName = () => {
  if (typeof window !== 'undefined') {
    const branchName = localStorage.getItem('branch_name');
    // Ensure we never return boolean values
    if (branchName === 'true' || branchName === 'false' || branchName === null || branchName === undefined) {
      return null;
    }
    return branchName;
  }
  return null;
};

/**
 * Get stored username from localStorage
 * @returns {string|null} Username or null if not found
 */
export const getUsername = () => {
  if (typeof window !== 'undefined') {
    const username = localStorage.getItem('username');
    // Ensure we never return boolean values
    if (username === 'true' || username === 'false' || username === null || username === undefined) {
      return null;
    }
    return username;
  }
  return null;
};

/**
 * Clear authentication data from localStorage
 */
export const clearAuth = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('branch_id');
    localStorage.removeItem('fullname');
    localStorage.removeItem('username');
  }
};

/**
 * Make GET request to API
 * @param {string} endpoint - API endpoint (e.g., '/users')
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} JSON response
 */
export const apiGet = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add token to headers if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      mode: 'cors', // Explicitly enable CORS
      credentials: 'omit', // Don't send credentials to avoid CORS issues
      headers,
      ...options,
    });

    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    devError('API GET Error:', normalizedEndpoint, error.message);
    // Provide more detailed error messages
    let errorMessage = error.message || 'Network error';
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      errorMessage = 'Cannot connect to server. Please ensure WAMP server is running and API is accessible.';
    }
    return {
      success: false,
      data: { 
        success: false,
        message: errorMessage,
        endpoint: normalizedEndpoint,
        apiUrl: fullUrl
      },
      status: 0,
    };
  }
};

/**
 * Make POST request to API
 * @param {string} endpoint - API endpoint (e.g., '/login.php')
 * @param {Object} body - Request body
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} JSON response
 */
export const apiPost = async (endpoint, body, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add token to headers if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Construct full URL
  const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;
  devLog('POST Request:', fullUrl);
  
  try {
    // Try to make the request
    const response = await fetch(fullUrl, {
      method: 'POST',
      mode: 'cors', // Explicitly enable CORS
      credentials: 'omit', // Don't send credentials to avoid CORS issues
      headers,
      body: JSON.stringify(body),
      ...options,
    }).catch((fetchError) => {
      // If fetch fails completely (network error, CORS blocked, etc.)
      throw fetchError;
    });

    // Get response text first to check if it's valid JSON
    const text = await response.text();
    
    // Handle empty response
    if (!text || text.trim() === '') {
      devError('Empty response from server:', normalizedEndpoint, 'Status:', response.status);
      return {
        success: false,
        data: { 
          success: false,
          message: 'Server returned an empty response. Please check server logs or try again.',
          rawResponse: '',
          endpoint: normalizedEndpoint
        },
        status: response.status,
      };
    }
    
    let data;
    
    try {
      data = JSON.parse(text);
      devLog('API Response:', normalizedEndpoint, data);
      
      // Check if response is an empty object
      if (data && typeof data === 'object' && Object.keys(data).length === 0) {
        // For endpoints that return arrays (like get_tables.php), empty object means no results
        if (normalizedEndpoint.includes('get_tables') || 
            normalizedEndpoint.includes('get_halls') || 
            normalizedEndpoint.includes('get_') && normalizedEndpoint.includes('.php')) {
          // Return empty array for list endpoints
          devLog('Empty object response from', normalizedEndpoint, '- treating as empty array');
          return {
            success: true,
            data: [],
            status: response.status || 200
          };
        }
        
        // For login endpoints, empty object means invalid credentials
        if (normalizedEndpoint.includes('login')) {
          devError('Empty object response from', normalizedEndpoint);
          return {
            success: false,
            data: {
              success: false,
              message: 'Invalid username or password',
              error: 'Server returned an empty response. This usually means invalid credentials or a server configuration issue.',
              details: 'The API returned an empty object. This typically indicates:\n1. Invalid username or password\n2. Server-side error that was not properly handled\n3. Database query returned no results\n\nPlease check your credentials and try again.',
              isEmptyResponse: true
            },
            status: response.status || 401
          };
        }
        
        // For other endpoints, log warning but don't treat as error
        devLog('Empty object response from', normalizedEndpoint, '- may indicate no results');
        return {
          success: response.ok,
          data: {},
          status: response.status || 200
        };
      }
      
      // Check for database connection errors in the response
      if (data && typeof data === 'object') {
        // Check for common database error patterns
        const errorText = JSON.stringify(data).toLowerCase();
        if (errorText.includes('access denied') || 
            errorText.includes('using password: no') ||
            errorText.includes('mysql') && errorText.includes('denied') ||
            errorText.includes('database connection') ||
            errorText.includes('mysqli_connect') ||
            errorText.includes('connection failed')) {
          
          // This is a database connection error
          devError('Database connection error detected in API response');
          return {
            success: false,
            data: {
              success: false,
              message: 'Database Connection Error',
              error: 'The server cannot connect to the database. Please check your database configuration.',
              details: `Database Error: ${data.message || data.error || 'Access denied for user. Check database credentials in PHP config file.'}\n\nTo fix this:\n1. Open your PHP database configuration file (usually config.php or database.php)\n2. Ensure MySQL username and password are correctly set\n3. Verify MySQL service is running in WAMP\n4. Check database credentials match your MySQL setup\n\nCommon location: C:\\wamp64\\www\\restuarent\\api\\config.php`,
              isDatabaseError: true,
              rawResponse: data
            },
            status: response.status || 500
          };
        }
        
        // Check for empty error objects or success: false without message
        if (!data.success) {
          // If it's just { success: false } or empty object, provide helpful message
          const hasMessage = data.message || data.error || data.details || data.msg;
          if (!hasMessage || Object.keys(data).length <= 1) {
            // Check if this is a login endpoint - provide specific message
            if (normalizedEndpoint.includes('login')) {
              return {
                success: false,
                data: {
                  success: false,
                  message: 'Invalid username or password',
                  error: 'The credentials you entered are incorrect. Please check your username and password and try again.',
                  details: 'Login failed. This usually means:\n1. Username or password is incorrect\n2. User account does not exist\n3. Account may be disabled\n\nPlease verify your credentials and try again.',
                  isEmptyResponse: true
                },
                status: response.status || 401
              };
            }
            
            return {
              success: false,
              data: {
                success: false,
                message: 'Server Error: Empty response received',
                error: 'The server returned an empty error response. This usually indicates a database connection issue or PHP error.',
                details: 'Please check:\n1. PHP error logs in WAMP\n2. Database connection settings\n3. Ensure MySQL service is running\n\nCheck: C:\\wamp64\\logs\\php_error.log',
                isDatabaseError: true
              },
              status: response.status || 500
            };
          }
        }
      }
      
      // Even if response.ok is false, if we got valid JSON, return it
      // The API might return { success: false, message: "..." } which is valid
      return { 
        success: response.ok || (data && data.success === true), 
        data, 
        status: response.status 
      };
    } catch (parseError) {
      // If response is not valid JSON, it might be an HTML error or PHP error
      devError('Invalid JSON response from', normalizedEndpoint, ':', text.substring(0, 200));
      
      // Check if the text contains database error messages
      const lowerText = text.toLowerCase();
      if (lowerText.includes('access denied') || 
          lowerText.includes('using password: no') ||
          lowerText.includes('mysql') && (lowerText.includes('denied') || lowerText.includes('error')) ||
          lowerText.includes('mysqli_connect') ||
          lowerText.includes('database connection')) {
        
        return {
          success: false,
          data: {
            success: false,
            message: 'Database Connection Error',
            error: 'The server cannot connect to the database. The response contains database error information.',
            details: `Database Error Detected in Server Response\n\nThis indicates your PHP API cannot connect to MySQL.\n\nTo fix:\n1. Open your PHP database config file (usually config.php or database.php)\n2. Add or update MySQL password:\n   - Username: root (or your MySQL username)\n   - Password: [your MySQL password]\n3. Verify MySQL service is running in WAMP (green icon)\n4. Test connection in phpMyAdmin\n\nCommon location: C:\\wamp64\\www\\restuarent\\api\\config.php\n\nError details: ${text.substring(0, 300)}`,
            isDatabaseError: true,
            rawResponse: text.substring(0, 500)
          },
          status: response.status || 500
        };
      }
      
      return {
        success: false,
        data: { 
          success: false,
          message: 'Invalid response from server. Please check server logs.',
          error: 'Server returned non-JSON response. This might be a PHP error or database connection issue.',
          details: `The server returned HTML or plain text instead of JSON.\n\nPossible causes:\n1. PHP error (check error logs)\n2. Database connection error\n3. Server configuration issue\n\nCheck: C:\\wamp64\\logs\\php_error.log\n\nResponse preview: ${text.substring(0, 300)}`,
          rawResponse: text.substring(0, 500), // Include first 500 chars for debugging
          endpoint: normalizedEndpoint
        },
        status: response.status,
      };
    }
  } catch (error) {
    devError('API POST Error:', normalizedEndpoint, error.message);
    
    // Provide more detailed error messages
    let errorMessage = error.message || 'Network error';
    let detailedMessage = '';
    
    // Check for specific error types
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      errorMessage = 'Cannot connect to server (CORS or Network Issue)';
      detailedMessage = `Unable to reach the API server at: ${fullUrl}\n\n⚠️ MOST LIKELY ISSUE: CORS Headers Missing\n\nYour PHP API file (login.php) needs CORS headers at the top.\n\nQuick Fix - Add these lines to the TOP of your login.php file:\n\n<?php\nheader('Access-Control-Allow-Origin: *');\nheader('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');\nheader('Access-Control-Allow-Headers: Content-Type, Authorization');\n\nif ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {\n    http_response_code(200);\n    exit();\n}\n\nSee API_CORS_FIX.md for complete instructions.\n\nOther Troubleshooting Steps:\n\n1. Check WAMP Server Status:\n   - Open WAMP server control panel\n   - Ensure Apache and MySQL services are running (green icon)\n   - If red, click "Start All Services"\n\n2. Verify API Folder Location:\n   - Check if folder exists: C:\\wamp64\\www\\restuarent\\api\\\n   - Ensure login.php file exists in that folder\n\n3. Test API in Browser:\n   - Open: http://localhost/restuarent/api/login.php\n   - You should see a response (even if it's an error message)\n   - If you see "404 Not Found", the path is incorrect\n   - If page doesn't load, Apache might not be running\n\n4. Check Browser Network Tab:\n   - Press F12 → Network tab\n   - Try to login again\n   - Look for the login.php request\n   - If it shows "CORS error" or "blocked", add CORS headers to PHP file`;
    } else if (error.message.includes('CORS')) {
      errorMessage = 'CORS (Cross-Origin) Error';
      detailedMessage = `The server is blocking the request due to CORS policy.\n\nSolution: Add CORS headers to your PHP API files:\n\n<?php\nheader('Access-Control-Allow-Origin: *');\nheader('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');\nheader('Access-Control-Allow-Headers: Content-Type, Authorization');\n?>\n\nAPI URL: ${fullUrl}`;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request Timeout';
      detailedMessage = `The server took too long to respond.\n\nPossible causes:\n- Server is overloaded\n- Database connection issues\n- Network problems\n\nAPI URL: ${fullUrl}`;
    }
    
    return {
      success: false,
      data: { 
        success: false,
        message: errorMessage,
        details: detailedMessage || errorMessage,
        endpoint: normalizedEndpoint,
        apiUrl: fullUrl,
        errorType: error.name || 'Unknown',
        troubleshooting: true,
      },
      status: 0,
    };
  }
};

/**
 * Make PUT request to API (Update)
 * @param {string} endpoint - API endpoint (e.g., '/categories/update.php')
 * @param {Object} body - Request body
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} JSON response
 */
export const apiPut = async (endpoint, body, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add token to headers if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;

  try {
    const response = await fetch(fullUrl, {
      method: 'PUT',
      mode: 'cors', // Explicitly enable CORS
      credentials: 'omit', // Don't send credentials to avoid CORS issues
      headers,
      body: JSON.stringify(body),
      ...options,
    });

    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    devError('API PUT Error:', normalizedEndpoint, error.message);
    // Provide more detailed error messages
    let errorMessage = error.message || 'Network error';
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      errorMessage = 'Cannot connect to server. Please ensure WAMP server is running and API is accessible.';
    }
    return {
      success: false,
      data: { 
        success: false,
        message: errorMessage,
        endpoint: normalizedEndpoint,
        apiUrl: fullUrl
      },
      status: 0,
    };
  }
};

/**
 * Make DELETE request to API
 * @param {string} endpoint - API endpoint (e.g., '/categories/delete.php')
 * @param {Object} body - Request body (optional)
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} JSON response
 */
export const apiDelete = async (endpoint, body = null, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add token to headers if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;

  try {
    const fetchOptions = {
      method: 'DELETE',
      headers,
      ...options,
    };

    // Include body if provided (some DELETE requests need body)
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    // Add CORS settings to fetch options
    fetchOptions.mode = 'cors';
    fetchOptions.credentials = 'omit';
    
    const response = await fetch(fullUrl, fetchOptions);

    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    devError('API DELETE Error:', normalizedEndpoint, error.message);
    // Provide more detailed error messages
    let errorMessage = error.message || 'Network error';
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      errorMessage = 'Cannot connect to server. Please ensure WAMP server is running and API is accessible.';
    }
    return {
      success: false,
      data: { 
        success: false,
        message: errorMessage,
        endpoint: normalizedEndpoint,
        apiUrl: fullUrl
      },
      status: 0,
    };
  }
};

/**
 * Generate a unique token
 * @returns {string} Generated token (64 characters)
 */
export const generateToken = () => {
  // Generate a random token
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Test API connection
 * @returns {Promise<Object>} Connection test result
 */
export const testConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/test_connection.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { success: false, message: 'Invalid response', raw: text.substring(0, 200) };
    }
    
    return {
      success: response.ok,
      data,
      status: response.status,
      url: `${API_BASE_URL}/test_connection.php`,
    };
  } catch (error) {
    return {
      success: false,
      data: {
        success: false,
        message: error.message,
        error: 'Cannot connect to API server',
      },
      status: 0,
      url: `${API_BASE_URL}/test_connection.php`,
    };
  }
};

/**
 * Login helper function
 * @param {string} username - User username
 * @param {string} password - User password
 * @returns {Promise<Object>} Login response with token and role
 */
export const login = async (username, password) => {
  const result = await apiPost('/login.php', { username, password });
  return result;
};

