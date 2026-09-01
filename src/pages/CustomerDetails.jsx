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
  MapPin,
  PhoneCall,
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
  WEBSITE: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  WHATSAPP: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  PHONE: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  EMAIL: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  OFFLINE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  IMPORT: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  REFERRAL: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  OTHER: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (value) => {
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

const InfoCard = ({ title, icon: Icon, children }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-4 flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h3>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const InfoItem = ({ label, value, isLink, href }) => (
  <div>
    <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
    {isLink && href && value ? (
      <a
        href={href}
        className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        {value}
      </a>
    ) : (
      <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200 break-words">
        {value || '—'}
      </p>
    )}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);

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

  // ── Load Tab Data ────────────────────────────────────────────────────────────

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
        setTabData((prev) => ({
          ...prev,
          [tabKey]: Array.isArray(payload?.data) ? payload.data : payload?.data?.[tabConfig.tabParam] || [],
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
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading && !customer) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-gray-800 dark:bg-gray-900 dark:text-indigo-400 dark:hover:bg-indigo-950/30 shadow-sm"
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 shadow-sm"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Customer Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {customer?.profile_pic ? (
              <MediaPreviewModal
                src={customer.profile_pic}
                alt={customer.name}
                type="image"
                thumbnailClassName="h-20 w-20 rounded-2xl object-cover ring-4 ring-indigo-50 dark:ring-indigo-950 shadow-md"
                className="block shrink-0"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-md">
                {getInitials(customer?.name) || 'C'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {customer?.name || 'Unnamed Customer'}
                </h1>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  customer?.is_active === false
                    ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                }`}>
                  {customer?.is_active === false ? 'Inactive' : 'Active'}
                </span>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${sourceColors[customer?.source] || sourceColors.OTHER}`}>
                  {customer?.source || 'N/A'}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Code: <span className="font-semibold text-gray-700 dark:text-gray-300">{customer?.customer_code || customer?.id}</span>
                {' · '}Joined {formatDate(customer?.created_at)}
              </p>
            </div>
          </div>

          {/* Quick Contact Chips */}
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {customer?.email && (
              <a
                href={`mailto:${customer.email}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <Mail className="h-3.5 w-3.5 text-indigo-500" />
                {customer.email}
              </a>
            )}
            {customer?.mobile && (
              <a
                href={`tel:${customer.mobile}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-500" />
                {customer.mobile}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-2 overflow-x-auto pb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {/* ── TAB 1: DETAILS ── */}
        {activeTab === 'details' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <InfoCard title="Personal & Contact Information" icon={User}>
              <InfoItem label="Full Name" value={customer?.name} />
              <InfoItem label="Email Address" value={customer?.email} isLink href={`mailto:${customer?.email}`} />
              <InfoItem label="Mobile Number" value={customer?.mobile} isLink href={`tel:${customer?.mobile}`} />
              <InfoItem label="Residential Address" value={customer?.address} />
            </InfoCard>

            <InfoCard title="Emergency Contact" icon={PhoneCall}>
              <InfoItem label="Emergency Contact Name" value={customer?.emergency_contact_name} />
              <InfoItem
                label="Emergency Contact Phone"
                value={customer?.emergency_contact_mobile}
                isLink
                href={`tel:${customer?.emergency_contact_mobile}`}
              />
            </InfoCard>

            <InfoCard title="Account & System Metadata" icon={Shield}>
              <InfoItem label="Customer Code" value={customer?.customer_code} />
              <InfoItem label="Registration Source" value={customer?.source} />
              <InfoItem label="Account Status" value={customer?.is_active ? 'Active' : 'Inactive'} />
              <InfoItem label="Imported Record" value={customer?.is_imported ? 'Yes' : 'No'} />
              <InfoItem label="Created At" value={formatDate(customer?.created_at)} />
              <InfoItem label="Last Updated" value={formatDate(customer?.updated_at)} />
            </InfoCard>
          </div>
        )}

        {/* ── TAB 2: DOCUMENTS ── */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Uploaded Documents</h2>
              <button
                type="button"
                onClick={() => navigate('/document-management')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-indigo-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Upload New Document
              </button>
            </div>

            {tabLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading documents...
              </div>
            ) : !tabData.documents || tabData.documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400 dark:border-gray-800">
                <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No documents uploaded for this customer yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tabData.documents.map((doc) => (
                  <div
                    key={doc.id || doc.file_url}
                    onClick={() => doc.file_url && setPreviewDoc(doc)}
                    className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {doc.document_type || 'DOCUMENT'}
                      </span>
                    </div>
                    <h4 className="mt-3 font-semibold text-gray-900 dark:text-white truncate">
                      {doc.title || doc.file_name || 'Document'}
                    </h4>
                    <p className="text-xs text-gray-400 truncate">{doc.file_name || 'N/A'}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span>{formatDate(doc.uploaded_at || doc.created_at)}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium group-hover:underline flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: ENQUIRIES ── */}
        {activeTab === 'enquiries' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Customer Enquiries & Leads</h2>
            {tabLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading enquiries...
              </div>
            ) : !tabData.enquiries || tabData.enquiries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400 dark:border-gray-800">
                <HelpCircle className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No enquiry records found for this customer.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-800/70">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Destination / Tour</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Travel Date</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Pax</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {tabData.enquiries.map((enq, idx) => (
                      <tr key={enq.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {enq.tour_name || enq.destination || enq.subject || 'General Enquiry'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(enq.travel_date)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{enq.pax_count || '1'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {enq.status || 'NEW'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(enq.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: TRIPS & TOURS ── */}
        {activeTab === 'tours' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Booked Trips & Tours</h2>
            {tabLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading trips...
              </div>
            ) : !tabData.tours || tabData.tours.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400 dark:border-gray-800">
                <Plane className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No booked trips or tour packages found for this customer.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tabData.tours.map((trip, idx) => (
                  <div
                    key={trip.id || idx}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {trip.status || 'CONFIRMED'}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(trip.departure_date)}</span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-white">
                      {trip.title || trip.package_name || 'Tour Package'}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">{trip.variant_name || 'Standard Package'}</p>
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                      <span className="text-gray-500">Travelers: {trip.travelers_count || 1}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{trip.amount ? `₹${trip.amount}` : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: REVIEWS ── */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Customer Reviews</h2>
            {tabLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading reviews...
              </div>
            ) : !tabData.reviews || tabData.reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400 dark:border-gray-800">
                <Star className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No reviews submitted by this customer.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tabData.reviews.map((rev, idx) => (
                  <div
                    key={rev.id || idx}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < (rev.rating || 5) ? 'fill-current' : 'opacity-30'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(rev.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{rev.comment || rev.review || 'No written comment.'}</p>
                    {rev.tour_name && (
                      <p className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        Tour: {rev.tour_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 6: REFERRALS ── */}
        {activeTab === 'referrals' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Referral History</h2>
            {tabLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading referrals...
              </div>
            ) : !tabData.referrals || tabData.referrals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400 dark:border-gray-800">
                <Share2 className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No referrals recorded for this customer.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-800/70">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Referred Contact</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Reward Points</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {tabData.referrals.map((ref, idx) => (
                      <tr key={ref.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {ref.referred_name || ref.contact || 'Referee'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {ref.status || 'CONVERTED'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{ref.reward_points || 0} pts</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(ref.created_at)}</td>
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
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Bills & Invoices</h2>
            <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400 dark:border-gray-800">
              <Receipt className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No invoices or billing transactions on record.</p>
              <p className="mt-1 text-xs text-gray-400">Generated booking invoices will appear here automatically.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Document Preview Modal ── */}
      <MediaViewerModal isOpen={!!previewDoc} onClose={() => setPreviewDoc(null)}>
        {previewDoc && (() => {
          const fileType = getFileType(previewDoc.file_url || '', previewDoc.file_name || '');
          return (
            <div style={{ background: '#000' }} className="flex min-h-full w-full flex-col">
              <div
                style={{ background: 'rgba(0,0,0,0.7)' }}
                className="flex shrink-0 items-center justify-center px-12 py-2"
              >
                <span className="max-w-md truncate text-center text-xs font-medium text-slate-400">
                  {previewDoc.title || previewDoc.file_name || 'Document preview'}
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
