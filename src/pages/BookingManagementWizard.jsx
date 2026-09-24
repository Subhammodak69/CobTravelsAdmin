import React, { useCallback, useEffect, useState } from 'react';
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
const steps = [{ id: 1, label: 'References' }, { id: 2, label: 'Customer & trip' }, { id: 3, label: 'Payment' }, { id: 4, label: 'Travellers' }];
const referenceEndpoints = { customer_id: '/api/v1/admin/customers?page=1&page_size=100', enquiry_id: '/api/v1/admin/enquiries?page=1&page_size=100', quotation_id: '/api/v1/admin/quotations?page=1&page_size=100', package_id: '/api/v1/admin/tour-packages?page=1&page_size=100', sales_account_id: '/api/v1/admin/account?page=1&page_size=100' };

const BookingManagementWizard = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [references, setReferences] = useState({});
  const [referencesLoading, setReferencesLoading] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

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

  const loadReference = async (field) => {
    if (!referenceEndpoints[field] || references[field] || referencesLoading[field]) return;
    setReferencesLoading((current) => ({ ...current, [field]: true }));
    try {
      const response = await apiCall(referenceEndpoints[field], 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || `Unable to load ${field.replace('_id', '')}`);
      const records = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.items) ? payload.data.items : Array.isArray(payload?.data?.results) ? payload.data.results : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.results) ? payload.results : [];
      setReferences((current) => ({ ...current, [field]: records }));
    } catch (error) { handleApiError(error, `Unable to load ${field.replace('_id', '')}`); } finally { setReferencesLoading((current) => ({ ...current, [field]: false })); }
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateTraveller = (index, field, value) => setForm((current) => ({ ...current, travellers: current.travellers.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  const openCreate = () => { setForm(defaultForm); setCreateStep(1); setIsCreateOpen(true); };
  const closeCreate = () => { setIsCreateOpen(false); setForm(defaultForm); setCreateStep(1); };
  const recordLabel = (record, field) => field === 'customer_id'
    ? [record.name || record.full_name || record.customer_name, record.email].filter(Boolean).join(' - ')
    : field === 'enquiry_id'
      ? [record.enquirer_name || record.name || record.customer_name, record.enquiry_code || record.id].filter(Boolean).join(' - ')
      : field === 'package_id'
        ? [record.name || record.title || record.package_name, record.code || record.package_code].filter(Boolean).join(' - ') || 'Unnamed package'
        : field === 'sales_account_id'
          ? [[record.first_name, record.last_name].filter(Boolean).join(' ') || record.name || record.full_name, record.email].filter(Boolean).join(' - ') || 'Unnamed staff member'
          : [record.code, record.customer_code, record.enquiry_code, record.quotation_code, record.name, record.title, record.package_name, record.customer_name, record.full_name, record.departure_date || record.date, record.email].filter(Boolean).join(' - ') || 'Unnamed record';
  const optionFor = (field) => (references[field] || []).map((record) => ({ value: record.id, label: recordLabel(record, field), raw: record }));
  const chooseReference = async (field, option) => {
    updateForm(field, option?.value || '');
    if (field === 'customer_id') {
      updateForm('customer_name', option?.raw?.name || option?.raw?.full_name || option?.raw?.customer_name || '');
      updateForm('mobile', option?.raw?.mobile || option?.raw?.phone || '');
      updateForm('email', option?.raw?.email || '');
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
  const referenceField = (label, field, placeholder) => {
    const options = optionFor(field);
    const selected = options.find((option) => option.value === form[field]) || null;
    const previewKeys = field === 'enquiry_id'
      ? ['enquirer_name', 'name', 'customer_name', 'enquiry_code', 'email', 'enquirer_email', 'mobile', 'enquirer_phone', 'status']
      : field === 'package_id'
        ? ['name', 'title', 'package_name', 'code', 'package_code', 'description', 'destination', 'status']
        : field === 'sales_account_id'
          ? ['first_name', 'last_name', 'name', 'full_name', 'email', 'phone', 'mobile', 'role', 'status']
          : ['name', 'full_name', 'customer_name', 'email', 'mobile', 'phone', 'status', 'departure_date', 'date'];
    return <div className="border-b border-slate-100 pb-5 last:border-b-0 dark:border-gray-700">
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <SelectField options={options} value={selected} onMenuOpen={() => loadReference(field)} onChange={(option) => chooseReference(field, option)} isSearchable isClearable isLoading={Boolean(referencesLoading[field])} placeholder={placeholder} noOptionsMessage={() => referencesLoading[field] ? 'Loading records...' : 'No records available'} />
      <p className="mt-1.5 text-xs text-gray-500">{selected ? `Selected: ${selected.label}` : 'Click to load and search by name, code, or email'}</p>
      {selected?.raw && <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4 text-xs text-cyan-900 dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-200"><strong className="text-sm">Selected {field === 'enquiry_id' ? 'enquiry' : field === 'package_id' ? 'package' : 'record'}</strong><div className="mt-2 grid gap-x-5 gap-y-1 sm:grid-cols-2">{previewKeys.map((key) => selected.raw[key] ? <span key={key}><b>{key.replaceAll('_', ' ')}:</b> {String(selected.raw[key])}</span> : null)}</div></div>}
    </div>;
  };
  const field = (label, key, type = 'text') => <div><label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label><input type="text" inputMode={type === 'number' ? 'decimal' : undefined} value={form[key]} onChange={(event) => updateForm(key, type === 'number' ? sanitizeNumericInput(event.target.value) : event.target.value)} className={inputClass} /></div>;

  const saveBooking = async (event) => {
    event.preventDefault();
    if (!form.customer_name.trim() && !form.customer_id) { toast.error('Select a customer or enter a customer name'); setCreateStep(1); return; }
    setSaving(true);
    try {
      const payload = { ...form, adult_count: Number(form.adult_count) || 0, child_count: Number(form.child_count) || 0, senior_count: Number(form.senior_count) || 0, rooms: Number(form.rooms) || 1, total_selling_price: Number(form.total_selling_price) || 0, advance_received: String(form.advance_received || 0), travellers: form.travellers.map((traveller) => ({ ...traveller, date_of_birth: traveller.date_of_birth || null })), items: [], costs: [], hotels: [], vehicles: [], itinerary: [] };
      ['customer_id', 'enquiry_id', 'quotation_id', 'package_id', 'variant_id', 'departure_id', 'sales_account_id', 'travel_date', 'hotel', 'transport'].forEach((key) => { if (!payload[key]) payload[key] = null; });
      const response = await apiCall('/api/v1/admin/bookings', 'POST', payload);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to create booking');
      toast.success(result?.message || 'Booking created successfully'); closeCreate();
      if (result?.data?.id) navigate(`/bookings/${result.data.id}`); else loadBookings(page, limit);
    } catch (error) { handleApiError(error, 'Unable to create booking'); } finally { setSaving(false); }
  };

  const deleteBooking = async () => { if (!deleteTarget) return; setDeleting(true); try { const response = await apiCall(`/api/v1/admin/bookings/${deleteTarget.id}`, 'DELETE'); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to delete booking'); toast.success(result?.message || 'Booking deleted successfully'); setDeleteTarget(null); await loadBookings(page, limit); } catch (error) { handleApiError(error, 'Unable to delete booking'); } finally { setDeleting(false); } };

  return <div className="space-y-5 pb-8">
    <div className="flex flex-col gap-3 px-2 md:flex-row md:items-end md:justify-between"><div><h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Bookings</h1><p className="mt-1 text-sm text-gray-500">Manage reservations, payments, travellers, and trip details.</p></div><div className="flex gap-2"><Link to="/bookings/calendar" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"><CalendarDays className="h-4 w-4" />Calendar</Link><button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />New booking</button></div></div>
    <div className="flex justify-end"><button type="button" onClick={() => loadBookings(page, limit)} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">{loading ? <div className="p-12 text-center text-sm text-gray-500">Loading bookings...</div> : bookings.length === 0 ? <div className="p-12 text-center text-sm text-gray-500">No bookings found.</div> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-900/60 dark:text-gray-300"><tr><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Travel date</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-700">{bookings.map((booking) => <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-gray-900/40"><td className="px-4 py-4"><button type="button" onClick={() => navigate(`/bookings/${booking.id}`)} className="text-left font-semibold text-cyan-700">{booking.booking_code || booking.id}</button></td><td className="px-4 py-4"><div className="font-medium">{booking.customer_name || 'Unnamed customer'}</div><div className="text-xs text-gray-500">{booking.customer_mobile || ''}</div></td><td className="px-4 py-4">{booking.travel_date ? new Date(booking.travel_date).toLocaleDateString() : 'Not set'}</td><td className="px-4 py-4 font-semibold">₹{Number(booking.total_amount || booking.total_selling_price || 0).toLocaleString('en-IN')}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[booking.status] || 'bg-gray-100 text-gray-700'}`}>{booking.status || 'TENTATIVE'}</span></td><td className="px-4 py-4 text-right"><ActionMenu actions={[{ label: 'View details', icon: Eye, onClick: () => navigate(`/bookings/${booking.id}`) }, { label: 'Delete booking', icon: Trash2, onClick: () => setDeleteTarget(booking), danger: true }]} /></td></tr>)}</tbody></table></div>}</div>
    <Pagination currentPage={page} totalItems={totalItems} itemsPerPage={limit} onPageChange={setPage} onItemsPerPageChange={(value) => { setLimit(value); setPage(1); }} />

    <Modal isOpen={isCreateOpen} onClose={closeCreate} title="New booking" icon={FileText} size="3xl" footer={<div className="flex w-full items-center justify-between gap-3"><span className="text-xs text-gray-500">Step {createStep} of {steps.length}</span><div className="flex gap-2">{createStep > 1 && <button type="button" onClick={() => setCreateStep((current) => current - 1)} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back</button>}{createStep < steps.length ? <button type="button" onClick={() => setCreateStep((current) => current + 1)} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white">Continue<ArrowRight className="h-4 w-4" /></button> : <button type="submit" form="booking-create-form" disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white">{saving ? 'Creating...' : <><Check className="h-4 w-4" />Create booking</>}</button>}</div></div>}>
      <div className="mb-5 grid grid-cols-4 gap-2">{steps.map((step) => <button key={step.id} type="button" disabled={step.id > createStep} onClick={() => step.id < createStep && setCreateStep(step.id)} className={`rounded-xl px-2 py-2 text-xs font-semibold ${step.id === createStep ? 'bg-cyan-600 text-white' : step.id < createStep ? 'bg-cyan-50 text-cyan-700' : 'bg-gray-100 text-gray-400'}`}>{step.id < createStep && <Check className="mr-1 inline h-3 w-3" />}{step.label}</button>)}</div>
      <form id="booking-create-form" onSubmit={saveBooking} onKeyDown={(event) => { if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') event.preventDefault(); }} className="space-y-5 p-1">
        {createStep === 1 && <div className="space-y-4"><div><h3 className="text-lg font-bold">Booking references</h3><p className="text-sm text-gray-500">Choose linked records to autofill the booking and inspect their details before continuing.</p></div><div className="grid gap-4 grid-cols-1">{referenceField('Customer', 'customer_id', 'Search customer')}{referenceField('Enquiry', 'enquiry_id', 'Search enquiry')}{referenceField('Quotation', 'quotation_id', 'Search quotation')}{referenceField('Package', 'package_id', 'Search package')}{referenceField('Variant', 'variant_id', 'Search variant')}{referenceField('Departure', 'departure_id', 'Search departure')}{referenceField('Seller staff account', 'sales_account_id', 'Search seller staff')}</div></div>}
        {createStep === 2 && <div className="space-y-4"><div><h3 className="text-lg font-bold">Customer and trip</h3><p className="text-sm text-gray-500">Confirm contact information and travel requirements.</p></div><div className="grid gap-4 md:grid-cols-3">{field('Customer name', 'customer_name')}{field('Mobile', 'mobile')}{field('Email', 'email')}<div><label className="mb-1.5 block text-sm font-medium">Travel date</label><CustomDatePicker value={form.travel_date} includeTime={false} onChange={(value) => updateForm('travel_date', value)} /></div>{field('Adults', 'adult_count', 'number')}{field('Children', 'child_count', 'number')}{field('Seniors', 'senior_count', 'number')}{field('Rooms', 'rooms', 'number')}{field('Hotel', 'hotel')}{field('Transport', 'transport')}</div></div>}
        {createStep === 3 && <div className="space-y-4"><div><h3 className="text-lg font-bold">Payment and notes</h3><p className="text-sm text-gray-500">Set the commercial details for this booking.</p></div><div className="grid gap-4 md:grid-cols-3">{field('Total selling price', 'total_selling_price', 'number')}{field('Advance received', 'advance_received', 'number')}<div><label className="mb-1.5 block text-sm font-medium">Payment mode</label><select value={form.payment_mode} onChange={(event) => updateForm('payment_mode', event.target.value)} className={inputClass}><option>CASH</option><option>UPI</option><option>CARD</option><option>BANK_TRANSFER</option></select></div></div><div><label className="mb-1.5 block text-sm font-medium">Special notes</label><textarea value={form.special_notes} onChange={(event) => updateForm('special_notes', event.target.value)} className={`${inputClass} min-h-28`} /></div></div>}
        {createStep === 4 && <div className="space-y-4"><div><h3 className="text-lg font-bold">Travellers</h3><p className="text-sm text-gray-500">Add the people travelling with this booking.</p></div>{form.travellers.map((traveller, index) => <div key={`traveller-${index}`} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">{Object.entries(traveller).filter(([key]) => key !== 'is_primary').map(([key, value]) => <input key={key} type="text" value={value} onChange={(event) => updateTraveller(index, key, event.target.value)} placeholder={key.replaceAll('_', ' ')} className={inputClass} />)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={traveller.is_primary} onChange={(event) => updateTraveller(index, 'is_primary', event.target.checked)} />Primary traveller</label>{form.travellers.length > 1 && <button type="button" onClick={() => setForm((current) => ({ ...current, travellers: current.travellers.filter((_, itemIndex) => itemIndex !== index) }))} className="text-left text-sm font-semibold text-rose-600">Remove traveller</button>}</div>)}<button type="button" onClick={() => setForm((current) => ({ ...current, travellers: [...current.travellers, { ...emptyTraveller }] }))} className="text-sm font-semibold text-cyan-700">+ Add traveller</button></div>}
      </form>
    </Modal>
    <ConfirmDeleteModal isOpen={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} onConfirm={deleteBooking} confirming={deleting} itemLabel={deleteTarget?.booking_code || 'this booking'} title="Delete booking" message="This booking and its related travel details will be permanently removed." />
  </div>;
};

export default BookingManagementWizard;


