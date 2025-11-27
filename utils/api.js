/**
 * API Helper Utility
 * Handles GET/POST requests to the PHP backend
 * Manages authentication tokens in headers
 * Automatically falls back to localhost when live server is unavailable
 */

import logger from './logger';

// Primary API URL (live/production) - from environment variable
const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Fallback API URL (local development)
const FALLBACK_API_URL = 'http://localhost/restuarent/api';

// Storage key for caching working API URL
const WORKING_API_URL_KEY = 'working_api_url';

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
 * Normalize API base URL to ensure proper formatting
 * Ensures URL ends with a single slash for proper endpoint concatenation
 * @param {string} url - The API base URL
 * @returns {string} Normalized URL
 */
const normalizeApiUrl = (url) => {
  if (!url) return url;
  
  // Trim whitespace
  let normalized = url.trim();
  
  // Remove multiple trailing slashes and ensure single trailing slash
  normalized = normalized.replace(/\/+$/, '');
  if (normalized && !normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }
  
  return normalized;
};

/**
 * Determine the correct API folder path for an endpoint
 * Supports both /api/ and /pos/ folders
 * If endpoint already includes folder (api/ or pos/), use it
 * Otherwise, default to api/ for backward compatibility
 * @param {string} endpoint - API endpoint (e.g., 'getOrders.php', 'api/getOrders.php', 'pos/getOrders.php')
 * @returns {string} Endpoint with correct folder path
 */
const resolveApiEndpoint = (endpoint) => {
  if (!endpoint) return endpoint;
  
  // Remove leading slash if present
  let normalized = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Check if endpoint already includes folder prefix (api/ or pos/)
  if (normalized.startsWith('api/') || normalized.startsWith('pos/')) {
    return normalized;
  }
  
  // Default to api/ folder for backward compatibility
  return `api/${normalized}`;
};

/**
 * Get the current working API URL
 * Checks localStorage cache first, then determines primary/fallback
 * @returns {string} The API base URL to use
 */
const getWorkingApiUrl = () => {
  if (typeof window === 'undefined') {
    // Server-side: use primary or fallback, normalize them
    const primaryUrl = PRIMARY_API_URL ? normalizeApiUrl(PRIMARY_API_URL) : '';
    return primaryUrl || FALLBACK_API_URL;
  }

  // Check if we have a cached working URL
  const cachedUrl = localStorage.getItem(WORKING_API_URL_KEY);
  if (cachedUrl) {
    return normalizeApiUrl(cachedUrl);
  }

  // Determine which URL to try first
  // If PRIMARY_API_URL is set and not localhost, use it as primary
  // Otherwise, use fallback as default
  const shouldTryPrimary = PRIMARY_API_URL && 
                           !PRIMARY_API_URL.includes('localhost') && 
                           PRIMARY_API_URL.trim() !== '';

  const urlToUse = shouldTryPrimary ? PRIMARY_API_URL : FALLBACK_API_URL;
  return normalizeApiUrl(urlToUse);
};

/**
 * Set the working API URL in cache
 * @param {string} url - The working API URL
 */
const setWorkingApiUrl = (url) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(WORKING_API_URL_KEY, url);
    if (IS_DEVELOPMENT) {
      console.log('✅ Cached working API URL:', url);
    }
  }
};

/**
 * Clear the cached working API URL (force re-detection)
 */
export const resetApiUrl = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WORKING_API_URL_KEY);
    if (IS_DEVELOPMENT) {
      console.log('🔄 Cleared cached API URL - will re-detect on next request');
    }
  }
};

/**
 * Get the currently working API URL (for debugging)
 * @returns {string} Current working API URL
 */
export const getCurrentApiUrl = () => {
  return getWorkingApiUrl();
};

/**
 * Test if an API URL is reachable with a quick HEAD request
 * @param {string} baseUrl - The API base URL to test
 * @param {string} testEndpoint - Endpoint to test (default: '/test_connection.php')
 * @returns {Promise<boolean>} True if URL is reachable
 */
const testApiUrl = async (baseUrl, testEndpoint = '/test_connection.php') => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(`${baseUrl}${testEndpoint}`, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok || response.status < 500; // Accept 200-499 as "reachable"
  } catch (error) {
    return false;
  }
};

/**
 * Try fetching with multiple URLs (primary then fallback)
 * @param {Array<string>} urls - Array of URLs to try
 * @param {Function} createFetchPromise - Function that takes a URL and returns a fetch Promise
 * @returns {Promise<Response>} Fetch response from first working URL
 */
const fetchWithFallback = async (urls, createFetchPromise) => {
  let lastError = null;
  const previousWorkingUrl = getWorkingApiUrl();

  for (const url of urls) {
    try {
      const response = await createFetchPromise(url);
      
      // If we got a response, cache this URL as working
      setWorkingApiUrl(url);
      
      if (IS_DEVELOPMENT && url !== previousWorkingUrl) {
        console.log(`✅ API URL working: ${url} (switched from ${previousWorkingUrl || 'none'})`);
      }
      
      return response;
    } catch (error) {
      // Network/CORS errors mean server is unreachable - try next URL
      if (error.message === 'Failed to fetch' || 
          error.name === 'TypeError' || 
          error.name === 'AbortError' ||
          error.message.includes('CORS') ||
          error.message.includes('network')) {
        
        lastError = error;
        
        if (IS_DEVELOPMENT) {
          console.warn(`⚠️ ${url} unreachable, trying fallback...`);
        }
        
        continue;
      } else {
        // Other errors mean server responded (even with error)
        // Cache this URL and re-throw for proper error handling
        setWorkingApiUrl(url);
        throw error;
      }
    }
  }

  // All URLs failed
  throw lastError || new Error('Cannot connect to any API server');
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
 * Make GET request to API with automatic fallback to localhost
 * @param {string} endpoint - API endpoint (e.g., '/users')
 * @param {Object} params - Query parameters (will be converted to query string)
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} JSON response
 */
export const apiGet = async (endpoint, params = {}, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add token to headers if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Resolve endpoint with correct folder path (api/ or pos/)
  const normalizedEndpoint = resolveApiEndpoint(endpoint);
  
  // Convert params object to query string
  const queryString = Object.keys(params)
    .filter(key => params[key] !== null && params[key] !== undefined && params[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  // Determine URLs to try (cached working URL first, then primary, then fallback)
  const currentWorkingUrl = getWorkingApiUrl();
  const urlsToTry = [currentWorkingUrl];
  
  const shouldTryPrimary = PRIMARY_API_URL && 
                           !PRIMARY_API_URL.includes('localhost') && 
                           PRIMARY_API_URL.trim() !== '';

  const normalizedPrimary = PRIMARY_API_URL ? normalizeApiUrl(PRIMARY_API_URL) : '';
  if (shouldTryPrimary && normalizedPrimary && normalizedPrimary !== currentWorkingUrl) {
    urlsToTry.push(normalizedPrimary);
  }
  const normalizedFallback = normalizeApiUrl(FALLBACK_API_URL);
  if (normalizedFallback !== currentWorkingUrl && (!shouldTryPrimary || normalizedPrimary !== normalizedFallback)) {
    urlsToTry.push(normalizedFallback);
  }

  // Log API base URL in development for debugging
  if (IS_DEVELOPMENT) {
    console.log('🔧 Trying API URLs:', urlsToTry);
    console.log('🔧 Current working URL:', currentWorkingUrl);
  }

  // Log API request
  logger.logAPI('GET', normalizedEndpoint, params);

  try {
    const response = await fetchWithFallback(urlsToTry, (baseUrl) => {
      const fullUrl = queryString 
        ? `${baseUrl}${normalizedEndpoint}?${queryString}`
        : `${baseUrl}${normalizedEndpoint}`;
      
      if (IS_DEVELOPMENT) {
        console.log('🔧 Attempting GET:', fullUrl);
      }
      
      return fetch(fullUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers,
        ...options,
      });
    });

    const data = await response.json();
    
    // Log API response
    logger.logAPIResponse(normalizedEndpoint, data, response.status);
    
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    devError('API GET Error:', normalizedEndpoint, error.message);
    
    // Log API error
    logger.logAPIError(normalizedEndpoint, error, params);
    
    // Provide more detailed error messages
    let errorMessage = error.message || 'Network error';
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      errorMessage = 'Cannot connect to server. Tried both live and localhost servers.';
    }
    
    const currentUrl = getWorkingApiUrl();
    const attemptedUrl = queryString 
      ? `${currentUrl}${normalizedEndpoint}?${queryString}`
      : `${currentUrl}${normalizedEndpoint}`;
    
    return {
      success: false,
      data: { 
        success: false,
        message: errorMessage,
        endpoint: normalizedEndpoint,
        apiUrl: attemptedUrl,
        triedUrls: urlsToTry
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
  // Validate body is provided
  if (body === undefined || body === null) {
    console.error('❌ apiPost: body is required but was', body);
    throw new Error('Request body is required for POST requests');
  }
  
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add token to headers if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Ensure Content-Type is always set
  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Validate and stringify body BEFORE using it
  let bodyString;
  try {
    if (typeof body === 'string') {
      // If already a string, validate it's valid JSON
      JSON.parse(body);
      bodyString = body;
    } else {
      // Stringify object/array
      bodyString = JSON.stringify(body);
    }
  } catch (stringifyError) {
    console.error('❌ apiPost: Failed to stringify body:', body, stringifyError);
    throw new Error(`Invalid request body: ${stringifyError.message}`);
  }
  
  // Resolve endpoint with correct folder path (api/ or pos/)
  const normalizedEndpoint = resolveApiEndpoint(endpoint);
  
  // Determine URLs to try (cached working URL first, then primary, then fallback)
  const currentWorkingUrl = getWorkingApiUrl();
  const urlsToTry = [currentWorkingUrl];
  
  const shouldTryPrimary = PRIMARY_API_URL && 
                           !PRIMARY_API_URL.includes('localhost') && 
                           PRIMARY_API_URL.trim() !== '';

  const normalizedPrimary = PRIMARY_API_URL ? normalizeApiUrl(PRIMARY_API_URL) : '';
  if (shouldTryPrimary && normalizedPrimary && normalizedPrimary !== currentWorkingUrl) {
    urlsToTry.push(normalizedPrimary);
  }
  const normalizedFallback = normalizeApiUrl(FALLBACK_API_URL);
  if (normalizedFallback !== currentWorkingUrl && (!shouldTryPrimary || normalizedPrimary !== normalizedFallback)) {
    urlsToTry.push(normalizedFallback);
  }

  // Log API base URL in development for debugging
  if (IS_DEVELOPMENT) {
    console.log('🔧 Trying API URLs:', urlsToTry);
    console.log('🔧 Current working URL:', currentWorkingUrl);
  }
  
  // Log API request
  logger.logAPI('POST', normalizedEndpoint, body);
  
  try {
    // Try to make the request with fallback
    const response = await fetchWithFallback(urlsToTry, (baseUrl) => {
      const fullUrl = `${baseUrl}${normalizedEndpoint}`;
      
      if (IS_DEVELOPMENT) {
        console.log('🔧 Attempting POST:', fullUrl);
        console.log('🔧 Request body:', body);
        console.log('🔧 Request body (stringified):', bodyString);
        console.log('🔧 Request headers:', headers);
      }
      
      // Ensure method is always POST and cannot be overridden
      const fetchOptions = {
        method: 'POST', // Always POST, cannot be overridden
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: bodyString, // Use pre-validated stringified body
        ...options,
      };
      
      // Explicitly set method again after spreading options to prevent override
      fetchOptions.method = 'POST';
      
      // Ensure Content-Type is set
      if (!fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
      
      if (IS_DEVELOPMENT) {
        console.log('🔧 Final fetch options:', {
          method: fetchOptions.method,
          headers: fetchOptions.headers,
          hasBody: !!fetchOptions.body,
          bodyLength: fetchOptions.body ? fetchOptions.body.length : 0
        });
      }
      
      return fetch(fullUrl, fetchOptions);
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
      
      // Log API response
      logger.logAPIResponse(normalizedEndpoint, data, response.status);
      
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
        
        // For user account endpoints, empty object usually means API error or missing endpoint
        if (normalizedEndpoint.includes('users_accounts') || 
            normalizedEndpoint.includes('get_users')) {
          devError('Empty object response from', normalizedEndpoint, '- API may not exist or is not returning data');
          return {
            success: false,
            data: {
              success: false,
              message: 'API returned empty response. Please check if the endpoint exists and returns JSON data.',
              endpoint: normalizedEndpoint,
              status: response.status
            },
            status: response.status || 500
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
    
    // Log API error
    logger.logAPIError(normalizedEndpoint, error, body);
    
    // Provide more detailed error messages
    let errorMessage = error.message || 'Network error';
    let detailedMessage = '';
    
    const currentUrl = getWorkingApiUrl();
    const attemptedUrl = `${currentUrl}${normalizedEndpoint}`;
    
    // Check for specific error types
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      errorMessage = 'Cannot connect to server (CORS or Network Issue) - Tried all available servers';
      detailedMessage = `Unable to reach any API server. Tried: ${urlsToTry.join(', ')}\n\n⚠️ MOST LIKELY ISSUE: CORS Headers Missing or Server Down\n\nYour PHP API file (login.php) needs CORS headers at the top.\n\nQuick Fix - Add these lines to the TOP of your login.php file:\n\n<?php\nheader('Access-Control-Allow-Origin: *');\nheader('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');\nheader('Access-Control-Allow-Headers: Content-Type, Authorization');\n\nif ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {\n    http_response_code(200);\n    exit();\n}\n\nSee API_CORS_FIX.md for complete instructions.\n\nOther Troubleshooting Steps:\n\n1. Check WAMP Server Status:\n   - Open WAMP server control panel\n   - Ensure Apache and MySQL services are running (green icon)\n   - If red, click "Start All Services"\n\n2. Verify API Folder Location:\n   - Check if folder exists: C:\\wamp64\\www\\restuarent\\api\\\n   - Ensure login.php file exists in that folder\n\n3. Test API in Browser:\n   - Open: http://localhost/restuarent/api/login.php\n   - You should see a response (even if it's an error message)\n   - If you see "404 Not Found", the path is incorrect\n   - If page doesn't load, Apache might not be running\n\n4. Check Browser Network Tab:\n   - Press F12 → Network tab\n   - Try to login again\n   - Look for the login.php request\n   - If it shows "CORS error" or "blocked", add CORS headers to PHP file`;
    } else if (error.message.includes('CORS')) {
      errorMessage = 'CORS (Cross-Origin) Error';
      detailedMessage = `The server is blocking the request due to CORS policy.\n\nSolution: Add CORS headers to your PHP API files:\n\n<?php\nheader('Access-Control-Allow-Origin: *');\nheader('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');\nheader('Access-Control-Allow-Headers: Content-Type, Authorization');\n?>\n\nTried URLs: ${urlsToTry.join(', ')}`;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request Timeout';
      detailedMessage = `The server took too long to respond.\n\nPossible causes:\n- Server is overloaded\n- Database connection issues\n- Network problems\n\nTried URLs: ${urlsToTry.join(', ')}`;
    }
    
    return {
      success: false,
      data: { 
        success: false,
        message: errorMessage,
        details: detailedMessage || errorMessage,
        endpoint: normalizedEndpoint,
        apiUrl: attemptedUrl,
        triedUrls: urlsToTry,
        errorType: error.name || 'Unknown',
        troubleshooting: true,
      },
      status: 0,
    };
  }
};

/**
 * Make PUT request to API (Update) with automatic fallback to localhost
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
  
  // Determine URLs to try (cached working URL first, then primary, then fallback)
  const currentWorkingUrl = getWorkingApiUrl();
  const urlsToTry = [currentWorkingUrl];
  
  const shouldTryPrimary = PRIMARY_API_URL && 
                           !PRIMARY_API_URL.includes('localhost') && 
                           PRIMARY_API_URL.trim() !== '';
  
  if (shouldTryPrimary && PRIMARY_API_URL !== currentWorkingUrl) {
    urlsToTry.push(PRIMARY_API_URL);
  }
  if (FALLBACK_API_URL !== currentWorkingUrl && (!shouldTryPrimary || PRIMARY_API_URL !== FALLBACK_API_URL)) {
    urlsToTry.push(FALLBACK_API_URL);
  }

  try {
    const response = await fetchWithFallback(urlsToTry, (baseUrl) => {
      const fullUrl = `${baseUrl}${normalizedEndpoint}`;
      
      if (IS_DEVELOPMENT) {
        console.log('🔧 Attempting PUT:', fullUrl);
      }
      
      return fetch(fullUrl, {
        method: 'PUT',
        mode: 'cors',
        credentials: 'omit',
        headers,
        body: JSON.stringify(body),
        ...options,
      });
    });

    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    devError('API PUT Error:', normalizedEndpoint, error.message);
    // Provide more detailed error messages
    let errorMessage = error.message || 'Network error';
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      errorMessage = 'Cannot connect to server. Tried both live and localhost servers.';
    }
    
    const currentUrl = getWorkingApiUrl();
    const attemptedUrl = `${currentUrl}${normalizedEndpoint}`;
    
    return {
      success: false,
      data: { 
        success: false,
        message: errorMessage,
        endpoint: normalizedEndpoint,
        apiUrl: attemptedUrl,
        triedUrls: urlsToTry
      },
      status: 0,
    };
  }
};

/**
 * Make DELETE request to API with automatic fallback to localhost
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
  
  // Determine URLs to try (cached working URL first, then primary, then fallback)
  const currentWorkingUrl = getWorkingApiUrl();
  const urlsToTry = [currentWorkingUrl];
  
  const shouldTryPrimary = PRIMARY_API_URL && 
                           !PRIMARY_API_URL.includes('localhost') && 
                           PRIMARY_API_URL.trim() !== '';
  
  if (shouldTryPrimary && PRIMARY_API_URL !== currentWorkingUrl) {
    urlsToTry.push(PRIMARY_API_URL);
  }
  if (FALLBACK_API_URL !== currentWorkingUrl && (!shouldTryPrimary || PRIMARY_API_URL !== FALLBACK_API_URL)) {
    urlsToTry.push(FALLBACK_API_URL);
  }

  try {
    const response = await fetchWithFallback(urlsToTry, (baseUrl) => {
      const fullUrl = `${baseUrl}${normalizedEndpoint}`;
      
      if (IS_DEVELOPMENT) {
        console.log('🔧 Attempting DELETE:', fullUrl);
      }
      
      const fetchOptions = {
        method: 'DELETE',
        mode: 'cors',
        credentials: 'omit',
        headers,
        ...options,
      };

      // Include body if provided (some DELETE requests need body)
      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }
      
      return fetch(fullUrl, fetchOptions);
    });

    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    devError('API DELETE Error:', normalizedEndpoint, error.message);
    // Provide more detailed error messages
    let errorMessage = error.message || 'Network error';
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      errorMessage = 'Cannot connect to server. Tried both live and localhost servers.';
    }
    
    const currentUrl = getWorkingApiUrl();
    const attemptedUrl = `${currentUrl}${normalizedEndpoint}`;
    
    return {
      success: false,
      data: { 
        success: false,
        message: errorMessage,
        endpoint: normalizedEndpoint,
        apiUrl: attemptedUrl,
        triedUrls: urlsToTry
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
 * Test API connection with automatic fallback
 * @returns {Promise<Object>} Connection test result
 */
export const testConnection = async () => {
  // Determine URLs to try
  const currentWorkingUrl = getWorkingApiUrl();
  const urlsToTry = [currentWorkingUrl];
  
  const shouldTryPrimary = PRIMARY_API_URL && 
                           !PRIMARY_API_URL.includes('localhost') && 
                           PRIMARY_API_URL.trim() !== '';
  
  if (shouldTryPrimary && PRIMARY_API_URL !== currentWorkingUrl) {
    urlsToTry.push(PRIMARY_API_URL);
  }
  if (FALLBACK_API_URL !== currentWorkingUrl && (!shouldTryPrimary || PRIMARY_API_URL !== FALLBACK_API_URL)) {
    urlsToTry.push(FALLBACK_API_URL);
  }

  try {
    const response = await fetchWithFallback(urlsToTry, (baseUrl) => {
      return fetch(`${baseUrl}/test_connection.php`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
    
    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { success: false, message: 'Invalid response', raw: text.substring(0, 200) };
    }
    
    const workingUrl = getWorkingApiUrl();
    
    return {
      success: response.ok,
      data,
      status: response.status,
      url: `${workingUrl}/test_connection.php`,
      testedUrls: urlsToTry,
    };
  } catch (error) {
    return {
      success: false,
      data: {
        success: false,
        message: error.message,
        error: 'Cannot connect to any API server',
      },
      status: 0,
      url: `${getWorkingApiUrl()}/test_connection.php`,
      testedUrls: urlsToTry,
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

