'use client';

/**
 * Account Management Page
 * Super Admin can add new users with roles (admin, order_taker, accountant)
 */

import { useEffect, useState, useCallback } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiGet, apiDelete, getTerminal, generateToken, getRole } from '@/utils/api';
import { useRouter } from 'next/navigation';

export default function AccountManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullname: '',
    role: 'order_taker', // branch_admin, order_taker, accountant, kitchen (only super_admin can add)
    branch_id: '', // Branch assignment
    status: 'Active',
    terminal: 1,
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [debugResponse, setDebugResponse] = useState(null);

  /**
   * Fetch all branches from API
   * API: branch_management.php (POST with action: 'get')
   */
  const fetchBranches = async () => {
    try {
      console.log('=== FETCHING BRANCHES ===');
      
      // Try apiGet first (as used in branches page)
      let result = null;
      let method = 'GET';
      
      try {
        console.log('Trying apiGet method...');
        result = await apiGet('/branch_management.php');
        method = 'GET';
        console.log('✅ apiGet succeeded');
      } catch (getError) {
        console.log('apiGet failed, trying apiPost...', getError);
        try {
          result = await apiPost('/branch_management.php', { action: 'get' });
          method = 'POST';
          console.log('✅ apiPost succeeded');
        } catch (postError) {
          console.error('Both methods failed:', { getError, postError });
          throw postError;
        }
      }
      
      console.log('Branches API response:', result);
      console.log('Method used:', method);
      console.log('Full response:', JSON.stringify(result, null, 2));
      console.log('result.success:', result.success);
      console.log('result.data:', result.data);
      console.log('result.data type:', typeof result.data);
      console.log('result.data is array:', Array.isArray(result.data));
      
      // Store debug response for UI display
      setDebugResponse({
        method,
        success: result.success,
        hasData: !!result.data,
        dataType: typeof result.data,
        isArray: Array.isArray(result.data),
        dataKeys: result.data && typeof result.data === 'object' && !Array.isArray(result.data) ? Object.keys(result.data) : [],
        sampleData: result.data && Array.isArray(result.data) && result.data.length > 0 
          ? result.data[0] 
          : (result.data && typeof result.data === 'object' ? result.data : null),
        fullResponse: result
      });
      
      let branchesData = [];
      let dataFound = false;
      
      // Try to extract branches even if result.success is false (some APIs return data with success: false)
      // First check result.data
      if (result.data) {
        // Check if data is an array directly
        if (Array.isArray(result.data)) {
          branchesData = result.data;
          dataFound = true;
          console.log('✅ Found branches in result.data (array):', branchesData.length);
        } 
        // Check if data is nested: { success: true, data: [...] }
        else if (result.data.data && Array.isArray(result.data.data)) {
          branchesData = result.data.data;
          dataFound = true;
          console.log('✅ Found branches in result.data.data:', branchesData.length);
        }
        // Check if data is wrapped: { success: true, data: { branches: [...] } }
        else if (result.data.branches && Array.isArray(result.data.branches)) {
          branchesData = result.data.branches;
          dataFound = true;
          console.log('✅ Found branches in result.data.branches:', branchesData.length);
        }
        // Check if result.data has success and data nested
        else if (result.data.success && result.data.data && Array.isArray(result.data.data)) {
          branchesData = result.data.data;
          dataFound = true;
          console.log('✅ Found branches in result.data.success.data:', branchesData.length);
        }
        // Try to find any array in result.data object
        else if (typeof result.data === 'object' && !Array.isArray(result.data)) {
          for (const key in result.data) {
            if (Array.isArray(result.data[key])) {
              branchesData = result.data[key];
              dataFound = true;
              console.log(`✅ Found branches in result.data.${key}:`, branchesData.length);
              break;
            }
          }
        }
      }
      
      // Also check if result itself is an array (some APIs return array directly)
      if (!dataFound && Array.isArray(result)) {
        branchesData = result;
        dataFound = true;
        console.log('✅ Found branches in result (direct array):', branchesData.length);
      }
      
      // If still no data found, check result.data even if success is false
      if (!dataFound && result.data && typeof result.data === 'object') {
        console.log('Trying to extract data from result.data object...');
        console.log('result.data keys:', Object.keys(result.data));
        
        // Try to find any array property
        for (const key in result.data) {
          const value = result.data[key];
          console.log(`Checking result.data.${key}:`, typeof value, Array.isArray(value));
          if (Array.isArray(value)) {
            branchesData = value;
            dataFound = true;
            console.log(`✅ Found branches in result.data.${key}:`, branchesData.length);
            break;
          }
        }
      }
      
      // Handle empty object response {}
      if (!dataFound && result.data && typeof result.data === 'object' && Object.keys(result.data).length === 0) {
        console.error('❌ API returned empty object {}');
        console.error('This usually means:');
        console.error('1. The API endpoint exists but returned no data');
        console.error('2. The API requires authentication or specific parameters');
        console.error('3. There are no branches in the database');
        console.error('4. The API method (GET vs POST) is incorrect');
        
        setAlert({ 
          type: 'warning', 
          message: `Branches API returned empty response ({}). Method used: ${method}. This could mean: 1) No branches exist in database, 2) API requires different method/parameters, or 3) Authentication issue. Check console for details.` 
        });
      } else if (!dataFound) {
        console.error('❌ No branches array found in response');
        console.error('Response structure:', {
          method,
          success: result.success,
          hasData: !!result.data,
          dataType: typeof result.data,
          dataKeys: result.data && typeof result.data === 'object' && !Array.isArray(result.data) ? Object.keys(result.data) : [],
          fullResult: result
        });
        
        if (!result.success) {
          setAlert({ 
            type: 'warning', 
            message: `Branches API returned an error (method: ${method}). Check console for details. Trying alternative method...` 
          });
        }
      }
      
      // Ensure branch_id and branch_name fields exist with proper normalization
      if (branchesData.length > 0) {
        branchesData = branchesData
          .filter(branch => branch !== null && branch !== undefined) // Filter out null/undefined
          .map(branch => {
            // Extract branch ID - try all possible field names
            const branchId = branch.branch_id || branch.id || branch.ID || branch.branchId || branch.BranchID;
            // Extract branch name - try all possible field names
            const branchName = branch.branch_name || branch.name || branch.Name || branch.branchName || branch.BranchName || `Branch ${branchId}`;
            // Extract branch code - try all possible field names
            const branchCode = branch.branch_code || branch.code || branch.Code || branch.branchCode || branch.BranchCode || '';
            
            console.log('Processing branch:', { 
              original: branch, 
              branchId, 
              branchName, 
              branchCode 
            });
            
            return {
              branch_id: branchId,
              branch_name: branchName,
              branch_code: branchCode,
              // Keep all original fields for compatibility
              ...branch,
              // Override with normalized values
              id: branchId,
              name: branchName,
              code: branchCode,
            };
          });
        
        // Remove duplicates based on branch_id
        const uniqueBranches = branchesData.reduce((acc, branch) => {
          const existing = acc.find(b => {
            const bId = String(b.branch_id || b.id || '');
            const newId = String(branch.branch_id || branch.id || '');
            return bId === newId && bId !== '';
          });
          if (!existing) {
            acc.push(branch);
          }
          return acc;
        }, []);
        
        setBranches(uniqueBranches);
        console.log('=== BRANCHES LOADED SUCCESSFULLY ===');
        console.log('Total branches:', uniqueBranches.length);
        console.log('Branches data:', uniqueBranches);
        console.log('Branch IDs:', uniqueBranches.map(b => b.branch_id));
        console.log('Branch Names:', uniqueBranches.map(b => b.branch_name));
        
        // Clear any previous error alerts if branches loaded successfully
        setAlert(prev => {
          if (prev.type === 'error' || prev.type === 'warning' || prev.type === 'info') {
            if (prev.message.includes('branches') || prev.message.includes('branch')) {
              return { type: '', message: '' };
            }
          }
          return prev;
        });
      } else {
        console.warn('⚠️ No branches found in response. Full response:', result);
        setBranches([]);
        if (!result.success) {
          setAlert({ 
            type: 'warning', 
            message: 'Branches API returned an error. Please check console for details. You can still create users, but branch assignment will not be available.' 
          });
        } else {
          setAlert({ 
            type: 'info', 
            message: 'No branches found in the system. Please add branches first before creating users.' 
          });
        }
      }
    } catch (error) {
      console.error('❌ Error fetching branches:', error);
      setBranches([]);
      setAlert({ 
        type: 'error', 
        message: 'Failed to load branches: ' + (error.message || 'Network error') 
      });
    }
  };

  /**
   * Get branch name from branch_id
   * Using useCallback to ensure it always has the latest branches array
   */
  const getBranchName = useCallback((branchId) => {
    // If branches are not loaded yet, return a placeholder
    if (!branches || branches.length === 0) {
      if (branchId && branchId !== null && branchId !== 'null' && branchId !== '' && branchId !== undefined) {
        return `Branch #${branchId} (Loading...)`;
      }
      return 'No Branch';
    }
    
    if (!branchId || branchId === null || branchId === 'null' || branchId === '' || branchId === undefined) {
      return 'No Branch';
    }
    
    // Convert to number for comparison (handle both string and number)
    const branchIdNum = typeof branchId === 'number' ? branchId : parseInt(String(branchId), 10);
    if (isNaN(branchIdNum)) {
      return 'No Branch';
    }
    
    // Find branch in branches array - try multiple comparison methods
    const branch = branches.find(b => {
      // Try multiple field names and comparison methods
      const bId = b.branch_id || b.id || b.ID;
      const bIdNum = typeof bId === 'number' ? bId : parseInt(String(bId), 10);
      
      // Compare as numbers
      if (!isNaN(bIdNum) && bIdNum === branchIdNum) {
        return true;
      }
      
      // Also try string comparison
      if (String(bId) === String(branchId) || String(bId) === String(branchIdNum)) {
        return true;
      }
      
      return false;
    });
    
    if (branch) {
      const branchName = branch.branch_name || branch.name || branch.Name || `Branch ${branch.branch_id || branch.id}`;
      const branchCode = branch.branch_code || branch.code || branch.Code || '';
      return branchCode ? `${branchName} (${branchCode})` : branchName;
    } else {
      // Branch ID exists but branch not found in branches array
      // This might mean the branch was deleted or not loaded
      console.warn(`Branch #${branchIdNum} not found in branches array. Available branches:`, branches.map(b => b.branch_id));
      return `Branch #${branchIdNum}`;
    }
  }, [branches]);

  /**
   * Fetch all users from API
   * API: get_users_accounts.php (POST with terminal parameter)
   * Note: This function should be called after branches are loaded
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    try {
      const terminal = getTerminal();
      
      console.log('=== FETCHING USERS ===');
      console.log('Terminal:', terminal);
      console.log('API Endpoint: /get_users_accounts.php');
      console.log('Request params:', { terminal });
      
      const result = await apiPost('/get_users_accounts.php', { terminal });
      
      console.log('=== API RESPONSE ===');
      console.log('Full result:', JSON.stringify(result, null, 2));
      console.log('result.success:', result.success);
      console.log('result.data:', result.data);
      console.log('result.data type:', typeof result.data);
      console.log('result.data is array:', Array.isArray(result.data));
      if (result.data && typeof result.data === 'object') {
        console.log('result.data keys:', Object.keys(result.data));
        console.log('result.data length:', Object.keys(result.data).length);
      }
      console.log('result.status:', result.status);
      console.log('===================');
      
      let usersData = [];
      
      // Check if result.data is an empty object
      if (result.data && typeof result.data === 'object' && !Array.isArray(result.data) && Object.keys(result.data).length === 0) {
        console.error('❌ Empty object response detected');
        setAlert({ 
          type: 'error', 
          message: 'API returned empty response. The get_users_accounts.php endpoint may not exist or is not returning data. Please check: 1) File exists in API folder, 2) API accepts POST requests, 3) API returns JSON format.' 
        });
        setUsers([]);
        setLoading(false);
        return;
      }
      
      if (result.success && result.data) {
        // Check if data is an array directly
        if (Array.isArray(result.data)) {
          usersData = result.data;
          console.log('Found users in result.data (array):', usersData.length);
        } 
        // Check if data is nested: { success: true, data: [...] }
        else if (result.data.data && Array.isArray(result.data.data)) {
          usersData = result.data.data;
          console.log('Found users in result.data.data:', usersData.length);
        }
        // Check if data is wrapped: { success: true, data: { users: [...] } }
        else if (result.data.users && Array.isArray(result.data.users)) {
          usersData = result.data.users;
          console.log('Found users in result.data.users:', usersData.length);
        }
        // Check if response has success field with false
        else if (result.data.success === false) {
          console.error('Users API returned error:', result.data);
          setAlert({ type: 'error', message: result.data.message || 'Failed to load users' });
          setUsers([]);
          setLoading(false);
          return;
        }
        // Try to find any array in the response
        else if (typeof result.data === 'object') {
          for (const key in result.data) {
            if (Array.isArray(result.data[key])) {
              usersData = result.data[key];
              console.log(`Found users in result.data.${key}:`, usersData.length);
              break;
            }
          }
        }
      } else if (!result.success) {
        console.error('❌ Users API request failed');
        console.error('Result:', result);
        console.error('Status:', result.status);
        console.error('Data:', result.data);
        
        // Check if result.data is empty object
        if (result.data && typeof result.data === 'object' && Object.keys(result.data).length === 0) {
          setAlert({ 
            type: 'error', 
            message: 'API returned empty response ({}). This usually means: 1) The get_users_accounts.php file doesn\'t exist, 2) The API is not returning JSON, or 3) There\'s a server error. Please check your API folder and ensure the endpoint exists and returns proper JSON.' 
          });
        } else if (result.status === 0 || result.status === undefined) {
          setAlert({ 
            type: 'error', 
            message: 'Cannot connect to server. Please check: 1) API URL is correct in .env.local, 2) Server is running, 3) CORS is enabled on server.' 
          });
        } else {
          const errorMsg = result.data?.message || result.data?.error || result.data?.error_message || 'Failed to load users';
          setAlert({ 
            type: 'error', 
            message: `API Error: ${errorMsg}. Status: ${result.status || 'Unknown'}` 
          });
        }
        setUsers([]);
        setLoading(false);
        return;
      }
      
      // Check if result.data is empty or undefined (after success check)
      if (!result.data) {
        console.error('❌ result.data is undefined or null');
        setAlert({ 
          type: 'error', 
          message: 'API returned success but no data. Please check if get_users_accounts.php returns data in the response.' 
        });
        setUsers([]);
        setLoading(false);
        return;
      }
      
      if (typeof result.data === 'object' && !Array.isArray(result.data) && Object.keys(result.data).length === 0) {
        console.error('❌ result.data is empty object');
        setAlert({ 
          type: 'error', 
          message: 'API returned empty object. Please ensure get_users_accounts.php returns user data in JSON format.' 
        });
        setUsers([]);
        setLoading(false);
        return;
      }
      
      if (usersData.length === 0) {
        console.warn('No users found in response. Full response:', result);
        // Don't show error if it's just an empty list
        if (result.data && result.data.message) {
          setAlert({ type: 'info', message: result.data.message || 'No users found.' });
        } else {
          setAlert({ type: 'info', message: 'No users found in the system.' });
        }
      }
      
      // Map API response to match our table structure
      const mappedUsers = usersData.map((user) => {
        // Handle branch_id - could be null, undefined, empty string, or number
        let branchId = user.branch_id;
        if (branchId === '' || branchId === 'null' || branchId === null || branchId === undefined) {
          branchId = null;
        } else {
          // Ensure it's a number
          branchId = parseInt(branchId, 10);
          if (isNaN(branchId)) {
            branchId = null;
          }
        }
        
        // Get branch name using the callback function (which has latest branches)
        const branchName = getBranchName(branchId);
        
        return {
          id: user.id || user.user_id,
          username: user.username || '',
          fullname: user.fullname || user.full_name || '',
          role: user.role || 'order_taker',
          branch_id: branchId,
          branch_name: branchName, // Look up branch name from branches array
          status: user.status || 'Active',
          terminal: user.terminal || terminal,
          created_at: user.created_at || user.created_date || '',
        };
      });
      
      // Debug: Log mapped users to see branch data
      console.log('=== USER MAPPING DEBUG ===');
      console.log('Mapped users with branch data:', mappedUsers.map(u => ({
        id: u.id,
        username: u.username,
        branch_id: u.branch_id,
        branch_id_type: typeof u.branch_id,
        branch_name: u.branch_name
      })));
      console.log('Available branches for lookup:', branches.map(b => ({
        branch_id: b.branch_id,
        branch_id_type: typeof b.branch_id,
        branch_name: b.branch_name,
        branch_code: b.branch_code
      })));
      console.log('=== END DEBUG ===');
      
      setUsers(mappedUsers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAlert({ type: 'error', message: 'Failed to load users: ' + (error.message || 'Network error') });
      setLoading(false);
      setUsers([]);
    }
  }, [getBranchName, branches]);

  useEffect(() => {
    // Check if current user is super_admin
    const role = getRole();
    setCurrentUserRole(role);
    
    if (role !== 'super_admin') {
      setAlert({ type: 'error', message: 'Access denied. Only Super Admin can manage accounts.' });
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/branch-admin');
      }, 2000);
      return;
    }
    
    // Fetch branches immediately - this is critical for the page to work
    console.log('Initial page load - fetching branches...');
    fetchBranches();
  }, [router]);
  
  // Fetch branches when modal opens if they're not loaded yet
  useEffect(() => {
    if (modalOpen) {
      console.log('Modal opened. Current branches count:', branches.length);
      if (branches.length === 0) {
        console.log('No branches loaded, fetching branches...');
        fetchBranches();
      } else {
        console.log('Branches already loaded:', branches.length);
      }
    }
  }, [modalOpen, branches.length]);
  
  // Also try to fetch branches periodically if they're not loaded (retry mechanism)
  useEffect(() => {
    if (currentUserRole === 'super_admin' && branches.length === 0) {
      const retryInterval = setInterval(() => {
        console.log('Retrying branch fetch (branches still empty)...');
        fetchBranches();
      }, 5000); // Retry every 5 seconds
      
      return () => clearInterval(retryInterval);
    }
  }, [currentUserRole, branches.length]);

  // Fetch users after branches are loaded (to ensure branch names can be looked up)
  // Also fetch if branches array is empty (might be no branches yet, but still fetch users)
  useEffect(() => {
    if (currentUserRole === 'super_admin') {
      // Fetch users regardless of branches count - branch names will be updated later
      console.log('Fetching users. Branches count:', branches.length);
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserRole]);

  // Update branch names in existing users when branches change (e.g., after a branch is added)
  useEffect(() => {
    if (branches.length > 0 && users.length > 0) {
      console.log('Branches loaded, updating branch names for users...');
      setUsers(prevUsers => {
        const updatedUsers = prevUsers.map((user) => {
          const branchName = getBranchName(user.branch_id);
          return {
            ...user,
            branch_name: branchName,
          };
        });
        // Check if any branch names changed
        const hasChanges = updatedUsers.some((user, index) => 
          user.branch_name !== prevUsers[index].branch_name
        );
        if (hasChanges) {
          console.log('✅ Updated branch names for existing users');
          console.log('Updated users:', updatedUsers.map(u => ({
            id: u.id,
            username: u.username,
            branch_id: u.branch_id,
            branch_name: u.branch_name
          })));
          return updatedUsers;
        }
        return prevUsers; // No changes, return previous state
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length, getBranchName]);
  
  // Also update branch names when branches array changes (not just length)
  useEffect(() => {
    if (branches.length > 0 && users.length > 0) {
      // Force update branch names when branches data changes
      setUsers(prevUsers => prevUsers.map(user => ({
        ...user,
        branch_name: getBranchName(user.branch_id)
      })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches]);

  /**
   * Handle form submission (Create or Update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    // Validate password match for new users
    if (!editingUser && formData.password !== confirmPassword) {
      setAlert({ type: 'error', message: 'Passwords do not match!' });
      return;
    }

    // Validate password length
    if (!editingUser && formData.password.length < 6) {
      setAlert({ type: 'error', message: 'Password must be at least 6 characters long!' });
      return;
    }

    // Validate branch selection (required for non-super_admin roles)
    if (formData.role !== 'super_admin' && !formData.branch_id) {
      setAlert({ type: 'error', message: 'Please select a branch for this user!' });
      return;
    }

    try {
      const terminal = getTerminal();
      // Generate token for new users
      const token = editingUser ? formData.token || '' : generateToken();
      
      // Convert branch_id to number or null
      // Note: Super Admin role is not in the roles list, so all users need a branch
      let branchIdValue = null;
      if (formData.branch_id && formData.branch_id !== '') {
        branchIdValue = parseInt(formData.branch_id, 10);
        if (isNaN(branchIdValue)) {
          setAlert({ type: 'error', message: 'Invalid branch selection' });
          return;
        }
      } else if (formData.role !== 'super_admin') {
        // Branch is required for all roles except super_admin
        setAlert({ type: 'error', message: 'Please select a branch for this user!' });
        return;
      }
      
      const data = {
        id: editingUser ? editingUser.id : '', // Empty for create
        username: formData.username,
        password: formData.password || '', // Empty if not provided (for updates)
        fullname: formData.fullname,
        token: token,
        role: formData.role,
        branch_id: branchIdValue, // Send as number or null
        status: formData.status,
        terminal: terminal,
      };

      // Debug: Log the data being sent
      console.log('Sending user data to API:', {
        ...data,
        password: data.password ? '***' : '(empty)',
        token: token ? '***' : '(empty)'
      });

      const result = await apiPost('/createaccount.php', data);

      // Debug: Log API response
      console.log('API Response:', {
        success: result.success,
        data: result.data,
        fullResponse: result
      });

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'User saved successfully!' });
        setFormData({
          username: '',
          password: '',
          fullname: '',
          role: 'order_taker',
          branch_id: '',
          status: 'Active',
          terminal: 1,
        });
        setConfirmPassword('');
        setEditingUser(null);
        setModalOpen(false);
        fetchUsers(); // Refresh list
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to save user' });
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setAlert({ type: 'error', message: 'Failed to save user: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (user) => {
    setEditingUser(user);
    // Convert branch_id to string for select element (null/undefined becomes empty string)
    const branchIdValue = user.branch_id ? String(user.branch_id) : '';
    setFormData({
      username: user.username,
      password: '', // Don't show password
      fullname: user.fullname,
      role: user.role,
      branch_id: branchIdValue,
      status: user.status || 'Active',
      terminal: user.terminal || 1,
    });
    setConfirmPassword('');
    setModalOpen(true);
  };

  /**
   * Handle delete button click
   */
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const result = await apiPost('/delete_users.php', { id });

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'User deleted successfully!' });
        fetchUsers(); // Refresh list
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to delete user' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setAlert({ type: 'error', message: 'Failed to delete user: ' + (error.message || 'Network error') });
    }
  };

  /**
   * Get role badge color
   */
  const getRoleColor = (role) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-800',
      branch_admin: 'bg-blue-100 text-blue-800',
      admin: 'bg-blue-100 text-blue-800',
      order_taker: 'bg-green-100 text-green-800',
      accountant: 'bg-indigo-100 text-indigo-800',
      kitchen: 'bg-orange-100 text-orange-800',
    };
    return colors[role] || colors.order_taker;
  };

  /**
   * Table columns configuration
   */
  const columns = [
    { header: 'ID', accessor: 'id', className: 'w-20' },
    { header: 'Username', accessor: 'username', className: 'min-w-[150px]' },
    { header: 'Full Name', accessor: 'fullname', className: 'min-w-[150px]' },
    {
      header: 'Role',
      accessor: (row) => {
        // Format role name for display
        const formatRoleName = (role) => {
          const roleNames = {
            super_admin: 'Super Admin',
            branch_admin: 'Branch Admin',
            admin: 'Admin',
            order_taker: 'Order Taker',
            accountant: 'Accountant',
            kitchen: 'Kitchen',
          };
          return roleNames[role] || role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        };
        
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(row.role)}`}>
            {formatRoleName(row.role)}
          </span>
        );
      },
      className: 'min-w-[120px]',
    },
    {
      header: 'Branch',
      accessor: (row) => {
        // Always use getBranchName to ensure we have the latest branch data
        let displayName = getBranchName(row.branch_id);
        
        // If still no branch name and we have branch_id, show the ID
        if ((!displayName || displayName === 'No Branch' || displayName.includes('Loading')) && row.branch_id) {
          // Try to find branch directly from branches array
          const branch = branches.find(b => {
            const bId = parseInt(b.branch_id || b.id, 10);
            const uId = parseInt(row.branch_id, 10);
            return bId === uId;
          });
          
          if (branch) {
            displayName = `${branch.branch_name}${branch.branch_code ? ` (${branch.branch_code})` : ''}`;
          } else {
            displayName = `Branch #${row.branch_id}`;
          }
        }
        
        return (
          <span className="text-sm text-gray-700 font-medium">
            {displayName || 'No Branch'}
          </span>
        );
      },
      className: 'min-w-[150px]',
    },
    {
      header: 'Status',
      accessor: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          row.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {row.status}
        </span>
      ),
      className: 'w-24',
    },
    { header: 'Terminal', accessor: 'terminal', className: 'w-20 text-center' },
    { header: 'Created', accessor: 'created_at', className: 'w-40 text-sm text-gray-600' },
  ];

  /**
   * Table actions (Edit and Delete buttons)
   */
  const actions = (row) => (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleEdit(row)}
      >
        Edit
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={() => handleDelete(row.id)}
      >
        Delete
      </Button>
    </div>
  );

  // Roles that Super Admin can create (not including super_admin itself)
  const roles = [
    { value: 'branch_admin', label: 'Branch Admin' },
    { value: 'order_taker', label: 'Order Taker' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'kitchen', label: 'Kitchen Staff' },
  ];

  // Only show page content if user is super_admin
  if (currentUserRole !== 'super_admin') {
    return (
      <SuperAdminLayout>
        <div className="space-y-6">
          <Alert
            type="error"
            message="Access denied. Only Super Admin can manage accounts."
          />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Account Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Super Admin can add users with roles and assign them to branches
              {branches.length > 0 && (
                <span className="ml-2 text-green-600">({branches.length} branches loaded)</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchBranches}
              className="w-full sm:w-auto"
              title="Refresh branches list"
            >
              Refresh Branches
            </Button>
            <Button
              onClick={() => {
                // Ensure branches are loaded before opening modal
                if (branches.length === 0) {
                  fetchBranches();
                }
                setEditingUser(null);
                setFormData({
                  username: '',
                  password: '',
                  fullname: '',
                  role: 'order_taker',
                  branch_id: '',
                  status: 'Active',
                  terminal: 1,
                });
                setConfirmPassword('');
                setModalOpen(true);
              }}
              className="w-full sm:w-auto"
            >
              + Add User
            </Button>
          </div>
        </div>

        {/* Alert Message */}
        {alert.message && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert({ type: '', message: '' })}
          />
        )}
        
        {/* Branch Status Indicator */}
        {currentUserRole === 'super_admin' && (
          <div className="space-y-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-900">
                  Branches Status:
                </span>
                {branches.length > 0 ? (
                  <span className="text-sm text-blue-700">
                    ✅ {branches.length} branch{branches.length !== 1 ? 'es' : ''} loaded
                  </span>
                ) : (
                  <span className="text-sm text-orange-600">
                    ⚠️ No branches loaded. Click "Refresh Branches" to load.
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBranches}
                className="text-xs"
              >
                🔄 Refresh
              </Button>
            </div>
            
            {/* Debug Info - Show API Response Structure */}
                    {debugResponse && branches.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <details className="cursor-pointer">
                  <summary className="text-sm font-medium text-yellow-900 mb-2">
                    🔍 Debug: API Response Structure (Click to expand)
                  </summary>
                  <div className="mt-2 text-xs space-y-1 font-mono bg-white p-2 rounded border">
                    <div><strong>Method Used:</strong> {debugResponse.method || 'Unknown'}</div>
                    <div><strong>Success:</strong> {String(debugResponse.success)}</div>
                    <div><strong>Has Data:</strong> {String(debugResponse.hasData)}</div>
                    <div><strong>Data Type:</strong> {debugResponse.dataType || 'N/A'}</div>
                    <div><strong>Is Array:</strong> {String(debugResponse.isArray)}</div>
                    {debugResponse.dataKeys && debugResponse.dataKeys.length > 0 && (
                      <div><strong>Data Keys:</strong> {debugResponse.dataKeys.join(', ')}</div>
                    )}
                    {debugResponse.dataKeys && debugResponse.dataKeys.length === 0 && debugResponse.hasData && (
                      <div className="text-red-600"><strong>⚠️ Empty Object:</strong> API returned {} (empty object)</div>
                    )}
                    {debugResponse.sampleData && (
                      <div className="mt-2">
                        <strong>Sample Data:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(debugResponse.sampleData, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div className="mt-2">
                      <strong>Full Response:</strong>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                        {JSON.stringify(debugResponse.fullResponse, null, 2)}
                      </pre>
                    </div>
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                      <strong>💡 Troubleshooting:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>If "Method Used" is POST, try clicking "Refresh Branches" to try GET method</li>
                        <li>If "Empty Object" appears, the API might need authentication or different parameters</li>
                        <li>Check if branches exist in the database via the Branches management page</li>
                        <li>Verify the API endpoint exists and is accessible</li>
                      </ul>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
            <p className="text-sm sm:text-base text-gray-500">Loading users...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={users}
            actions={actions}
            emptyMessage="No users found. Click 'Add User' to create one."
          />
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingUser(null);
            setFormData({
              username: '',
              password: '',
              fullname: '',
              role: 'order_taker',
              branch_id: '',
              status: 'Active',
              terminal: 1,
            });
            setConfirmPassword('');
          }}
          title={editingUser ? 'Edit User' : 'Add New User'}
          size="md"
        >
          <form onSubmit={handleSubmit}>
            <Input
              label="Username"
              name="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="e.g., user@restaurant.com"
              required
            />

            <Input
              label="Full Name"
              name="fullname"
              value={formData.fullname}
              onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
              placeholder="e.g., John Doe"
              required
            />

            <Input
              label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
              name="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
              required={!editingUser}
            />

            {(!editingUser || formData.password) && (
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required={!editingUser || formData.password}
              />
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Branch <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">(Required for all roles except Super Admin)</span>
              </label>
              <div className="relative">
                <select
                  name="branch_id"
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  required={formData.role !== 'super_admin'}
                  className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                  disabled={formData.role === 'super_admin'}
                >
                  <option value="">
                    {formData.role === 'super_admin' 
                      ? 'No Branch (Super Admin)' 
                      : branches.length === 0 
                        ? 'Loading branches...' 
                        : 'Select a branch'}
                  </option>
                  {branches.length === 0 ? (
                    <option value="" disabled>
                      {modalOpen ? 'No branches available. Click "Refresh Branches" button above.' : 'Loading branches...'}
                    </option>
                  ) : (
                    branches.map((branch) => {
                      const branchId = branch.branch_id || branch.id || branch.ID;
                      const branchName = branch.branch_name || branch.name || branch.Name || `Branch ${branchId}`;
                      const branchCode = branch.branch_code || branch.code || branch.Code || '';
                      const displayText = branchCode 
                        ? `${branchName} (${branchCode})` 
                        : branchName;
                      
                      return (
                        <option key={branchId} value={String(branchId)}>
                          {displayText}
                        </option>
                      );
                    })
                  )}
                </select>
                {branches.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {branches.length} branch{branches.length !== 1 ? 'es' : ''} available
                  </p>
                )}
                {branches.length === 0 && formData.role !== 'super_admin' && (
                  <div className="mt-2">
                    <p className="text-xs text-red-500 mb-2">
                      Branches are not loaded. Please:
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        fetchBranches();
                      }}
                      className="text-xs"
                    >
                      Reload Branches
                    </Button>
                  </div>
                )}
              </div>
              {formData.role === 'super_admin' && (
                <p className="text-xs text-gray-500 mt-1">Super Admin users don't require a branch assignment</p>
              )}
            </div>

            <Input
              label="Terminal"
              name="terminal"
              type="number"
              value={formData.terminal}
              onChange={(e) => setFormData({ ...formData, terminal: e.target.value })}
              placeholder="Terminal number"
              required
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingUser(null);
                  setFormData({
                    username: '',
                    password: '',
                    fullname: '',
                    role: 'order_taker',
                    branch_id: '',
                    status: 'Active',
                    terminal: 1,
                  });
                  setConfirmPassword('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}

