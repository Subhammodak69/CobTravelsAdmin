import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Building2,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Mail,
  Phone,
  BadgeCheck,
} from 'lucide-react';
import Modal from '../component/common/Modal';
import ConfirmDeleteModal from '../component/common/ConfirmDeleteModal';
import Pagination from '../component/common/PaginationComponent';
import ActionMenu from '../component/common/ActionMenu';
import { apiCall, handleApiError } from '../utils/apiCall';

const defaultForm = {
  name: '',
  type: '',
  contact: '',
  email: '',
  address: '',
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const VendorManagement = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteVendorTarget, setDeleteVendorTarget] = useState(null);
  const [deletingVendor, setDeletingVendor] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [formState, setFormState] = useState(defaultForm);

  const loadVendors = useCallback(
    async (page = currentPage, limit = itemsPerPage) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          page_size: String(limit),
        });

        const response = await apiCall(`/api/v1/admin/vendors?${queryParams.toString()}`, 'GET');
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message || payload?.detail || 'Unable to fetch vendors');
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setVendors(data);

        const pagination = payload?.pagination || {};
        setTotalItems(Number(pagination.total_items ?? data.length ?? 0));
      } catch (error) {
        handleApiError(error, 'Unable to fetch vendors');
      } finally {
        setLoading(false);
      }
    },
    [currentPage, itemsPerPage]
  );

  useEffect(() => {
    loadVendors(currentPage, itemsPerPage);
  }, [loadVendors, currentPage, itemsPerPage]);

  const resetForm = () => {
    setFormState(defaultForm);
    setEditingVendor(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (vendor) => {
    setEditingVendor(vendor);
    setFormState({
      name: vendor?.name || '',
      type: vendor?.type || '',
      contact: vendor?.contact || '',
      email: vendor?.email || '',
      address: vendor?.address || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleFieldChange = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formState.name.trim(),
        type: formState.type.trim(),
        contact: formState.contact.trim(),
        email: formState.email.trim(),
        address: formState.address.trim(),
      };

      const endpoint = editingVendor
        ? `/api/v1/admin/vendors/${editingVendor.id}`
        : '/api/v1/admin/vendors';
      const method = editingVendor ? 'PATCH' : 'POST';

      const response = await apiCall(endpoint, method, payload);
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to save vendor');
      }

      toast.success(
        result?.message || (editingVendor ? 'Vendor updated successfully' : 'Vendor created successfully')
      );
      closeModal();
      await loadVendors(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, editingVendor ? 'Unable to update vendor' : 'Unable to create vendor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (vendor) => {
    setDeleteVendorTarget(vendor);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteVendor = async () => {
    if (!deleteVendorTarget) return;
    setDeletingVendor(true);
    try {
      const response = await apiCall(`/api/v1/admin/vendors/${deleteVendorTarget.id}`, 'DELETE');
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to delete vendor');
      }

      toast.success(result?.message || 'Vendor deleted successfully');
      setIsDeleteModalOpen(false);
      setDeleteVendorTarget(null);
      await loadVendors(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to delete vendor');
    } finally {
      setDeletingVendor(false);
    }
  };

  const filteredVendors = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return vendors;

    return vendors.filter((vendor) => {
      const searchString = [
        vendor?.name,
        vendor?.type,
        vendor?.contact,
        vendor?.email,
        vendor?.address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchString.includes(term);
    });
  }, [vendors, searchTerm]);

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';

  const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="space-y-3 pb-6">
      <div className="px-2 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mt-1 bg-gradient-to-r from-slate-900 via-emerald-700 to-teal-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl dark:from-slate-100 dark:via-emerald-300 dark:to-teal-300">
              Vendors
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage supplier records and contact details.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Refresh vendors"
              title="Refresh vendors"
              onClick={() => loadVendors(currentPage, itemsPerPage)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 sm:px-3 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              aria-label="Add vendor"
              title="Add vendor"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white p-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add vendor</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 px-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search vendors..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {totalItems} record{totalItems === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-gray-500 dark:text-gray-300">
            Loading vendors...
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 dark:text-gray-300">
            <Building2 className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p>No vendors found.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Vendor</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                            <BadgeCheck className="h-4 w-4 text-emerald-600" />
                            <span>{vendor.name || 'Unnamed vendor'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{vendor.type || '—'}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1 text-slate-700 dark:text-slate-200">
                          {vendor.contact && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              <span>{vendor.contact}</span>
                            </div>
                          )}
                          {vendor.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              <span>{vendor.email}</span>
                            </div>
                          )}
                          {!vendor.contact && !vendor.email && <span>—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">
                        {formatDate(vendor.updated_at || vendor.created_at)}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <ActionMenu
                          actions={[
                            {
                              label: 'Edit vendor',
                              icon: <Pencil className="h-4 w-4" />,
                              onClick: () => openEditModal(vendor),
                            },
                            {
                              label: 'Delete vendor',
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: () => handleDelete(vendor),
                              className: 'text-rose-600 dark:text-rose-400',
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalItems > 0 && (
          <div className="border-t border-slate-200 bg-white/90 px-3 py-3 dark:border-gray-700 dark:bg-gray-800/90">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onLimitChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingVendor ? 'Edit vendor' : 'Add vendor'}
        icon={Building2}
        size="lg"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="vendor-form"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (editingVendor ? 'Saving...' : 'Creating...') : editingVendor ? 'Save changes' : 'Create vendor'}
            </button>
          </div>
        )}
      >
        <form id="vendor-form" onSubmit={handleSubmit} className="space-y-5 p-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Vendor name</label>
              <input
                value={formState.name}
                onChange={(event) => handleFieldChange('name', event.target.value)}
                className={inputClass}
                placeholder="e.g. Travel Logistics Pvt Ltd"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Vendor type</label>
              <input
                value={formState.type}
                onChange={(event) => handleFieldChange('type', event.target.value)}
                className={inputClass}
                placeholder="Transport, Hotel, Service..."
              />
            </div>
            <div>
              <label className={labelClass}>Contact</label>
              <input
                value={formState.contact}
                onChange={(event) => handleFieldChange('contact', event.target.value)}
                className={inputClass}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={formState.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                className={inputClass}
                placeholder="vendor@example.com"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <textarea
              value={formState.address}
              onChange={(event) => handleFieldChange('address', event.target.value)}
              className={`${inputClass} min-h-[90px] resize-y`}
              placeholder="Business address"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (deletingVendor) return;
          setIsDeleteModalOpen(false);
          setDeleteVendorTarget(null);
        }}
        onConfirm={confirmDeleteVendor}
        confirming={deletingVendor}
        itemLabel={deleteVendorTarget?.name || 'this vendor'}
        title="Delete vendor"
        message="This vendor and its details will be permanently removed."
      />
    </div>
  );
};

export default VendorManagement;
