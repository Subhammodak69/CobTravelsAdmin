import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Route, Pencil, Trash2, Search, RefreshCw, CalendarDays, ArrowLeft, Eye } from 'lucide-react';
import Modal from '../component/common/Modal';
import Pagination from '../component/common/PaginationComponent';
import ActionMenu from '../component/common/ActionMenu';
import { apiCall, handleApiError } from '../utils/apiCall';
import { getVariantDetailsPath } from '../utils/tourNavigation';

const defaultForm = {
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

const TourVariant = () => {
  const navigate = useNavigate();
  const { packageId } = useParams();
  const location = useLocation();
  const packageInfo = location.state?.package || null;

  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [formState, setFormState] = useState(defaultForm);

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
        // Fallback to query parameter if nested route isn't available
        const fallbackEndpoint = `/api/v1/admin/tour-variants?tour_id=${encodeURIComponent(packageId)}&${queryParams.toString()}`;
        const fallbackResponse = await apiCall(fallbackEndpoint, 'GET');
        if (fallbackResponse.ok) {
          response = fallbackResponse;
        }
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to fetch tour variants');
      }
      const nextVariants = Array.isArray(payload?.data) ? payload.data : [];
      setVariants(nextVariants);
      if (payload?.pagination) {
        setTotalItems(payload.pagination.total_items ?? nextVariants.length);
      } else {
        setTotalItems(nextVariants.length);
      }
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
    setFormState({
      ...defaultForm,
      tour_id: packageId || packageInfo?.id || '',
    });
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

  const handleFieldChange = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

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

      // In API spec, tour_id is required in POST, but omitted in PATCH
      const payload = editingVariant
        ? commonFields
        : {
            ...commonFields,
            tour_id: formState.tour_id || packageId || packageInfo?.id || '',
          };

      const endpoint = editingVariant ? `/api/v1/admin/tour-variants/${editingVariant.id}` : '/api/v1/admin/tour-variants';
      const method = editingVariant ? 'PATCH' : 'POST';
      const response = await apiCall(endpoint, method, payload);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to save tour variant');
      }

      toast.success(result?.message || (editingVariant ? 'Tour variant updated successfully' : 'Tour variant created successfully'));
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
    const confirmed = window.confirm(`Delete ${variant?.name || 'this variant'}?`);
    if (!confirmed) return;

    try {
      const response = await apiCall(`/api/v1/admin/tour-variants/${variant.id}`, 'DELETE');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to delete tour variant');
      }
      toast.success(result?.message || 'Tour variant deleted successfully');
      await loadVariants(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to delete tour variant');
    }
  };

  const filteredVariants = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return variants.filter((item) => {
      if (!term) return true;
      return [item.name, item.slug, item.badge, item.season_name, item.availability]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [variants, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className=" space-y-3 pb-6">
      <div className="px-2 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            {packageInfo && (
              <button
                type="button"
                onClick={() => navigate('/tour-packages')}
                className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
              >
                <ArrowLeft className="h-4 w-4" /> Back to packages
              </button>
            )}
            <h1 className="mt-1 bg-gradient-to-r from-slate-900 via-violet-700 to-indigo-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-slate-100 dark:via-violet-300 dark:to-indigo-300 md:text-3xl">
              {packageInfo ? `${packageInfo.title} variants` : 'Tour Variants'}
            </h1>
            {packageInfo && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{packageInfo.destination || packageInfo.tour_code || packageId}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadVariants}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
            >
              <Plus className="h-4 w-4" />
              Add variant
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 px-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search variants..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300">{filteredVariants.length} total records</div>
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
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Price (List / Selling)</th>
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
                    title="Click to view variant details"
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
                              <span className="inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                                Default
                              </span>
                            )}
                            {variant.badge && (
                              <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                {variant.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{variant.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{variant.season_name || 'N/A'}</td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
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
                      <span className={[
                        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                        variant.is_active === false
                          ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300',
                      ].join(' ')}>
                        {variant.is_active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-end">
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
                              className: 'text-red-600 hover:text-red-700 dark:text-red-400',
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
        )}
      </div>

      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onLimitChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }}
        />
      )}

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
            <button type="button" onClick={() => {
              setIsModalOpen(false);
              resetForm();
            }} className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" form="tour-variant-form" disabled={saving} className="rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60">
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
                onChange={(event) => handleFieldChange('slug', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="variant-slug"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input
                value={formState.name}
                onChange={(event) => handleFieldChange('name', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Variant name"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Season</label>
              <input
                value={formState.season_name}
                onChange={(event) => handleFieldChange('season_name', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Monsoon, Winter..."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Valid from</label>
              <input
                type="date"
                value={formState.valid_from}
                onChange={(event) => handleFieldChange('valid_from', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Valid to</label>
              <input
                type="date"
                value={formState.valid_to}
                onChange={(event) => handleFieldChange('valid_to', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Duration days</label>
              <input
                type="number"
                min="0"
                value={formState.duration_days}
                onChange={(event) => handleFieldChange('duration_days', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Duration nights</label>
              <input
                type="number"
                min="0"
                value={formState.duration_nights}
                onChange={(event) => handleFieldChange('duration_nights', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">List price (₹)</label>
              <input
                type="number"
                min="0"
                value={formState.list_price}
                onChange={(event) => handleFieldChange('list_price', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. 15000"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Selling price (₹)</label>
              <input
                type="number"
                min="0"
                value={formState.selling_price}
                onChange={(event) => handleFieldChange('selling_price', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. 12999"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Badge</label>
              <input
                value={formState.badge}
                onChange={(event) => handleFieldChange('badge', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g. Best Seller"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={formState.is_default}
                  onChange={(event) => handleFieldChange('is_default', event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                Default variant
              </label>

              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={formState.is_active}
                  onChange={(event) => handleFieldChange('is_active', event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                Active
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TourVariant;
