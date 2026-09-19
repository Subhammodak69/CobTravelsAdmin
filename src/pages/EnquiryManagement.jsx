import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HelpCircle,
  Plus,
  Pencil,
  Search,
  RefreshCw,
  Calendar,
  Phone,
  Mail,
  TrendingUp,
  MapPin,
  FileText,
  DollarSign,
  Users as UsersIcon,
} from 'lucide-react';
import Modal from '../component/common/Modal';
import SelectField from '../component/common/SelectField';
import Pagination from '../component/common/PaginationComponent';
import ActionMenu from '../component/common/ActionMenu';
import { apiCall, handleApiError } from '../utils/apiCall';

const ENQUIRY_TYPES = [
  { value: 'FIXED_TOUR', label: 'Fixed Tour' },
  { value: 'CUSTOM_TOUR', label: 'Custom Tour' },
  { value: 'HOTEL_ONLY', label: 'Hotel Only' },
  { value: 'TRANSPORT_ONLY', label: 'Transport Only' },
  { value: 'FLIGHT_ONLY', label: 'Flight Only' },
  { value: 'VISA_ASSISTANCE', label: 'Visa Assistance' },
  { value: 'CORPORATE', label: 'Corporate' },
];

const CHANNELS = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'OFFLINE', label: 'Offline / Walk-in' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
];

const STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'LOST', label: 'Lost' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const MEAL_PLANS = [
  { value: 'ANY', label: 'Any Plan' },
  { value: 'NONE', label: 'None / Room Only' },
  { value: 'CP', label: 'Continental Plan (Breakfast)' },
  { value: 'MAP', label: 'Modified American Plan (Breakfast + Dinner)' },
  { value: 'AP', label: 'American Plan (All Meals)' },
];

const defaultCreateForm = {
  enquiry_type: 'FIXED_TOUR',
  channel: 'WEBSITE',
  name: '',
  phone: '',
  email: '',
  destination_id: '',
  package_id: '',
  variant_id: '',
  hotel_id: '',
  vehicle_id: '',
  customer_id: '',
  visitor_id: '',
  travel_date: '',
  travel_duration_day: 1,
  travel_duration_night: 1,
  adult_count: 1,
  child_count: 0,
  senior_count: 0,
  room_count: 1,
  vehicle_count: 0,
  budget_min: 0,
  budget_max: 0,
  meal_plan: 'ANY',
  message: '',
  special_requirements: '',
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

const formatShortDate = (value) => {
  if (!value) return 'Flexible';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
};

const statusBadgeClasses = {
  NEW: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300',
  IN_PROGRESS: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300',
  QUALIFIED: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300',
  FOLLOW_UP: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/40 dark:bg-purple-900/20 dark:text-purple-300',
  CONVERTED: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300',
  LOST: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300',
  CANCELLED: 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

const EnquiryManagement = () => {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Active items
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [editingEnquiry, setEditingEnquiry] = useState(null);
  const [statusEditForm, setStatusEditForm] = useState({ status: 'NEW', message: '' });

  // Details & Lead Information
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [leadDetails, setLeadDetails] = useState(null);
  const [leadLoading, setLeadLoading] = useState(false);

  // Lookup references (Destinations, Hotels, Tour Packages, Staff)
  const [destinations, setDestinations] = useState([]);
  const [destLoading, setDestLoading] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [packages, setPackages] = useState([]);
  const [staffAccounts, setStaffAccounts] = useState([]);

  // Load Reference Data
  const loadReferenceData = useCallback(async () => {
    setDestLoading(true);
    try {
      // 1. Destinations
      apiCall('/api/v1/admin/destinations?page=1&page_size=100', 'GET')
        .then((r) => r.json())
        .then((res) => {
          if (Array.isArray(res?.data)) {
            setDestinations(res.data.map((d) => ({ value: d.id, label: d.name })));
          }
        })
        .catch(() => {})
        .finally(() => setDestLoading(false));

      // 2. Hotels
      apiCall('/api/v1/admin/hotels?page=1&page_size=100', 'GET')
        .then((r) => r.json())
        .then((res) => {
          if (Array.isArray(res?.data)) {
            setHotels(res.data.map((h) => ({ value: h.id, label: `${h.name} (${h.category || 'Hotel'})` })));
          }
        })
        .catch(() => {});

      // 3. Packages
      apiCall('/api/v1/admin/tour-packages?page=1&page_size=100', 'GET')
        .then((r) => r.json())
        .then((res) => {
          if (Array.isArray(res?.data)) {
            setPackages(res.data.map((p) => ({ value: p.id, label: `${p.title} (${p.tour_code || 'Package'})` })));
          }
        })
        .catch(() => {});

      // 4. Staff / Accounts
      apiCall('/api/v1/admin/account?page=1&page_size=100', 'GET')
        .then((r) => r.json())
        .then((res) => {
          if (Array.isArray(res?.data)) {
            setStaffAccounts(res.data.map((a) => ({ value: a.id, label: `${a.name} (${a.role || 'Staff'})` })));
          }
        })
        .catch(() => {});
    } catch {
      setDestLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // Lookup Maps
  const destMap = useMemo(() => {
    const map = {};
    destinations.forEach((d) => (map[d.value] = d.label));
    return map;
  }, [destinations]);

  const hotelMap = useMemo(() => {
    const map = {};
    hotels.forEach((h) => (map[h.value] = h.label));
    return map;
  }, [hotels]);

  const packageMap = useMemo(() => {
    const map = {};
    packages.forEach((p) => (map[p.value] = p.label));
    return map;
  }, [packages]);

  const staffMap = useMemo(() => {
    const map = {};
    staffAccounts.forEach((s) => (map[s.value] = s.label));
    return map;
  }, [staffAccounts]);

  // Load Enquiries API
  const loadEnquiries = useCallback(
    async (page = currentPage, limit = itemsPerPage) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ page, page_size: limit });
        const response = await apiCall(`/api/v1/admin/enquiries?${queryParams.toString()}`, 'GET');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || payload?.detail || 'Unable to fetch enquiries');
        }
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setEnquiries(data);
        if (payload?.pagination) {
          setTotalItems(payload.pagination.total_items ?? data.length);
        } else {
          setTotalItems(data.length);
        }
      } catch (error) {
        handleApiError(error, 'Unable to fetch enquiries');
      } finally {
        setLoading(false);
      }
    },
    [currentPage, itemsPerPage]
  );

  useEffect(() => {
    loadEnquiries(currentPage, itemsPerPage);
  }, [loadEnquiries, currentPage, itemsPerPage]);

  // Navigate to Lead Management Page
  const openEnquiryDetails = (enquiry) => {
    navigate(`/enquiries/${enquiry.id}/lead`, { state: { enquiry } });
  };

  // Open Edit Status Modal
  const openEditModal = (enquiry) => {
    setEditingEnquiry(enquiry);
    setStatusEditForm({
      status: enquiry.status || 'NEW',
      message: enquiry.message || '',
    });
    setIsEditModalOpen(true);
  };

  // Handle Create Enquiry Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() && !createForm.phone.trim() && !createForm.email.trim()) {
      toast.error('Please provide at least a name, phone, or email.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        enquiry_type: createForm.enquiry_type,
        channel: createForm.channel,
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim(),
        destination_id: createForm.destination_id || '',
        package_id: createForm.package_id || '',
        variant_id: createForm.variant_id || '',
        hotel_id: createForm.hotel_id || '',
        vehicle_id: createForm.vehicle_id || '',
        customer_id: createForm.customer_id || '',
        visitor_id: createForm.visitor_id || '',
        travel_date: createForm.travel_date || '',
        travel_duration_day: Number(createForm.travel_duration_day) || 0,
        travel_duration_night: Number(createForm.travel_duration_night) || 0,
        adult_count: Number(createForm.adult_count) || 0,
        child_count: Number(createForm.child_count) || 0,
        senior_count: Number(createForm.senior_count) || 0,
        room_count: Number(createForm.room_count) || 0,
        vehicle_count: Number(createForm.vehicle_count) || 0,
        budget_min: Number(createForm.budget_min) || 0,
        budget_max: Number(createForm.budget_max) || 0,
        meal_plan: createForm.meal_plan,
        message: createForm.message.trim(),
        special_requirements: createForm.special_requirements.trim(),
      };

      const res = await apiCall('/api/v1/admin/enquiries', 'POST', payload);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.detail || 'Failed to create enquiry');
      }

      toast.success(data?.message || 'Enquiry recorded successfully!');
      setIsCreateModalOpen(false);
      setCreateForm(defaultCreateForm);
      await loadEnquiries(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to create enquiry');
    } finally {
      setSaving(false);
    }
  };

  // Handle Edit Status / Message Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingEnquiry) return;

    setSaving(true);
    try {
      const payload = {
        status: statusEditForm.status,
        message: statusEditForm.message.trim(),
      };

      const res = await apiCall(`/api/v1/admin/enquiries/${editingEnquiry.id}`, 'PATCH', payload);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.detail || 'Failed to update enquiry status');
      }

      toast.success(data?.message || 'Enquiry updated successfully');
      setIsEditModalOpen(false);
      setEditingEnquiry(null);
      await loadEnquiries(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to update enquiry');
    } finally {
      setSaving(false);
    }
  };

  // Filtered enquiries list
  const filteredEnquiries = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return enquiries.filter((item) => {
      const matchesSearch =
        !term ||
        [
          item.enquiry_code,
          item.enquirer_name,
          item.enquirer_phone,
          item.enquirer_email,
          item.message,
          item.special_requirements,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term);

      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || item.enquiry_type === typeFilter;
      const matchesChannel = channelFilter === 'ALL' || item.channel === channelFilter;

      return matchesSearch && matchesStatus && matchesType && matchesChannel;
    });
  }, [enquiries, searchTerm, statusFilter, typeFilter, channelFilter]);

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
  const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="space-y-3 pb-6">
      {/* Header */}
      <div className="px-2 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mt-1 bg-gradient-to-r from-slate-900 via-indigo-600 to-violet-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl dark:from-slate-100 dark:via-indigo-300 dark:to-violet-300">
              Enquiry Management
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track and convert incoming customer leads, holiday packages, hotel and custom trip queries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadEnquiries(currentPage, itemsPerPage)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateForm(defaultCreateForm);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 shadow-xs border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-indigo-400 dark:hover:bg-gray-700"
            >
              <Plus className="h-4 w-4" />
              Add enquiry
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="mt-5 px-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search code, name, phone..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:bg-gray-800"
              />
            </div>

            {/* Status Filter */}
            <div>
              <SelectField
                options={[{ value: 'ALL', label: 'All Statuses' }, ...STATUSES]}
                value={[{ value: 'ALL', label: 'All Statuses' }, ...STATUSES].find((s) => s.value === statusFilter)}
                onChange={(sel) => setStatusFilter(sel?.value || 'ALL')}
                isSearchable={false}
                placeholder="Filter status"
                menuPlacement="auto"
              />
            </div>

            {/* Enquiry Type Filter */}
            <div>
              <SelectField
                options={[{ value: 'ALL', label: 'All Types' }, ...ENQUIRY_TYPES]}
                value={[{ value: 'ALL', label: 'All Types' }, ...ENQUIRY_TYPES].find((t) => t.value === typeFilter)}
                onChange={(sel) => setTypeFilter(sel?.value || 'ALL')}
                isSearchable={false}
                placeholder="Filter type"
                menuPlacement="auto"
              />
            </div>

            {/* Channel Filter */}
            <div>
              <SelectField
                options={[{ value: 'ALL', label: 'All Channels' }, ...CHANNELS]}
                value={[{ value: 'ALL', label: 'All Channels' }, ...CHANNELS].find((c) => c.value === channelFilter)}
                onChange={(sel) => setChannelFilter(sel?.value || 'ALL')}
                isSearchable={false}
                placeholder="Filter channel"
                menuPlacement="auto"
              />
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300 shrink-0">
            {filteredEnquiries.length} total records
          </div>
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading customer enquiries...
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400">
              <HelpCircle className="h-6 w-6" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL' || channelFilter !== 'ALL'
                ? 'No enquiries match your selected filters.'
                : 'No customer enquiries recorded yet.'}
            </p>
            {!searchTerm && statusFilter === 'ALL' && typeFilter === 'ALL' && channelFilter === 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setCreateForm(defaultCreateForm);
                  setIsCreateModalOpen(true);
                }}
                className="mt-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Add first enquiry
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/70">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Code & Type</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Customer / Contact</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Requirements & Travel</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Channel</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status & Lead Score</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEnquiries.map((enq) => {
                  const leadScore = enq.lead?.lead_score;
                  const destTitle = destMap[enq.destination_id];
                  const pkgTitle = packageMap[enq.package_id];

                  return (
                    <tr
                      key={enq.id}
                      onClick={() => openEnquiryDetails(enq)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    >
                      {/* Enquiry Code & Type */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {enq.enquiry_code || enq.id?.slice(0, 8) || 'ENQ-NEW'}
                          </span>
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                            {enq.enquiry_type?.replace(/_/g, ' ') || 'Fixed Tour'}
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5">
                            {formatDate(enq.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Customer / Contact */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {enq.enquirer_name || 'Anonymous Visitor'}
                          </span>
                          {enq.enquirer_phone && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                              <Phone className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span>{enq.enquirer_phone}</span>
                            </div>
                          )}
                          {enq.enquirer_email && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              <Mail className="h-3 w-3 text-blue-400 shrink-0" />
                              <span className="truncate max-w-xs">{enq.enquirer_email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Requirements & Travel */}
                      <td className="px-4 py-4 max-w-xs">
                        <div className="flex flex-col gap-0.5">
                          {destTitle && (
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-800 dark:text-gray-200">
                              <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{destTitle}</span>
                            </div>
                          )}
                          {pkgTitle && (
                            <div className="text-xs text-indigo-600 dark:text-indigo-400 truncate">
                              Package: {pkgTitle}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatShortDate(enq.travel_date)}
                            </span>
                            {(enq.adult_count || enq.child_count || enq.senior_count) ? (
                              <span className="flex items-center gap-1">
                                <UsersIcon className="h-3 w-3" />
                                {Number(enq.adult_count || 0) +
                                  Number(enq.child_count || 0) +
                                  Number(enq.senior_count || 0)}{' '}
                                Pax
                              </span>
                            ) : null}
                          </div>
                          {enq.message && (
                            <p className="text-xs text-gray-400 line-clamp-1 italic mt-0.5">
                              &ldquo;{enq.message}&rdquo;
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {enq.channel || 'WEBSITE'}
                        </span>
                      </td>

                      {/* Status & Lead Score */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`inline-flex items-center w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              statusBadgeClasses[enq.status] || statusBadgeClasses.NEW
                            }`}
                          >
                            {enq.status || 'NEW'}
                          </span>
                          {leadScore !== undefined && leadScore !== null && (
                            <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                              <TrendingUp className="h-3 w-3 text-indigo-500" />
                              Score: <span className="font-semibold text-gray-700 dark:text-gray-200">{leadScore}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          menuId={`enq-${enq.id}`}
                          actions={[
                            {
                              label: 'Manage Lead',
                              icon: <TrendingUp className="h-4 w-4 text-indigo-500" />,
                              onClick: () => navigate(`/enquiries/${enq.id}/lead`, { state: { enquiry: enq } }),
                            },
                            {
                              label: 'Update Status',
                              icon: <Pencil className="h-4 w-4 text-blue-500" />,
                              onClick: () => openEditModal(enq),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onLimitChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* ── CREATE ENQUIRY MODAL using Modal footer prop ── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!saving) setIsCreateModalOpen(false);
        }}
        title="Add New Customer Enquiry"
        icon={HelpCircle}
        size="2xl"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-enquiry-form"
              disabled={saving}
              className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
            >
              {saving ? 'Recording...' : 'Create enquiry'}
            </button>
          </div>
        )}
      >
        <form id="create-enquiry-form" onSubmit={handleCreateSubmit} className="space-y-4 p-1">
          {/* Customer Contacts */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              1. Enquirer Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>
                  Customer name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Phone number</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email address</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="customer@example.com"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Enquiry Type and Channel */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              2. Channel & Scope
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Enquiry type</label>
                <SelectField
                  options={ENQUIRY_TYPES}
                  value={ENQUIRY_TYPES.find((t) => t.value === createForm.enquiry_type) || null}
                  onChange={(selected) => setCreateForm({ ...createForm, enquiry_type: selected?.value || 'FIXED_TOUR' })}
                  isSearchable={false}
                  placeholder="Select enquiry type"
                  menuPlacement="auto"
                />
              </div>

              <div>
                <label className={labelClass}>Source channel</label>
                <SelectField
                  options={CHANNELS}
                  value={CHANNELS.find((c) => c.value === createForm.channel) || null}
                  onChange={(selected) => setCreateForm({ ...createForm, channel: selected?.value || 'WEBSITE' })}
                  isSearchable={false}
                  placeholder="Select source channel"
                  menuPlacement="auto"
                />
              </div>
            </div>
          </div>

          {/* Destinations and Packages */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              3. Destination & Package Matching
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Destination</label>
                <SelectField
                  options={destinations}
                  isLoading={destLoading}
                  value={destinations.find((d) => d.value === createForm.destination_id) || null}
                  onChange={(opt) => setCreateForm({ ...createForm, destination_id: opt?.value || '' })}
                  placeholder="Select destination"
                  isClearable
                  menuPlacement="auto"
                />
              </div>

              <div>
                <label className={labelClass}>Tour package</label>
                <SelectField
                  options={packages}
                  value={packages.find((p) => p.value === createForm.package_id) || null}
                  onChange={(opt) => setCreateForm({ ...createForm, package_id: opt?.value || '' })}
                  placeholder="Select package"
                  isClearable
                  menuPlacement="auto"
                />
              </div>

              <div>
                <label className={labelClass}>Preferred hotel</label>
                <SelectField
                  options={hotels}
                  value={hotels.find((h) => h.value === createForm.hotel_id) || null}
                  onChange={(opt) => setCreateForm({ ...createForm, hotel_id: opt?.value || '' })}
                  placeholder="Select hotel"
                  isClearable
                  menuPlacement="auto"
                />
              </div>
            </div>
          </div>

          {/* Travel Dates & Duration */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              4. Travel Details & Pax
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelClass}>Travel date</label>
                <input
                  type="date"
                  value={createForm.travel_date}
                  onChange={(e) => setCreateForm({ ...createForm, travel_date: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Duration (Days / Nights)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Days"
                    value={createForm.travel_duration_day}
                    onChange={(e) => setCreateForm({ ...createForm, travel_duration_day: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Nights"
                    value={createForm.travel_duration_night}
                    onChange={(e) => setCreateForm({ ...createForm, travel_duration_night: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Adults / Children / Seniors</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="0"
                    title="Adults"
                    placeholder="Ad"
                    value={createForm.adult_count}
                    onChange={(e) => setCreateForm({ ...createForm, adult_count: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min="0"
                    title="Children"
                    placeholder="Ch"
                    value={createForm.child_count}
                    onChange={(e) => setCreateForm({ ...createForm, child_count: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min="0"
                    title="Seniors"
                    placeholder="Sr"
                    value={createForm.senior_count}
                    onChange={(e) => setCreateForm({ ...createForm, senior_count: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Rooms / Meal plan</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Rooms"
                    value={createForm.room_count}
                    onChange={(e) => setCreateForm({ ...createForm, room_count: e.target.value })}
                    className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <SelectField
                      options={MEAL_PLANS}
                      value={MEAL_PLANS.find((m) => m.value === createForm.meal_plan) || null}
                      onChange={(selected) => setCreateForm({ ...createForm, meal_plan: selected?.value || 'ANY' })}
                      isSearchable={false}
                      placeholder="Meal plan"
                      menuPlacement="auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Budget & Message */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Budget range (Min - Max)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min budget (₹)"
                    value={createForm.budget_min}
                    onChange={(e) => setCreateForm({ ...createForm, budget_min: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Max budget (₹)"
                    value={createForm.budget_max}
                    onChange={(e) => setCreateForm({ ...createForm, budget_max: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Special requirements</label>
                <input
                  type="text"
                  placeholder="e.g. Sea view room, vegetarian meals, airport pickup"
                  value={createForm.special_requirements}
                  onChange={(e) => setCreateForm({ ...createForm, special_requirements: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className={labelClass}>Customer enquiry message</label>
              <textarea
                rows={2}
                placeholder="Notes or query details provided by the customer..."
                value={createForm.message}
                onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* ── UPDATE STATUS / MESSAGE MODAL using Modal footer prop ── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!saving) setIsEditModalOpen(false);
        }}
        title="Update Enquiry Status"
        icon={Pencil}
        size="md"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="status-update-form"
              disabled={saving}
              className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
            >
              {saving ? 'Updating...' : 'Save changes'}
            </button>
          </div>
        )}
      >
        <form id="status-update-form" onSubmit={handleEditSubmit} className="space-y-4 p-1">
          <div>
            <label className={labelClass}>Enquiry status</label>
            <SelectField
              options={STATUSES}
              value={STATUSES.find((s) => s.value === statusEditForm.status) || null}
              onChange={(selected) => setStatusEditForm({ ...statusEditForm, status: selected?.value || 'NEW' })}
              isSearchable={false}
              placeholder="Select status"
              menuPlacement="auto"
            />
          </div>

          <div>
            <label className={labelClass}>Status update note / message</label>
            <textarea
              rows={4}
              value={statusEditForm.message}
              onChange={(e) => setStatusEditForm({ ...statusEditForm, message: e.target.value })}
              placeholder="Record follow-up remarks or notes regarding this status change..."
              className={inputClass}
            />
          </div>
        </form>
      </Modal>

      {/* ── DETAILS & LEAD INSPECTION MODAL using Modal footer prop ── */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedEnquiry(null);
          setLeadDetails(null);
        }}
        title="Enquiry & Lead Details"
        icon={FileText}
        size="3xl"
        footer={(
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-gray-400">
              {selectedEnquiry ? `Created: ${formatDate(selectedEnquiry.created_at)}` : ''}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  openEditModal(selectedEnquiry);
                }}
                className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
              >
                Update status
              </button>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      >
        {selectedEnquiry && (
          <div className="space-y-4 p-1">
            {/* Top Bar Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/40">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {selectedEnquiry.enquiry_code || 'ENQ-DETAILS'}
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  {selectedEnquiry.enquirer_name || 'Anonymous Visitor'}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300 mt-1">
                  {selectedEnquiry.enquirer_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-emerald-500" />
                      {selectedEnquiry.enquirer_phone}
                    </span>
                  )}
                  {selectedEnquiry.enquirer_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-blue-400" />
                      {selectedEnquiry.enquirer_email}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                    statusBadgeClasses[selectedEnquiry.status] || statusBadgeClasses.NEW
                  }`}
                >
                  {selectedEnquiry.status || 'NEW'}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Channel: <strong className="text-gray-700 dark:text-gray-300">{selectedEnquiry.channel || 'WEBSITE'}</strong>
                </span>
              </div>
            </div>

            {/* Lead Status & Performance Overview */}
            <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Lead Performance & Conversion Status
                </h4>
                {leadLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" />}
              </div>

              {leadDetails ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                    <span className="text-[11px] text-gray-400">Lead score</span>
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {leadDetails.lead_score ?? 0}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                    <span className="text-[11px] text-gray-400">Assigned agent</span>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate mt-1">
                      {staffMap[leadDetails.assigned_account_id] || leadDetails.assigned_account_id?.slice(0, 8) || 'Unassigned'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                    <span className="text-[11px] text-gray-400">Qualified date</span>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1">
                      {formatShortDate(leadDetails.qualified_at)}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                    <span className="text-[11px] text-gray-400">Conversion / Lost</span>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1">
                      {leadDetails.converted_at
                        ? `Converted: ${formatShortDate(leadDetails.converted_at)}`
                        : leadDetails.lost_at
                        ? `Lost: ${leadDetails.lost_reason || 'Lost'}`
                        : 'In Pipeline'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-xs text-gray-400 italic">
                  {leadLoading ? 'Fetching lead analytics...' : 'No lead records available.'}
                </div>
              )}
            </div>

            {/* Travel & Requirements Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trip Parameters */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  Trip Scope & Itinerary
                </h4>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-gray-400">Travel date</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {formatShortDate(selectedEnquiry.travel_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Duration</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedEnquiry.travel_duration_day || 0} Days / {selectedEnquiry.travel_duration_night || 0} Nights
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Pax breakdown</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedEnquiry.adult_count || 0} Ad, {selectedEnquiry.child_count || 0} Ch, {selectedEnquiry.senior_count || 0} Sr
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Accommodations</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedEnquiry.room_count || 0} Rooms ({selectedEnquiry.meal_plan || 'ANY'})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Destination</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 truncate">
                      {destMap[selectedEnquiry.destination_id] || selectedEnquiry.destination_id || 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Tour package</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 truncate">
                      {packageMap[selectedEnquiry.package_id] || selectedEnquiry.package_id || 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Preferred hotel</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 truncate">
                      {hotelMap[selectedEnquiry.hotel_id] || selectedEnquiry.hotel_id || 'Not specified'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Budget & Extras */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Budget & Special Needs
                </h4>
                <dl className="space-y-2.5 text-xs">
                  <div>
                    <dt className="text-gray-400">Budget range</dt>
                    <dd className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                      {selectedEnquiry.budget_min || selectedEnquiry.budget_max
                        ? `₹${selectedEnquiry.budget_min || 0} - ₹${selectedEnquiry.budget_max || 0}`
                        : 'Flexible / Not stated'}
                    </dd>
                  </div>
                  {selectedEnquiry.special_requirements && (
                    <div>
                      <dt className="text-gray-400">Special requirements</dt>
                      <dd className="text-gray-800 dark:text-gray-200 font-medium mt-0.5">
                        {selectedEnquiry.special_requirements}
                      </dd>
                    </div>
                  )}
                  {selectedEnquiry.message && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                      <dt className="text-gray-400">Customer message</dt>
                      <dd className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap rounded-xl bg-gray-50 dark:bg-gray-900 p-2.5 text-xs">
                        {selectedEnquiry.message}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EnquiryManagement;
