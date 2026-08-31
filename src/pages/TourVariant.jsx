import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Route, Pencil, Trash2, Search, RefreshCw, CalendarDays, ArrowLeft } from 'lucide-react';
import Modal from '../component/common/Modal';
import SelectField from '../component/common/SelectField';
import Pagination from '../component/common/PaginationComponent';
import { apiCall, handleApiError } from '../utils/apiCall';
import { getVariantDetailsPath } from '../utils/tourNavigation';

const availabilityOptions = ['AVAILABLE', 'LOW', 'SOLD_OUT'];
const availabilitySelectOptions = availabilityOptions.map((option) => ({ value: option, label: option }));

const defaultForm = {
  tour_id: '',
  slug: '',
  name: '',
  season_name: '',
  valid_from: '',
  valid_to: '',
  duration_days: 0,
  duration_nights: 0,
  price: 0,
  seats: 0,
  badge: '',
  availability: 'AVAILABLE',
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
  const [formState, setFormState] = useState(defaultForm);

  const loadVariants = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = packageId ? `/api/v1/admin/tour-variants?tour_id=${encodeURIComponent(packageId)}` : '/api/v1/admin/tour-variants';
      const response = await apiCall(endpoint, 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to fetch tour variants');
      }
      const nextVariants = Array.isArray(payload?.data) ? payload.data : [];
      setVariants(nextVariants);
    } catch (error) {
      handleApiError(error, 'Unable to fetch tour variants');
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  const resetForm = () => {
    setFormState(defaultForm);
    setEditingVariant(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (variant) => {
    setEditingVariant(variant);
    setFormState({
      tour_id: variant?.tour_id || '',
      slug: variant?.slug || '',
      name: variant?.name || '',
      season_name: variant?.season_name || '',
      valid_from: variant?.valid_from || '',
      valid_to: variant?.valid_to || '',
      duration_days: variant?.duration_days || 0,
      duration_nights: variant?.duration_nights || 0,
      price: variant?.price || 0,
      seats: variant?.seats || 0,
      badge: variant?.badge || '',
      availability: variant?.availability || 'AVAILABLE',
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
    navigate(getVariantDetailsPath(packageId || packageInfo?.id, variant.id), {
      state: { package: packageInfo, variant },
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        tour_id: formState.tour_id,
        slug: formState.slug,
        name: formState.name,
        season_name: formState.season_name,
        valid_from: formState.valid_from,
        valid_to: formState.valid_to,
        duration_days: Number(formState.duration_days),
        duration_nights: Number(formState.duration_nights),
        price: Number(formState.price),
        seats: Number(formState.seats),
        badge: formState.badge,
        availability: formState.availability,
        is_default: formState.is_default,
        is_active: formState.is_active,
      };

      const endpoint = editingVariant ? `/api/v1/admin/tour-variants/${editingVariant.id}` : '/api/v1/admin/tour-variants';
      const method = editingVariant ? 'PATCH' : 'POST';
      const response = await apiCall(endpoint, method, payload);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to save tour variant');
      }

      toast.success(editingVariant ? 'Tour variant updated' : 'Tour variant created');
      setIsModalOpen(false);
      resetForm();
      await loadVariants();
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
      toast.success('Tour variant deleted');
      await loadVariants();
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

  const totalPages = Math.max(1, Math.ceil(filteredVariants.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedVariants = filteredVariants.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className=" space-y-3 pb-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            {packageInfo && (
              <button
                type="button"
                onClick={() => navigate('/tour-packages')}
                className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-100 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to packages
              </button>
            )}
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Inventory</p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              {packageInfo ? `${packageInfo.title} variants` : 'Tour Variants'}
            </h1>
            {packageInfo && (
              <p className="mt-1 text-sm text-cyan-100">{packageInfo.destination || packageInfo.tour_code || packageId}</p>
            )}
          </div>

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

          <button
            type="button"
            onClick={loadVariants}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Price</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Availability</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedVariants.map((variant) => (
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
                          <div className="font-semibold text-gray-900 dark:text-white">{variant.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{variant.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{variant.season_name || 'N/A'}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-800 dark:text-gray-100">₹{Number(variant.price || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-4">
                      <span className={[
                        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                        variant.availability === 'SOLD_OUT'
                          ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                          : variant.availability === 'LOW'
                            ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300',
                      ].join(' ')}>
                        {variant.availability || 'AVAILABLE'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(variant);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 hover:bg-cyan-50 hover:text-cyan-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-cyan-900/20"
                          title="Edit variant"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(variant);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                          title="Delete variant"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredVariants.length > 0 && (
        <Pagination
          currentPage={safePage}
          totalItems={filteredVariants.length}
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
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Tour ID</label>
              <input
                value={formState.tour_id}
                onChange={(event) => handleFieldChange('tour_id', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="UUID of tour package"
                required
              />
            </div>

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
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
              <input
                type="number"
                min="0"
                value={formState.price}
                onChange={(event) => handleFieldChange('price', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Seats</label>
              <input
                type="number"
                min="0"
                value={formState.seats}
                onChange={(event) => handleFieldChange('seats', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Badge</label>
              <input
                value={formState.badge}
                onChange={(event) => handleFieldChange('badge', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Best Seller"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Availability</label>
              <SelectField
                options={availabilitySelectOptions}
                value={availabilitySelectOptions.find((option) => option.value === formState.availability) || null}
                onChange={(selected) => handleFieldChange('availability', selected?.value || '')}
                isSearchable={false}
                placeholder="Select availability"
                menuPlacement="auto"
                classNamePrefix="react-select"
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
