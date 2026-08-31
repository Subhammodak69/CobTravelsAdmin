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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import DragDropUpload from '../component/common/DragDropUpload';
import MediaPreviewModal from '../component/common/MediaPreviewModal';
import Modal from '../component/common/Modal';
import SelectField from '../component/common/SelectField';
import { apiCall, handleApiError } from '../utils/apiCall';

const createEmptyDraft = () => ({
  banner: { items: [], cover_image: '', image: '', video: '' },
  gallery: [],
  highlights: [],
  inclusions: [],
  exclusions: [],
  departure_dates: [],
  itinerary: [],
  route: [],
});

const normalizeMediaUrl = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    return (
      value.url ||
      value.image ||
      value.image_url ||
      value.imageUrl ||
      value.src ||
      value.path ||
      value.video ||
      value.video_url ||
      value.videoUrl ||
      ''
    );
  }
  return String(value).trim();
};

const getMediaTypeFromUrl = (url, fallbackType = 'image') => {
  if (!url) return fallbackType;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm') || lowerUrl.includes('.ogg') || lowerUrl.includes('video/upload')) {
    return 'video';
  }
  return fallbackType;
};

const normalizeBannerItem = (item, fallbackIndex = 0) => {
  const url = normalizeMediaUrl(
    item?.url ??
    item?.image ??
    item?.media_url ??
    item?.image_url ??
    item?.imageUrl ??
    item?.src ??
    item?.video ??
    item?.video_url ??
    item?.videoUrl ??
    item?.path ??
    ''
  );

  const type = (item?.type || item?.media_type || item?.kind || getMediaTypeFromUrl(url, 'image')).toLowerCase();

  return {
    id: item?.id || generateId(),
    url,
    type: type === 'video' ? 'video' : 'image',
    alt: item?.alt || '',
    cover_image: Boolean(item?.cover_image),
    display_order: item?.display_order ?? fallbackIndex + 1,
  };
};

const normalizeDetailData = (detailData = {}) => {
  const bannerSource = detailData.banner || {};
  const bannerItems = Array.isArray(bannerSource)
    ? bannerSource.map((item, index) => normalizeBannerItem(item, index))
    : Array.isArray(bannerSource.items)
      ? bannerSource.items.map((item, index) => normalizeBannerItem(item, index))
      : [
          bannerSource.image,
          bannerSource.video,
          bannerSource.cover_image,
          bannerSource.url,
          bannerSource.media_url,
          bannerSource.image_url,
          bannerSource.video_url,
          bannerSource.imageUrl,
          bannerSource.videoUrl,
        ]
          .filter(Boolean)
          .map((entry, index) => {
            const isVideo = getMediaTypeFromUrl(String(entry), 'image') === 'video';
            return normalizeBannerItem({
              id: generateId(),
              type: isVideo ? 'video' : 'image',
              url: entry,
              cover_image: entry === bannerSource.cover_image,
            }, index);
          });

  const normalizedBanner = {
    items: bannerItems.length ? bannerItems : [
      normalizeBannerItem({
        type: getMediaTypeFromUrl(normalizeMediaUrl(bannerSource.video || bannerSource.url || bannerSource.image || ''), 'image'),
        url: normalizeMediaUrl(bannerSource.video || bannerSource.url || bannerSource.image || ''),
        cover_image: Boolean(bannerSource.cover_image),
      }, 0),
    ].filter((item) => item.url),
    cover_image: normalizeMediaUrl(
      bannerSource.cover_image ??
      bannerSource.image ??
      bannerSource.url ??
      detailData.cover_image ??
      detailData.banner_image ??
      ''
    ),
    image: normalizeMediaUrl(
      bannerSource.image ??
      bannerSource.url ??
      bannerSource.image_url ??
      bannerSource.imageUrl ??
      bannerSource.src ??
      detailData.banner_image ??
      detailData.bannerUrl ??
      detailData.image_url ??
      ''
    ),
    video: normalizeMediaUrl(
      bannerSource.video ??
      bannerSource.video_url ??
      bannerSource.videoUrl ??
      detailData.video_url ??
      detailData.videoUrl ??
      ''
    ),
  };

  const normalizedGallery = (detailData.gallery || []).map((item, index) => ({
    ...item,
    id: item.id || generateId(),
    alt: item.alt || '',
    url: normalizeMediaUrl(item.url ?? item.image ?? item.image_url ?? item.imageUrl ?? item.src ?? ''),
    type: (item.type || item.media_type || getMediaTypeFromUrl(normalizeMediaUrl(item.url ?? item.image ?? item.image_url ?? item.imageUrl ?? item.src ?? ''), 'image')).toLowerCase(),
    display_order: item.display_order ?? index + 1,
  }));

  return {
    banner: normalizedBanner,
    gallery: normalizedGallery,
    highlights: detailData.highlights || [],
    inclusions: detailData.inclusions || [],
    exclusions: detailData.exclusions || [],
    departure_dates: detailData.departure_dates || [],
    itinerary: detailData.itinerary || [],
    route: detailData.route || [],
  };
};

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
  // The route is /tour-packages/:packageId/variants/:variantId/details.
  // The API detail resource is keyed by the selected variant id, not the package id.
  const { packageId, variantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const packageInfo = location.state?.package || null;
  const variantInfo = location.state?.variant || null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [details, setDetails] = useState(null);
  const [draft, setDraft] = useState(createEmptyDraft());
  const [activeSection, setActiveSection] = useState('banner');
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaModalContext, setMediaModalContext] = useState('banner');
  const [mediaForm, setMediaForm] = useState({ type: 'image', url: '', alt: '', cover_image: false });
  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);
  const [itineraryForm, setItineraryForm] = useState({ day: 1, title: '', description: '' });
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [routeForm, setRouteForm] = useState({ city: '', nights: 1 });
  const [extrasModalOpen, setExtrasModalOpen] = useState(false);
  const [extrasModalType, setExtrasModalType] = useState('inclusion');
  const [extrasForm, setExtrasForm] = useState({ value: '', date: '' });
  const [extrasCollapsed, setExtrasCollapsed] = useState({ inclusion: true, exclusion: true });

  useEffect(() => {
    if (variantId) {
      loadDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId]);

  const applyDetailToDraft = (detailData) => {
    const normalized = normalizeDetailData(detailData || {});
    setDraft({
      banner: normalized.banner,
      gallery: normalized.gallery,
      highlights: normalized.highlights,
      inclusions: normalized.inclusions,
      exclusions: normalized.exclusions,
      departure_dates: normalized.departure_dates,
      itinerary: normalized.itinerary,
      route: normalized.route,
    });
  };

  const loadDetails = async () => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/v1/admin/tour-details/${variantId}`, 'GET');

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

  const buildPayload = () => {
    const bannerItems = (draft.banner?.items || []).map((item, index) => ({
      id: item.id || generateId(),
      url: item.url || '',
      type: item.type || getMediaTypeFromUrl(item.url || '', 'image'),
      alt: item.alt || '',
      cover_image: Boolean(item.cover_image),
      display_order: item.display_order ?? index + 1,
    }));

    return {
      banner: {
        items: bannerItems,
        image: draft.banner?.image || '',
        video: draft.banner?.video || '',
        cover_image: draft.banner?.cover_image || '',
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
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      let response;

      if (notFound) {
        response = await apiCall('/api/v1/admin/tour-details', 'POST', {
          ...payload,
          variant_id: variantId,
        });
      } else {
        response = await apiCall(`/api/v1/admin/tour-details/${variantId}`, 'PATCH', payload);
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
      const response = await apiCall(`/api/v1/admin/tour-details/${variantId}`, 'DELETE');
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

  const openMediaModal = (context) => {
    setMediaModalContext(context);
    setMediaForm({ type: 'image', url: '', alt: '', cover_image: false });
    setMediaModalOpen(true);
  };

  const submitMediaModal = () => {
    if (!mediaForm.url) {
      toast.error('Please choose a media file first.');
      return;
    }

    const payloadItem = {
      id: generateId(),
      url: mediaForm.url,
      type: mediaForm.type,
      alt: mediaForm.alt || '',
      cover_image: Boolean(mediaForm.cover_image),
      display_order: ((mediaModalContext === 'banner' ? draft.banner?.items : draft.gallery) || []).length + 1,
    };

    if (mediaModalContext === 'banner') {
      setDraft((current) => ({
        ...current,
        banner: {
          ...current.banner,
          image: mediaForm.type === 'image' ? mediaForm.url : current.banner?.image || '',
          video: mediaForm.type === 'video' ? mediaForm.url : current.banner?.video || '',
          items: [...(current.banner?.items || []), payloadItem],
        },
      }));
    } else {
      setDraft((current) => ({
        ...current,
        gallery: [...(current.gallery || []), { ...payloadItem, display_order: (current.gallery || []).length + 1 }],
      }));
    }

    setMediaModalOpen(false);
    setMediaForm({ type: 'image', url: '', alt: '', cover_image: false });
  };

  const submitItineraryModal = () => {
    if (!itineraryForm.title.trim()) {
      toast.error('Please enter an itinerary title.');
      return;
    }

    const newItem = {
      id: generateId(),
      day: Number(itineraryForm.day) || 1,
      title: itineraryForm.title.trim(),
      description: itineraryForm.description.trim(),
    };

    setDraft((current) => ({
      ...current,
      itinerary: [...(current.itinerary || []), newItem],
    }));

    setItineraryModalOpen(false);
    setItineraryForm({ day: (draft.itinerary || []).length + 1, title: '', description: '' });
  };

  const submitRouteModal = () => {
    if (!routeForm.city.trim()) {
      toast.error('Please enter a city name.');
      return;
    }

    const newItem = {
      id: generateId(),
      city: routeForm.city.trim(),
      nights: Number(routeForm.nights) || 1,
    };

    setDraft((current) => ({
      ...current,
      route: [...(current.route || []), newItem],
    }));

    setRouteModalOpen(false);
    setRouteForm({ city: '', nights: 1 });
  };

  const openExtrasModal = (type) => {
    setExtrasModalType(type);
    setExtrasForm({ value: '', date: '' });
    setExtrasModalOpen(true);
  };

  const submitExtrasModal = () => {
    if (extrasModalType === 'departure_date') {
      if (!extrasForm.date) {
        toast.error('Please select a departure date.');
        return;
      }

      setDraft((current) => ({
        ...current,
        departure_dates: [...(current.departure_dates || []), { id: generateId(), date: extrasForm.date }],
      }));
    } else if (!extrasForm.value.trim()) {
      toast.error(extrasModalType === 'inclusion' ? 'Please enter an inclusion.' : 'Please enter an exclusion.');
      return;
    } else if (extrasModalType === 'inclusion') {
      setDraft((current) => ({
        ...current,
        inclusions: [...(current.inclusions || []), extrasForm.value.trim()],
      }));
    } else {
      setDraft((current) => ({
        ...current,
        exclusions: [...(current.exclusions || []), extrasForm.value.trim()],
      }));
    }

    setExtrasModalOpen(false);
    setExtrasForm({ value: '', date: '' });
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'banner': {
        const bannerItems = draft.banner?.items || [];
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Media list</p>
              <button type="button" onClick={() => openMediaModal('banner')} className={addBtnClass}>
                <Plus className="h-4 w-4" /> Add media
              </button>
            </div>

            {bannerItems.length === 0 && <EmptyState text="No banner media yet." />}

            {bannerItems.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-[110px_minmax(0,1fr)_56px] gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <span>Type</span>
                  <span>Media</span>
                  <span className="text-right">Action</span>
                </div>

                {bannerItems.map((item, index) => (
                  <div key={item.id || index} className="grid grid-cols-[110px_minmax(0,1fr)_56px] items-center gap-3 border-b border-gray-200 px-3 py-3 last:border-b-0 dark:border-gray-700">
                    <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-200">{item.type || 'image'}</span>
                    <div className="flex min-w-0 items-center gap-3">
                      <MediaPreviewModal
                        src={item.url}
                        alt={item.alt || 'Banner media'}
                        type={item.type || 'image'}
                        thumbnailClassName="h-12 w-20 rounded-lg object-cover"
                        className="block shrink-0"
                      />
                      <span className="truncate text-xs text-gray-500 dark:text-gray-400">{item.url}</span>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setDraft((current) => ({
                          ...current,
                          banner: {
                            ...current.banner,
                            items: (current.banner?.items || []).filter((_, idx) => idx !== index),
                          },
                        }))}
                        className={removeBtnClass}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'gallery': {
        const galleryItems = draft.gallery || [];
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Media list</p>
              <button type="button" onClick={() => openMediaModal('gallery')} className={addBtnClass}>
                <Plus className="h-4 w-4" /> Add media
              </button>
            </div>

            {galleryItems.length === 0 && <EmptyState text="No gallery media yet." />}

            {galleryItems.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-[110px_minmax(0,1fr)_56px] gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <span>Type</span>
                  <span>Media</span>
                  <span className="text-right">Action</span>
                </div>

                {galleryItems.map((item, index) => (
                  <div key={item.id || index} className="grid grid-cols-[110px_minmax(0,1fr)_56px] items-center gap-3 border-b border-gray-200 px-3 py-3 last:border-b-0 dark:border-gray-700">
                    <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-200">{item.type || 'image'}</span>
                    <div className="flex min-w-0 items-center gap-3">
                      <MediaPreviewModal
                        src={item.url}
                        alt={item.alt || 'Gallery media'}
                        type={item.type || 'image'}
                        thumbnailClassName="h-12 w-20 rounded-lg object-cover"
                        className="block shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-200">{item.alt || 'Untitled'}</p>
                        <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{item.url}</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeArrayItem('gallery', index)} className={removeBtnClass}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

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

      case 'itinerary': {
        const itineraryItems = draft.itinerary || [];
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Itinerary list</p>
              <button type="button" onClick={() => setItineraryModalOpen(true)} className={addBtnClass}>
                <Plus className="h-4 w-4" /> Add itinerary day
              </button>
            </div>

            {itineraryItems.length === 0 && <EmptyState text="No itinerary days yet." />}

            {itineraryItems.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-[90px_minmax(0,1.1fr)_minmax(0,1.5fr)_70px] gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <span>Day</span>
                  <span>Title</span>
                  <span>Description</span>
                  <span className="text-right">Action</span>
                </div>

                {itineraryItems.map((item, index) => (
                  <div key={item.id || index} className="grid grid-cols-[90px_minmax(0,1.1fr)_minmax(0,1.5fr)_70px] items-start gap-3 border-b border-gray-200 px-3 py-3 last:border-b-0 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Day {item.day || index + 1}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.title || 'Untitled'}</span>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{item.description || 'No description provided.'}</p>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeArrayItem('itinerary', index)} className={removeBtnClass}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'route':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Route segments</p>
              <button type="button" onClick={() => setRouteModalOpen(true)} className={addBtnClass}>
                <Plus className="h-4 w-4" /> Add route segment
              </button>
            </div>

            {(draft.route || []).length === 0 && <EmptyState text="No route segments yet." />}

            {(draft.route || []).length > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-[minmax(0,1.2fr)_110px_70px] gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <span>City</span>
                  <span>Nights</span>
                  <span className="text-right">Action</span>
                </div>

                {(draft.route || []).map((item, index) => (
                  <div key={item.id || index} className="grid grid-cols-[minmax(0,1.2fr)_110px_70px] items-center gap-3 border-b border-gray-200 px-3 py-3 last:border-b-0 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.city || 'Untitled city'}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{item.nights || 0} nights</span>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeArrayItem('route', index)} className={removeBtnClass}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'extras':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExtrasCollapsed((current) => ({ ...current, inclusion: !current.inclusion }))}
                    className="inline-flex items-center justify-center rounded-lg p-1 text-gray-500 transition hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                    aria-label={extrasCollapsed.inclusion ? 'Expand inclusions' : 'Collapse inclusions'}
                  >
                    {extrasCollapsed.inclusion ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Inclusions</p>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => openExtrasModal('inclusion')} className={addBtnClass}>
                    <Plus className="h-4 w-4" /> Add inclusion
                  </button>
                </div>
              </div>

              {!extrasCollapsed.inclusion && (
                <>
                  {(draft.inclusions || []).length === 0 && <EmptyState text="No inclusions yet." />}

                  {(draft.inclusions || []).length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-[minmax(0,1fr)_70px] gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        <span>Item</span>
                        <span className="text-right">Action</span>
                      </div>

                      {(draft.inclusions || []).map((item, index) => (
                        <div key={`${item}-${index}`} className="grid grid-cols-[minmax(0,1fr)_70px] items-center gap-3 border-b border-gray-200 px-3 py-3 last:border-b-0 dark:border-gray-700">
                          <span className="text-sm text-gray-700 dark:text-gray-200">{item}</span>
                          <div className="flex justify-end">
                            <button type="button" onClick={() => setDraft((current) => ({ ...current, inclusions: (current.inclusions || []).filter((_, idx) => idx !== index) }))} className={removeBtnClass}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExtrasCollapsed((current) => ({ ...current, exclusion: !current.exclusion }))}
                    className="inline-flex items-center justify-center rounded-lg p-1 text-gray-500 transition hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                    aria-label={extrasCollapsed.exclusion ? 'Expand exclusions' : 'Collapse exclusions'}
                  >
                    {extrasCollapsed.exclusion ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Exclusions</p>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => openExtrasModal('exclusion')} className={addBtnClass}>
                    <Plus className="h-4 w-4" /> Add exclusion
                  </button>
                </div>
              </div>

              {!extrasCollapsed.exclusion && (
                <>
                  {(draft.exclusions || []).length === 0 && <EmptyState text="No exclusions yet." />}

                  {(draft.exclusions || []).length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-[minmax(0,1fr)_70px] gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        <span>Item</span>
                        <span className="text-right">Action</span>
                      </div>

                      {(draft.exclusions || []).map((item, index) => (
                        <div key={`${item}-${index}`} className="grid grid-cols-[minmax(0,1fr)_70px] items-center gap-3 border-b border-gray-200 px-3 py-3 last:border-b-0 dark:border-gray-700">
                          <span className="text-sm text-gray-700 dark:text-gray-200">{item}</span>
                          <div className="flex justify-end">
                            <button type="button" onClick={() => setDraft((current) => ({ ...current, exclusions: (current.exclusions || []).filter((_, idx) => idx !== index) }))} className={removeBtnClass}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Departure dates</p>
                <button type="button" onClick={() => openExtrasModal('departure_date')} className={addBtnClass}>
                  <Plus className="h-4 w-4" /> Add date
                </button>
              </div>

              {(draft.departure_dates || []).length === 0 && <EmptyState text="No departure dates yet." />}

              {(draft.departure_dates || []).length > 0 && (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-[minmax(0,1fr)_70px] gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    <span>Date</span>
                    <span className="text-right">Action</span>
                  </div>

                  {(draft.departure_dates || []).map((item, index) => (
                    <div key={item.id || index} className="grid grid-cols-[minmax(0,1fr)_70px] items-center gap-3 border-b border-gray-200 px-3 py-3 last:border-b-0 dark:border-gray-700">
                      <span className="text-sm text-gray-700 dark:text-gray-200">{item.date || 'No date'}</span>
                      <div className="flex justify-end">
                        <button type="button" onClick={() => removeArrayItem('departure_dates', index)} className={removeBtnClass}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!variantId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500 dark:border-gray-700">
        No tour variant selected. Go back to the package variants page and click a row to open its details.
      </div>
    );
  }

  const headerTitle = variantInfo?.name || packageInfo?.title || 'Tour details';
  const headerSubtitle = [packageInfo?.tour_code, packageInfo?.destination, variantInfo?.season_name].filter(Boolean).join(' • ') || variantId;

  return (
    <div className="space-y-3 pb-6">
      <Modal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        title={mediaModalContext === 'banner' ? 'Add banner media' : 'Add gallery media'}
        size="lg"
        confirmText="Add item"
        onConfirm={submitMediaModal}
      >
        <div className="space-y-4 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              options={[
                { value: 'image', label: 'Image' },
                { value: 'video', label: 'Video' },
              ]}
              value={{ value: mediaForm.type, label: mediaForm.type === 'video' ? 'Video' : 'Image' }}
              onChange={(selected) => setMediaForm((current) => ({ ...current, type: selected?.value || 'image' }))}
              isSearchable={false}
              menuPlacement="bottom"
              classNamePrefix="react-select"
            />
            <input
              value={mediaForm.alt}
              onChange={(event) => setMediaForm((current) => ({ ...current, alt: event.target.value }))}
              placeholder={mediaModalContext === 'banner' ? 'Alt text' : 'Media title'}
              className={inputClass}
            />
          </div>

          <DragDropUpload
            label={mediaModalContext === 'banner' ? 'Banner media file' : 'Gallery media file'}
            value={mediaForm.url}
            accept="image/*,video/*"
            onChange={(url) => setMediaForm((current) => ({ ...current, url }))}
            helperText="Upload image or video file"
          />
        </div>
      </Modal>

      <Modal
        isOpen={itineraryModalOpen}
        onClose={() => setItineraryModalOpen(false)}
        title="Add itinerary day"
        size="lg"
        confirmText="Add day"
        onConfirm={submitItineraryModal}
      >
        <div className="space-y-4 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              min={1}
              value={itineraryForm.day}
              onChange={(event) => setItineraryForm((current) => ({ ...current, day: Number(event.target.value) || 1 }))}
              placeholder="Day"
              className={inputClass}
            />
            <input
              value={itineraryForm.title}
              onChange={(event) => setItineraryForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Title"
              className={inputClass}
            />
          </div>
          <textarea
            value={itineraryForm.description}
            onChange={(event) => setItineraryForm((current) => ({ ...current, description: event.target.value }))}
            rows={5}
            placeholder="Description"
            className={inputClass}
          />
        </div>
      </Modal>

      <Modal
        isOpen={routeModalOpen}
        onClose={() => setRouteModalOpen(false)}
        title="Add route segment"
        size="md"
        confirmText="Add segment"
        onConfirm={submitRouteModal}
      >
        <div className="space-y-4 p-4">
          <input
            value={routeForm.city}
            onChange={(event) => setRouteForm((current) => ({ ...current, city: event.target.value }))}
            placeholder="City name"
            className={inputClass}
          />
          <input
            type="number"
            min={0}
            value={routeForm.nights}
            onChange={(event) => setRouteForm((current) => ({ ...current, nights: Number(event.target.value) || 1 }))}
            placeholder="Nights"
            className={inputClass}
          />
        </div>
      </Modal>

      <Modal
        isOpen={extrasModalOpen}
        onClose={() => setExtrasModalOpen(false)}
        title={extrasModalType === 'inclusion' ? 'Add inclusion' : extrasModalType === 'exclusion' ? 'Add exclusion' : 'Add departure date'}
        size="md"
        confirmText={extrasModalType === 'departure_date' ? 'Add date' : 'Add item'}
        onConfirm={submitExtrasModal}
      >
        <div className="space-y-4 p-4">
          {extrasModalType === 'departure_date' ? (
            <input
              type="date"
              value={extrasForm.date}
              onChange={(event) => setExtrasForm((current) => ({ ...current, date: event.target.value }))}
              className={inputClass}
            />
          ) : (
            <input
              value={extrasForm.value}
              onChange={(event) => setExtrasForm((current) => ({ ...current, value: event.target.value }))}
              placeholder={extrasModalType === 'inclusion' ? 'Enter inclusion' : 'Enter exclusion'}
              className={inputClass}
            />
          )}
        </div>
      </Modal>

      <div className="px-2 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => navigate(packageId ? `/tour-packages/${encodeURIComponent(packageId)}/variants` : '/tour-packages', { state: packageInfo ? { package: packageInfo } : undefined })}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to tour packages</span>
            </button>

            <div>
              <h1 className="mt-1 bg-gradient-to-r from-slate-900 via-violet-700 to-indigo-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-slate-100 dark:via-violet-300 dark:to-indigo-300 md:text-3xl">{headerTitle}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{headerSubtitle}</p>
            </div>
          </div>

          <span
            className={[
              'inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
              notFound ? 'border-slate-300 bg-slate-200 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200' : 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
            ].join(' ')}
          >
            {notFound ? 'Not created yet' : 'Details saved'}
          </span>
        </div>
      </div>

      <div className="space-y-3 mx-4">
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
                  'flex whitespace-nowrap items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
                  activeSection === key
                    ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-500'
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