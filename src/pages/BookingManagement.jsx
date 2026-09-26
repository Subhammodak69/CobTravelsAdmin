import React, { useCallback, useEffect, useState } from 'react';
import ManagementTable from '../component/common/ManagementTable';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Eye, FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Modal from '../component/common/Modal';
import ConfirmDeleteModal from '../component/common/ConfirmDeleteModal';
import CustomDatePicker from '../component/common/CustomDatePicker';
import Pagination from '../component/common/PaginationComponent';
import ActionMenu from '../component/common/ActionMenu';
import SelectField from '../component/common/SelectField';
import { apiCall, handleApiError } from '../utils/apiCall';
import { sanitizeNumericInput } from '../utils/inputValidation';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
const emptyTraveller = { full_name: '', traveler_type: 'ADULT', gender: '', date_of_birth: '', mobile: '', email: '', relationship_to_customer: '', is_primary: false };
const defaultForm = { customer_id: '', enquiry_id: '', quotation_id: '', customer_name: '', mobile: '', email: '', package_id: '', variant_id: '', departure_id: '', travel_date: '', adult_count: '1', child_count: '0', senior_count: '0', rooms: '1', hotel: '', transport: '', total_selling_price: '0', advance_received: '0', payment_mode: 'CASH', sales_account_id: '', source: 'OFFLINE', special_notes: '', travellers: [{ ...emptyTraveller }] };
const statusClasses = { TENTATIVE: 'bg-amber-50 text-amber-700', CONFIRMED: 'bg-emerald-50 text-emerald-700', CANCELLED: 'bg-rose-50 text-rose-700', COMPLETED: 'bg-cyan-50 text-cyan-700' };

const BookingManagement = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [createStep, setCreateStep] = useState(1);
  const [referenceOptions, setReferenceOptions] = useState({});
  const [referencesLoading, setReferencesLoading] = useState(false);

  const bookingSteps = [
    { id: 1, label: 'References' },
    { id: 2, label: 'Customer & trip' },
    { id: 3, label: 'Payment' },
    { id: 4, label: 'Travellers' },
  ];

  const loadBookings = useCallback(async (currentPage = page, pageSize = limit) => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/v1/admin/bookings?page=${currentPage}&page_size=${pageSize}`, 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || 'Unable to fetch bookings');
      setBookings(Array.isArray(payload?.data) ? payload.data : []);
      setTotalItems(Number(payload?.pagination?.total_items ?? payload?.data?.length ?? 0));
    } catch (error) { handleApiError(error, 'Unable to load bookings'); } finally { setLoading(false); }
  }, [page, limit]);

  useEffect(() => { loadBookings(page, limit); }, [loadBookings, page, limit]);
  const loadQuotationsForEnquiry = useCallback(async (enquiryId) => {
    if (!enquiryId) {
      setReferenceOptions((prev) => ({ ...prev, quotation_id: [] }));
      return;
    }
    setReferencesLoading(true);
    try {
      const response = await apiCall(`/api/v1/admin/quotations?enquiry_id=${encodeURIComponent(enquiryId)}&page=1&page_size=100`, 'GET');
      const payload = await response.json().catch(() => ({}));
      setReferenceOptions((prev) => ({
        ...prev,
        quotation_id: response.ok && Array.isArray(payload?.data) ? payload.data : [],
      }));
    } catch {
      setReferenceOptions((prev) => ({ ...prev, quotation_id: [] }));
    } finally {
      setReferencesLoading(false);
    }
  }, []);

  const loadReferenceOptions = useCallback(async () => {
    setReferencesLoading(true);
    const resources = {
      customer_id: '/api/v1/admin/customers?page=1&page_size=100',
      enquiry_id: '/api/v1/admin/enquiries?page=1&page_size=100',
      package_id: '/api/v1/admin/tour-packages?page=1&page_size=100',
      sales_account_id: '/api/v1/admin/sales-accounts?page=1&page_size=100',
    };
    try {
      const entries = await Promise.all(Object.entries(resources).map(async ([field, endpoint]) => {
        const response = await apiCall(endpoint, 'GET');
        const payload = await response.json().catch(() => ({}));
        return [field, response.ok && Array.isArray(payload?.data) ? payload.data : []];
      }));
      setReferenceOptions(Object.fromEntries(entries));
    } catch (error) {
      handleApiError(error, 'Unable to load booking references');
    } finally { setReferencesLoading(false); }
  }, []);

  const toOption = (item) => ({
    value: item.id,
    label: [
      item.code || item.customer_code || item.enquiry_code || item.quotation_code || item.name || item.customer_name || item.full_name || item.email || item.id,
      item.tour_name,
      item.status,
      item.total_amount ? `₹${item.total_amount}` : null,
    ].filter(Boolean).join(' - '),
    raw: item,
  });
  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateTraveller = (index, field, value) => setForm((current) => ({ ...current, travellers: current.travellers.map((traveller, travellerIndex) => travellerIndex === index ? { ...traveller, [field]: value } : traveller) }));
  const closeCreate = () => { setIsCreateOpen(false); setForm(defaultForm); setCreateStep(1); };
  const openCreate = () => { setIsCreateOpen(true); setCreateStep(1); loadReferenceOptions(); };
  const chooseReference = (field, option) => {
    updateForm(field, option?.value || '');
    const raw = option?.raw || {};
    if (field === 'customer_id') {
      updateForm('customer_name', raw.name || raw.full_name || raw.customer_name || '');
      updateForm('mobile', raw.mobile || raw.phone || '');
      updateForm('email', raw.email || '');
    }
    if (field === 'enquiry_id') {
      updateForm('quotation_id', '');
      const enquiryId = option?.value || '';
      if (enquiryId) {
        loadQuotationsForEnquiry(enquiryId);
      } else {
        setReferenceOptions((prev) => ({ ...prev, quotation_id: [] }));
      }
    }
    if (field === 'quotation_id') {
      if (raw.total_amount) updateForm('total_selling_price', String(raw.total_amount));
      if (raw.travel_date) updateForm('travel_date', String(raw.travel_date).slice(0, 10));
    }
  };
  const isCreateStepValid = (step) => step !== 1 || Boolean(form.customer_id || form.customer_name.trim());
  const goNextStep = () => { if (isCreateStepValid(createStep)) setCreateStep((current) => Math.min(current + 1, bookingSteps.length)); else toast.error('Select a customer or enter a customer name first'); };

  const saveBooking = async (event) => {
    event.preventDefault();
    if (!form.customer_name.trim() && !form.customer_id.trim()) { toast.error('Customer name or customer ID is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        adult_count: Number(form.adult_count) || 0, child_count: Number(form.child_count) || 0, senior_count: Number(form.senior_count) || 0,
        rooms: Number(form.rooms) || 1, total_selling_price: Number(form.total_selling_price) || 0, advance_received: String(form.advance_received || 0),
        travellers: form.travellers.map((traveller) => ({ ...traveller, date_of_birth: traveller.date_of_birth || null })),
        items: [], costs: [], hotels: [], vehicles: [], itinerary: [],
      };
      ['customer_id', 'enquiry_id', 'quotation_id', 'package_id', 'variant_id', 'departure_id', 'sales_account_id', 'travel_date', 'hotel', 'transport'].forEach((field) => { if (!payload[field]) payload[field] = null; });
      const response = await apiCall('/api/v1/admin/bookings', 'POST', payload);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to create booking');
      toast.success(result?.message || 'Booking created successfully');
      closeCreate();
      if (result?.data?.id) navigate(`/bookings/${result.data.id}`); else await loadBookings(page, limit);
    } catch (error) { handleApiError(error, 'Unable to create booking'); } finally { setSaving(false); }
  };

  const deleteBooking = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await apiCall(`/api/v1/admin/bookings/${deleteTarget.id}`, 'DELETE');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to delete booking');
      toast.success(result?.message || 'Booking deleted successfully'); setDeleteTarget(null); await loadBookings(page, limit);
    } catch (error) { handleApiError(error, 'Unable to delete booking'); } finally { setDeleting(false); }
  };

  const field = (label, key, type = 'text') => <div><label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label><input type="text" inputMode={type === 'number' ? 'decimal' : undefined} value={form[key]} onChange={(event) => updateForm(key, type === 'number' ? sanitizeNumericInput(event.target.value) : event.target.value)} className={inputClass} /></div>;
  const referenceField = (label, fieldName, placeholder) => {
    const isQuotation = fieldName === 'quotation_id';
    const isDisabled = isQuotation && !form.enquiry_id;
    const options = (referenceOptions[fieldName] || []).map(toOption);
    const selected = options.find((option) => option.value === form[fieldName]) || null;
    return <div><label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}{isQuotation && form.enquiry_id && <span className="ml-2 text-xs font-normal text-cyan-600">(Filtered by chosen enquiry)</span>}</label><SelectField options={options} value={selected} isDisabled={isDisabled} onChange={(option) => chooseReference(fieldName, option)} isSearchable isClearable isLoading={referencesLoading} placeholder={isDisabled ? 'Select an enquiry first' : placeholder} noOptionsMessage={() => isQuotation && !form.enquiry_id ? 'Please select an enquiry first' : 'No records available'} /><div className="mt-2 min-h-5 text-xs text-gray-500">{selected ? `Selected: ${selected.label}` : isQuotation && !form.enquiry_id ? 'Select an enquiry to view its quotations' : 'Search by name, code, email, or ID'}</div>{selected?.raw && <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-3 text-xs text-cyan-900 dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-200"><span className="font-semibold">Selected record</span><div className="mt-1 grid gap-1 sm:grid-cols-2">{Object.entries(selected.raw).filter(([key, value]) => ['id', 'name', 'code', 'quotation_code', 'customer_name', 'email', 'mobile', 'phone', 'status', 'total_amount'].includes(key) && value).slice(0, 6).map(([key, value]) => <span key={key}><strong>{key.replaceAll('_', ' ')}:</strong> {String(value)}</span>)}</div></div>}</div>;
  };

  return <div className="space-y-5 pb-8"><div className="flex flex-col gap-3 px-2 md:flex-row md:items-end md:justify-between"><div><h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Bookings</h1><p className="mt-1 text-sm text-gray-500">Manage reservations, payments, travellers, and trip details.</p></div><div className="flex gap-2"><Link to="/bookings/calendar" aria-label="Booking calendar" title="Booking calendar" className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-semibold text-gray-700 sm:px-3 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"><CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">Calendar</span></Link><button type="button" aria-label="New booking" title="New booking" onClick={() => setIsCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 p-2.5 text-sm font-semibold text-white sm:px-4"><Plus className="h-4 w-4" /><span className="hidden sm:inline">New booking</span></button></div></div><div className="flex justify-end"><button type="button" aria-label="Refresh bookings" title="Refresh bookings" onClick={() => loadBookings(page, limit)} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span></button></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">{loading ? <div className="p-12 text-center text-sm text-gray-500">Loading bookings...</div> : bookings.length === 0 ? <div className="p-12 text-center text-sm text-gray-500">No bookings found.</div> : <div className="overflow-x-auto"><ManagementTable><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-900/60 dark:text-gray-300"><tr><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Travel date</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-700">{bookings.map((booking) => <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-gray-900/40"><td className="px-4 py-4"><Link to={`/bookings/${booking.id}`} className="font-semibold text-cyan-700">{booking.booking_code || booking.id}</Link><p className="mt-1 text-xs text-gray-500">{booking.booking_type || 'Booking'}</p></td><td className="px-4 py-4"><p className="font-medium text-gray-800 dark:text-gray-100">{booking.customer_name || booking.customer_id || 'No customer'}</p><p className="text-xs text-gray-500">{booking.customer_mobile || booking.mobile || ''}</p></td><td className="px-4 py-4">{booking.travel_date || 'Not set'}</td><td className="px-4 py-4 font-semibold">{booking.total_amount || booking.total_selling_price || '0'}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[booking.status] || 'bg-gray-100 text-gray-600'}`}>{booking.status || 'TENTATIVE'}</span></td><td className="px-4 py-4 text-right"><ActionMenu actions={[{ label: 'View booking', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/bookings/${booking.id}`) }, { label: 'Delete booking', icon: <Trash2 className="h-4 w-4" />, onClick: () => setDeleteTarget(booking), className: 'text-rose-600' }]} /></td></tr>)}</tbody></table></ManagementTable></div>}{totalItems > 0 && <div className="border-t border-slate-200 px-3 py-3 dark:border-gray-700"><Pagination currentPage={page} totalItems={totalItems} itemsPerPage={limit} onPageChange={setPage} onLimitChange={(value) => { setLimit(value); setPage(1); }} /></div>}</div>

    <Modal isOpen={isCreateOpen} onClose={closeCreate} title="New booking" icon={FileText} size="3xl" footer={<div className="flex justify-end gap-3"><button type="button" onClick={closeCreate} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancel</button><button type="submit" form="booking-create-form" disabled={saving} className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white">{saving ? 'Creating...' : 'Create booking'}</button></div>}><form id="booking-create-form" onSubmit={saveBooking} onKeyDown={(event) => { if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') event.preventDefault(); }} className="space-y-5 p-1"><div className="grid gap-4 md:grid-cols-2">{referenceField('Customer', 'customer_id', 'Search customer')}{referenceField('Enquiry', 'enquiry_id', 'Search enquiry')}</div><div className="grid gap-4 md:grid-cols-1">{referenceField('Quotation', 'quotation_id', form.enquiry_id ? 'Search quotation for this enquiry' : 'Select an enquiry first')}</div><div className="grid gap-4 md:grid-cols-3">{field('Customer name', 'customer_name')}{field('Mobile', 'mobile')}{field('Email', 'email')}{field('Package ID', 'package_id')}{field('Variant ID', 'variant_id')}{field('Departure ID', 'departure_id')}<div><label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Travel date</label><CustomDatePicker value={form.travel_date} includeTime={false} onChange={(value) => updateForm('travel_date', value)} /></div>{field('Adults', 'adult_count', 'number')}{field('Children', 'child_count', 'number')}{field('Seniors', 'senior_count', 'number')}{field('Rooms', 'rooms', 'number')}{field('Hotel', 'hotel')}{field('Transport', 'transport')}{field('Total selling price', 'total_selling_price', 'number')}{field('Advance received', 'advance_received', 'number')}{field('Sales account ID', 'sales_account_id')}{field('Special notes', 'special_notes')}</div><section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-gray-700"><div className="flex items-center justify-between"><h3 className="font-semibold">Travellers</h3><button type="button" onClick={() => setForm((current) => ({ ...current, travellers: [...current.travellers, { ...emptyTraveller }] }))} className="text-sm font-semibold text-cyan-700">Add traveller</button></div>{form.travellers.map((traveller, index) => <div key={`traveller-${index}`} className="grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-2">{Object.entries(traveller).filter(([key]) => key !== 'is_primary').map(([key, value]) => <input key={key} type="text" value={value} onChange={(event) => updateTraveller(index, key, event.target.value)} placeholder={key.replaceAll('_', ' ')} className={inputClass} />)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={traveller.is_primary} onChange={(event) => updateTraveller(index, 'is_primary', event.target.checked)} />Primary traveller</label></div>)}</section></form></Modal><ConfirmDeleteModal isOpen={Boolean(deleteTarget)} onClose={() => { if (!deleting) setDeleteTarget(null); }} onConfirm={deleteBooking} confirming={deleting} itemLabel={deleteTarget?.booking_code || 'this booking'} title="Delete booking" message="This booking and its records will be permanently removed." /></div>;
  };

export default BookingManagement;
