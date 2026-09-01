import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Shield,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Eye,
} from 'lucide-react';
import Modal from '../component/common/Modal';
import DragDropUpload from '../component/common/DragDropUpload';
import SelectField from '../component/common/SelectField';
import ActionMenu from '../component/common/ActionMenu';
import { apiCall, handleApiError } from '../utils/apiCall';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_OPTIONS = [
  'WEBSITE', 'WHATSAPP', 'PHONE', 'EMAIL', 'OFFLINE', 'IMPORT', 'REFERRAL', 'OTHER',
].map((v) => ({ value: v, label: v }));

const defaultForm = {
  name: '',
  mobile: '',
  email: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_mobile: '',
  profile_pic: '',
  source: 'WEBSITE',
  is_imported: false,
  is_active: true,
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return value;
  }
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');

const sourceColors = {
  WEBSITE: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  WHATSAPP: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  PHONE: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  EMAIL: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  OFFLINE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  IMPORT: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  REFERRAL: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  OTHER: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CustomerManagement = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // pagination (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // filters
  const [searchTerm, setSearchTerm] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');   // '' | 'true' | 'false'
  const searchDebounceRef = useRef(null);

  // modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formState, setFormState] = useState(defaultForm);

  // ── API ──────────────────────────────────────────────────────────────────────

  const loadCustomers = useCallback(async (page = currentPage, search = searchTerm, active = isActiveFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });
      if (search) params.set('search', search);
      if (active !== '') params.set('is_active', active);

      const response = await apiCall(`/api/v1/admin/customers?${params}`, 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to fetch customers');
      }
      setCustomers(Array.isArray(payload?.data) ? payload.data : []);
      if (payload?.pagination) {
        setTotalItems(payload.pagination.total_items ?? 0);
        setTotalPages(payload.pagination.total_pages ?? 1);
      }
    } catch (error) {
      handleApiError(error, 'Unable to load customers');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, isActiveFilter]);

  useEffect(() => {
    loadCustomers(currentPage, searchTerm, isActiveFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, isActiveFilter]);

  // Debounce search
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      loadCustomers(1, value, isActiveFilter);
    }, 400);
  };

  const handleActiveFilterChange = (value) => {
    setIsActiveFilter(value);
    setCurrentPage(1);
  };

  const resetForm = () => {
    setFormState(defaultForm);
    setEditingCustomer(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormState({
      name: customer.name || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      address: customer.address || '',
      emergency_contact_name: customer.emergency_contact_name || '',
      emergency_contact_mobile: customer.emergency_contact_mobile || '',
      profile_pic: customer.profile_pic || '',
      source: customer.source || 'WEBSITE',
      is_imported: customer.is_imported || false,
      is_active: customer.is_active !== false,
    });
    setIsFormOpen(true);
  };

  const closeModal = () => {
    resetForm();
    setIsFormOpen(false);
  };

  const handleFieldChange = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    setSaving(true);
    const body = {
      name: formState.name,
      mobile: formState.mobile || null,
      email: formState.email || null,
      address: formState.address || null,
      emergency_contact_name: formState.emergency_contact_name || null,
      emergency_contact_mobile: formState.emergency_contact_mobile || null,
      profile_pic: formState.profile_pic || null,
      source: formState.source,
      is_imported: formState.is_imported,
      is_active: formState.is_active,
    };

    try {
      const endpoint = editingCustomer
        ? `/api/v1/admin/customers/${editingCustomer.id}`
        : '/api/v1/admin/customers';
      const method = editingCustomer ? 'PATCH' : 'POST';
      const response = await apiCall(endpoint, method, body);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to save customer');
      }
      toast.success(editingCustomer ? 'Customer updated successfully' : 'Customer created successfully');
      closeModal();
      loadCustomers(1, searchTerm, isActiveFilter);
      setCurrentPage(1);
    } catch (error) {
      handleApiError(error, editingCustomer ? 'Unable to update customer' : 'Unable to create customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer) => {
    const confirmed = window.confirm(`Delete customer "${customer?.name || 'this customer'}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await apiCall(`/api/v1/admin/customers/${customer.id}`, 'DELETE');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to delete customer');
      }
      toast.success('Customer deleted');
      loadCustomers(currentPage, searchTerm, isActiveFilter);
    } catch (error) {
      handleApiError(error, 'Unable to delete customer');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3 pb-6">
      {/* Page header */}
      <div className="px-2 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mt-1 bg-gradient-to-r from-slate-900 via-indigo-600 to-violet-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl dark:from-slate-100 dark:via-indigo-300 dark:to-violet-300">
              Customer Management
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View, create and manage all traveller customer accounts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadCustomers(currentPage, searchTerm, isActiveFilter)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4" />
              Add customer
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 px-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, email, mobile…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Active filter */}
            <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {[['', 'All'], ['true', 'Active'], ['false', 'Inactive']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleActiveFilterChange(val)}
                  className={`px-3 py-2 text-xs font-medium transition ${isActiveFilter === val
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Page size */}
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s} / page</option>
              ))}
            </select>

            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {totalItems} total
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-sm text-gray-400">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading customers…
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 text-gray-400">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm">No customers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/70">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Customer</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Contact</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Source</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Joined</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => navigate(`/customers/${customer.id}`, { state: { customer } })}
                    className="cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
                  >
                    {/* Avatar + name */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {customer.profile_pic ? (
                          <img
                            src={customer.profile_pic}
                            alt={customer.name}
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-100 dark:ring-indigo-900/50"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
                            {getInitials(customer.name) || 'C'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{customer.name || 'Unnamed'}</div>
                          <div className="text-xs text-gray-400">{customer.customer_code || '—'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0" /><span>{customer.email || 'N/A'}</span></div>
                        <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" /><span>{customer.mobile || 'N/A'}</span></div>
                      </div>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${sourceColors[customer.source] || sourceColors.OTHER}`}>
                        {customer.source || 'N/A'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${customer.is_active === false
                          ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                        }`}>
                        {customer.is_active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(customer.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <ActionMenu
                          menuId={customer.id}
                          actions={[
                            {
                              label: 'View Details',
                              icon: <Eye className="h-4 w-4 text-indigo-500" />,
                              onClick: () => navigate(`/customers/${customer.id}`, { state: { customer } }),
                            },
                            {
                              label: 'Edit Customer',
                              icon: <Pencil className="h-4 w-4 text-blue-500" />,
                              onClick: () => openEditModal(customer),
                            },
                            {
                              label: 'Delete Customer',
                              icon: <Trash2 className="h-4 w-4 text-red-500" />,
                              className: 'text-red-600 hover:text-red-700 dark:text-red-400',
                              onClick: () => handleDelete(customer),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages} · {totalItems} customers
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let page = i + 1;
              if (totalPages > 7) {
                const start = Math.max(1, currentPage - 3);
                page = start + i;
                if (page > totalPages) return null;
              }
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition ${currentPage === page
                      ? 'bg-indigo-600 text-white shadow'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeModal}
        title={editingCustomer ? 'Edit customer' : 'Add new customer'}
        icon={Users}
        size="lg"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="customer-form"
              disabled={saving}
              className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : editingCustomer ? 'Save changes' : 'Create customer'}
            </button>
          </div>
        )}
      >
        <form id="customer-form" onSubmit={handleSubmit} className="space-y-5 p-1">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                value={formState.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Enter full name"
                maxLength={100}
                required
              />
            </div>

            {/* Source */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Source</label>
              <SelectField
                options={SOURCE_OPTIONS}
                value={SOURCE_OPTIONS.find((o) => o.value === formState.source) || null}
                onChange={(selected) => handleFieldChange('source', selected?.value || 'WEBSITE')}
                isSearchable={false}
                placeholder="Select source"
                menuPlacement="auto"
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Mobile</label>
              <input
                value={formState.mobile}
                onChange={(e) => handleFieldChange('mobile', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. +91 9876543210"
                maxLength={20}
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="customer@email.com"
                maxLength={255}
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
              <input
                value={formState.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Street, City, State"
                maxLength={255}
              />
            </div>

            {/* Emergency name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency contact name</label>
              <input
                value={formState.emergency_contact_name}
                onChange={(e) => handleFieldChange('emergency_contact_name', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Contact person name"
                maxLength={100}
              />
            </div>

            {/* Emergency mobile */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency contact mobile</label>
              <input
                value={formState.emergency_contact_mobile}
                onChange={(e) => handleFieldChange('emergency_contact_mobile', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="+91 9876543210"
                maxLength={20}
              />
            </div>

            {/* Status toggles */}
            <div className="flex items-center gap-6 md:col-span-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.is_active}
                  onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <UserCheck className="h-4 w-4" />
                Active account
              </label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.is_imported}
                  onChange={(e) => handleFieldChange('is_imported', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Shield className="h-4 w-4" />
                Imported record
              </label>
            </div>

            {/* Profile picture */}
            <div className="md:col-span-2">
              <DragDropUpload
                label="Profile picture"
                value={formState.profile_pic}
                onChange={(url) => handleFieldChange('profile_pic', url)}
                helperText="Recommended: square image, JPG or PNG"
                accept="image/*"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerManagement;
