import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Car,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  UploadCloud,
  X,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import Modal from '../component/common/Modal';
import ConfirmDeleteModal from '../component/common/ConfirmDeleteModal';
import { sanitizeNumericInput } from '../utils/inputValidation';
import SelectField from '../component/common/SelectField';
import Pagination from '../component/common/PaginationComponent';
import ActionMenu from '../component/common/ActionMenu';
import { apiCall, handleApiError, uploadFile } from '../utils/apiCall';
import { useEnums } from '../context/EnumsContext';

const defaultForm = {
  name: '',
  vehicle_image: [],
  vehicle_type: 'ANY',
  registration_number: '',
  capacity: 1,
  price_per_day: '0.00',
  is_active: true,
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const moneyValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

const VehicleManagement = () => {
  const { getEnumOptions } = useEnums();
  const vehicleTypeOptions = getEnumOptions('VehicleType');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteVehicleTarget, setDeleteVehicleTarget] = useState(null);
  const [deletingVehicle, setDeletingVehicle] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [formState, setFormState] = useState(defaultForm);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [newImageAlt, setNewImageAlt] = useState('');

  const loadVehicles = useCallback(
    async (page = currentPage, limit = itemsPerPage) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), page_size: String(limit) });
        const response = await apiCall(`/api/v1/admin/vehicles?${params.toString()}`, 'GET');
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message || payload?.detail || 'Unable to fetch vehicles');
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setVehicles(data);

        const meta = payload?.pagination || {};
        setTotalItems(Number(meta.total_items ?? data.length ?? 0));
      } catch (error) {
        handleApiError(error, 'Unable to fetch vehicles');
      } finally {
        setLoading(false);
      }
    },
    [currentPage, itemsPerPage]
  );

  useEffect(() => {
    loadVehicles(currentPage, itemsPerPage);
  }, [loadVehicles, currentPage, itemsPerPage]);

  const resetForm = () => {
    setFormState(defaultForm);
    setEditingVehicle(null);
    setNewImageAlt('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormState({
      name: vehicle?.name || '',
      vehicle_image: Array.isArray(vehicle?.vehicle_image) ? vehicle.vehicle_image : [],
      vehicle_type: vehicle?.vehicle_type || 'ANY',
      registration_number: vehicle?.registration_number || '',
      capacity: Number(vehicle?.capacity ?? 1),
      price_per_day: vehicle?.price_per_day ?? '0.00',
      is_active: vehicle?.is_active !== false,
    });
    setNewImageAlt('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleFieldChange = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploadLoading(true);
    try {
      const result = await uploadFile(file);
      const url = result?.url || '';
      if (!url) throw new Error('Uploaded file URL not found in response');

      const nextImage = {
        id: `img-${Date.now()}`,
        alt: newImageAlt.trim() || formState.name || file.name || 'Vehicle image',
        url,
        type: 'image',
        display_order: (formState.vehicle_image || []).length + 1,
        additionalProperty: 'anything',
      };

      setFormState((current) => ({
        ...current,
        vehicle_image: [...(current.vehicle_image || []), nextImage],
      }));
      setNewImageAlt('');
      toast.success('Vehicle image uploaded successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload image');
    } finally {
      setImageUploadLoading(false);
      if (event.target) event.target.value = '';
    }
  };

  const removeImage = (index) => {
    setFormState((current) => ({
      ...current,
      vehicle_image: (current.vehicle_image || []).filter((_, idx) => idx !== index).map((item, idx) => ({
        ...item,
        display_order: idx + 1,
      })),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formState.name.trim(),
        vehicle_image: (formState.vehicle_image || []).map((image, index) => ({
          id: image?.id || `img-${index + 1}`,
          alt: image?.alt || formState.name || 'Vehicle image',
          url: image?.url || '',
          type: image?.type || 'image',
          display_order: image?.display_order ?? index + 1,
          additionalProperty: image?.additionalProperty || 'anything',
        })),
        vehicle_type: formState.vehicle_type || 'ANY',
        registration_number: formState.registration_number.trim(),
        capacity: Number(formState.capacity) || 1,
        price_per_day: String(formState.price_per_day ?? '0.00'),
      };

      if (editingVehicle) {
        payload.is_active = Boolean(formState.is_active);
      }

      const endpoint = editingVehicle
        ? `/api/v1/admin/vehicles/${editingVehicle.id}`
        : '/api/v1/admin/vehicles';
      const method = editingVehicle ? 'PATCH' : 'POST';

      const response = await apiCall(endpoint, method, payload);
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to save vehicle');
      }

      toast.success(
        result?.message || (editingVehicle ? 'Vehicle updated successfully' : 'Vehicle created successfully')
      );
      closeModal();
      await loadVehicles(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, editingVehicle ? 'Unable to update vehicle' : 'Unable to create vehicle');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (vehicle) => {
    setDeleteVehicleTarget(vehicle);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteVehicle = async () => {
    if (!deleteVehicleTarget) return;
    setDeletingVehicle(true);
    try {
      const response = await apiCall(`/api/v1/admin/vehicles/${deleteVehicleTarget.id}`, 'DELETE');
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Unable to delete vehicle');
      }

      toast.success(result?.message || 'Vehicle deleted successfully');
      setIsDeleteModalOpen(false);
      setDeleteVehicleTarget(null);
      await loadVehicles(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to delete vehicle');
    } finally {
      setDeletingVehicle(false);
    }
  };

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return vehicles;

    return vehicles.filter((vehicle) => {
      const searchString = [
        vehicle?.name,
        vehicle?.vehicle_type,
        vehicle?.registration_number,
        vehicle?.capacity,
        vehicle?.price_per_day,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchString.includes(term);
    });
  }, [vehicles, searchTerm]);

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';

  const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="space-y-3 pb-6">
      <div className="px-2 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mt-1 bg-gradient-to-r from-slate-900 via-emerald-700 to-teal-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl dark:from-slate-100 dark:via-emerald-300 dark:to-teal-300">
              Vehicles
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage fleet inventory, availability, pricing, and registration details for your travel services.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadVehicles(currentPage, itemsPerPage)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4" />
              Add vehicle
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
              placeholder="Search vehicles..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {totalItems} record{totalItems === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-gray-500 dark:text-gray-300">
            Loading vehicles...
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 dark:text-gray-300">
            <Car className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p>No vehicles found.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Vehicle</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Registration</th>
                    <th className="px-4 py-3 font-semibold">Capacity</th>
                    <th className="px-4 py-3 font-semibold">Price/day</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                            {vehicle?.vehicle_image?.[0]?.url ? (
                              <img
                                src={vehicle.vehicle_image[0].url}
                                alt={vehicle.name || 'Vehicle'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{vehicle.name || 'Unnamed vehicle'}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{vehicle.id || 'No id'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{vehicle.vehicle_type || 'ANY'}</td>
                      <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{vehicle.registration_number || '—'}</td>
                      <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{vehicle.capacity ?? 0}</td>
                      <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{moneyValue(vehicle.price_per_day)}</td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            vehicle.is_active === false
                              ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60'
                              : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60'
                          }`}
                        >
                          {vehicle.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">
                        {formatDate(vehicle.updated_at || vehicle.created_at)}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <ActionMenu
                          actions={[
                            {
                              label: 'Edit vehicle',
                              icon: <Pencil className="h-4 w-4" />,
                              onClick: () => openEditModal(vehicle),
                            },
                            {
                              label: 'Delete vehicle',
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: () => handleDelete(vehicle),
                              className: 'text-rose-600 dark:text-rose-400',
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalItems > 0 && (
          <div className="border-t border-slate-200 bg-white/90 px-3 py-3 dark:border-gray-700 dark:bg-gray-800/90">
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
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingVehicle ? 'Edit vehicle' : 'Add vehicle'}
        icon={Car}
        size="lg"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="vehicle-form"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (editingVehicle ? 'Saving...' : 'Creating...') : editingVehicle ? 'Save changes' : 'Create vehicle'}
            </button>
          </div>
        )}
      >
        <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-5 p-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Vehicle name</label>
              <input
                value={formState.name}
                onChange={(event) => handleFieldChange('name', event.target.value)}
                className={inputClass}
                placeholder="e.g. Toyota Innova"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Registration number</label>
              <input
                value={formState.registration_number}
                onChange={(event) => handleFieldChange('registration_number', event.target.value)}
                className={inputClass}
                placeholder="KA 01 AB 1234"
              />
            </div>
            <div>
              <label className={labelClass}>Vehicle type</label>
              <SelectField
                options={vehicleTypeOptions}
                value={vehicleTypeOptions.find((option) => option.value === formState.vehicle_type) || vehicleTypeOptions[0]}
                onChange={(option) => handleFieldChange('vehicle_type', option?.value || 'ANY')}
                isSearchable={false}
                menuPlacement="auto"
              />
            </div>
            <div>
              <label className={labelClass}>Capacity</label>
              <input
                type="text"
                inputMode="numeric"
                min="1"
                value={formState.capacity}
                onChange={(event) => handleFieldChange('capacity', sanitizeNumericInput(event.target.value))}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Price per day</label>
              <input
                type="text"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={formState.price_per_day}
                onChange={(event) => handleFieldChange('price_per_day', sanitizeNumericInput(event.target.value))}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
          </div>

          {editingVehicle && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Active status</div>
              <button
                type="button"
                onClick={() => handleFieldChange('is_active', !formState.is_active)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  formState.is_active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {formState.is_active ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {formState.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          )}

          <div>
            <label className={labelClass}>Vehicle images</label>
            <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={newImageAlt}
                  onChange={(event) => setNewImageAlt(event.target.value)}
                  className={`${inputClass} flex-1`}
                  placeholder="Image alt text"
                />
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <UploadCloud className="h-4 w-4" />
                  {imageUploadLoading ? 'Uploading...' : 'Upload image'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              {formState.vehicle_image?.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {formState.vehicle_image.map((image, index) => (
                    <div key={`${image?.id || index}-image`} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                      {image?.url ? (
                        <img src={image.url} alt={image.alt || 'Vehicle'} className="h-24 w-full object-cover" />
                      ) : (
                        <div className="flex h-24 items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 p-2">
                        <span className="truncate text-xs text-slate-600 dark:text-slate-300">{image?.alt || 'Vehicle image'}</span>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">No images added yet.</div>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VehicleManagement;
