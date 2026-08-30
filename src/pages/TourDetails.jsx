import React, {useState} from 'react';
import toast from 'react-hot-toast';
import { Layers3, Save, Trash2 } from 'lucide-react';
import Modal from '../component/common/Modal';
import DragDropUpload from '../component/common/DragDropUpload';
import { apiCall, handleApiError } from '../utils/apiCall';

const emptyDetail = {
  variant_id: '',
  banner: { image: '', video: '' },
  gallery: [],
  highlights: [],
  inclusions: [],
  exclusions: [],
  departure_dates: [],
  itinerary: [],
  route: [],
};

const TourDetails = () => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [variantId, setVariantId] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState('banner');
  const [draft, setDraft] = useState(emptyDetail);

  const loadDetails = async (selectedVariantId = variantId) => {
    if (!selectedVariantId) return;
    setLoading(true);
    try {
      const response = await apiCall(`/api/v1/admin/tour-details/${selectedVariantId}`, 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to load tour details');
      }
      const detailData = payload?.data || emptyDetail;
      setDetails(detailData);
      setDraft({
        variant_id: detailData?.variant_id || selectedVariantId,
        banner: detailData?.banner || { image: '', video: '' },
        gallery: detailData?.gallery || [],
        highlights: detailData?.highlights || [],
        inclusions: detailData?.inclusions || [],
        exclusions: detailData?.exclusions || [],
        departure_dates: detailData?.departure_dates || [],
        itinerary: detailData?.itinerary || [],
        route: detailData?.route || [],
      });
    } catch (error) {
      handleApiError(error, 'Unable to load tour details');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!variantId) {
      toast.error('Please enter a variant ID');
      return;
    }

    setSaving(true);
    try {
      const response = await apiCall('/api/v1/admin/tour-details', 'POST', {
        ...draft,
        variant_id: variantId,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to create tour details');
      }
      toast.success('Tour details created');
      setDetails(payload?.data || draft);
      setDraft(payload?.data || draft);
    } catch (error) {
      handleApiError(error, 'Unable to create tour details');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!variantId && !details?.variant_id) {
      toast.error('No variant selected');
      return;
    }

    const targetId = details?.id || details?.variant_id || variantId;
    setSaving(true);
    try {
      const response = await apiCall(`/api/v1/admin/tour-details/${targetId}`, 'PATCH', {
        ...draft,
        variant_id: targetId,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to update tour details');
      }
      toast.success('Tour details updated');
      setDetails(payload?.data || draft);
    } catch (error) {
      handleApiError(error, 'Unable to update tour details');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const targetId = details?.id || details?.variant_id || variantId;
    if (!targetId) return;

    const confirmed = window.confirm('Delete these tour details?');
    if (!confirmed) return;

    try {
      const response = await apiCall(`/api/v1/admin/tour-details/${targetId}`, 'DELETE');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to delete tour details');
      }
      toast.success('Tour details deleted');
      setDetails(null);
      setDraft(emptyDetail);
      setVariantId('');
    } catch (error) {
      handleApiError(error, 'Unable to delete tour details');
    }
  };

  const updateArrayItem = (key, index, field, value) => {
    setDraft((current) => {
      const next = [...(current[key] || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...current, [key]: next };
    });
  };

  const addArrayItem = (key, item = {}) => {
    setDraft((current) => ({ ...current, [key]: [...(current[key] || []), item] }));
  };

  const removeArrayItem = (key, index) => {
    setDraft((current) => ({
      ...current,
      [key]: (current[key] || []).filter((_, idx) => idx !== index),
    }));
  };

  const renderEditor = () => {
    switch (currentSection) {
      case 'banner':
        return (
          <div className="space-y-4">
            <DragDropUpload
              label="Banner image"
              value={draft.banner?.image || ''}
              onChange={(url) => setDraft((current) => ({ ...current, banner: { ...current.banner, image: url } }))}
              helperText="Upload a tour banner image"
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Banner video URL</label>
              <input
                value={draft.banner?.video || ''}
                onChange={(event) => setDraft((current) => ({ ...current, banner: { ...current.banner, video: event.target.value } }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="https://..."
              />
            </div>
          </div>
        );
      case 'gallery':
        return (
          <div className="space-y-4">
            {(draft.gallery || []).map((item, index) => (
              <div key={`gallery-${index}`} className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={item.alt || ''} onChange={(event) => updateArrayItem('gallery', index, 'alt', event.target.value)} placeholder="Alt text" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
                  <input value={item.type || ''} onChange={(event) => updateArrayItem('gallery', index, 'type', event.target.value)} placeholder="Type" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
                </div>
                <DragDropUpload
                  label="Gallery image"
                  value={item.url || ''}
                  onChange={(url) => updateArrayItem('gallery', index, 'url', url)}
                  helperText="Upload gallery image"
                />
                <button type="button" onClick={() => removeArrayItem('gallery', index)} className="text-xs font-semibold text-red-500">Remove item</button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('gallery', { alt: '', url: '', type: '', display_order: (draft.gallery || []).length + 1 })} className="rounded-2xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200">Add gallery item</button>
          </div>
        );
      case 'highlights':
        return (
          <div className="space-y-4">
            {(draft.highlights || []).map((item, index) => (
              <div key={`highlight-${index}`} className="flex gap-2">
                <input value={item.text || ''} onChange={(event) => updateArrayItem('highlights', index, 'text', event.target.value)} className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" placeholder="Highlight text" />
                <button type="button" onClick={() => removeArrayItem('highlights', index)} className="rounded-2xl border border-red-200 px-3 py-2 text-sm text-red-600">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('highlights', { text: '' })} className="rounded-2xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200">Add highlight</button>
          </div>
        );
      case 'itinerary':
        return (
          <div className="space-y-4">
            {(draft.itinerary || []).map((item, index) => (
              <div key={`itinerary-${index}`} className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="grid gap-3 md:grid-cols-2">
                  <input type="number" value={item.day || ''} onChange={(event) => updateArrayItem('itinerary', index, 'day', Number(event.target.value))} placeholder="Day" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
                  <input value={item.title || ''} onChange={(event) => updateArrayItem('itinerary', index, 'title', event.target.value)} placeholder="Title" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
                </div>
                <textarea value={item.description || ''} onChange={(event) => updateArrayItem('itinerary', index, 'description', event.target.value)} rows={3} placeholder="Description" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
                <button type="button" onClick={() => removeArrayItem('itinerary', index)} className="text-xs font-semibold text-red-500">Remove item</button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('itinerary', { day: (draft.itinerary || []).length + 1, title: '', description: '' })} className="rounded-2xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200">Add itinerary item</button>
          </div>
        );
      case 'route':
        return (
          <div className="space-y-4">
            {(draft.route || []).map((item, index) => (
              <div key={`route-${index}`} className="grid gap-3 md:grid-cols-2 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <input value={item.city || ''} onChange={(event) => updateArrayItem('route', index, 'city', event.target.value)} placeholder="City" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
                <input type="number" value={item.nights || ''} onChange={(event) => updateArrayItem('route', index, 'nights', Number(event.target.value))} placeholder="Nights" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
                <button type="button" onClick={() => removeArrayItem('route', index)} className="md:col-span-2 text-left text-xs font-semibold text-red-500">Remove item</button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('route', { city: '', nights: 1 })} className="rounded-2xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200">Add route segment</button>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Inclusions</label>
              <textarea value={(draft.inclusions || []).join('\n')} onChange={(event) => setDraft((current) => ({ ...current, inclusions: event.target.value.split('\n').filter(Boolean) }))} rows={6} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Exclusions</label>
              <textarea value={(draft.exclusions || []).join('\n')} onChange={(event) => setDraft((current) => ({ ...current, exclusions: event.target.value.split('\n').filter(Boolean) }))} rows={6} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Departure dates</label>
              <textarea value={(draft.departure_dates || []).map((item) => item.date || '').join('\n')} onChange={(event) => setDraft((current) => ({ ...current, departure_dates: event.target.value.split('\n').filter(Boolean).map((date) => ({ date })) }))} rows={6} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 p-6 text-white shadow-xl shadow-orange-500/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-100">Content</p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Tour Details</h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              className="w-full rounded-xl border border-white/30 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-orange-100 outline-none backdrop-blur-sm focus:border-white/50 sm:w-72"
              placeholder="Enter variant UUID"
            />
            <button type="button" onClick={() => loadDetails()} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50">Load</button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Sections</h2>
            <button type="button" onClick={() => setModalOpen(true)} className="rounded-2xl border border-gray-200 px-2 py-1 text-xs font-medium dark:border-gray-700">Quick add</button>
          </div>
          <div className="space-y-2">
            {['banner', 'gallery', 'highlights', 'itinerary', 'route', 'inclusions'].map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setCurrentSection(section)}
                className={[
                  'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
                  currentSection === section
                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                <span className="capitalize">{section}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Editor</p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentSection} settings</h2>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDraft(details || emptyDetail)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium dark:border-gray-700 dark:bg-gray-800">Reset</button>
              <button type="button" onClick={handleDelete} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <button type="button" onClick={handleUpdate} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save details'}
              </button>
            </div>
          </div>

          {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading details...</div> : renderEditor()}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create tour details"
        icon={Layers3}
        size="lg"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">Close</button>
            <button type="button" onClick={() => { handleCreate(); setModalOpen(false); }} disabled={saving} className="rounded-2xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">Create</button>
          </div>
        )}
      >
        <div className="space-y-4 p-1">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Variant ID</label>
            <input
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
              placeholder="UUID"
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create a new details collection for this variant, then load it to edit the sections below.</p>
        </div>
      </Modal>
    </div>
  );
};

export default TourDetails;
