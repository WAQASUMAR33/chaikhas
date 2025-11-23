'use client';

/**
 * Super Admin - Branch Management Page
 * Create, update, delete branches
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getRole, apiGet, apiPost, apiDelete } from '@/utils/api';
import { Building2, PlusCircle, Edit, Trash2, Save, X } from 'lucide-react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Modal from '@/components/ui/Modal';

export default function BranchManagementPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    address: '',
    phone: '',
    email: '',
    status: 'Active'
  });

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token || role !== 'super_admin') {
      router.push('/login');
      return;
    }

    fetchBranches();
  }, [router]);

  /**
   * Fetch all branches
   */
  const fetchBranches = async () => {
    setLoading(true);
    try {
      const result = await apiGet('/branch_management.php');
      if (result.success && result.data) {
        const data = Array.isArray(result.data) ? result.data : (result.data.data || []);
        setBranches(data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setAlert({ type: 'error', message: 'Failed to load branches' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Open modal for creating new branch
   */
  const handleCreate = () => {
    setEditingBranch(null);
    setFormData({
      branch_name: '',
      branch_code: '',
      address: '',
      phone: '',
      email: '',
      status: 'Active'
    });
    setModalOpen(true);
  };

  /**
   * Open modal for editing branch
   */
  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      branch_name: branch.branch_name || '',
      branch_code: branch.branch_code || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      status: branch.status || 'Active'
    });
    setModalOpen(true);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.branch_name || !formData.branch_code) {
      setAlert({ type: 'error', message: 'Branch name and code are required' });
      return;
    }

    try {
      const payload = {
        ...formData,
        branch_id: editingBranch?.branch_id || undefined
      };

      const result = await apiPost('/branch_management.php', payload);
      
      if (result.success && result.data) {
        setAlert({ type: 'success', message: editingBranch ? 'Branch updated successfully' : 'Branch created successfully' });
        setModalOpen(false);
        fetchBranches();
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Operation failed' });
      }
    } catch (error) {
      console.error('Error saving branch:', error);
      setAlert({ type: 'error', message: 'Failed to save branch' });
    }
  };

  /**
   * Handle branch deletion
   */
  const handleDelete = async (branchId) => {
    if (!confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await apiDelete('/branch_management.php', { branch_id: branchId });
      
      if (result.success) {
        setAlert({ type: 'success', message: 'Branch deleted successfully' });
        fetchBranches();
      } else {
        setAlert({ type: 'error', message: result.data?.message || 'Failed to delete branch' });
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      setAlert({ type: 'error', message: 'Failed to delete branch' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5F15]"></div>
          <p className="mt-4 text-gray-600">Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Branch Management</h1>
            <p className="text-gray-600">Create, update, and manage restaurant branches</p>
          </div>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Add Branch
          </Button>
        </div>

        {alert.message && (
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />
        )}

        {/* Branches List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No branches found. Click "Add Branch" to create one.
                    </td>
                  </tr>
                ) : (
                  branches.map((branch) => (
                    <tr key={branch.branch_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {branch.branch_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {branch.branch_code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {branch.address || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {branch.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          branch.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {branch.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(branch)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(branch.branch_id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingBranch ? 'Edit Branch' : 'Create Branch'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
              <input
                type="text"
                value={formData.branch_name}
                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code *</label>
              <input
                type="text"
                value={formData.branch_code}
                onChange={(e) => setFormData({ ...formData, branch_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
                rows="3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5F15] focus:border-[#FF5F15]"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button type="submit" className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {editingBranch ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}

