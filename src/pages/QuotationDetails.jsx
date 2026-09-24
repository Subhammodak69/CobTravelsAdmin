import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Download,
  Edit3,
  FileText,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import Modal from '../component/common/Modal';
import ConfirmDeleteModal from '../component/common/ConfirmDeleteModal';
import CustomDatePicker from '../component/common/CustomDatePicker';
import { apiCall, handleApiError } from '../utils/apiCall';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
const fields = ['customer_id', 'enquiry_id', 'package_id', 'variant_id', 'destination_id', 'tour_name', 'travel_date', 'return_date', 'subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'valid_until', 'terms_and_conditions', 'important_notes', 'inclusion', 'exclusion'];
const dateFields = new Set(['travel_date', 'return_date', 'valid_until']);
const nestedDateFields = new Set(['check_in', 'check_out', 'start_date', 'end_date', 'date']);
const numericFields = new Set(['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'quantity', 'unit_price', 'total_price', 'nights', 'room_count', 'rental_minutes', 'day_number', 'sort_order']);

const formatDate = (value) => {
  if (!value) return 'N/A';
  try { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch { return value; }
};
const formatAmount = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const toLocalDateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : '';
const toIso = (value) => value ? new Date(value).toISOString() : '';
const prettyLabel = (value) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const numericValue = (value) => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

const normalizeQuotation = (quotation) => ({
  ...quotation,
  travel_date: toLocalDateTime(quotation?.travel_date),
  return_date: toLocalDateTime(quotation?.return_date),
  valid_until: toLocalDateTime(quotation?.valid_until),
  subtotal: quotation?.subtotal ?? '0',
  discount_amount: quotation?.discount_amount ?? '0',
  tax_amount: quotation?.tax_amount ?? '0',
  total_amount: quotation?.total_amount ?? '0',
  items: Array.isArray(quotation?.items) ? quotation.items.map((item) => ({ ...item })) : [],
  hotels: Array.isArray(quotation?.hotels) ? quotation.hotels.map((hotel) => ({ ...hotel })) : [],
  vehicles: Array.isArray(quotation?.vehicles) ? quotation.vehicles.map((vehicle) => ({ ...vehicle })) : [],
  itinerary: Array.isArray(quotation?.itinerary) ? quotation.itinerary.map((day) => ({ ...day, date: day.date ? day.date.slice(0, 10) : '' })) : [],
});

const QuotationDetails = () => {
  const navigate = useNavigate();
  const { quotationId } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  const loadQuotation = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/v1/admin/quotations/${quotationId}`, 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || 'Unable to fetch quotation');
      setQuotation(payload?.data || null);
    } catch (error) { handleApiError(error, 'Unable to load quotation'); } finally { setLoading(false); }
  }, [quotationId]);

  useEffect(() => { loadQuotation(); }, [loadQuotation]);

  const openEdit = () => {
    const next = normalizeQuotation(quotation);
    setEditForm(next);
    setIsEditOpen(true);
  };
  const updateEdit = (field, value) => setEditForm((current) => ({ ...current, [field]: value }));
  const updateNested = (field, index, key, value) => setEditForm((current) => ({ ...current, [field]: current[field].map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const addNested = (field) => setEditForm((current) => ({ ...current, [field]: [...current[field], {}] }));
  const removeNested = (field, index) => setEditForm((current) => ({ ...current, [field]: current[field].filter((_, itemIndex) => itemIndex !== index) }));

  const saveEdit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      ['package_id', 'variant_id', 'destination_id', 'tour_name', 'travel_date', 'return_date', 'subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'valid_until', 'terms_and_conditions', 'important_notes', 'inclusion', 'exclusion'].forEach((field) => {
        payload[field] = dateFields.has(field) ? toIso(editForm[field]) : editForm[field];
      });
      payload.items = editForm.items || [];
      payload.hotels = editForm.hotels || [];
      payload.vehicles = editForm.vehicles || [];
      payload.itinerary = editForm.itinerary || [];
      const response = await apiCall(`/api/v1/admin/quotations/${quotationId}/versions`, 'POST', payload);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to create quotation version');
      toast.success(result?.message || 'Quotation version created successfully');
      setIsEditOpen(false);
      if (result?.data?.id) navigate(`/quotations/${result.data.id}`); else await loadQuotation();
    } catch (error) { handleApiError(error, 'Unable to create quotation version'); } finally { setSaving(false); }
  };

  const deleteQuotation = async () => {
    setDeleting(true);
    try {
      const response = await apiCall(`/api/v1/admin/quotations/${quotationId}`, 'DELETE');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to delete quotation');
      toast.success(result?.message || 'Quotation deleted successfully');
      navigate('/quotations');
    } catch (error) { handleApiError(error, 'Unable to delete quotation'); } finally { setDeleting(false); }
  };

  const createVersion = async () => {
    try {
      const source = normalizeQuotation(quotation);
      const payload = {};
      ['package_id', 'variant_id', 'destination_id', 'tour_name', 'travel_date', 'return_date', 'subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'valid_until', 'terms_and_conditions', 'important_notes', 'inclusion', 'exclusion', 'items', 'hotels', 'vehicles', 'itinerary'].forEach((field) => { payload[field] = dateFields.has(field) ? toIso(source[field]) : source[field]; });
      const response = await apiCall(`/api/v1/admin/quotations/${quotationId}/versions`, 'POST', payload);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to create quotation version');
      toast.success(result?.message || 'New quotation version created');
      if (result?.data?.id) navigate(`/quotations/${result.data.id}`); else await loadQuotation();
    } catch (error) { handleApiError(error, 'Unable to create quotation version'); }
  };

  const downloadPdf = async () => {
    try {
      const response = await apiCall(`/api/v1/admin/quotations/${quotationId}/pdf`, 'GET');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to generate quotation PDF');
      const pdfValue = result?.data?.url || result?.data?.download_url || result?.data?.file_url || result?.data;
      if (typeof pdfValue === 'string' && /^https?:/i.test(pdfValue)) window.open(pdfValue, '_blank', 'noopener,noreferrer');
      else toast.success(result?.message || 'Quotation PDF generated');
    } catch (error) { handleApiError(error, 'Unable to generate quotation PDF'); }
  };

  const sendQuotation = async (event) => {
    event.preventDefault();
    if (!recipientEmail.trim()) { toast.error('Recipient email is required'); return; }
    try {
      const response = await apiCall(`/api/v1/admin/quotations/${quotationId}/send`, 'POST', { recipient_email: recipientEmail.trim() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to send quotation');
      toast.success(result?.message || 'Quotation sent successfully'); setIsSendOpen(false); setRecipientEmail(''); await loadQuotation();
    } catch (error) { handleApiError(error, 'Unable to send quotation'); }
  };

  const renderNestedEditor = (field, label) => <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-gray-700"><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900 dark:text-slate-100">{label}</h3><button type="button" onClick={() => addNested(field)} className="text-sm font-semibold text-cyan-700">Add row</button></div>{(editForm[field] || []).map((item, index) => <div key={`${field}-${index}`} className="grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-2 dark:bg-gray-900/50">{Object.keys(item).filter((key) => !['id', 'quotation_id', 'trip_item_id', 'created_at', 'updated_at'].includes(key)).map((key) => <div key={key}><label className="mb-1 block text-xs font-medium capitalize text-gray-600 dark:text-gray-300">{prettyLabel(key)}</label>{nestedDateFields.has(key) ? <CustomDatePicker value={item[key] ?? ''} includeTime={key !== 'date'} onChange={(value) => updateNested(field, index, key, value)} /> : <input type="text" inputMode={numericFields.has(key) ? 'decimal' : undefined} value={item[key] ?? ''} onChange={(event) => updateNested(field, index, key, numericFields.has(key) ? numericValue(event.target.value) : event.target.value)} className={inputClass} />}</div>)}<button type="button" onClick={() => removeNested(field, index)} className="justify-self-start text-sm text-rose-600">Remove</button></div>)}</section>;

  if (loading && !quotation) return <div className="flex min-h-[360px] items-center justify-center text-sm text-gray-500">Loading quotation...</div>;
  if (!quotation) return <div className="p-8 text-center"><p className="text-gray-500">Quotation not found.</p><button type="button" onClick={() => navigate('/quotations')} className="mt-4 text-sm font-semibold text-cyan-700">Back to quotations</button></div>;

  return <div className="space-y-5 pb-8"><div className="flex flex-col gap-3 px-2 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><button type="button" onClick={() => navigate('/quotations')} className="rounded-xl border border-gray-200 p-2 text-gray-600 dark:border-gray-700 dark:text-gray-300" title="Back to quotations"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">{quotation.quotation_code || 'Quotation'}</p><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{quotation.tour_name || 'Untitled tour'}</h1><p className="text-sm text-slate-500">Version {quotation.version || 1} · Created {formatDate(quotation.created_at)}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={loadQuotation} className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300" title="Refresh"><RefreshCw className="h-4 w-4" /></button><button type="button" onClick={openEdit} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"><Edit3 className="h-4 w-4" />Edit</button><button type="button" onClick={createVersion} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300"><Plus className="h-4 w-4" />New version</button><button type="button" onClick={() => setIsSendOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white"><Send className="h-4 w-4" />Send</button><button type="button" onClick={downloadPdf} className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300" title="Generate PDF"><Download className="h-4 w-4" /></button><button type="button" onClick={() => setIsDeleteOpen(true)} className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/20" title="Delete quotation"><Trash2 className="h-4 w-4" /></button></div></div>
    <div className="grid gap-4 md:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><p className="text-xs uppercase tracking-wide text-gray-500">Status</p><p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{quotation.status || 'DRAFT'}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><p className="text-xs uppercase tracking-wide text-gray-500">Total amount</p><p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{formatAmount(quotation.total_amount)}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><p className="text-xs uppercase tracking-wide text-gray-500">Travel dates</p><p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDate(quotation.travel_date)} - {formatDate(quotation.return_date)}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><p className="text-xs uppercase tracking-wide text-gray-500">Valid until</p><p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDate(quotation.valid_until)}</p></div></div>
    <div className="grid gap-5 xl:grid-cols-3"><div className="space-y-5 xl:col-span-2"><section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Quotation summary</h2><div className="grid gap-4 md:grid-cols-2">{['customer_id', 'enquiry_id', 'package_id', 'variant_id', 'destination_id', 'inclusion', 'exclusion', 'important_notes', 'terms_and_conditions'].map((field) => <div key={field} className="border-b border-slate-100 pb-3 dark:border-gray-700"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{prettyLabel(field)}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{quotation[field] || 'Not provided'}</p></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Itinerary</h2>{(quotation.itinerary || []).length ? <div className="space-y-3">{quotation.itinerary.map((day) => <div key={day.id || day.day_number} className="rounded-xl bg-slate-50 p-4 dark:bg-gray-900/50"><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Day {day.day_number}: {day.title || 'Untitled day'}</h3><span className="text-xs text-gray-500">{formatDate(day.date)}</span></div><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{day.description || 'No description'}</p><p className="mt-2 text-xs text-gray-500">{day.overnight_location || 'No overnight location'}{day.meal_plan ? ` · ${day.meal_plan}` : ''}</p></div>)}</div> : <p className="text-sm text-gray-500">No itinerary days added.</p>}</section></div><aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Amount breakdown</h2><div className="space-y-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>{formatAmount(quotation.subtotal)}</strong></div><div className="flex justify-between"><span>Discount</span><strong>- {formatAmount(quotation.discount_amount)}</strong></div><div className="flex justify-between"><span>Tax</span><strong>{formatAmount(quotation.tax_amount)}</strong></div><div className="flex justify-between border-t border-slate-200 pt-3 text-base dark:border-gray-700"><span>Total</span><strong>{formatAmount(quotation.total_amount)}</strong></div></div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Trip components</h2><div className="space-y-3 text-sm text-slate-700 dark:text-slate-200"><p><strong>{quotation.items?.length || 0}</strong> quotation items</p><p><strong>{quotation.hotels?.length || 0}</strong> hotel stays</p><p><strong>{quotation.vehicles?.length || 0}</strong> vehicle bookings</p><p><Calendar className="mr-2 inline h-4 w-4" />Updated {formatDate(quotation.updated_at)}</p></div></section></aside></div>

    <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Create quotation version" icon={FileText} size="3xl" footer={<div className="flex justify-end gap-3"><button type="button" onClick={() => setIsEditOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" form="quotation-edit-form" disabled={saving} className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white">{saving ? 'Creating...' : 'Create version'}</button></div>}>{editForm && <form id="quotation-edit-form" onSubmit={saveEdit} className="space-y-5 p-1"><div className="grid gap-4 md:grid-cols-3">{fields.slice(0, 13).map((field) => <div key={field}><label className="mb-1.5 block text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{prettyLabel(field)}</label>{dateFields.has(field) ? <CustomDatePicker value={editForm[field] ?? ''} onChange={(value) => updateEdit(field, value)} /> : <input type="text" inputMode={numericFields.has(field) ? 'decimal' : undefined} value={editForm[field] ?? ''} onChange={(event) => updateEdit(field, numericFields.has(field) ? numericValue(event.target.value) : event.target.value)} className={inputClass} />}</div>)}</div><div className="grid gap-4 md:grid-cols-2">{fields.slice(13).map((field) => <div key={field}><label className="mb-1.5 block text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{prettyLabel(field)}</label><textarea value={editForm[field] ?? ''} onChange={(event) => updateEdit(field, event.target.value)} className={`${inputClass} min-h-[90px]`} /></div>)}</div>{renderNestedEditor('items', 'Quotation items')}{renderNestedEditor('hotels', 'Hotels')}{renderNestedEditor('vehicles', 'Vehicles')}{renderNestedEditor('itinerary', 'Itinerary')}</form>}</Modal>
    <Modal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} title="Send quotation" icon={Mail} size="sm" footer={<div className="flex justify-end gap-3"><button type="button" onClick={() => setIsSendOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" form="send-quotation-form" className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white">Send quotation</button></div>}><form id="send-quotation-form" onSubmit={sendQuotation} className="space-y-4"><p className="text-sm text-gray-500">The quotation will be sent to the recipient email below.</p><input type="email" required value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} className={inputClass} placeholder="customer@example.com" /></form></Modal>
    <ConfirmDeleteModal isOpen={isDeleteOpen} onClose={() => { if (!deleting) setIsDeleteOpen(false); }} onConfirm={deleteQuotation} confirming={deleting} itemLabel={quotation.quotation_code || 'this quotation'} title="Delete quotation" message="This quotation and its itinerary details will be permanently removed." />
  </div>;
};

export default QuotationDetails;
