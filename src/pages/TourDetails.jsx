import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Image as ImageIcon,
  Images,
  Sparkles,
  CalendarRange,
  Route as RouteIcon,
  ListChecks,
  Save,
  Trash2,
  Plus,
  X,
} from 'lucide-react';
import DragDropUpload from '../component/common/DragDropUpload';
import { apiCall, handleApiError } from '../utils/apiCall';

const createEmptyDraft = () => ({
  banner: { image: '', video: '' },
  gallery: [],
  highlights: [],
  inclusions: [],
  exclusions: [],
  departure_dates: [],
  itinerary: [],
  route: [],
});

// Generates a stable client-side id for freshly added sub-items (gallery
// entries, highlights, itinerary days, route stops, departure dates) so the
// PATCH payload always has an `id` field, matching what already-saved items
// get back from the API.
const generateId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const sections = [
  { key: 'banner', label: 'Banner', icon: ImageIcon },
  { key: 'gallery', label: 'Gallery', icon: Images },
  { key: 'highlights', label: 'Highlights', icon: Sparkles },
  { key: 'itinerary', label: 'Itinerary', icon: CalendarRange },
  { key: 'route', label: 'Route', icon: RouteIcon },
  { key: 'extras', label: 'Inclusions & dates', icon: ListChecks },
];

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
const addBtnClass = 'inline-flex items-center gap-1.5 rounded-2xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-orange-400 hover:text-orange-600 dark:border-gray-600 dark:text-gray-200';
const removeBtnClass = 'inline-flex items-center gap-1 rounded-xl border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300';

const EmptyState = ({ text }) => (
  <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-700">{text}</p>
);

const TourDetails = () => {
  // The route is expected to look like /admin/tour-packages/:id/details —
  // :id is the tour package's id, and it is what's sent to the API both to
  // look up existing details and as `variant_id` when creating new ones.
  const { id: packageId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const packageInfo = location.state?.package || null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [details, setDetails] = useState(null);
  const [draft, setDraft] = useState(createEmptyDraft());
  const [activeSection, setActiveSection] = useState('banner');

  useEffect(() => {
    if (packageId) {
      loadDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  const applyDetailToDraft = (detailData) => {
    setDraft({
      banner: detailData?.banner || { image: '', video: '' },
      gallery: detailData?.gallery || [],
      highlights: detailData?.highlights || [],
      inclusions: detailData?.inclusions || [],
      exclusions: detailData?.exclusions || [],
      departure_dates: detailData?.departure_dates || [],
      itinerary: detailData?.itinerary || [],
      route: detailData?.route || [],
    });
  };

  const loadDetails = async () => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/v1/admin/tour-details/${packageId}`, 'GET');

      if (response.status === 404) {
        // No details created for this package yet — that's a normal state,
        // not an error. Show an empty form ready for creation.
        setDetails(null);
        setNotFound(true);
        setDraft(createEmptyDraft());
        return;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to load tour details');
      }

      const detailData = payload?.data || null;
      setDetails(detailData);
      setNotFound(!detailData);
      applyDetailToDraft(detailData || {});
    } catch (error) {
      handleApiError(error, 'Unable to load tour details');
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const buildPayload = () => ({
    banner: {
      image: draft.banner?.image || '',
      video: draft.banner?.video || '',
    },
    gallery: (draft.gallery || []).map((item, index) => ({
      id: item.id || generateId(),
      alt: item.alt || '',
      url: item.url || '',
      type: item.type || '',
      display_order: item.display_order ?? index + 1,
    })),
    highlights: (draft.highlights || []).map((item) => ({
      id: item.id || generateId(),
      text: item.text || '',
    })),
    inclusions: draft.inclusions || [],
    exclusions: draft.exclusions || [],
    departure_dates: (draft.departure_dates || []).map((item) => ({
      id: item.id || generateId(),
      date: item.date || '',
    })),
    itinerary: (draft.itinerary || []).map((item) => ({
      id: item.id || generateId(),
      day: item.day || 1,
      title: item.title || '',
      description: item.description || '',
    })),
    route: (draft.route || []).map((item) => ({
      id: item.id || generateId(),
      city: item.city || '',
      nights: item.nights || 1,
    })),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      let response;

      if (notFound) {
        response = await apiCall('/api/v1/admin/tour-details', 'POST', {
          ...payload,
          variant_id: packageId,
        });
      } else {
        response = await apiCall(`/api/v1/admin/tour-details/${packageId}`, 'PATCH', payload);
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to save tour details');
      }

      toast.success(notFound ? 'Tour details created' : 'Tour details updated');
      const detailData = result?.data || payload;
      setDetails(detailData);
      setNotFound(false);
      applyDetailToDraft(detailData);
    } catch (error) {
      handleApiError(error, notFound ? 'Unable to create tour details' : 'Unable to update tour details');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete all details for this tour package? This cannot be undone.');
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await apiCall(`/api/v1/admin/tour-details/${packageId}`, 'DELETE');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to delete tour details');
      }
      toast.success('Tour details deleted');
      setDetails(null);
      setNotFound(true);
      setDraft(createEmptyDraft());
    } catch (error) {
      handleApiError(error, 'Unable to delete tour details');
    } finally {
      setDeleting(false);
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
    setDraft((current) => ({
      ...current,
      [key]: [...(current[key] || []), { id: generateId(), ...item }],
    }));
  };

  const removeArrayItem = (key, index) => {
    setDraft((current) => ({
      ...current,
      [key]: (current[key] || []).filter((_, idx) => idx !== index),
    }));
  };

  const renderSection = () => {
    switch (activeSection) {
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
                className={inputClass}
                placeholder="https://..."
              />
            </div>
          </div>
        );

      case 'gallery':
        return (
          <div className="space-y-4">
            {(draft.gallery || []).length === 0 && <EmptyState text="No gallery images yet." />}
            {(draft.gallery || []).map((item, index) => (
              <div key={item.id || index} className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={item.alt || ''} onChange={(event) => updateArrayItem('gallery', index, 'alt', event.target.value)} placeholder="Alt text" className={inputClass} />
                  <input value={item.type || ''} onChange={(event) => updateArrayItem('gallery', index, 'type', event.target.value)} placeholder="Type (e.g. image, video)" className={inputClass} />
                </div>
                <DragDropUpload
                  label="Gallery image"
                  value={item.url || ''}
                  onChange={(url) => updateArrayItem('gallery', index, 'url', url)}
                  helperText="Upload gallery image"
                />
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    min={1}
                    value={item.display_order ?? index + 1}
                    onChange={(event) => updateArrayItem('gallery', index, 'display_order', Number(event.target.value))}
                    placeholder="Order"
                    className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                  <button type="button" onClick={() => removeArrayItem('gallery', index)} className={removeBtnClass}>
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('gallery', { alt: '', url: '', type: '', display_order: (draft.gallery || []).length + 1 })}
              className={addBtnClass}
            >
              <Plus className="h-4 w-4" /> Add gallery item
            </button>
          </div>
        );

      case 'highlights':
        return (
          <div className="space-y-3">
            {(draft.highlights || []).length === 0 && <EmptyState text="No highlights yet." />}
            {(draft.highlights || []).map((item, index) => (
              <div key={item.id || index} className="flex gap-2">
                <input
                  value={item.text || ''}
                  onChange={(event) => updateArrayItem('highlights', index, 'text', event.target.value)}
                  className={inputClass}
                  placeholder="Highlight text"
                />
                <button type="button" onClick={() => removeArrayItem('highlights', index)} className={removeBtnClass}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('highlights', { text: '' })} className={addBtnClass}>
              <Plus className="h-4 w-4" /> Add highlight
            </button>
          </div>
        );

      case 'itinerary':
        return (
          <div className="space-y-4">
            {(draft.itinerary || []).length === 0 && <EmptyState text="No itinerary days yet." />}
            {(draft.itinerary || []).map((item, index) => (
              <div key={item.id || index} className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="number"
                    min={1}
                    value={item.day || ''}
                    onChange={(event) => updateArrayItem('itinerary', index, 'day', Number(event.target.value))}
                    placeholder="Day"
                    className={inputClass}
                  />
                  <input value={item.title || ''} onChange={(event) => updateArrayItem('itinerary', index, 'title', event.target.value)} placeholder="Title" className={inputClass} />
                </div>
                <textarea
                  value={item.description || ''}
                  onChange={(event) => updateArrayItem('itinerary', index, 'description', event.target.value)}
                  rows={3}
                  placeholder="Description"
                  className={inputClass}
                />
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeArrayItem('itinerary', index)} className={removeBtnClass}>
                    <X className="h-3.5 w-3.5" /> Remove day
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('itinerary', { day: (draft.itinerary || []).length + 1, title: '', description: '' })}
              className={addBtnClass}
            >
              <Plus className="h-4 w-4" /> Add itinerary day
            </button>
          </div>
        );

      case 'route':
        return (
          <div className="space-y-3">
            {(draft.route || []).length === 0 && <EmptyState text="No route segments yet." />}
            {(draft.route || []).map((item, index) => (
              <div key={item.id || index} className="grid gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700 md:grid-cols-[1fr_140px_auto] md:items-center">
                <input value={item.city || ''} onChange={(event) => updateArrayItem('route', index, 'city', event.target.value)} placeholder="City" className={inputClass} />
                <input
                  type="number"
                  min={0}
                  value={item.nights || ''}
                  onChange={(event) => updateArrayItem('route', index, 'nights', Number(event.target.value))}
                  placeholder="Nights"
                  className={inputClass}
                />
                <button type="button" onClick={() => removeArrayItem('route', index)} className={removeBtnClass}>
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayItem('route', { city: '', nights: 1 })} className={addBtnClass}>
              <Plus className="h-4 w-4" /> Add route segment
            </button>
          </div>
        );

      case 'extras':
        return (
          <div className="space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Inclusions</label>
              <p className="mb-1.5 text-xs text-gray-500">One item per line.</p>
              <textarea
                value={(draft.inclusions || []).join('\n')}
                onChange={(event) => setDraft((current) => ({ ...current, inclusions: event.target.value.split('\n').filter(Boolean) }))}
                rows={5}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Exclusions</label>
              <p className="mb-1.5 text-xs text-gray-500">One item per line.</p>
              <textarea
                value={(draft.exclusions || []).join('\n')}
                onChange={(event) => setDraft((current) => ({ ...current, exclusions: event.target.value.split('\n').filter(Boolean) }))}
                rows={5}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Departure dates</label>
              <div className="space-y-2">
                {(draft.departure_dates || []).length === 0 && <EmptyState text="No departure dates yet." />}
                {(draft.departure_dates || []).map((item, index) => (
                  <div key={item.id || index} className="flex items-center gap-2">
                    <input
                      type="date"
                      value={item.date || ''}
                      onChange={(event) => updateArrayItem('departure_dates', index, 'date', event.target.value)}
                      className={inputClass}
                    />
                    <button type="button" onClick={() => removeArrayItem('departure_dates', index)} className={removeBtnClass}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addArrayItem('departure_dates', { date: '' })} className={addBtnClass}>
                  <Plus className="h-4 w-4" /> Add departure date
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!packageId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500 dark:border-gray-700">
        No tour package selected. Go back to Tour Packages and click a row to manage its details.
      </div>
    );
  }

  const headerTitle = packageInfo?.title || 'Tour details';
  const headerSubtitle = packageInfo
    ? [packageInfo.tour_code, packageInfo.destination].filter(Boolean).join(' • ')
    : packageId;

  return (
    <div className=" space-y-3 pb-6">
      <div className="rounded-2xl bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 p-6 text-white shadow-xl shadow-orange-500/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/admin/tour-packages')}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-100 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to tour packages
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-100">Content</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">{headerTitle}</h1>
            <p className="mt-1 text-sm text-orange-100">{headerSubtitle}</p>
          </div>

          <span
            className={[
              'w-fit rounded-full border px-3 py-1.5 text-xs font-semibold',
              notFound ? 'border-white/40 bg-white/10 text-white' : 'border-emerald-200/60 bg-emerald-500/20 text-white',
            ].join(' ')}
          >
            {notFound ? 'Not created yet' : 'Details saved'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="mt-5">
          <div
            role="tablist"
            className="overflow-x-scroll flex items-center"
          >
            {sections.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeSection === key}
                onClick={() => setActiveSection(key)}
                className={[
                  'flex w-full whitespace-nowrap items-center gap-2.5 rounded-xl border-l-[3px] px-3 py-2.5 text-left text-sm font-medium transition',
                  activeSection === key
                    ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Editor</p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {sections.find((section) => section.key === activeSection)?.label} settings
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {!notFound && (
                <button
                  type="button"
                  onClick={() => details && applyDetailToDraft(details)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  Reset
                </button>
              )}
              {!notFound && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                >
                  <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : notFound ? 'Create details' : 'Save changes'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading details...</div>
          ) : (
            <>
              {notFound && (
                <div className="mb-5 rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-300">
                  No details exist for this package yet. Fill in the sections below and click "Create details" to publish them.
                </div>
              )}
              {renderSection()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TourDetails;