import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Bed,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  X,
  LayoutGrid,
  List,
  MapPin,
} from 'lucide-react';
import Modal from '../component/common/Modal';
import SelectField from '../component/common/SelectField';
import ActionMenu from '../component/common/ActionMenu';
import MediaPreviewModal from '../component/common/MediaPreviewModal';
import DragDropUpload from '../component/common/DragDropUpload';
import Pagination from '../component/common/PaginationComponent';
import { apiCall, handleApiError } from '../utils/apiCall';

const ROOM_TYPES = [
  { value: 'SINGLE', label: 'Single Room' },
  { value: 'DOUBLE', label: 'Double Room' },
  { value: 'TWIN', label: 'Twin Room' },
  { value: 'TRIPLE', label: 'Triple Room' },
  { value: 'DELUXE', label: 'Deluxe Room' },
  { value: 'SUPER_DELUXE', label: 'Super Deluxe Room' },
  { value: 'SUITE', label: 'Suite' },
  { value: 'EXECUTIVE_SUITE', label: 'Executive Suite' },
  { value: 'FAMILY', label: 'Family Room' },
  { value: 'PRESIDENTIAL', label: 'Presidential Suite' },
  { value: 'STUDIO', label: 'Studio Room' },
  { value: 'VILLA', label: 'Villa' },
];

const roomTypeBadgeColors = {
  SINGLE: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/40',
  DOUBLE: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-900/40',
  TWIN: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-900/40',
  TRIPLE: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-900/40',
  DELUXE: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-900/40',
  SUPER_DELUXE: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/20 dark:text-fuchsia-300 dark:border-fuchsia-900/40',
  SUITE: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/40',
  EXECUTIVE_SUITE: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-900/40',
  FAMILY: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40',
  PRESIDENTIAL: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-900/40',
  STUDIO: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-900/40',
  VILLA: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
};

const defaultRoomForm = {
  room_number: '',
  room_type: 'SINGLE',
  capacity: 1,
  price_per_night: 0,
  description: '',
  room_image: [],
  is_active: true,
};

const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num)) return val || '0';
  return num.toLocaleString('en-IN');
};

const RoomManagement = () => {
  const navigate = useNavigate();
  const { hotelId: paramHotelId } = useParams();
  const location = useLocation();
  const initialHotel = location.state?.hotel || null;

  // Selected Hotel state
  const [currentHotelId, setCurrentHotelId] = useState(paramHotelId || initialHotel?.id || '');
  const [hotelDetails, setHotelDetails] = useState(initialHotel);
  const [allHotels, setAllHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(false);

  // Rooms list state
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formState, setFormState] = useState(defaultRoomForm);

  // Fetch all hotels for switching/lookup
  const fetchAllHotels = useCallback(async () => {
    setLoadingHotels(true);
    try {
      const res = await apiCall('/api/v1/admin/hotels?page=1&page_size=100', 'GET');
      const payload = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(payload?.data)) {
        setAllHotels(payload.data);
        // If currentHotelId is set, find hotel details
        if (currentHotelId) {
          const found = payload.data.find((h) => h.id === currentHotelId);
          if (found) setHotelDetails(found);
        } else if (payload.data.length > 0 && !currentHotelId) {
          // Default to first hotel if none provided
          setCurrentHotelId(payload.data[0].id);
          setHotelDetails(payload.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoadingHotels(false);
    }
  }, [currentHotelId]);

  useEffect(() => {
    fetchAllHotels();
  }, [fetchAllHotels]);

  // If paramHotelId changed
  useEffect(() => {
    if (paramHotelId) {
      setCurrentHotelId(paramHotelId);
    }
  }, [paramHotelId]);

  // Load rooms for current hotel
  const loadRooms = useCallback(
    async (page = currentPage, limit = itemsPerPage) => {
      if (!currentHotelId) return;
      setLoadingRooms(true);
      try {
        const queryParams = new URLSearchParams({ page, page_size: limit });
        const response = await apiCall(
          `/api/v1/admin/hotels/${encodeURIComponent(currentHotelId)}/rooms?${queryParams.toString()}`,
          'GET'
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || payload?.detail || 'Unable to fetch rooms');
        }
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setRooms(data);
        setTotalItems(payload?.pagination?.total_items ?? data.length);
      } catch (error) {
        handleApiError(error, 'Unable to fetch rooms');
      } finally {
        setLoadingRooms(false);
      }
    },
    [currentHotelId, currentPage, itemsPerPage]
  );

  useEffect(() => {
    loadRooms(currentPage, itemsPerPage);
  }, [loadRooms, currentPage, itemsPerPage]);

  // Hotel selector change handler
  const handleHotelSelect = (selectedOption) => {
    if (!selectedOption) return;
    const nextId = selectedOption.value;
    setCurrentHotelId(nextId);
    const found = allHotels.find((h) => h.id === nextId);
    if (found) setHotelDetails(found);
    setCurrentPage(1);
    navigate(`/hotels/${nextId}/rooms`, { state: { hotel: found } });
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingRoom(null);
    setFormState(defaultRoomForm);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (room) => {
    setEditingRoom(room);
    setFormState({
      room_number: room.room_number || '',
      room_type: room.room_type || 'SINGLE',
      capacity: Number(room.capacity) || 1,
      price_per_night: Number(room.price_per_night) || 0,
      description: room.description || '',
      room_image: Array.isArray(room.room_image)
        ? room.room_image.map((img, idx) => ({
            id: img.id || '',
            alt: img.alt || '',
            url: typeof img === 'string' ? img : img.url || '',
            type: img.type || 'image',
            display_order: img.display_order ?? idx + 1,
          }))
        : [],
      is_active: room.is_active !== false,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    setFormState(defaultRoomForm);
  };

  // Image upload handling for Room
  const handleImageUpload = (uploadedUrl) => {
    if (!uploadedUrl) return;
    const isVideo = uploadedUrl.match(/\.(mp4|webm|mov|ogg)$/i) || uploadedUrl.includes('video');
    setFormState((prev) => ({
      ...prev,
      room_image: [
        ...prev.room_image,
        {
          id: '',
          alt: '',
          url: uploadedUrl,
          type: isVideo ? 'video' : 'image',
          display_order: prev.room_image.length + 1,
        },
      ],
    }));
    toast.success('Photo added to room gallery');
  };

  const updateImageItem = (index, field, value) => {
    setFormState((prev) => ({
      ...prev,
      room_image: prev.room_image.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeImageItem = (index) => {
    setFormState((prev) => ({
      ...prev,
      room_image: prev.room_image.filter((_, i) => i !== index),
    }));
  };

  // Save Room (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.room_number.trim()) {
      toast.error('Room number is required.');
      return;
    }
    if (!currentHotelId) {
      toast.error('No hotel selected.');
      return;
    }

    setSaving(true);
    try {
      const imagePayload = formState.room_image
        .filter((img) => img.url)
        .map((img, idx) => {
          const item = {
            alt: img.alt || '',
            url: img.url,
            type: img.type || 'image',
            display_order: img.display_order ?? idx + 1,
          };
          if (editingRoom && img.id) item.id = img.id;
          return item;
        });

      const payload = {
        room_number: formState.room_number.trim(),
        room_type: formState.room_type,
        capacity: Math.max(1, Number(formState.capacity) || 1),
        price_per_night: Math.max(0, Number(formState.price_per_night) || 0),
        description: formState.description.trim(),
        room_image: imagePayload,
      };

      let response;
      if (editingRoom) {
        payload.is_active = Boolean(formState.is_active);
        response = await apiCall(
          `/api/v1/admin/hotels/${encodeURIComponent(currentHotelId)}/rooms/${editingRoom.id}`,
          'PATCH',
          payload
        );
      } else {
        response = await apiCall(
          `/api/v1/admin/hotels/${encodeURIComponent(currentHotelId)}/rooms`,
          'POST',
          payload
        );
      }

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resData?.message || resData?.detail || 'Unable to save room');
      }

      toast.success(
        resData?.message || (editingRoom ? 'Room updated successfully' : 'Room created successfully')
      );
      closeModal();
      loadRooms(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to save room');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active/Inactive status
  const handleToggleActive = async (room) => {
    const nextStatus = !room.is_active;
    try {
      const response = await apiCall(
        `/api/v1/admin/hotels/${encodeURIComponent(currentHotelId)}/rooms/${room.id}`,
        'PATCH',
        {
          is_active: nextStatus,
        }
      );
      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resData?.message || 'Unable to update status');
      }
      toast.success(resData?.message || `Room ${nextStatus ? 'activated' : 'deactivated'}`);
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, is_active: nextStatus } : r))
      );
    } catch (error) {
      handleApiError(error, 'Unable to update room status');
    }
  };

  // Delete Room
  const handleDelete = async (room) => {
    if (!window.confirm(`Are you sure you want to delete Room "${room.room_number}"?`)) return;
    try {
      const response = await apiCall(
        `/api/v1/admin/hotels/${encodeURIComponent(currentHotelId)}/rooms/${room.id}`,
        'DELETE'
      );
      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resData?.message || 'Unable to delete room');
      }
      toast.success(resData?.message || 'Room deleted successfully');
      loadRooms(currentPage, itemsPerPage);
    } catch (error) {
      handleApiError(error, 'Unable to delete room');
    }
  };

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        searchTerm === '' ||
        String(room.room_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(room.room_type).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(room.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = roomTypeFilter === 'ALL' || room.room_type === roomTypeFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && room.is_active !== false) ||
        (statusFilter === 'INACTIVE' && room.is_active === false);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [rooms, searchTerm, roomTypeFilter, statusFilter]);

  const activeCount = useMemo(() => {
    return rooms.filter((r) => r.is_active !== false).length;
  }, [rooms]);

  return (
    <div className="space-y-4 pb-6">
      {/* ── Header ── */}
      <div className="px-2">
        <button
          type="button"
          onClick={() => navigate('/hotels')}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back to hotels
        </button>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-slate-100 dark:via-indigo-300 dark:to-purple-300 md:text-3xl">
                {hotelDetails?.name || 'Hotel Rooms'}
              </h1>
              {hotelDetails?.category && (
                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                  {hotelDetails.category}
                </span>
              )}
            </div>
            {hotelDetails && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {hotelDetails.address || hotelDetails.destination_name || 'Room inventory & pricing management'}
              </p>
            )}
          </div>

          {/* Hotel selector switcher */}
          {allHotels.length > 1 && (
            <div className="w-full md:w-72">
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Switch hotel:
              </label>
              <SelectField
                options={allHotels.map((h) => ({
                  value: h.id,
                  label: `${h.name} (${h.category || 'Hotel'})`,
                }))}
                value={
                  allHotels.find((h) => h.id === currentHotelId)
                    ? {
                        value: currentHotelId,
                        label: `${hotelDetails?.name || 'Selected Hotel'} (${hotelDetails?.category || 'Hotel'})`,
                      }
                    : null
                }
                onChange={handleHotelSelect}
                isLoading={loadingHotels}
                placeholder="Choose a hotel..."
                isSearchable
                menuPlacement="auto"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Stats & Toolbar ── */}
      <div className="px-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick stats */}
          <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 dark:border-indigo-900/40 dark:bg-indigo-900/10">
            <Bed className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{totalItems}</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400">total rooms</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-900/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{activeCount}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">active</span>
          </div>

          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search room number, type..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {/* Room Type filter dropdown */}
          <div className="w-44">
            <SelectField
              options={[{ value: 'ALL', label: 'All Room Types' }, ...ROOM_TYPES]}
              value={
                roomTypeFilter === 'ALL'
                  ? { value: 'ALL', label: 'All Room Types' }
                  : ROOM_TYPES.find((t) => t.value === roomTypeFilter) || null
              }
              onChange={(opt) => setRoomTypeFilter(opt?.value || 'ALL')}
              isSearchable={false}
              menuPlacement="auto"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1">
            {[
              { value: 'ALL', label: 'All' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatusFilter(s.value)}
                className={[
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                  statusFilter === s.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Right actions: View mode, refresh, add */}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={[
                  'rounded-lg p-1.5 transition',
                  viewMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
                ].join(' ')}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={[
                  'rounded-lg p-1.5 transition',
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
                ].join(' ')}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadRooms(currentPage, itemsPerPage)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Add room
            </button>
          </div>
        </div>
      </div>

      {/* ── Rooms Content ── */}
      <div className="px-2">
        {loadingRooms ? (
          <div className="flex items-center justify-center py-24 text-sm text-gray-500">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin text-indigo-500" />
            Loading rooms...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-20 text-center dark:border-gray-700 dark:bg-gray-800/40">
            <Bed className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
              No rooms found
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {rooms.length === 0
                ? 'No rooms have been added to this hotel yet. Click "Add room" to create one.'
                : 'No rooms match your current search or filters.'}
            </p>
            {rooms.length === 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> Add your first room
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* ── Grid View ── */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRooms.map((room) => {
              const images = Array.isArray(room.room_image) ? room.room_image : [];
              const primaryImg = images[0]?.url || (typeof images[0] === 'string' ? images[0] : '');
              const typeLabel =
                ROOM_TYPES.find((t) => t.value === room.room_type)?.label || room.room_type || 'Single';
              const badgeClass =
                roomTypeBadgeColors[room.room_type] ||
                'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300';

              return (
                <div
                  key={room.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
                >
                  {/* Top media banner */}
                  <div className="relative h-44 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {primaryImg ? (
                      <MediaPreviewModal
                        src={primaryImg}
                        alt={`Room ${room.room_number}`}
                        type={images[0]?.type || 'image'}
                        thumbnailClassName="h-44 w-full object-cover transition duration-300 group-hover:scale-105"
                        className="block h-full w-full"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                        <Bed className="h-10 w-10 mb-1" />
                        <span className="text-xs">No photos uploaded</span>
                      </div>
                    )}

                    {/* Room number pill */}
                    <div className="absolute left-3 top-3 rounded-xl bg-slate-900/80 px-2.5 py-1 text-xs font-bold text-white shadow backdrop-blur-md">
                      Room {room.room_number}
                    </div>

                    {/* Photo count badge */}
                    {images.length > 1 && (
                      <div className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                        {images.length} photos
                      </div>
                    )}

                    {/* Top right ActionMenu */}
                    <div
                      className="absolute right-2 top-2 rounded-xl bg-white/90 p-0.5 shadow-sm backdrop-blur-sm dark:bg-gray-900/90"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ActionMenu
                        menuId={room.id}
                        actions={[
                          {
                            label: 'Edit Room',
                            icon: <Pencil className="h-4 w-4 text-blue-500" />,
                            onClick: () => openEditModal(room),
                          },
                          {
                            label: room.is_active ? 'Deactivate' : 'Activate',
                            icon: room.is_active ? (
                              <XCircle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ),
                            onClick: () => handleToggleActive(room),
                          },
                          {
                            label: 'Delete Room',
                            icon: <Trash2 className="h-4 w-4 text-red-500" />,
                            onClick: () => handleDelete(room),
                            className: 'text-red-600 hover:text-red-700 dark:text-red-400',
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                        {typeLabel}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        <span>{room.capacity} {room.capacity === 1 ? 'Guest' : 'Guests'}</span>
                      </div>
                    </div>

                    {room.description && (
                      <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-300 mb-3">
                        {room.description}
                      </p>
                    )}

                    {/* Footer: Price & Status */}
                    <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                      <div>
                        <span className="text-[11px] text-gray-400 uppercase tracking-wider block">Price / night</span>
                        <div className="flex items-baseline gap-0.5 text-base font-bold text-gray-900 dark:text-white">
                          <span className="text-xs font-semibold text-gray-500">₹</span>
                          <span>{formatCurrency(room.price_per_night)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(room)}
                        className={[
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                          room.is_active !== false
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                            : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300',
                        ].join(' ')}
                        title="Click to toggle status"
                      >
                        {room.is_active !== false ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> Inactive
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Table View ── */
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/70">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Room</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Type</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Capacity</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Price / Night</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Photos</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRooms.map((room) => {
                    const images = Array.isArray(room.room_image) ? room.room_image : [];
                    const primaryImg = images[0]?.url || (typeof images[0] === 'string' ? images[0] : '');
                    const typeLabel =
                      ROOM_TYPES.find((t) => t.value === room.room_type)?.label || room.room_type || 'Single';
                    const badgeClass =
                      roomTypeBadgeColors[room.room_type] ||
                      'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300';

                    return (
                      <tr key={room.id} className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        {/* Room info */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {primaryImg ? (
                              <MediaPreviewModal
                                src={primaryImg}
                                alt={`Room ${room.room_number}`}
                                type={images[0]?.type || 'image'}
                                thumbnailClassName="h-11 w-14 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                                className="block shrink-0"
                              />
                            ) : (
                              <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
                                <Bed className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                Room {room.room_number}
                              </span>
                              {room.description && (
                                <p className="line-clamp-1 max-w-xs text-xs text-gray-400">
                                  {room.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Room type */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                            {typeLabel}
                          </span>
                        </td>

                        {/* Capacity */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{room.capacity} {room.capacity === 1 ? 'Guest' : 'Guests'}</span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            ₹ {formatCurrency(room.price_per_night)}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">/ night</span>
                        </td>

                        {/* Photos count */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                          {images.length} {images.length === 1 ? 'photo' : 'photos'}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(room)}
                            className={[
                              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition',
                              room.is_active !== false
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                                : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300',
                            ].join(' ')}
                          >
                            {room.is_active !== false ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" /> Inactive
                              </>
                            )}
                          </button>
                        </td>

                        {/* Action menu */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <ActionMenu
                            menuId={room.id}
                            actions={[
                              {
                                label: 'Edit Room',
                                icon: <Pencil className="h-4 w-4 text-blue-500" />,
                                onClick: () => openEditModal(room),
                              },
                              {
                                label: room.is_active ? 'Deactivate' : 'Activate',
                                icon: room.is_active ? (
                                  <XCircle className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ),
                                onClick: () => handleToggleActive(room),
                              },
                              {
                                label: 'Delete Room',
                                icon: <Trash2 className="h-4 w-4 text-red-500" />,
                                onClick: () => handleDelete(room),
                                className: 'text-red-600 hover:text-red-700 dark:text-red-400',
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalItems > 0 && (
        <div className="px-2">
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

      {/* ── Add / Edit Room Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRoom ? `Edit Room ${formState.room_number || ''}` : 'Add new room'}
        icon={Bed}
        size="2xl"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="room-form"
              disabled={saving}
              className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingRoom ? 'Save changes' : 'Create room'}
            </button>
          </div>
        )}
      >
        <form id="room-form" onSubmit={handleSubmit} className="space-y-5 p-1">
          {/* Row 1: Room Number & Room Type */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Room Number <span className="text-red-500">*</span>
              </label>
              <input
                value={formState.room_number}
                onChange={(e) => setFormState((p) => ({ ...p, room_number: e.target.value }))}
                placeholder="e.g. 101, 204B, Villa-1"
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Room Type <span className="text-red-500">*</span>
              </label>
              <SelectField
                options={ROOM_TYPES}
                value={ROOM_TYPES.find((t) => t.value === formState.room_type) || null}
                onChange={(opt) => setFormState((p) => ({ ...p, room_type: opt?.value || 'SINGLE' }))}
                isSearchable={false}
                menuPlacement="bottom"
              />
            </div>
          </div>

          {/* Row 2: Capacity & Price Per Night */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Guest Capacity <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  min={1}
                  value={formState.capacity}
                  onChange={(e) => setFormState((p) => ({ ...p, capacity: Number(e.target.value) || 1 }))}
                  placeholder="Number of guests"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price per night (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  value={formState.price_per_night}
                  onChange={(e) => setFormState((p) => ({ ...p, price_per_night: Number(e.target.value) || 0 }))}
                  placeholder="0"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-8 pr-3 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={formState.description}
              onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))}
              placeholder="Features, bed size, amenities, balcony view, etc..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {/* Room Gallery Photos Upload using DragDropUpload (NO TEXT INPUT FIELD) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Room Photos & Gallery
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Drag and drop images to upload photos of this room.
                </p>
              </div>
              <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {formState.room_image.length} {formState.room_image.length === 1 ? 'photo' : 'photos'}
              </span>
            </div>

            {/* Drag & Drop Upload Component */}
            <DragDropUpload
              label="Upload room image"
              value=""
              accept="image/*,video/*"
              helperText="Drag & drop JPG, PNG, WEBP files up to 10MB"
              onChange={handleImageUpload}
            />

            {/* Uploaded Photos Table */}
            {formState.room_image.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-[80px_minmax(0,1fr)_90px_48px] gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <span>Preview</span>
                  <span>Caption / Alt</span>
                  <span>Order</span>
                  <span className="text-right">Action</span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {formState.room_image.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="grid grid-cols-[80px_minmax(0,1fr)_90px_48px] items-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-900"
                    >
                      <MediaPreviewModal
                        src={item.url}
                        alt={item.alt || `Room photo ${index + 1}`}
                        type={item.type || 'image'}
                        thumbnailClassName="h-12 w-16 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                        className="block shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={item.alt || ''}
                          onChange={(e) => updateImageItem(index, 'alt', e.target.value)}
                          placeholder="Photo title / caption (optional)"
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 outline-none focus:border-indigo-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">#</span>
                        <input
                          type="number"
                          min={1}
                          value={item.display_order ?? index + 1}
                          onChange={(e) => updateImageItem(index, 'display_order', Number(e.target.value) || 1)}
                          className="w-14 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none focus:border-indigo-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeImageItem(index)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                          title="Remove photo"
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

          {/* Is Active Toggle Switch */}
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={formState.is_active}
                onChange={(e) => setFormState((p) => ({ ...p, is_active: e.target.checked }))}
              />
              <div
                className={`h-5 w-9 rounded-full transition-colors ${
                  formState.is_active ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              <div
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  formState.is_active ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formState.is_active ? 'Active — room available for booking' : 'Inactive — room unavailable / under maintenance'}
            </span>
          </label>
        </form>
      </Modal>
    </div>
  );
};

export default RoomManagement;
