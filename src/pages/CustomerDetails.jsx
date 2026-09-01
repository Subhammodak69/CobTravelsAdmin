import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  User,
  FileText,
  HelpCircle,
  Plane,
  Star,
  Share2,
  Receipt,
  Mail,
  Phone,
  Shield,
  UserCheck,
  Pencil,
  Trash2,
  Plus,
  RefreshCw,
  Eye,
} from 'lucide-react';
import Modal from '../component/common/Modal';
import DragDropUpload from '../component/common/DragDropUpload';
import MediaPreviewModal from '../component/common/MediaPreviewModal';
import MediaViewerModal from '../component/common/MediaViewerModal';
import SelectField from '../component/common/SelectField';
import ActionMenu from '../component/common/ActionMenu';
import { apiCall, handleApiError } from '../utils/apiCall';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'details', label: 'Details', icon: User },
  { key: 'documents', label: 'Documents', icon: FileText, tabParam: 'documents' },
  { key: 'enquiries', label: 'Enquiries', icon: HelpCircle, tabParam: 'enquery' },
  { key: 'tours', label: 'Trips & Tours', icon: Plane, tabParam: 'tours' },
  { key: 'reviews', label: 'Reviews', icon: Star, tabParam: 'review' },
  { key: 'referrals', label: 'Refers', icon: Share2, tabParam: 'referral' },
  { key: 'bills', label: 'Bills & Invoices', icon: Receipt, tabParam: null },
];

const SOURCE_OPTIONS = [
  'WEBSITE', 'WHATSAPP', 'PHONE', 'EMAIL', 'OFFLINE', 'IMPORT', 'REFERRAL', 'OTHER',
].map((v) => ({ value: v, label: v }));

const sourceColors = {
  WEBSITE: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  WHATSAPP: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300',
  PHONE: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  EMAIL: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  OFFLINE: 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
  IMPORT: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  REFERRAL: 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  OTHER: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const statusColors = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  CONVERTED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const formatShortDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
};

const formatFileSize = (bytes) => {
  if (!bytes || Number.isNaN(bytes)) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');

const getFileType = (url = '', fileName = '') => {
  const lower = (url + fileName).toLowerCase();
  if (lower.includes('.pdf')) return 'pdf';
  if (lower.match(/\.(mp4|mov|webm|ogg)/) || lower.includes('video/upload') || lower.includes('video')) return 'video';
  if (lower.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|avif)/)) return 'image';
  return 'image';
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CustomerDetails = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [customer, setCustomer] = useState(location.state?.customer || null);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(!customer);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabData, setTabData] = useState({});

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
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
  });

  // Row Details Modals
  const [previewDoc, setPreviewDoc] = useState(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedReferral, setSelectedReferral] = useState(null);

  // ── Load Customer Profile ────────────────────────────────────────────────────

  const loadCustomer = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const response = await apiCall(`/api/v1/admin/customers/${customerId}`, 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to load customer details');
      }
      setCustomer(payload.data);
    } catch (error) {
      handleApiError(error, 'Unable to fetch customer profile');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  // ── Load Tab Data (extracts data.items cleanly) ──────────────────────────────

  const loadTabData = useCallback(async (tabKey) => {
    const tabConfig = TABS.find((t) => t.key === tabKey);
    if (!tabConfig || !tabConfig.tabParam || !customerId) return;

    setTabLoading(true);
    try {
      const response = await apiCall(
        `/api/v1/admin/customers/${customerId}?tab=${tabConfig.tabParam}&page=1&page_size=50`,
        'GET'
      );
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        const rawItems =
          payload?.data?.items ||
          (Array.isArray(payload?.data)
            ? payload.data
            : payload?.data?.[tabConfig.tabParam] || []);

        setTabData((prev) => ({
          ...prev,
          [tabKey]: Array.isArray(rawItems) ? rawItems : [],
          [`${tabKey}_pagination`]: payload?.data?.pagination || payload?.pagination || null,
        }));
      }
    } catch (error) {
      console.warn(`Tab ${tabKey} fetch failed:`, error);
    } finally {
      setTabLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (activeTab !== 'details') {
      loadTabData(activeTab);
    }
  }, [activeTab, loadTabData]);

  // ── Edit Handlers ────────────────────────────────────────────────────────────

  const openEditModal = () => {
    if (!customer) return;
    setEditForm({
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
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    setSaving(true);
    const body = {
      name: editForm.name,
      mobile: editForm.mobile || null,
      email: editForm.email || null,
      address: editForm.address || null,
      emergency_contact_name: editForm.emergency_contact_name || null,
      emergency_contact_mobile: editForm.emergency_contact_mobile || null,
      profile_pic: editForm.profile_pic || null,
      source: editForm.source,
      is_imported: editForm.is_imported,
      is_active: editForm.is_active,
    };

    try {
      const response = await apiCall(`/api/v1/admin/customers/${customerId}`, 'PATCH', body);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to update customer');
      }
      toast.success('Customer updated successfully');
      setIsEditOpen(false);
      loadCustomer();
    } catch (error) {
      handleApiError(error, 'Unable to update customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete customer "${customer?.name || 'this customer'}"?`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await apiCall(`/api/v1/admin/customers/${customerId}`, 'DELETE');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to delete customer');
      }
      toast.success('Customer deleted successfully');
      navigate('/customers');
    } catch (error) {
      handleApiError(error, 'Unable to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-12">
      {/* ── Page Header ── */}
      <div className="px-2 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to customers</span>
            </button>

            <div>
              <h1 className="mt-1 bg-gradient-to-r from-slate-900 via-violet-700 to-indigo-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-slate-100 dark:via-violet-300 dark:to-indigo-300 md:text-3xl">
                {customer?.name || 'Customer Details'}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Code: <span className="font-semibold text-slate-700 dark:text-slate-300">{customer?.customer_code || customer?.id || '—'}</span>
                {' · '}Joined {formatShortDate(customer?.created_at)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                customer?.is_active === false
                  ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
              ].join(' ')}
            >
              {customer?.is_active === false ? 'Inactive' : 'Active Account'}
            </span>

            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                sourceColors[customer?.source] || sourceColors.OTHER
              }`}
            >
              {customer?.source || 'N/A'}
            </span>

            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 shadow-sm"
            >
              <Pencil className="h-4 w-4 text-indigo-500" />
              Edit Profile
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs Bar ── */}
      <div className="space-y-4">
        <div className="mt-2 px-2">
          <div
            role="tablist"
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className={[
                  'flex whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition',
                  activeTab === key
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-semibold'
                    : 'border-transparent text-gray-600 hover:bg-gray-100/70 dark:text-gray-300 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main Tab Content Panel ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {TABS.find((t) => t.key === activeTab)?.label}
            </h2>
            <button
              type="button"
              onClick={activeTab === 'details' ? loadCustomer : () => loadTabData(activeTab)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading || tabLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading && activeTab === 'details' ? (
            <div className="p-12 text-center text-sm text-gray-400">Loading customer details...</div>
          ) : null}

          {/* ── TAB 1: DETAILS ── */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Profile summary header row */}
              <div className="flex flex-col gap-4 pb-6 border-b border-gray-100 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {customer?.profile_pic ? (
                    <MediaPreviewModal
                      src={customer.profile_pic}
                      alt={customer.name}
                      type="image"
                      thumbnailClassName="h-16 w-16 rounded-2xl object-cover ring-2 ring-indigo-200 dark:ring-indigo-800 shadow-sm"
                      className="block shrink-0"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white shadow-sm">
                      {getInitials(customer?.name) || 'C'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{customer?.name || 'Customer'}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{customer?.email || 'No email on file'} · {customer?.mobile || 'No mobile on file'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {customer?.email && (
                    <a
                      href={`mailto:${customer.email}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <Mail className="h-3.5 w-3.5 text-indigo-500" />
                      Email
                    </a>
                  )}
                  {customer?.mobile && (
                    <a
                      href={`tel:${customer.mobile}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <Phone className="h-3.5 w-3.5 text-emerald-500" />
                      Call
                    </a>
                  )}
                </div>
              </div>

              {/* Clean flat definition sections */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                    Personal & Contact Information
                  </h4>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Full Name</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{customer?.name || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Email Address</dt>
                      <dd className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        {customer?.email ? (
                          <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a>
                        ) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Mobile Number</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {customer?.mobile ? (
                          <a href={`tel:${customer.mobile}`} className="hover:underline">{customer.mobile}</a>
                        ) : '—'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Residential Address</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{customer?.address || '—'}</dd>
                    </div>
                  </dl>
                </div>

                <hr className="border-gray-100 dark:border-gray-800" />

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                    Emergency Contact
                  </h4>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Contact Name</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{customer?.emergency_contact_name || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Contact Phone</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {customer?.emergency_contact_mobile ? (
                          <a href={`tel:${customer.emergency_contact_mobile}`} className="hover:underline">{customer.emergency_contact_mobile}</a>
                        ) : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <hr className="border-gray-100 dark:border-gray-800" />

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                    Account & System Metadata
                  </h4>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Customer Code</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{customer?.customer_code || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Registration Source</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{customer?.source || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Account Status</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{customer?.is_active ? 'Active' : 'Inactive'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Imported Record</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{customer?.is_imported ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Joined Date</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{formatDate(customer?.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Last Modified</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{formatDate(customer?.updated_at)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: DOCUMENTS TABLE ── */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
                  {tabData.documents?.length || 0} Documents Uploaded
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/document-management')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-indigo-400 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Upload document
                </button>
              </div>

              {tabLoading ? (
                <div className="p-12 text-center text-sm text-gray-400">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-600" />
                  Loading documents...
                </div>
              ) : !tabData.documents || tabData.documents.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
                  No documents uploaded for this customer yet.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800/70">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Document</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Type</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Uploaded By</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Uploaded Date</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Size</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {tabData.documents.map((doc) => (
                        <tr
                          key={doc.id || doc.file_url}
                          onClick={() => setPreviewDoc(doc)}
                          className="cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">
                                  {doc.title || doc.file_name || 'Untitled document'}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{doc.file_name || 'N/A'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              {doc.document_type || 'ID_PROOF'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="text-xs">
                              <p className="font-medium text-gray-800 dark:text-gray-200">{doc.uploader_name || doc.customer_name || 'Customer'}</p>
                              <p className="text-gray-400 capitalize">{doc.uploaded_by || 'CUSTOMER'}</p>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(doc.uploaded_at || doc.created_at)}
                          </td>

                          <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(doc.file_size)}
                          </td>

                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end">
                              <ActionMenu
                                menuId={`doc-${doc.id || doc.file_url}`}
                                actions={[
                                  {
                                    label: 'Preview Document',
                                    icon: <Eye className="h-4 w-4 text-indigo-500" />,
                                    onClick: () => setPreviewDoc(doc),
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
          )}

          {/* ── TAB 3: ENQUIRIES TABLE ── */}
          {activeTab === 'enquiries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
                  {tabData.enquiries?.length || 0} Enquiries Recorded
                </p>
              </div>

              {tabLoading ? (
                <div className="p-12 text-center text-sm text-gray-400">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-600" />
                  Loading enquiries...
                </div>
              ) : !tabData.enquiries || tabData.enquiries.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
                  No enquiry records found for this customer.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800/70">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Enquiry Code</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Subject / Type</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Channel</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Travel Date</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Created</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {tabData.enquiries.map((enq) => (
                        <tr
                          key={enq.id || enq.enquiry_code}
                          onClick={() => setSelectedEnquiry(enq)}
                          className="cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
                        >
                          <td className="px-4 py-3.5 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {enq.enquiry_code || enq.id?.slice(0, 8) || '—'}
                          </td>

                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                              {enq.subject || enq.destination || 'General Enquiry'}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">{enq.enquiry_type?.replace(/_/g, ' ') || 'Fixed Tour'}</p>
                          </td>

                          <td className="px-4 py-3.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                            {enq.channel || 'WEBSITE'}
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                statusColors[enq.status] || statusColors.NEW
                              }`}
                            >
                              {enq.status || 'NEW'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                            {enq.travel_date ? formatShortDate(enq.travel_date) : 'Flexible'}
                          </td>

                          <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(enq.created_at)}
                          </td>

                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end">
                              <ActionMenu
                                menuId={`enq-${enq.id || enq.enquiry_code}`}
                                actions={[
                                  {
                                    label: 'View Details',
                                    icon: <Eye className="h-4 w-4 text-indigo-500" />,
                                    onClick: () => setSelectedEnquiry(enq),
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
          )}

          {/* ── TAB 4: TRIPS & TOURS TABLE ── */}
          {activeTab === 'tours' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
                  {tabData.tours?.length || 0} Trips & Tours
                </p>
              </div>

              {tabLoading ? (
                <div className="p-12 text-center text-sm text-gray-400">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-600" />
                  Loading trips...
                </div>
              ) : !tabData.tours || tabData.tours.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
                  No booked trips or tour packages found for this customer.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800/70">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Tour Package</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Variant</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Departure Date</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Travelers</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Amount</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {tabData.tours.map((trip, idx) => (
                        <tr
                          key={trip.id || idx}
                          onClick={() => setSelectedTrip(trip)}
                          className="cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
                        >
                          <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">
                            {trip.title || trip.package_name || 'Tour Package'}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                            {trip.variant_name || 'Standard Package'}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatShortDate(trip.departure_date)}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                            {trip.travelers_count || trip.pax_no || 1} Pax
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">
                            {trip.amount ? `₹${trip.amount}` : '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                statusColors[trip.status] || statusColors.CONFIRMED
                              }`}
                            >
                              {trip.status || 'CONFIRMED'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end">
                              <ActionMenu
                                menuId={`trip-${trip.id || idx}`}
                                actions={[
                                  {
                                    label: 'View Trip Details',
                                    icon: <Eye className="h-4 w-4 text-indigo-500" />,
                                    onClick: () => setSelectedTrip(trip),
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
          )}

          {/* ── TAB 5: REVIEWS TABLE ── */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
                  {tabData.reviews?.length || 0} Customer Reviews
                </p>
              </div>

              {tabLoading ? (
                <div className="p-12 text-center text-sm text-gray-400">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-600" />
                  Loading reviews...
                </div>
              ) : !tabData.reviews || tabData.reviews.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
                  No reviews submitted by this customer.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800/70">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Rating</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Tour Name</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Comment</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Date</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {tabData.reviews.map((rev, idx) => (
                        <tr
                          key={rev.id || idx}
                          onClick={() => setSelectedReview(rev)}
                          className="cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${i < (rev.rating || 5) ? 'fill-current' : 'opacity-30'}`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">
                            {rev.tour_name || 'General Feedback'}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300 truncate max-w-sm">
                            {rev.comment || rev.review || 'No written text'}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatShortDate(rev.created_at)}
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end">
                              <ActionMenu
                                menuId={`rev-${rev.id || idx}`}
                                actions={[
                                  {
                                    label: 'View Review',
                                    icon: <Eye className="h-4 w-4 text-indigo-500" />,
                                    onClick: () => setSelectedReview(rev),
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
          )}

          {/* ── TAB 6: REFERRALS TABLE ── */}
          {activeTab === 'referrals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
                  {tabData.referrals?.length || 0} Referrals
                </p>
              </div>

              {tabLoading ? (
                <div className="p-12 text-center text-sm text-gray-400">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-600" />
                  Loading referrals...
                </div>
              ) : !tabData.referrals || tabData.referrals.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
                  No referrals recorded for this customer.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800/70">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Referred Contact</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Reward Points</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Date</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {tabData.referrals.map((ref, idx) => (
                        <tr
                          key={ref.id || idx}
                          onClick={() => setSelectedReferral(ref)}
                          className="cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
                        >
                          <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">
                            {ref.referred_name || ref.contact || 'Referee'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              {ref.status || 'CONVERTED'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {ref.reward_points || 0} pts
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatShortDate(ref.created_at)}
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end">
                              <ActionMenu
                                menuId={`ref-${ref.id || idx}`}
                                actions={[
                                  {
                                    label: 'View Referral Details',
                                    icon: <Eye className="h-4 w-4 text-indigo-500" />,
                                    onClick: () => setSelectedReferral(ref),
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
          )}

          {/* ── TAB 7: BILLS & INVOICES ── */}
          {activeTab === 'bills' && (
            <div className="space-y-4">
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
                No invoices or billing transactions on record.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Document Preview Modal (MediaViewerModal) ── */}
      <MediaViewerModal isOpen={!!previewDoc} onClose={() => setPreviewDoc(null)}>
        {previewDoc && (() => {
          const fileType = getFileType(previewDoc.file_url || '', previewDoc.file_name || '');
          return (
            <div style={{ background: '#000' }} className="flex min-h-full w-full flex-col">
              <div
                style={{ background: 'rgba(0,0,0,0.7)' }}
                className="flex shrink-0 items-center justify-between px-6 py-3 border-b border-white/10"
              >
                <div className="min-w-0 pr-4">
                  <p className="truncate text-sm font-semibold text-white">
                    {previewDoc.title || previewDoc.file_name || 'Document preview'}
                  </p>
                  {previewDoc.description && (
                    <p className="truncate text-xs text-slate-400">{previewDoc.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {previewDoc.document_type} · {formatFileSize(previewDoc.file_size)}
                </span>
              </div>
              <div className="flex flex-1 items-center justify-center p-3">
                {fileType === 'pdf' ? (
                  <iframe
                    src={previewDoc.file_url}
                    title={previewDoc.title || 'PDF preview'}
                    style={{ border: 'none', background: '#fff' }}
                    className="h-[80vh] w-full max-w-5xl rounded-xl"
                  />
                ) : fileType === 'video' ? (
                  <video
                    src={previewDoc.file_url}
                    controls
                    autoPlay
                    className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-xl"
                  />
                ) : (
                  <img
                    src={previewDoc.file_url}
                    alt={previewDoc.title || previewDoc.file_name || 'Document'}
                    className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-xl"
                  />
                )}
              </div>
            </div>
          );
        })()}
      </MediaViewerModal>

      {/* ── Enquiry Details Modal ── */}
      <Modal
        isOpen={!!selectedEnquiry}
        onClose={() => setSelectedEnquiry(null)}
        title="Enquiry Details"
        icon={HelpCircle}
        size="lg"
        footer={(
          <div className="flex w-full items-center justify-end">
            <button
              type="button"
              onClick={() => setSelectedEnquiry(null)}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Close
            </button>
          </div>
        )}
      >
        {selectedEnquiry && (
          <div className="space-y-5 p-1">
            {/* Header Badge Row */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedEnquiry.enquiry_code || selectedEnquiry.id}
                </span>
                <h3 className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">
                  {selectedEnquiry.subject || 'Travel Enquiry'}
                </h3>
              </div>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  statusColors[selectedEnquiry.status] || statusColors.NEW
                }`}
              >
                {selectedEnquiry.status || 'NEW'}
              </span>
            </div>

            {/* Message Content */}
            {selectedEnquiry.message && (
              <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Message / Notes</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedEnquiry.message}</p>
              </div>
            )}

            {/* Structured Fields */}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Enquirer Name</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedEnquiry.enquirer_name || customer?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Enquirer Phone</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedEnquiry.enquirer_phone || customer?.mobile || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Enquiry Type</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white capitalize">{selectedEnquiry.enquiry_type?.replace(/_/g, ' ') || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Channel</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedEnquiry.channel || 'WEBSITE'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Destination</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedEnquiry.destination || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Travel Date</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedEnquiry.travel_date ? formatShortDate(selectedEnquiry.travel_date) : 'Flexible'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Duration</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedEnquiry.travel_duration_day ? `${selectedEnquiry.travel_duration_day} Days / ${selectedEnquiry.travel_duration_night || 0} Nights` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Pax Count</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedEnquiry.pax_no || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Rooms Required</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedEnquiry.no_room || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Vehicle Type</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedEnquiry.vehicle_type || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Meal Plan</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedEnquiry.meal_plan || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Special Requirements</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedEnquiry.special_requirements || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Submitted At</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{formatDate(selectedEnquiry.created_at)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>

      {/* ── Trip Details Modal ── */}
      <Modal
        isOpen={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        title="Trip / Tour Details"
        icon={Plane}
        size="md"
        footer={(
          <div className="flex w-full items-center justify-end">
            <button
              type="button"
              onClick={() => setSelectedTrip(null)}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Close
            </button>
          </div>
        )}
      >
        {selectedTrip && (
          <div className="space-y-4 p-1">
            <div className="pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedTrip.title || selectedTrip.package_name || 'Tour Package'}
              </h3>
              <p className="text-xs text-gray-500">{selectedTrip.variant_name || 'Standard Variant'}</p>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-500">Departure Date</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{formatShortDate(selectedTrip.departure_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Travelers</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedTrip.travelers_count || 1} Pax</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Booking Amount</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedTrip.amount ? `₹${selectedTrip.amount}` : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Status</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedTrip.status || 'CONFIRMED'}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>

      {/* ── Review Details Modal ── */}
      <Modal
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title="Customer Review"
        icon={Star}
        size="md"
        footer={(
          <div className="flex w-full items-center justify-end">
            <button
              type="button"
              onClick={() => setSelectedReview(null)}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Close
            </button>
          </div>
        )}
      >
        {selectedReview && (
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < (selectedReview.rating || 5) ? 'fill-current' : 'opacity-30'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">{formatShortDate(selectedReview.created_at)}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Tour / Service</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedReview.tour_name || 'General Feedback'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-gray-800/60">
              <p className="text-xs text-gray-400 mb-1">Feedback Comment</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedReview.comment || selectedReview.review || 'No written comment'}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Referral Details Modal ── */}
      <Modal
        isOpen={!!selectedReferral}
        onClose={() => setSelectedReferral(null)}
        title="Referral Details"
        icon={Share2}
        size="md"
        footer={(
          <div className="flex w-full items-center justify-end">
            <button
              type="button"
              onClick={() => setSelectedReferral(null)}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Close
            </button>
          </div>
        )}
      >
        {selectedReferral && (
          <div className="space-y-4 p-1">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-500">Referee Contact</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{selectedReferral.referred_name || selectedReferral.contact || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Status</dt>
                <dd className="mt-0.5 text-sm font-semibold text-emerald-600">{selectedReferral.status || 'CONVERTED'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Reward Points</dt>
                <dd className="mt-0.5 text-sm font-semibold text-indigo-600">{selectedReferral.reward_points || 0} pts</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Referral Date</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{formatShortDate(selectedReferral.created_at)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>

      {/* ── Edit Customer Modal ── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Customer Profile"
        icon={User}
        size="lg"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="customer-edit-form"
              disabled={saving}
              className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      >
        <form id="customer-edit-form" onSubmit={handleEditSubmit} className="space-y-5 p-1">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Source</label>
              <SelectField
                options={SOURCE_OPTIONS}
                value={SOURCE_OPTIONS.find((o) => o.value === editForm.source) || null}
                onChange={(selected) => setEditForm((prev) => ({ ...prev, source: selected?.value || 'WEBSITE' }))}
                isSearchable={false}
                placeholder="Select source"
                menuPlacement="auto"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Mobile</label>
              <input
                value={editForm.mobile}
                onChange={(e) => setEditForm((prev) => ({ ...prev, mobile: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. +91 9876543210"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="customer@email.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
              <input
                value={editForm.address}
                onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Street, City, State"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency contact name</label>
              <input
                value={editForm.emergency_contact_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, emergency_contact_name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Contact person name"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency contact mobile</label>
              <input
                value={editForm.emergency_contact_mobile}
                onChange={(e) => setEditForm((prev) => ({ ...prev, emergency_contact_mobile: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="+91 9876543210"
              />
            </div>

            <div className="flex items-center gap-6 md:col-span-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <UserCheck className="h-4 w-4" />
                Active account
              </label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_imported}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, is_imported: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Shield className="h-4 w-4" />
                Imported record
              </label>
            </div>

            <div className="md:col-span-2">
              <DragDropUpload
                label="Profile picture"
                value={editForm.profile_pic}
                onChange={(url) => setEditForm((prev) => ({ ...prev, profile_pic: url }))}
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

export default CustomerDetails;
