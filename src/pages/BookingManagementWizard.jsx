import React, { useCallback, useEffect, useRef, useState } from 'react';
import ManagementTable from '../component/common/ManagementTable';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Eye, FileText, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import Modal from '../component/common/Modal';
import ConfirmDeleteModal from '../component/common/ConfirmDeleteModal';
import CustomDatePicker from '../component/common/CustomDatePicker';
import Pagination from '../component/common/PaginationComponent';
import ActionMenu from '../component/common/ActionMenu';
import SelectField from '../component/common/SelectField';
import { useEnums } from '../context/EnumsContext';
import { apiCall, handleApiError } from '../utils/apiCall';
import { sanitizeNumericInput } from '../utils/inputValidation';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
const emptyTraveller = { full_name: '', gender: '', date_of_birth: '', mobile: '', email: '', relationship_to_customer: '', is_primary: false };
const defaultForm = { customer_id: '', enquiry_id: '', quotation_id: '', destination_id: '', package_id: '', variant_id: '', departure_id: '', departure_date: '', return_date: '', adult_count: '1', child_count: '0', senior_count: '0', total_selling_price: '0', advance_received: '0', payment_mode: 'CASH', sales_account_id: '', source: 'OFFLINE', special_notes: '', travellers: [{ ...emptyTraveller }] };

const bookingStatuses = ['TENTATIVE', 'CONFIRMED', 'PARTIALLY_PAID', 'FULLY_PAID', 'TRAVELLED', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'REFUNDED'];
const bookingSources = ['APP', 'WEBSITE', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'PHONE', 'WALK_IN', 'EXISTING_CUSTOMER', 'REFERRAL', 'B2B', 'OFFLINE', 'OTHER'];
const paymentMethods = ['WALLET', 'RAZORPAY', 'UPI', 'CASH', 'BANK_TRANSFER', 'NET_BANKING', 'CARD', 'OFFLINE', 'OTHER'];

const fallbackEnumOptions = (values) => values.map((value) => ({ value, label: value.toLowerCase().replaceAll('_', ' ') }));
const statusClasses = {
  TENTATIVE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  PARTIALLY_PAID: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  FULLY_PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  TRAVELLED: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  COMPLETED: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  ON_HOLD: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  CANCELLED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  REFUNDED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};
const steps = [{ id: 1, label: 'References' }, { id: 2, label: 'Trip & Dates' }, { id: 3, label: 'Commercial' }, { id: 4, label: 'Travellers' }];
const referenceEndpoints = {
  customer_id: '/api/v1/admin/customers?page=1&page_size=100',
  enquiry_id: '/api/v1/admin/enquiries?page=1&page_size=100',
  quotation_id: '/api/v1/admin/quotations?page=1&page_size=100',
  destination_id: '/api/v1/admin/destinations?page=1&page_size=100',
  package_id: '/api/v1/admin/tour-packages?page=1&page_size=100',
  sales_account_id: '/api/v1/admin/account?page=1&page_size=100',
};

const BookingManagementWizard = () => {
  const navigate = useNavigate();
  const { getEnumOptions } = useEnums();
  const apiBookingSources = getEnumOptions('BookingSource');
  const bookingSourceOptions = apiBookingSources.length ? apiBookingSources : fallbackEnumOptions(bookingSources);
  const paymentMethodOptions = getEnumOptions('PaymentMethod').length ? getEnumOptions('PaymentMethod') : fallbackEnumOptions(paymentMethods);
  const genderOptions = getEnumOptions('Gender').length ? getEnumOptions('Gender') : fallbackEnumOptions(['MALE', 'FEMALE', 'OTHER']);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const createSubmitRequested = useRef(false);
  const [customerSource, setCustomerSource] = useState('CUSTOMER');
  const [tripSelection, setTripSelection] = useState('PACKAGE');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [references, setReferences] = useState({});
  const [referencesLoading, setReferencesLoading] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filters & Pagination matching ADMIN_BOOKINGS_API.md
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadBookings = useCallback(async (currentPage = page, pageSize = limit) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        page_size: String(pageSize),
      });
      if (statusFilter) params.append('status', statusFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const response = await apiCall(`/api/v1/admin/bookings?${params.toString()}`, 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || 'Unable to fetch bookings');
      setBookings(Array.isArray(payload?.data) ? payload.data : []);
      setTotalItems(Number(payload?.pagination?.total_items ?? payload?.data?.length ?? 0));
    } catch (error) {
      handleApiError(error, 'Unable to load bookings');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, sourceFilter, searchQuery]);

  useEffect(() => {
    loadBookings(page, limit);
  }, [loadBookings, page, limit]);

  const loadReference = async (field) => {
    if (!referenceEndpoints[field] || references[field] || referencesLoading[field]) return;
    setReferencesLoading((current) => ({ ...current, [field]: true }));
    try {
      const response = await apiCall(referenceEndpoints[field], 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || `Unable to load ${field.replace('_id', '')}`);
      const records = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.items) ? payload.data.items : Array.isArray(payload?.data?.results) ? payload.data.results : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.results) ? payload.results : [];
      setReferences((current) => ({ ...current, [field]: records }));
    } catch (error) {
      handleApiError(error, `Unable to load ${field.replace('_id', '')}`);
    } finally {
      setReferencesLoading((current) => ({ ...current, [field]: false }));
    }
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateTraveller = (index, field, value) => setForm((current) => ({ ...current, travellers: current.travellers.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  const openCreate = () => {
    createSubmitRequested.current = false;
    setForm(defaultForm);
    setCustomerSource('CUSTOMER');
    setTripSelection('PACKAGE');
    setCreateStep(1);
    setIsCreateOpen(true);
  };
  const closeCreate = () => {
    createSubmitRequested.current = false;
    setIsCreateOpen(false);
    setForm(defaultForm);
    setCustomerSource('CUSTOMER');
    setTripSelection('PACKAGE');
    setCreateStep(1);
  };

  const recordLabel = (record, field) => field === 'customer_id'
    ? [record.name || record.full_name || record.customer_name, record.mobile || record.email].filter(Boolean).join(' - ')
    : field === 'enquiry_id'
      ? [record.enquirer_name || record.name || record.customer_name, record.enquiry_code || record.id].filter(Boolean).join(' - ')
      : field === 'destination_id'
        ? [record.name || record.title, record.country].filter(Boolean).join(' - ') || 'Unnamed destination'
        : field === 'package_id'
        ? [record.name || record.title || record.package_name, record.code || record.package_code].filter(Boolean).join(' - ') || 'Unnamed package'
        : field === 'sales_account_id'
          ? [[record.first_name, record.last_name].filter(Boolean).join(' ') || record.name || record.full_name, record.email].filter(Boolean).join(' - ') || 'Unnamed staff member'
          : [record.code, record.customer_code, record.enquiry_code, record.quotation_code, record.name, record.title, record.package_name, record.customer_name, record.full_name, record.departure_date || record.date, record.email].filter(Boolean).join(' - ') || 'Unnamed record';

  const optionFor = (field) => (references[field] || []).map((record) => ({ value: record.id, label: recordLabel(record, field), raw: record }));

  const chooseReference = async (field, option) => {
    updateForm(field, option?.value || '');
    if (field === 'customer_id') {
      updateForm('enquiry_id', '');
      updateForm('quotation_id', '');
      if (option?.raw) {
        const raw = option.raw;
        setForm((current) => ({
          ...current,
          customer_id: raw.id || '',
          travellers: current.travellers.map((traveller, index) => index === 0 ? {
            ...traveller,
            full_name: raw.name || raw.full_name || traveller.full_name || '',
            mobile: raw.mobile || raw.phone || traveller.mobile || '',
            email: raw.email || traveller.email || '',
            is_primary: true,
          } : traveller),
        }));
      }
    }
    if (field === 'enquiry_id') {
      const enquiry = option?.raw || {};
      const linkedCustomerId = enquiry.customer_id || enquiry.customer?.id || '';
      const hasPackage = Boolean(enquiry.package_id);
      const enquirySource = bookingSourceOptions.some((source) => source.value === enquiry.channel) ? enquiry.channel : 'OFFLINE';
      updateForm('customer_id', linkedCustomerId);
      updateForm('quotation_id', '');
      setTripSelection(hasPackage ? 'PACKAGE' : 'DESTINATION');
      setForm((current) => ({
        ...current,
        customer_id: linkedCustomerId,
        quotation_id: '',
        destination_id: hasPackage ? '' : enquiry.destination_id || '',
        package_id: enquiry.package_id || '',
        variant_id: hasPackage ? enquiry.variant_id || '' : '',
        departure_id: '',
        departure_date: enquiry.travel_date ? String(enquiry.travel_date).slice(0, 10) : '',
        return_date: '',
        adult_count: String(enquiry.adult_count ?? 1),
        child_count: String(enquiry.child_count ?? 0),
        senior_count: String(enquiry.senior_count ?? 0),
        source: enquirySource,
        special_notes: enquiry.special_requirements || enquiry.message || '',
        travellers: [{ ...current.travellers[0], full_name: enquiry.enquirer_name || '', mobile: enquiry.enquirer_phone || '', email: enquiry.enquirer_email || '', is_primary: Boolean(enquiry.enquirer_name || enquiry.enquirer_phone || enquiry.enquirer_email) }, ...current.travellers.slice(1)],
      }));
      if (hasPackage) {
        await loadReference('package_id');
        try {
          const response = await apiCall(`/api/v1/admin/tour-packages/${encodeURIComponent(enquiry.package_id)}/variants?page=1&page_size=100`, 'GET');
          const payload = await response.json().catch(() => ({}));
          setReferences((current) => ({ ...current, variant_id: response.ok && Array.isArray(payload?.data) ? payload.data : [], departure_id: [] }));
        } catch { setReferences((current) => ({ ...current, variant_id: [], departure_id: [] })); }
      } else {
        setReferences((current) => ({ ...current, variant_id: [], departure_id: [] }));
        if (enquiry.destination_id) await loadReference('destination_id');
      }
    }
    if (field === 'destination_id') {
      updateForm('package_id', '');
      updateForm('variant_id', '');
      updateForm('departure_id', '');
    }
    if (field === 'package_id') {
      updateForm('variant_id', '');
      updateForm('departure_id', '');
      if (!option?.value) { setReferences((current) => ({ ...current, variant_id: [], departure_id: [] })); return; }
      try {
        const response = await apiCall(`/api/v1/admin/tour-packages/${encodeURIComponent(option.value)}/variants?page=1&page_size=100`, 'GET');
        const payload = await response.json().catch(() => ({}));
        setReferences((current) => ({ ...current, variant_id: response.ok && Array.isArray(payload?.data) ? payload.data : [], departure_id: [] }));
      } catch { setReferences((current) => ({ ...current, variant_id: [], departure_id: [] })); }
    }
    if (field === 'variant_id') {
      updateForm('departure_id', '');
      if (!option?.value || !form.package_id) { setReferences((current) => ({ ...current, departure_id: [] })); return; }
      try {
        let response = await apiCall(`/api/v1/admin/tour-packages/${encodeURIComponent(form.package_id)}/variants/${encodeURIComponent(option.value)}`, 'GET');
        if (response.status === 404) response = await apiCall(`/api/v1/admin/tour-details/${encodeURIComponent(option.value)}`, 'GET');
        const payload = await response.json().catch(() => ({}));
        const details = payload?.data || option.raw || {};
        setReferences((current) => ({ ...current, departure_id: Array.isArray(details.departure_dates) ? details.departure_dates : [] }));
      } catch { setReferences((current) => ({ ...current, departure_id: [] })); }
    }
  };

  const referenceField = (label, fieldName, placeholder) => {
    const options = optionFor(fieldName);
    const selected = options.find((option) => option.value === form[fieldName]) || null;
    const previewKeys = fieldName === 'enquiry_id'
      ? ['enquirer_name', 'name', 'customer_name', 'enquiry_code', 'email', 'enquirer_email', 'mobile', 'enquirer_phone', 'status']
      : fieldName === 'destination_id'
        ? ['name', 'title', 'country', 'description', 'status']
      : fieldName === 'package_id'
        ? ['name', 'title', 'package_name', 'code', 'package_code', 'description', 'destination', 'status']
        : fieldName === 'sales_account_id'
          ? ['first_name', 'last_name', 'name', 'full_name', 'email', 'phone', 'mobile', 'role', 'status']
          : ['name', 'full_name', 'customer_name', 'email', 'mobile', 'phone', 'status', 'departure_date', 'date'];
    return (
      <div className="border-b border-slate-100 pb-5 last:border-b-0 dark:border-gray-700">
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <SelectField
          options={options}
          value={selected}
          onMenuOpen={() => loadReference(fieldName)}
          onChange={(option) => chooseReference(fieldName, option)}
          isSearchable
          isClearable
          isLoading={Boolean(referencesLoading[fieldName])}
          placeholder={placeholder}
          noOptionsMessage={() => referencesLoading[fieldName] ? 'Loading records...' : 'No records available'}
        />
        <p className="mt-1.5 text-xs text-gray-500">{selected ? `Selected: ${selected.label}` : 'Click to load and search by name, code, or email'}</p>
        {selected?.raw && (
          <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4 text-xs text-cyan-900 dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-200">
            <strong className="text-sm">Selected {fieldName === 'enquiry_id' ? 'enquiry' : fieldName === 'package_id' ? 'package' : 'record'}</strong>
            <div className="mt-2 grid gap-x-5 gap-y-1 sm:grid-cols-2">
              {previewKeys.map((key) => selected.raw[key] ? <span key={key}><b>{key.replaceAll('_', ' ')}:</b> {String(selected.raw[key])}</span> : null)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const field = (label, key, type = 'text') => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type="text"
        inputMode={type === 'number' ? 'decimal' : undefined}
        value={form[key]}
        onChange={(event) => updateForm(key, type === 'number' ? sanitizeNumericInput(event.target.value) : event.target.value)}
        className={inputClass}
      />
    </div>
  );

  const travellerField = (index, key, value) => (
    <div key={key}>
      <label className="mb-1.5 block text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{key.replaceAll('_', ' ')}</label>
      {key === 'gender' ? (
        <SelectField
          options={genderOptions}
          value={genderOptions.find((option) => option.value === value) || null}
          onChange={(option) => updateTraveller(index, key, option?.value || '')}
          isSearchable={false}
          isClearable
          placeholder="Select gender"
        />
      ) : key === 'date_of_birth' ? (
        <CustomDatePicker
          value={value}
          onChange={(date) => updateTraveller(index, key, date)}
          includeTime={false}
          placeholder="Select date of birth"
        />
      ) : (
        <input
          type={key === 'email' ? 'email' : 'text'}
          value={value}
          onChange={(event) => updateTraveller(index, key, event.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );

  const saveBooking = async (event) => {
    event.preventDefault();
    if (!createSubmitRequested.current) return;
    createSubmitRequested.current = false;

    if (customerSource === 'ENQUIRY' && !form.enquiry_id) {
      toast.error('Select an enquiry first');
      setCreateStep(1);
      return;
    }
    if (!form.customer_id && !form.travellers.some((traveller) => traveller.full_name.trim())) {
      toast.error('Select a customer or add a named traveller');
      setCreateStep(4);
      return;
    }

    setSaving(true);
    try {
      // Aligns strictly with ADMIN_BOOKINGS_API.md Section 4.1 OfflineBookingCreate
      const payload = {
        customer_id: form.customer_id || null,
        enquiry_id: form.enquiry_id || null,
        quotation_id: form.quotation_id || null,
        tour_offer_id: null,
        destination_id: tripSelection === 'DESTINATION' ? form.destination_id || null : null,
        package_id: tripSelection === 'PACKAGE' ? form.package_id || null : null,
        variant_id: tripSelection === 'PACKAGE' ? form.variant_id || null : null,
        departure_id: tripSelection === 'PACKAGE' ? form.departure_id || null : null,
        departure_date: form.departure_date ? form.departure_date.slice(0, 10) : null,
        return_date: form.return_date ? form.return_date.slice(0, 10) : null,
        adult_count: Number(form.adult_count) || 0,
        child_count: Number(form.child_count) || 0,
        senior_count: Number(form.senior_count) || 0,
        total_selling_price: Number(form.total_selling_price) || 0,
        advance_received: Number(form.advance_received) || 0,
        payment_mode: form.payment_mode,
        sales_account_id: form.sales_account_id || null,
        source: form.source,
        special_notes: form.special_notes,
        travellers: form.travellers
          .filter((traveller) => traveller.full_name.trim())
          .map((traveller) => ({
            full_name: traveller.full_name.trim(),
            gender: traveller.gender || null,
            date_of_birth: traveller.date_of_birth ? traveller.date_of_birth.slice(0, 10) : null,
            mobile: traveller.mobile || null,
            email: traveller.email || null,
            relationship_to_customer: traveller.relationship_to_customer || null,
            is_primary: Boolean(traveller.is_primary),
          })),
        items: [],
        hotels: [],
        vehicles: [],
        itinerary: [],
      };

      const response = await apiCall('/api/v1/admin/bookings', 'POST', payload);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to create booking');
      toast.success(result?.message || 'Booking created successfully');
      closeCreate();
      if (result?.data?.id) navigate(`/bookings/${result.data.id}`);
      else loadBookings(page, limit);
    } catch (error) {
      handleApiError(error, 'Unable to create booking');
    } finally {
      setSaving(false);
    }
  };

  const deleteBooking = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await apiCall(`/api/v1/admin/bookings/${deleteTarget.id}`, 'DELETE');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to delete booking');
      toast.success(result?.message || 'Booking deleted successfully');
      setDeleteTarget(null);
      await loadBookings(page, limit);
    } catch (error) {
      handleApiError(error, 'Unable to delete booking');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Top Header */}
      <div className="flex flex-col gap-3 px-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage reservations, payments, travellers, and trip details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/bookings/calendar"
            aria-label="Booking calendar"
            title="Booking calendar"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-semibold text-gray-700 sm:px-3 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </Link>
          <button
            type="button"
            aria-label="New booking"
            title="New booking"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 p-2.5 text-sm font-semibold text-white sm:px-4 hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New booking</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar (Section 4.2 Query Params) */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search code, customer, email, phone..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div className="w-full sm:w-44">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">All statuses</option>
              {bookingStatuses.map((st) => (
                <option key={st} value={st}>{st.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-44">
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">All sources</option>
              {bookingSources.map((src) => (
                <option key={src} value={src}>{src.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          aria-label="Refresh bookings"
          title="Refresh bookings"
          onClick={() => loadBookings(page, limit)}
          className="inline-flex items-center gap-2 self-end rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 md:self-auto dark:border-gray-700 dark:text-cyan-400 dark:hover:bg-cyan-950/30"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">No bookings found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <ManagementTable>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-900/60 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Destination / Package</th>
                    <th className="px-4 py-3">Departure Date</th>
                    <th className="px-4 py-3">Financials</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-gray-900/40">
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/bookings/${booking.id}`)}
                          className="text-left font-semibold text-cyan-700 hover:underline"
                        >
                          {booking.booking_code || booking.id}
                        </button>
                        <div className="text-xs text-gray-400">{booking.booking_type || 'OFFLINE'} · {booking.source || 'OFFLINE'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {booking.customer?.name || booking.customer_name || 'No customer'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.customer?.mobile || booking.customer?.email || ''}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {booking.package?.name || booking.destination_name || '—'}
                        </div>
                        {booking.variant?.name && (
                          <div className="text-xs text-gray-500">{booking.variant.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div>{booking.departure_date ? new Date(booking.departure_date).toLocaleDateString() : 'Not set'}</div>
                        {booking.return_date && (
                          <div className="text-xs text-gray-400">Return: {new Date(booking.return_date).toLocaleDateString()}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          &#8377;{Number(booking.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-emerald-600">
                          Paid: &#8377;{Number(booking.paid_amount || 0).toLocaleString('en-IN')}
                        </div>
                        {Number(booking.due_amount) > 0 && (
                          <div className="text-xs text-rose-500">
                            Due: &#8377;{Number(booking.due_amount || 0).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                          {booking.status ? booking.status.replaceAll('_', ' ') : 'TENTATIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <ActionMenu
                          actions={[
                            { label: 'View details', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/bookings/${booking.id}`) },
                            { label: 'Delete booking', icon: <Trash2 className="h-4 w-4" />, onClick: () => setDeleteTarget(booking), className: 'text-rose-600 hover:text-rose-700' },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ManagementTable>
          </div>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalItems={totalItems}
        itemsPerPage={limit}
        onPageChange={setPage}
        onItemsPerPageChange={(value) => { setLimit(value); setPage(1); }}
      />

      {/* Create Offline Booking Modal (Section 4.1 Schema) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="New Offline Booking"
        icon={FileText}
        size="3xl"
        footer={(
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-xs text-gray-500">Step {createStep} of {steps.length}</span>
            <div className="flex gap-2">
              {createStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCreateStep((current) => current - 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <ArrowLeft className="h-4 w-4" />Back
                </button>
              )}
              {createStep < steps.length ? (
                <button
                  type="button"
                  onClick={() => setCreateStep((current) => current + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
                >
                  Continue<ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  form="booking-create-form"
                  onClick={() => { createSubmitRequested.current = true; }}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
                >
                  {saving ? 'Creating...' : <><Check className="h-4 w-4" />Create booking</>}
                </button>
              )}
            </div>
          </div>
        )}
      >
        <div className="mb-5 grid grid-cols-4 gap-2">
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              disabled={step.id > createStep}
              onClick={() => step.id < createStep && setCreateStep(step.id)}
              className={`rounded-xl px-2 py-2 text-xs font-semibold ${
                step.id === createStep
                  ? 'bg-cyan-600 text-white'
                  : step.id < createStep
                  ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
              }`}
            >
              {step.id < createStep && <Check className="mr-1 inline h-3 w-3" />}
              {step.label}
            </button>
          ))}
        </div>

        <form
          id="booking-create-form"
          onSubmit={saveBooking}
          onKeyDown={(event) => { if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') event.preventDefault(); }}
          className="space-y-5 p-1"
        >
          {createStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold">Booking references</h3>
                <p className="text-sm text-gray-500">Choose the customer source and trip inventory for this booking.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Booking for</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setCustomerSource('CUSTOMER'); setForm((current) => ({ ...current, enquiry_id: '', quotation_id: '' })); }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${customerSource === 'CUSTOMER' ? 'bg-cyan-600 text-white' : 'border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300'}`}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerSource('ENQUIRY'); setForm((current) => ({ ...current, customer_id: '', quotation_id: '' })); }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${customerSource === 'ENQUIRY' ? 'bg-cyan-600 text-white' : 'border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300'}`}
                  >
                    Enquiry / Quotation
                  </button>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1">
                {customerSource === 'CUSTOMER' ? (
                  referenceField('Customer', 'customer_id', 'Search customer')
                ) : (
                  <>
                    {referenceField('Enquiry', 'enquiry_id', 'Search enquiry')}
                    {referenceField('Quotation', 'quotation_id', 'Search quotation')}
                  </>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Trip type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setTripSelection('DESTINATION'); setForm((current) => ({ ...current, destination_id: '', package_id: '', variant_id: '', departure_id: '' })); }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${tripSelection === 'DESTINATION' ? 'bg-cyan-600 text-white' : 'border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300'}`}
                  >
                    Destination Only
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTripSelection('PACKAGE'); setForm((current) => ({ ...current, destination_id: '', package_id: '', variant_id: '', departure_id: '' })); setReferences((current) => ({ ...current, variant_id: [], departure_id: [] })); }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${tripSelection === 'PACKAGE' ? 'bg-cyan-600 text-white' : 'border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300'}`}
                  >
                    Package & Variant
                  </button>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1">
                {tripSelection === 'DESTINATION' ? (
                  referenceField('Destination', 'destination_id', 'Search destination')
                ) : (
                  <>
                    {referenceField('Package', 'package_id', 'Search package')}
                    {form.package_id && referenceField('Variant', 'variant_id', 'Search variant')}
                    {form.variant_id && referenceField('Departure Date (Optional)', 'departure_id', 'Search scheduled departure')}
                  </>
                )}
              </div>

              {referenceField('Sales / Responsible Staff', 'sales_account_id', 'Search staff account')}
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold">Trip dates & Passenger counts</h3>
                <p className="text-sm text-gray-500">Provide the departure date, return date, and number of travellers.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Departure Date</label>
                  <CustomDatePicker
                    value={form.departure_date}
                    includeTime={false}
                    onChange={(value) => updateForm('departure_date', value)}
                    placeholder="Select departure date"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Return Date</label>
                  <CustomDatePicker
                    value={form.return_date}
                    includeTime={false}
                    onChange={(value) => updateForm('return_date', value)}
                    placeholder="Select return date"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {field('Adults (Age 12+)', 'adult_count', 'number')}
                {field('Children (Age 2-11)', 'child_count', 'number')}
                {field('Seniors (Age 60+)', 'senior_count', 'number')}
              </div>
            </div>
          )}

          {createStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold">Payment & Booking Source</h3>
                <p className="text-sm text-gray-500">Specify selling price, advance collected, payment mode, and special requirements.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {field('Total Selling Price (₹)', 'total_selling_price', 'number')}
                {field('Advance Received (₹)', 'advance_received', 'number')}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Payment Mode</label>
                  <select
                    value={form.payment_mode}
                    onChange={(event) => updateForm('payment_mode', event.target.value)}
                    className={inputClass}
                  >
                    {paymentMethodOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Booking Source</label>
                  <select
                    value={form.source}
                    onChange={(event) => updateForm('source', event.target.value)}
                    className={inputClass}
                  >
                    {bookingSourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Special Notes & Requirements</label>
                <textarea
                  value={form.special_notes}
                  onChange={(event) => updateForm('special_notes', event.target.value)}
                  className={`${inputClass} min-h-24`}
                  placeholder="Preferences for hotels, meal plans, pickup points, etc."
                />
              </div>
            </div>
          )}

          {createStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold">Traveller Details</h3>
                <p className="text-sm text-gray-500">Add the passenger list. Mark one traveller as primary.</p>
              </div>

              {form.travellers.map((traveller, index) => (
                <div key={`traveller-${index}`} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                  <div className="flex items-center justify-between font-semibold text-sm">
                    <span>Traveller #{index + 1} {traveller.is_primary && <span className="ml-2 text-xs text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full dark:bg-cyan-950/50 dark:text-cyan-300">Primary</span>}</span>
                    {form.travellers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, travellers: current.travellers.filter((_, itemIndex) => itemIndex !== index) }))}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {Object.entries(traveller).filter(([key]) => key !== 'is_primary').map(([key, value]) => travellerField(index, key, value))}
                  </div>
                  <label className="flex items-center gap-2 text-sm pt-1">
                    <input
                      type="checkbox"
                      checked={traveller.is_primary}
                      onChange={(event) => updateTraveller(index, 'is_primary', event.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    Primary traveller
                  </label>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, travellers: [...current.travellers, { ...emptyTraveller }] }))}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400"
              >
                <Plus className="h-4 w-4" /> Add traveller
              </button>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={deleteBooking}
        confirming={deleting}
        itemLabel={deleteTarget?.booking_code || 'this booking'}
        title="Delete booking"
        message="This booking and all associated itinerary items, vouchers, and traveler entries will be permanently deleted."
      />
    </div>
  );
};

export default BookingManagementWizard;



