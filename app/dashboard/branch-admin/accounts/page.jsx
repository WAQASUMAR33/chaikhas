'use client';

/**
 * Account Management Page
 * Super Admin can add new users with roles (admin, order_taker, accountant)
 */

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, apiDelete, getTerminal, generateToken, getRole } from '@/utils/api';
import { useRouter } from 'next/navigation';

export default function AccountManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullname: '',
    role: 'order_taker', // admin, order_taker, accountant (only super_admin can add)
    status: 'Active',
    terminal: 1,
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [currentUserRole, setCurrentUserRole] = useState(null);

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
    
    fetchUsers();
  }, [router]);

  /**
   * Fetch all users from API
   * API: get_users_accounts.php (POST with terminal parameter)
   */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      const result = await apiPost('/get_users_accounts.php', { terminal });
      
      // The API returns a plain JSON array
      if (result.data && Array.isArray(result.data)) {
        // Map API response to match our table structure
        const mappedUsers = result.data.map((user) => ({
          id: user.id,
          username: user.username,
          fullname: user.fullname,
          role: user.role,
          status: user.status || 'Active',
          terminal: user.terminal || terminal,
          created_at: user.created_at || '',
        }));
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
  };

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

    try {
      const terminal = getTerminal();
      // Generate token for new users
      const token = editingUser ? formData.token || '' : generateToken();
      
      const data = {
        id: editingUser ? editingUser.id : '', // Empty for create
        username: formData.username,
        password: formData.password || '', // Empty if not provided (for updates)
        fullname: formData.fullname,
        token: token,
        role: formData.role,
        status: formData.status,
        terminal: terminal,
      };

      const result = await apiPost('/createaccount.php', data);

      if (result.success && result.data && result.data.success) {
        setAlert({ type: 'success', message: result.data.message || 'User saved successfully!' });
        setFormData({
          username: '',
          password: '',
          fullname: '',
          role: 'order_taker',
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
    setFormData({
      username: user.username,
      password: '', // Don't show password
      fullname: user.fullname,
      role: user.role,
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
    { header: 'ID', accessor: 'id' },
    { header: 'Username', accessor: 'username' },
    { header: 'Full Name', accessor: 'fullname' },
    {
      header: 'Role',
      accessor: (row) => {
        // Format role name for display
        const formatRoleName = (role) => {
          const roleNames = {
            super_admin: 'Super Admin',
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
    },
    { header: 'Terminal', accessor: 'terminal' },
    { header: 'Created', accessor: 'created_at' },
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
    { value: 'admin', label: 'Admin' },
    { value: 'order_taker', label: 'Order Taker' },
    { value: 'accountant', label: 'Accountant' },
  ];

  // Only show page content if user is super_admin
  if (currentUserRole !== 'super_admin') {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Alert
            type="error"
            message="Access denied. Only Super Admin can manage accounts."
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
            <p className="text-gray-600 mt-1">Super Admin can add Admin, Order Taker, and Accountant roles</p>
          </div>
          <Button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                username: '',
                password: '',
                fullname: '',
                role: 'order_taker',
                status: 'Active',
                terminal: 1,
              });
              setConfirmPassword('');
              setModalOpen(true);
            }}
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
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Loading users...</p>
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
    </AdminLayout>
  );
}

