import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, UserCog, Pencil, Trash2, Mail, Phone, ShieldCheck, Search, RefreshCw } from 'lucide-react';
import Modal from '../component/common/Modal';
import DragDropUpload from '../component/common/DragDropUpload';
import SelectField from '../component/common/SelectField';
import Pagination from '../component/common/PaginationComponent';
import { apiCall, handleApiError } from '../utils/apiCall';

const roleOptions = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'STAFF'];
const roleSelectOptions = roleOptions.map((option) => ({ value: option, label: option }));

const defaultForm = {
  name: '',
  email: '',
  mobile: '',
  role: 'STAFF',
  profile_pic: '',
  is_active: true,
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formState, setFormState] = useState(defaultForm);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const response = await apiCall('/api/v1/admin/account', 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Failed to load staff');
      }
      const records = Array.isArray(payload?.data) ? payload.data : [];
      setStaffList(records);
    } catch (error) {
      handleApiError(error, 'Unable to fetch staff records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const resetForm = () => {
    setFormState(defaultForm);
    setEditingStaff(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setFormState({
      name: staff?.name || '',
      email: staff?.email || '',
      mobile: staff?.mobile || '',
      role: staff?.role || 'STAFF',
      profile_pic: staff?.profile_pic || '',
      is_active: staff?.is_active !== false,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    resetForm();
    setIsModalOpen(false);
  };

  const handleFieldChange = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: formState.name,
      email: formState.email,
      mobile: formState.mobile,
      role: formState.role,
      profile_pic: formState.profile_pic,
      is_active: formState.is_active,
    };

    try {
      const endpoint = editingStaff ? `/api/v1/admin/account/${editingStaff.id}` : '/api/v1/admin/account';
      const method = editingStaff ? 'PATCH' : 'POST';
      const response = await apiCall(endpoint, method, payload);
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to save staff');
      }

      toast.success(editingStaff ? 'Staff updated successfully' : 'Staff created successfully');
      closeModal();
      await loadStaff();
    } catch (error) {
      handleApiError(error, editingStaff ? 'Unable to update staff' : 'Unable to create staff');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (staff) => {
    const confirmed = window.confirm(`Delete ${staff?.name || 'this staff member'}?`);
    if (!confirmed) return;

    try {
      const response = await apiCall(`/api/v1/admin/account/${staff.id}`, 'DELETE', {
        identifier: staff?.email || staff?.mobile || staff?.id,
        otp: '',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to delete staff');
      }
      toast.success('Staff deleted successfully');
      await loadStaff();
    } catch (error) {
      handleApiError(error, 'Unable to delete staff');
    }
  };

  const filteredStaff = staffList.filter((staff) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return [staff?.name, staff?.email, staff?.mobile, staff?.role]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStaff = filteredStaff.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-6 text-white shadow-xl shadow-indigo-500/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">Operations</p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Staff Management</h1>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4" />
            Add staff
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search staff..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <button
            type="button"
            onClick={loadStaff}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-gray-500">Loading staff...</div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">No staff records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/70">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Staff</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Contact</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Role</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Last Login</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {staff.profile_pic ? (
                          <img src={staff.profile_pic} alt={staff.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-100 dark:ring-indigo-950" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-bold text-white">
                            {staff.name?.[0]?.toUpperCase() || 'S'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{staff.name || 'Unnamed staff'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{staff.user_code || staff.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {staff.email || 'N/A'}</div>
                        <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {staff.mobile || 'N/A'}</div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {staff.role || 'STAFF'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className={[
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                        staff.is_active === false
                          ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300',
                      ].join(' ')}>
                        {staff.is_active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(staff.last_login)}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(staff)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/20"
                          title="Edit staff"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(staff)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                          title="Delete staff"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredStaff.length > 0 && (
        <Pagination
          currentPage={safePage}
          totalItems={filteredStaff.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onLimitChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingStaff ? 'Edit staff member' : 'Add new staff member'}
        icon={UserCog}
        size="lg"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" form="staff-form" disabled={saving} className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? 'Saving...' : editingStaff ? 'Save changes' : 'Create staff'}
            </button>
          </div>
        )}
      >
        <form id="staff-form" onSubmit={handleSubmit} className="space-y-5 p-1">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Full name</label>
              <input
                value={formState.name}
                onChange={(event) => handleFieldChange('name', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
              <SelectField
                options={roleSelectOptions}
                value={roleSelectOptions.find((option) => option.value === formState.role) || null}
                onChange={(selected) => handleFieldChange('role', selected?.value || '')}
                isSearchable={false}
                placeholder="Select role"
                menuPlacement="auto"
                classNamePrefix="react-select"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                value={formState.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Enter email"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Mobile</label>
              <input
                value={formState.mobile}
                onChange={(event) => handleFieldChange('mobile', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Enter mobile"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <ShieldCheck className="h-4 w-4" />
                Status
              </label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={formState.is_active}
                  onChange={(event) => handleFieldChange('is_active', event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Active account
              </label>
            </div>

            <div className="md:col-span-2">
              <DragDropUpload
                label="Profile picture"
                value={formState.profile_pic}
                onChange={(url) => handleFieldChange('profile_pic', url)}
                helperText="Recommended: square image, JPG or PNG"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffManagement;
