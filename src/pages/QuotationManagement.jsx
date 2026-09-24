import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Calendar,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import Modal from '../component/common/Modal';
import ConfirmDeleteModal from '../component/common/ConfirmDeleteModal';
import CustomDatePicker from '../component/common/CustomDatePicker';
import Pagination from '../component/common/PaginationComponent';
import ActionMenu from '../component/common/ActionMenu';
import { apiCall, handleApiError } from '../utils/apiCall';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
const emptyLineItem = { item_type: 'other', name: '', description: '', quantity: 1, unit_price: '0', total_price: '0' };
const emptyHotel = { hotel_id: '', hotel_name: '', check_in: '', check_out: '', nights: 1, room_count: 1, room_type: 'SINGLE' };
const emptyVehicle = { vehicle_id: '', vehicle_name: '', vehicle_type: 'ANY', start_date: '', end_date: '', rental_minutes: 1, quantity: 1 };
const emptyItinerary = { day_number: 1, date: '', title: '', description: '', overnight_location: '', meal_plan: '', sort_order: 0 };

const defaultForm = {
  customer_id: '', enquiry_id: '', package_id: '', variant_id: '', destination_id: '', tour_name: '',
  travel_date: '', return_date: '', subtotal: '0', discount_amount: '0', tax_amount: '0', total_amount: '0',
  valid_until: '', terms_and_conditions: '', important_notes: '', inclusion: '', exclusion: '',
  items: [emptyLineItem], hotels: [], vehicles: [], itinerary: [emptyItinerary],
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  try { return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return value; }
};
const formatAmount = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const numericValue = (value) => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
const statusClasses = {
  DRAFT: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  SENT: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300',
  ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
};

const QuotationManagement = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const loadQuotations = useCallback(async (page = currentPage, limit = itemsPerPage) => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/v1/admin/quotations?page=${page}&page_size=${limit}`, 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || 'Unable to fetch quotations');
      const data = Array.isArray(payload?.data) ? payload.data : [];
      setQuotations(data);
      setTotalItems(Number(payload?.pagination?.total_items ?? data.length));
    } catch (error) {
      handleApiError(error, 'Unable to load quotations');
    } finally { setLoading(false); }
  }, [currentPage, itemsPerPage]);

  useEffect(() => { loadQuotations(currentPage, itemsPerPage); }, [loadQuotations, currentPage, itemsPerPage]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateArrayItem = (field, index, key, value) => setForm((current) => ({
    ...current, [field]: current[field].map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
  }));
  const addArrayItem = (field, template) => setForm((current) => ({ ...current, [field]: [...current[field], { ...template }] }));
  const removeArrayItem = (field, index) => setForm((current) => ({ ...current, [field]: current[field].filter((_, itemIndex) => itemIndex !== index) }));

  const closeCreate = () => { setIsCreateOpen(false); setForm(defaultForm); };
  const saveQuotation = async (event) => {
    event.preventDefault();
    if (!form.tour_name.trim()) { toast.error('Tour name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tour_name: form.tour_name.trim(),
        subtotal: String(form.subtotal || 0),
        discount_amount: String(form.discount_amount || 0),
        tax_amount: String(form.tax_amount || 0),
        total_amount: String(form.total_amount || 0),
        items: form.items.map((item) => ({ ...item, quantity: Number(item.quantity) || 1, unit_price: String(item.unit_price || 0), total_price: String(item.total_price || 0) })),
        hotels: form.hotels.map((hotel) => ({ ...hotel, nights: Number(hotel.nights) || 1, room_count: Number(hotel.room_count) || 1 })),
        vehicles: form.vehicles.map((vehicle) => ({ ...vehicle, rental_minutes: Number(vehicle.rental_minutes) || 1, quantity: Number(vehicle.quantity) || 1 })),
        itinerary: form.itinerary.map((day, index) => ({ ...day, day_number: Number(day.day_number) || index + 1, sort_order: Number(day.sort_order) || index })),
      };
      const response = await apiCall('/api/v1/admin/quotations', 'POST', payload);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to create quotation');
      const created = result?.data;
      toast.success(result?.message || 'Quotation created successfully');
      closeCreate();
      if (created?.id) navigate(`/quotations/${created.id}`); else await loadQuotations(currentPage, itemsPerPage);
    } catch (error) { handleApiError(error, 'Unable to create quotation'); } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await apiCall(`/api/v1/admin/quotations/${deleteTarget.id}`, 'DELETE');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to delete quotation');
      toast.success(result?.message || 'Quotation deleted successfully');
      setIsDeleteOpen(false); setDeleteTarget(null); await loadQuotations(currentPage, itemsPerPage);
    } catch (error) { handleApiError(error, 'Unable to delete quotation'); } finally { setDeleting(false); }
  };

  const visibleQuotations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return quotations;
    return quotations.filter((quotation) => [quotation.quotation_code, quotation.tour_name, quotation.status, quotation.customer_id, quotation.enquiry_id]
      .filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [quotations, searchTerm]);

  const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300';
  const renderInput = (label, field, type = 'text') => (
    <div><label className={labelClass}>{label}</label>{type === 'datetime-local' ? <CustomDatePicker value={form[field]} onChange={(value) => updateForm(field, value)} /> : <input type="text" inputMode={type === 'number' ? 'decimal' : undefined} value={form[field]} onChange={(event) => updateForm(field, type === 'number' ? numericValue(event.target.value) : event.target.value)} className={inputClass} />}</div>
  );
  const renderNestedRows = (field, label, template, fields) => (
    <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-gray-700">
      <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900 dark:text-slate-100">{label}</h3><button type="button" onClick={() => addArrayItem(field, template)} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-300">Add</button></div>
      {form[field].map((item, index) => <div key={`${field}-${index}`} className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-gray-900/50 md:grid-cols-2">
        {fields.map(([key, fieldLabel, type]) => <div key={key}><label className={labelClass}>{fieldLabel}</label>{type === 'datetime-local' || type === 'date' ? <CustomDatePicker value={item[key] ?? ''} includeTime={type === 'datetime-local'} onChange={(value) => updateArrayItem(field, index, key, value)} /> : <input type="text" inputMode={type === 'number' ? 'decimal' : undefined} value={item[key] ?? ''} onChange={(event) => updateArrayItem(field, index, key, type === 'number' ? numericValue(event.target.value) : event.target.value)} className={inputClass} />}</div>)}
        <button type="button" onClick={() => removeArrayItem(field, index)} className="justify-self-start text-sm font-medium text-rose-600">Remove</button>
      </div>)}
    </section>
  );

  return <div className="space-y-5 pb-8">
    <div className="flex flex-col gap-3 px-2 md:flex-row md:items-end md:justify-between"><div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Quotations</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Build, review, and send customer-ready travel quotations.</p></div><div className="flex gap-2"><button type="button" onClick={() => loadQuotations(currentPage, itemsPerPage)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button><button type="button" onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"><Plus className="h-4 w-4" />New quotation</button></div></div>
    <div className="flex flex-col gap-3 px-2 md:flex-row md:items-center md:justify-between"><div className="relative w-full md:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search quotations..." className={`${inputClass} pl-9`} /></div><span className="text-sm text-gray-500 dark:text-gray-400">{totalItems} record{totalItems === 1 ? '' : 's'}</span></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">{loading ? <div className="flex min-h-[240px] items-center justify-center text-sm text-gray-500">Loading quotations...</div> : visibleQuotations.length === 0 ? <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-sm text-gray-500"><FileText className="h-9 w-9 text-gray-300" /><p>No quotations found.</p></div> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900/60 dark:text-slate-300"><tr><th className="px-4 py-3">Quotation</th><th className="px-4 py-3">Travel dates</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-700">{visibleQuotations.map((quotation) => <tr key={quotation.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40"><td className="px-4 py-4"><button type="button" onClick={() => navigate(`/quotations/${quotation.id}`)} className="text-left"><div className="font-semibold text-slate-900 hover:text-cyan-700 dark:text-slate-100 dark:hover:text-cyan-300">{quotation.quotation_code || 'Draft quotation'}</div><div className="mt-1 text-xs text-slate-500">{quotation.tour_name || 'Untitled tour'} · v{quotation.version || 1}</div></button></td><td className="px-4 py-4"><div className="flex items-center gap-2 text-slate-700 dark:text-slate-200"><Calendar className="h-4 w-4 text-slate-400" />{formatDate(quotation.travel_date)}<span className="text-slate-400">to</span>{formatDate(quotation.return_date)}</div></td><td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">{formatAmount(quotation.total_amount)}</td><td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[quotation.status] || statusClasses.DRAFT}`}>{quotation.status || 'DRAFT'}</span></td><td className="px-4 py-4 text-right"><ActionMenu actions={[{ label: 'Open quotation', icon: <ArrowRight className="h-4 w-4" />, onClick: () => navigate(`/quotations/${quotation.id}`) }, { label: 'Delete quotation', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setDeleteTarget(quotation); setIsDeleteOpen(true); }, className: 'text-rose-600 dark:text-rose-400' }]} /></td></tr>)}</tbody></table></div>}{totalItems > 0 && <div className="border-t border-slate-200 px-3 py-3 dark:border-gray-700"><Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onLimitChange={(limit) => { setItemsPerPage(limit); setCurrentPage(1); }} /></div>}</div>

    <Modal isOpen={isCreateOpen} onClose={closeCreate} title="New quotation" icon={FileText} size="3xl" footer={<div className="flex justify-end gap-3"><button type="button" onClick={closeCreate} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" form="quotation-create-form" disabled={saving} className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Creating...' : 'Create quotation'}</button></div>}><form id="quotation-create-form" onSubmit={saveQuotation} className="space-y-5 p-1"><div className="grid gap-4 md:grid-cols-3">{renderInput('Tour name', 'tour_name')}{renderInput('Travel date', 'travel_date', 'datetime-local')}{renderInput('Return date', 'return_date', 'datetime-local')}{renderInput('Valid until', 'valid_until', 'datetime-local')}{renderInput('Customer ID', 'customer_id')}{renderInput('Enquiry ID', 'enquiry_id')}{renderInput('Package ID', 'package_id')}{renderInput('Variant ID', 'variant_id')}{renderInput('Destination ID', 'destination_id')}{renderInput('Subtotal', 'subtotal', 'number')}{renderInput('Discount', 'discount_amount', 'number')}{renderInput('Tax', 'tax_amount', 'number')}{renderInput('Total amount', 'total_amount', 'number')}</div><div className="grid gap-4 md:grid-cols-2">{['terms_and_conditions', 'important_notes', 'inclusion', 'exclusion'].map((field) => <div key={field}><label className={labelClass}>{field.replaceAll('_', ' ')}</label><textarea value={form[field]} onChange={(event) => updateForm(field, event.target.value)} className={`${inputClass} min-h-[90px]`} /></div>)}</div>{renderNestedRows('items', 'Quotation items', emptyLineItem, [['item_type', 'Item type'], ['name', 'Name'], ['description', 'Description'], ['quantity', 'Quantity', 'number'], ['unit_price', 'Unit price', 'number'], ['total_price', 'Total price', 'number']])}{renderNestedRows('hotels', 'Hotels', emptyHotel, [['hotel_id', 'Hotel ID'], ['hotel_name', 'Hotel name'], ['check_in', 'Check in', 'datetime-local'], ['check_out', 'Check out', 'datetime-local'], ['nights', 'Nights', 'number'], ['room_count', 'Rooms', 'number'], ['room_type', 'Room type']])}{renderNestedRows('vehicles', 'Vehicles', emptyVehicle, [['vehicle_id', 'Vehicle ID'], ['vehicle_name', 'Vehicle name'], ['vehicle_type', 'Vehicle type'], ['start_date', 'Start date', 'datetime-local'], ['end_date', 'End date', 'datetime-local'], ['rental_minutes', 'Rental minutes', 'number'], ['quantity', 'Quantity', 'number']])}{renderNestedRows('itinerary', 'Itinerary', emptyItinerary, [['day_number', 'Day', 'number'], ['date', 'Date', 'date'], ['title', 'Title'], ['description', 'Description'], ['overnight_location', 'Overnight location'], ['meal_plan', 'Meal plan'], ['sort_order', 'Sort order', 'number']])}</form></Modal>
    <ConfirmDeleteModal isOpen={isDeleteOpen} onClose={() => { if (!deleting) { setIsDeleteOpen(false); setDeleteTarget(null); } }} onConfirm={confirmDelete} confirming={deleting} itemLabel={deleteTarget?.quotation_code || 'this quotation'} title="Delete quotation" message="This quotation and its itinerary details will be permanently removed." />
  </div>;
};

export default QuotationManagement;
