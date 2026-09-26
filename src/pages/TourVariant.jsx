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
} from 'lucide-react';
import Modal from '../component/common/Modal';
import ConfirmDeleteModal from '../component/common/ConfirmDeleteModal';
import CustomDatePicker from '../component/common/CustomDatePicker';
import Pagination from '../component/common/PaginationComponent';
import ActionMenu from '../component/common/ActionMenu';
import { apiCall, handleApiError } from '../utils/apiCall';
import { getVariantDetailsPath } from '../utils/tourNavigation';
import { sanitizeNumericInput } from '../utils/inputValidation';

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

/* ═══════════════════════════════════════════════
   MAIN — TourVariant  (Variants | Reviews hub)
   Reviews lives on its own route:
   /tour-packages/:packageId/reviews  (TourReviews.jsx)
═══════════════════════════════════════════════ */
const TourVariant = () => {
  const navigate = useNavigate();
  const { packageId } = useParams();
  const location = useLocation();
  const packageInfo = location.state?.package || null;

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
  const [isDeleteVariantModalOpen, setIsDeleteVariantModalOpen] = useState(false);
  const [deleteVariantTarget, setDeleteVariantTarget] = useState(null);
  const [deletingVariant, setDeletingVariant] = useState(false);
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
        const fallback = await apiCall(
          `/api/v1/admin/tour-variants?tour_id=${encodeURIComponent(packageId)}&${queryParams.toString()}`,
          'GET'
        );
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

  useEffect(() => {
    loadVariants(currentPage, itemsPerPage);
  }, [loadVariants, currentPage, itemsPerPage]);

  const resetForm = () => {
    setFormState({ ...defaultVariantForm, tour_id: packageId || packageInfo?.id || '' });
    setEditingVariant(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

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

  /* Reviews is a real route now, so the URL changes and survives a refresh */
  const goToReviews = () => {
    if (!packageId) return;
    navigate(`/tour-packages/${packageId}/reviews`, { state: { package: packageInfo } });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const commonFields = {
        slug: formState.slug,
        name: formState.name,
        season_name: formState.season_name,
        valid_from: formState.valid_from || '',
        valid_to: formState.valid_to || '',
        duration_days: Number(formState.duration_days) || 0,
        duration_nights: Number(formState.duration_nights) || 0,
        list_price: Number(formState.list_price) || 0,
        selling_price: Number(formState.selling_price) || 0,
        badge: formState.badge || '',
        is_default: Boolean(formState.is_default),
        is_active: Boolean(formState.is_active),
      };
      const payload = editingVariant
        ? commonFields
        : { ...commonFields, tour_id: formState.tour_id || packageId || packageInfo?.id || '' };
      const endpoint = editingVariant
        ? `/api/v1/admin/tour-variants/${editingVariant.id}`
        : '/api/v1/admin/tour-variants';
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

  const handleDelete = (variant) => {
    setDeleteVariantTarget(variant);
    setIsDeleteVariantModalOpen(true);
  };

  const confirmDeleteVariant = async () => {
    if (!deleteVariantTarget) return;
    setDeletingVariant(true);
    try {
      const response = await apiCall(`/api/v1/admin/tour-variants/${deleteVariantTarget.id}`, 'DELETE');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.detail || 'Unable to delete variant');
      toast.success(result?.message || 'Variant deleted');
      setIsDeleteVariantModalOpen(false);
      setDeleteVariantTarget(null);
      await loadVariants(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to delete variant');
    } finally {
      setDeletingVariant(false);
    }
  };

  const filteredVariants = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return variants.filter(
      (item) =>
        !term ||
        [item.name, item.slug, item.badge, item.season_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term)
    );
  }, [variants, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-4 pb-6">
      <ConfirmDeleteModal
        isOpen={isDeleteVariantModalOpen}
        onClose={() => {
          if (!deletingVariant) {
            setIsDeleteVariantModalOpen(false);
            setDeleteVariantTarget(null);
          }
        }}
        onConfirm={confirmDeleteVariant}
        title="Delete variant"
        itemLabel={deleteVariantTarget?.name || 'this variant'}
        message="This will permanently remove the selected tour variant from the package."
        confirming={deletingVariant}
      />

      {/* ── Page header ── */}
      <div className="px-2">
        <button
          type="button"
          onClick={() => navigate('/tour-packages')}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back to packages
        </button>
        <h1 className="bg-gradient-to-r from-slate-900 via-violet-700 to-indigo-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-slate-100 dark:via-violet-300 dark:to-indigo-300 md:text-3xl">
          {packageInfo ? packageInfo.title : 'Tour Package'}
        </h1>
        {packageInfo && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {packageInfo.destination || packageInfo.tour_code || packageId}
          </p>
        )}
      </div>

      {/* ── Navigation hub tabs (Variants is active here, Reviews is a route) ── */}
      <div className="px-2">
        <div className="flex w-fit gap-1 rounded-2xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            aria-label="Variants"
            title="Variants"
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
          >
            <Route className="h-4 w-4" />
            <span className="hidden sm:inline">Variants</span>
          </button>
          {packageId && (
            <button
              type="button"
              onClick={goToReviews}
              aria-label="Reviews"
              title="Reviews"
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Reviews</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
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
            <button
              type="button"
              onClick={() => loadVariants(currentPage, itemsPerPage)}
              aria-label="Refresh variants"
              title="Refresh variants"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              aria-label="Add variant"
              title="Add variant"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add variant</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Variants table ── */}
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading variants...</div>
        ) : filteredVariants.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">No variants available.</div>
        ) : (
          <div className="overflow-hidden">
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
                    <tr
                      key={variant.id}
                      onClick={() => goToDetails(variant)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300">
                            <Route className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 dark:text-white">{variant.name}</span>
                              {variant.is_default && (
                                <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                                  Default
                                </span>
                              )}
                              {variant.badge && (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                  {variant.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{variant.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {variant.season_name || 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {variant.duration_days ?? 0}D / {variant.duration_nights ?? 0}N
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            ₹{Number(variant.selling_price ?? variant.price ?? 0).toLocaleString('en-IN')}
                          </span>
                          {variant.list_price > (variant.selling_price ?? 0) && (
                            <span className="text-xs text-gray-400 line-through">
                              ₹{Number(variant.list_price).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={[
                            'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                            variant.is_active === false
                              ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300',
                          ].join(' ')}
                        >
                          {variant.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end">
                          <ActionMenu
                            menuId={variant.id}
                            actions={[
                              {
                                label: 'View Details',
                                icon: <Eye className="h-4 w-4 text-cyan-500" />,
                                onClick: () => goToDetails(variant),
                              },
                              {
                                label: 'Edit Variant',
                                icon: <Pencil className="h-4 w-4 text-blue-500" />,
                                onClick: () => openEditModal(variant),
                              },
                              {
                                label: 'Delete Variant',
                                icon: <Trash2 className="h-4 w-4 text-red-500" />,
                                className: 'text-red-600',
                                onClick: () => handleDelete(variant),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalItems > 0 && (
          <div className="border-t border-slate-200 bg-white/90 px-3 py-3 dark:border-gray-700 dark:bg-gray-900/90">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
              onLimitChange={(l) => {
                setItemsPerPage(l);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ── Variant Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingVariant ? 'Edit tour variant' : 'Add tour variant'}
        icon={CalendarDays}
        size="lg"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="tour-variant-form"
              disabled={saving}
              className="rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingVariant ? 'Save changes' : 'Create variant'}
            </button>
          </div>
        )}
      >
        <form id="tour-variant-form" onSubmit={handleSubmit} className="space-y-5 p-1">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
              <input
                value={formState.slug}
                onChange={(e) => handleFieldChange('slug', e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="variant-slug"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input
                value={formState.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Variant name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Season</label>
              <input
                value={formState.season_name}
                onChange={(e) => handleFieldChange('season_name', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Monsoon, Winter..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Valid from</label>
              <CustomDatePicker
                value={formState.valid_from}
                includeTime={false}
                onChange={(value) => handleFieldChange('valid_from', value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Valid to</label>
              <CustomDatePicker
                value={formState.valid_to}
                includeTime={false}
                onChange={(value) => handleFieldChange('valid_to', value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Duration days</label>
              <input
                type="text"
                inputMode="numeric"
                min="0"
                value={formState.duration_days}
                onChange={(e) => handleFieldChange('duration_days', sanitizeNumericInput(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Duration nights</label>
              <input
                type="text"
                inputMode="numeric"
                min="0"
                value={formState.duration_nights}
                onChange={(e) => handleFieldChange('duration_nights', sanitizeNumericInput(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">List price (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                min="0"
                value={formState.list_price}
                onChange={(e) => handleFieldChange('list_price', sanitizeNumericInput(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. 15000"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Selling price (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                min="0"
                value={formState.selling_price}
                onChange={(e) => handleFieldChange('selling_price', sanitizeNumericInput(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. 12999"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Badge</label>
              <input
                value={formState.badge}
                onChange={(e) => handleFieldChange('badge', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. Best Seller"
              />
            </div>
            <div className="flex flex-wrap gap-4 md:col-span-2">
              {[
                ['is_default', 'Default variant'],
                ['is_active', 'Active'],
              ].map(([field, label]) => (
                <label
                  key={field}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={formState[field]}
                    onChange={(e) => handleFieldChange(field, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
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