import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Route,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  CalendarDays,
  ArrowLeft,
  Eye,
  Star,
  MessageSquare,
  User,
  Calendar,
  Image as ImageIcon,
  X,
  UploadCloud,
} from 'lucide-react';
import Modal from '../component/common/Modal';
import Pagination from '../component/common/PaginationComponent';
import ActionMenu from '../component/common/ActionMenu';
import MediaPreviewModal from '../component/common/MediaPreviewModal';
import DragDropUpload from '../component/common/DragDropUpload';
import { apiCall, handleApiError } from '../utils/apiCall';
import { getVariantDetailsPath } from '../utils/tourNavigation';

/* ─── Variant form defaults ─── */
const defaultVariantForm = {
  tour_id: '',
  slug: '',
  name: '',
  season_name: '',
  valid_from: '',
  valid_to: '',
  duration_days: 0,
  duration_nights: 0,
  list_price: 0,
  selling_price: 0,
  badge: '',
  is_default: false,
  is_active: true,
};

/* ─── Review form defaults ─── */
const defaultReviewForm = {
  customer_id: '',
  name: '',
  rating: 5,
  review: '',
  review_gallery: [],
  is_published: true,
};

/* ─── Helpers ─── */
const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
};

const StarRating = ({ rating, max = 5 }) => {
  const r = Math.round(Number(rating) || 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < r ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-600 dark:text-gray-400">{r}/{max}</span>
    </div>
  );
};

const StarPicker = ({ value, onChange }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        className="transition hover:scale-110"
      >
        <Star className={`h-6 w-6 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
      </button>
    ))}
    <span className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{value} / 5</span>
  </div>
);

/* ═══════════════════════════════════════════════
   REVIEWS TAB
═══════════════════════════════════════════════ */
const ReviewsTab = ({ packageId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [formState, setFormState] = useState(defaultReviewForm);

  /* Load reviews */
  const loadReviews = useCallback(async (page = currentPage, limit = itemsPerPage) => {
    if (!packageId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: limit });
      const response = await apiCall(
        `/api/v1/admin/tour-packages/${encodeURIComponent(packageId)}/reviews?${params.toString()}`,
        'GET'
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || 'Unable to fetch reviews');
      const data = Array.isArray(payload?.data) ? payload.data : [];
      setReviews(data);
      setTotalItems(payload?.pagination?.total_items ?? data.length);
    } catch (error) {
      handleApiError(error, 'Unable to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, [packageId, currentPage, itemsPerPage]);

  useEffect(() => {
    loadReviews(currentPage, itemsPerPage);
  }, [loadReviews, currentPage, itemsPerPage]);

  /* Open modals */
  const openCreateModal = () => {
    setEditingReview(null);
    setFormState(defaultReviewForm);
    setIsModalOpen(true);
  };

  const openEditModal = (review) => {
    setEditingReview(review);
    setFormState({
      customer_id: review.customer_id || '',
      name: review.name || '',
      rating: Number(review.rating) || 5,
      review: review.review || '',
      review_gallery: Array.isArray(review.review_gallery)
        ? review.review_gallery.map((g) => ({
            id: g.id || '',
            alt: g.alt || '',
            url: g.url || '',
            type: g.type || 'image',
            display_order: g.display_order ?? 1,
          }))
        : [],
      is_published: review.is_published !== false,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReview(null);
    setFormState(defaultReviewForm);
  };

  /* Gallery helpers */
  const handleGalleryUpload = (uploadedUrl) => {
    if (!uploadedUrl) return;
    const isVideo = uploadedUrl.match(/\.(mp4|webm|mov|ogg)$/i) || uploadedUrl.includes('video');
    setFormState((prev) => ({
      ...prev,
      review_gallery: [
        ...prev.review_gallery,
        {
          id: '',
          alt: '',
          url: uploadedUrl,
          type: isVideo ? 'video' : 'image',
          display_order: prev.review_gallery.length + 1,
        },
      ],
    }));
    toast.success('Media added to gallery');
  };

  const updateGalleryItem = (index, field, value) => {
    setFormState((prev) => ({
      ...prev,
      review_gallery: prev.review_gallery.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeGalleryItem = (index) => {
    setFormState((prev) => ({
      ...prev,
      review_gallery: prev.review_gallery.filter((_, i) => i !== index),
    }));
  };

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const galleryPayload = formState.review_gallery
        .filter((g) => g.url)
        .map((g, idx) => {
          const item = { alt: g.alt, url: g.url, type: g.type || 'image', display_order: g.display_order ?? idx + 1 };
          if (editingReview && g.id) item.id = g.id;
          return item;
        });

      const payload = {
        name: formState.name,
        rating: Number(formState.rating),
        review: formState.review,
        review_gallery: galleryPayload,
        is_published: Boolean(formState.is_published),
      };
      if (formState.customer_id) payload.customer_id = formState.customer_id;

      let response;
      if (editingReview) {
        response = await apiCall(`/api/v1/admin/reviews/${editingReview.id}`, 'PATCH', payload);
      } else {
        response = await apiCall(
          `/api/v1/admin/tour-packages/${encodeURIComponent(packageId)}/reviews`,
          'POST',
          payload
        );
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to save review');

      toast.success(result?.message || (editingReview ? 'Review updated' : 'Review created'));
      closeModal();
      loadReviews(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to save review');
    } finally {
      setSaving(false);
    }
  };

  /* Delete */
  const handleDelete = async (review) => {
    if (!window.confirm(`Delete this review by "${review.name || 'Anonymous'}"?`)) return;
    try {
      const response = await apiCall(`/api/v1/admin/reviews/${review.id}`, 'DELETE');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to delete review');
      toast.success(result?.message || 'Review deleted');
      loadReviews(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to delete review');
    }
  };

  /* Toggle published */
  const handleTogglePublished = async (review) => {
    try {
      const response = await apiCall(`/api/v1/admin/reviews/${review.id}`, 'PATCH', {
        is_published: !review.is_published,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to update review');
      toast.success(review.is_published ? 'Review unpublished' : 'Review published');
      loadReviews(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to update review');
    }
  };

  const avgRating = useMemo(() => {
    if (!reviews.length) return '0.0';
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/40 dark:bg-amber-900/10">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{avgRating}</span>
          <span className="text-xs text-amber-600 dark:text-amber-400">avg rating</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{totalItems}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">total reviews</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadReviews(currentPage, itemsPerPage)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
          >
            <Plus className="h-4 w-4" />
            Add review
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-500">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-800/40">
          <MessageSquare className="mx-auto mb-3 h-9 w-9 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No reviews yet for this package.</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Click "Add review" to create one manually.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* Reviewer info */}
                <div className="flex items-start gap-3">
                  {review.customer_profile_picture ? (
                    <img
                      src={review.customer_profile_picture}
                      alt={review.name || 'Reviewer'}
                      onError={(e) => { e.target.style.display = 'none'; }}
                      className="h-11 w-11 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{review.name || 'Anonymous'}</span>
                      {review.is_verified && (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                          Verified
                        </span>
                      )}
                      <span className={[
                        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                        review.is_published
                          ? 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-300'
                          : 'border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
                      ].join(' ')}>
                        {review.is_published ? 'Published' : 'Unpublished'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <StarRating rating={review.rating} />
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center justify-end">
                  <ActionMenu
                    menuId={review.id}
                    actions={[
                      {
                        label: review.is_published ? 'Unpublish' : 'Publish',
                        icon: <Eye className="h-4 w-4 text-cyan-500" />,
                        onClick: () => handleTogglePublished(review),
                      },
                      {
                        label: 'Edit Review',
                        icon: <Pencil className="h-4 w-4 text-blue-500" />,
                        onClick: () => openEditModal(review),
                      },
                      {
                        label: 'Delete Review',
                        icon: <Trash2 className="h-4 w-4 text-red-500" />,
                        className: 'text-red-600 hover:text-red-700 dark:text-red-400',
                        onClick: () => handleDelete(review),
                      },
                    ]}
                  />
                </div>
              </div>

              {review.review && (
                <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{review.review}</p>
              )}

              {Array.isArray(review.review_gallery) && review.review_gallery.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.review_gallery.map((img, idx) => {
                    const url = typeof img === 'string' ? img : img?.url || '';
                    const alt = typeof img === 'object' ? img?.alt : `Photo ${idx + 1}`;
                    const type = (typeof img === 'object' && img?.type) || 'image';
                    if (!url) return null;
                    return (
                      <MediaPreviewModal
                        key={img?.id || idx}
                        src={url}
                        alt={alt || 'Review gallery media'}
                        type={type}
                        thumbnailClassName="h-16 w-20 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                        className="block shrink-0"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onLimitChange={(limit) => { setItemsPerPage(limit); setCurrentPage(1); }}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingReview ? 'Edit review' : 'Add review'}
        icon={MessageSquare}
        size="xl"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={closeModal}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
              Cancel
            </button>
            <button type="submit" form="review-form" disabled={saving}
              className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
              {saving ? 'Saving...' : editingReview ? 'Save changes' : 'Create review'}
            </button>
          </div>
        )}
      >
        <form id="review-form" onSubmit={handleSubmit} className="space-y-5 p-1">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Reviewer name <span className="text-red-500">*</span></label>
              <input
                value={formState.name}
                onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. Rahul Sharma"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Customer ID <span className="text-xs text-gray-400">(optional)</span></label>
              <input
                value={formState.customer_id}
                onChange={(e) => setFormState((p) => ({ ...p, customer_id: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="UUID of existing customer"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Rating <span className="text-red-500">*</span></label>
            <StarPicker value={formState.rating} onChange={(v) => setFormState((p) => ({ ...p, rating: v }))} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Review text</label>
            <textarea
              value={formState.review}
              onChange={(e) => setFormState((p) => ({ ...p, review: e.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              placeholder="Customer's review of this package..."
            />
          </div>

          {/* Review Gallery Upload - NO TEXT INPUT FIELD TYPE, USES DRAGDROPUPLOAD */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Review gallery photos & videos
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Drag and drop files to upload directly into the review gallery.
                </p>
              </div>
              <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {formState.review_gallery.length} {formState.review_gallery.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Drag & Drop Upload component */}
            <DragDropUpload
              label="Upload gallery image or video"
              value=""
              accept="image/*,video/*"
              helperText="Drag & drop PNG, JPG, WEBP, MP4 files to add"
              onChange={handleGalleryUpload}
            />

            {/* Uploaded Gallery Items Table */}
            {formState.review_gallery.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-[80px_minmax(0,1fr)_90px_48px] gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <span>Type</span>
                  <span>Preview & Caption</span>
                  <span>Order</span>
                  <span className="text-right">Action</span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {formState.review_gallery.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="grid grid-cols-[80px_minmax(0,1fr)_90px_48px] items-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-900"
                    >
                      <span className="inline-flex w-fit items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium capitalize text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {item.type || 'image'}
                      </span>

                      <div className="flex min-w-0 items-center gap-3">
                        <MediaPreviewModal
                          src={item.url}
                          alt={item.alt || 'Gallery media'}
                          type={item.type || 'image'}
                          thumbnailClassName="h-12 w-16 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                          className="block shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <input
                            type="text"
                            value={item.alt || ''}
                            onChange={(e) => updateGalleryItem(index, 'alt', e.target.value)}
                            placeholder="Caption / Alt text (optional)"
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 outline-none focus:border-violet-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">#</span>
                        <input
                          type="number"
                          min="1"
                          value={item.display_order ?? index + 1}
                          onChange={(e) => updateGalleryItem(index, 'display_order', Number(e.target.value) || 1)}
                          className="w-14 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none focus:border-violet-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeGalleryItem(index)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                          title="Remove media"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Published toggle */}
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={formState.is_published}
                onChange={(e) => setFormState((p) => ({ ...p, is_published: e.target.checked }))}
              />
              <div className={`h-5 w-9 rounded-full transition-colors ${formState.is_published ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${formState.is_published ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formState.is_published ? 'Published — visible to customers' : 'Unpublished — hidden from customers'}
            </span>
          </label>
        </form>
      </Modal>
    </>
  );
};

/* ═══════════════════════════════════════════════
   MAIN — TourVariant (tabs: Variants | Reviews)
═══════════════════════════════════════════════ */
const TourVariant = () => {
  const navigate = useNavigate();
  const { packageId } = useParams();
  const location = useLocation();
  const packageInfo = location.state?.package || null;

  const [activeTab, setActiveTab] = useState('variants');

  /* ── Variant state ── */
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [formState, setFormState] = useState(defaultVariantForm);

  const loadVariants = useCallback(async (page = currentPage, limit = itemsPerPage) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ page, page_size: limit });
      let endpoint = `/api/v1/admin/tour-variants?${queryParams.toString()}`;
      if (packageId) {
        endpoint = `/api/v1/admin/tour-packages/${encodeURIComponent(packageId)}/variants?${queryParams.toString()}`;
      }
      let response = await apiCall(endpoint, 'GET');
      if (!response.ok && packageId) {
        const fallback = await apiCall(`/api/v1/admin/tour-variants?tour_id=${encodeURIComponent(packageId)}&${queryParams.toString()}`, 'GET');
        if (fallback.ok) response = fallback;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || 'Unable to fetch tour variants');
      const data = Array.isArray(payload?.data) ? payload.data : [];
      setVariants(data);
      setTotalItems(payload?.pagination?.total_items ?? data.length);
    } catch (error) {
      handleApiError(error, 'Unable to fetch tour variants');
    } finally {
      setLoading(false);
    }
  }, [packageId, currentPage, itemsPerPage]);

  useEffect(() => { loadVariants(currentPage, itemsPerPage); }, [loadVariants, currentPage, itemsPerPage]);

  const resetForm = () => {
    setFormState({ ...defaultVariantForm, tour_id: packageId || packageInfo?.id || '' });
    setEditingVariant(null);
  };

  const openCreateModal = () => { resetForm(); setIsModalOpen(true); };

  const openEditModal = (variant) => {
    setEditingVariant(variant);
    setFormState({
      tour_id: variant?.tour_id || packageId || packageInfo?.id || '',
      slug: variant?.slug || '',
      name: variant?.name || '',
      season_name: variant?.season_name || '',
      valid_from: variant?.valid_from ? variant.valid_from.substring(0, 10) : '',
      valid_to: variant?.valid_to ? variant.valid_to.substring(0, 10) : '',
      duration_days: variant?.duration_days || 0,
      duration_nights: variant?.duration_nights || 0,
      list_price: variant?.list_price ?? variant?.price ?? 0,
      selling_price: variant?.selling_price ?? variant?.price ?? 0,
      badge: variant?.badge || '',
      is_default: Boolean(variant?.is_default),
      is_active: variant?.is_active !== false,
    });
    setIsModalOpen(true);
  };

  const handleFieldChange = (field, value) => setFormState((p) => ({ ...p, [field]: value }));

  const goToDetails = (variant) => {
    if (!variant?.id) return;
    navigate(getVariantDetailsPath(packageId || packageInfo?.id || variant.tour_id, variant.id), {
      state: { package: packageInfo, variant },
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const commonFields = {
        slug: formState.slug, name: formState.name, season_name: formState.season_name,
        valid_from: formState.valid_from || '', valid_to: formState.valid_to || '',
        duration_days: Number(formState.duration_days) || 0,
        duration_nights: Number(formState.duration_nights) || 0,
        list_price: Number(formState.list_price) || 0,
        selling_price: Number(formState.selling_price) || 0,
        badge: formState.badge || '',
        is_default: Boolean(formState.is_default),
        is_active: Boolean(formState.is_active),
      };
      const payload = editingVariant ? commonFields : { ...commonFields, tour_id: formState.tour_id || packageId || packageInfo?.id || '' };
      const endpoint = editingVariant ? `/api/v1/admin/tour-variants/${editingVariant.id}` : '/api/v1/admin/tour-variants';
      const response = await apiCall(endpoint, editingVariant ? 'PATCH' : 'POST', payload);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to save tour variant');
      toast.success(result?.message || (editingVariant ? 'Variant updated' : 'Variant created'));
      setIsModalOpen(false);
      resetForm();
      await loadVariants(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, editingVariant ? 'Unable to update variant' : 'Unable to create variant');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (variant) => {
    if (!window.confirm(`Delete ${variant?.name || 'this variant'}?`)) return;
    try {
      const response = await apiCall(`/api/v1/admin/tour-variants/${variant.id}`, 'DELETE');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to delete variant');
      toast.success(result?.message || 'Variant deleted');
      await loadVariants(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to delete variant');
    }
  };

  const filteredVariants = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return variants.filter((item) => !term || [item.name, item.slug, item.badge, item.season_name].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [variants, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const TABS = [
    { id: 'variants', label: 'Variants', icon: Route },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  return (
    <div className="space-y-4 pb-6">
      {/* ── Page header ── */}
      <div className="px-2">
        {packageInfo && (
          <button
            type="button"
            onClick={() => navigate('/tour-packages')}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" /> Back to packages
          </button>
        )}
        <h1 className="bg-gradient-to-r from-slate-900 via-violet-700 to-indigo-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-slate-100 dark:via-violet-300 dark:to-indigo-300 md:text-3xl">
          {packageInfo ? packageInfo.title : 'Tour Package'}
        </h1>
        {packageInfo && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {packageInfo.destination || packageInfo.tour_code || packageId}
          </p>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="px-2">
        <div className="flex gap-1 rounded-2xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800 w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200',
                  active
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── VARIANTS tab ── */}
      {activeTab === 'variants' && (
        <>
          <div className="px-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search variants..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{filteredVariants.length} records</div>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={loadVariants}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button type="button" onClick={openCreateModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50">
                  <Plus className="h-4 w-4" /> Add variant
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {loading ? (
              <div className="p-12 text-center text-sm text-gray-500">Loading variants...</div>
            ) : filteredVariants.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">No variants available.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/70">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Variant</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Season</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Duration</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Price</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredVariants.map((variant) => (
                      <tr key={variant.id} onClick={() => goToDetails(variant)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300">
                              <Route className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 dark:text-white">{variant.name}</span>
                                {variant.is_default && (
                                  <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">Default</span>
                                )}
                                {variant.badge && (
                                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{variant.badge}</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{variant.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{variant.season_name || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{variant.duration_days ?? 0}D / {variant.duration_nights ?? 0}N</td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">₹{Number(variant.selling_price ?? variant.price ?? 0).toLocaleString('en-IN')}</span>
                            {variant.list_price > (variant.selling_price ?? 0) && (
                              <span className="text-xs text-gray-400 line-through">₹{Number(variant.list_price).toLocaleString('en-IN')}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={['inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                            variant.is_active === false
                              ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300',
                          ].join(' ')}>
                            {variant.is_active === false ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end">
                            <ActionMenu
                              menuId={variant.id}
                              actions={[
                                { label: 'View Details', icon: <Eye className="h-4 w-4 text-cyan-500" />, onClick: () => goToDetails(variant) },
                                { label: 'Edit Variant', icon: <Pencil className="h-4 w-4 text-blue-500" />, onClick: () => openEditModal(variant) },
                                { label: 'Delete Variant', icon: <Trash2 className="h-4 w-4 text-red-500" />, className: 'text-red-600', onClick: () => handleDelete(variant) },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {totalItems > 0 && (
            <Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={itemsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
              onLimitChange={(l) => { setItemsPerPage(l); setCurrentPage(1); }} />
          )}
        </>
      )}

      {/* ── REVIEWS tab ── */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <ReviewsTab packageId={packageId} />
        </div>
      )}

      {/* ── Variant Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingVariant ? 'Edit tour variant' : 'Add tour variant'}
        icon={CalendarDays}
        size="lg"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
              Cancel
            </button>
            <button type="submit" form="tour-variant-form" disabled={saving}
              className="rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
              {saving ? 'Saving...' : editingVariant ? 'Save changes' : 'Create variant'}
            </button>
          </div>
        )}
      >
        <form id="tour-variant-form" onSubmit={handleSubmit} className="space-y-5 p-1">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
              <input value={formState.slug} onChange={(e) => handleFieldChange('slug', e.target.value)} required
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="variant-slug" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input value={formState.name} onChange={(e) => handleFieldChange('name', e.target.value)} required
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Variant name" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Season</label>
              <input value={formState.season_name} onChange={(e) => handleFieldChange('season_name', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Monsoon, Winter..." />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Valid from</label>
              <input type="date" value={formState.valid_from} onChange={(e) => handleFieldChange('valid_from', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Valid to</label>
              <input type="date" value={formState.valid_to} onChange={(e) => handleFieldChange('valid_to', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Duration days</label>
              <input type="number" min="0" value={formState.duration_days} onChange={(e) => handleFieldChange('duration_days', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Duration nights</label>
              <input type="number" min="0" value={formState.duration_nights} onChange={(e) => handleFieldChange('duration_nights', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">List price (₹)</label>
              <input type="number" min="0" value={formState.list_price} onChange={(e) => handleFieldChange('list_price', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. 15000" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Selling price (₹)</label>
              <input type="number" min="0" value={formState.selling_price} onChange={(e) => handleFieldChange('selling_price', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. 12999" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Badge</label>
              <input value={formState.badge} onChange={(e) => handleFieldChange('badge', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. Best Seller" />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-4">
              {[['is_default', 'Default variant'], ['is_active', 'Active']].map(([field, label]) => (
                <label key={field} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <input type="checkbox" checked={formState[field]} onChange={(e) => handleFieldChange(field, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TourVariant;
