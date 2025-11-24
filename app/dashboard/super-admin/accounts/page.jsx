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
import { apiPost, apiDelete, apiGet, getTerminal, generateToken, getRole } from '@/utils/api';
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

  /**
   * Fetch all branches from API
   * API: branch_management.php (GET)
   */
  const fetchBranches = async () => {
    try {
      const result = await apiGet('/branch_management.php');
      if (result.success && result.data) {
        const data = Array.isArray(result.data) ? result.data : (result.data.data || []);
        setBranches(data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  /**
   * Get branch name from branch_id
   * Using useCallback to ensure it always has the latest branches array
   */
  const getBranchName = useCallback((branchId) => {
    // If branches are not loaded yet, return a placeholder
    if (!branches || branches.length === 0) {
      if (branchId && branchId !== null && branchId !== 'null' && branchId !== '') {
        return `Branch #${branchId} (Loading...)`;
      }
      return 'No Branch';
    }
    
    if (!branchId || branchId === null || branchId === 'null' || branchId === '' || branchId === undefined) {
      return 'No Branch';
    }
    
    // Convert to number for comparison
    const branchIdNum = parseInt(branchId, 10);
    if (isNaN(branchIdNum)) {
      return 'No Branch';
    }
    
    // Find branch in branches array
    const branch = branches.find(b => {
      const bId = parseInt(b.branch_id, 10);
      return bId === branchIdNum;
    });
    
    if (branch) {
      return `${branch.branch_name} (${branch.branch_code})`;
    } else {
      // Branch ID exists but branch not found in branches array
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
    try {
      const terminal = getTerminal();
      const result = await apiPost('/get_users_accounts.php', { terminal });
      
      // The API returns a plain JSON array
      if (result.data && Array.isArray(result.data)) {
        // Map API response to match our table structure
        const mappedUsers = result.data.map((user) => {
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
            id: user.id,
            username: user.username,
            fullname: user.fullname,
            role: user.role,
            branch_id: branchId,
            branch_name: branchName, // Look up branch name from branches array
            status: user.status || 'Active',
            terminal: user.terminal || terminal,
            created_at: user.created_at || '',
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
      } else if (result.data && result.data.success === false) {
        // Error response
        setAlert({ type: 'error', message: result.data.message || 'Failed to load users' });
        setUsers([]);
      } else {
        // Empty result
        setUsers([]);
      }
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
    
    fetchBranches();
  }, [router]);

  // Fetch users after branches are loaded (to ensure branch names can be looked up)
  useEffect(() => {
    if (currentUserRole === 'super_admin' && branches.length > 0) {
      console.log('Fetching users now that branches are loaded. Branches count:', branches.length);
      fetchUsers();
    }
  }, [currentUserRole, branches.length, fetchUsers]);

  // Update branch names in existing users when branches change (e.g., after a branch is added)
  useEffect(() => {
    if (branches.length > 0 && users.length > 0) {
      setUsers(prevUsers => {
        const updatedUsers = prevUsers.map((user) => ({
          ...user,
          branch_name: getBranchName(user.branch_id),
        }));
        // Check if any branch names changed
        const hasChanges = updatedUsers.some((user, index) => 
          user.branch_name !== prevUsers[index].branch_name
        );
        if (hasChanges) {
          console.log('Updating branch names for existing users');
          return updatedUsers;
        }
        return prevUsers; // No changes, return previous state
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length, getBranchName]);

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
        // If branch_name is not set or is "No Branch", try to look it up again
        let displayName = row.branch_name;
        if (!displayName || displayName === 'No Branch' || displayName === 'Branch #undefined') {
          // Try to get branch name again using current branches
          displayName = getBranchName(row.branch_id);
        }
        return (
          <span className="text-sm text-gray-700 font-medium">
            {displayName || (row.branch_id ? `Branch #${row.branch_id}` : 'No Branch')}
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
            <p className="text-sm sm:text-base text-gray-600 mt-1">Super Admin can add users with roles and assign them to branches</p>
          </div>
          <Button
            onClick={() => {
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

        {/* Alert Message */}
        {alert.message && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert({ type: '', message: '' })}
          />
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
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                required={formData.role !== 'super_admin'}
                className="block w-full px-3 py-2.5 border border-[#E0E0E0] rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15] transition"
                disabled={formData.role === 'super_admin'}
              >
                <option value="">{formData.role === 'super_admin' ? 'No Branch (Super Admin)' : 'Select a branch'}</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.branch_name} ({branch.branch_code})
                  </option>
                ))}
              </select>
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

