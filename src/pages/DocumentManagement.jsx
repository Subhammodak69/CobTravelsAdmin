import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Plus, Trash2, RefreshCw, FileX, Eye } from 'lucide-react';
import Modal from '../component/common/Modal';
import MediaViewerModal from '../component/common/MediaViewerModal';
import DragDropUpload from '../component/common/DragDropUpload';
import SelectField from '../component/common/SelectField';
import Pagination from '../component/common/PaginationComponent';
import ActionMenu from '../component/common/ActionMenu';
import { apiCall, handleApiError } from '../utils/apiCall';

const documentTypes = ['ID_PROOF', 'ADDRESS_PROOF', 'PASSPORT', 'PAN_CARD', 'BANK_ACCOUNT'];
const documentTypeOptions = documentTypes.map((type) => ({ value: type, label: type }));

const defaultForm = {
  customer_id: '',
  file: '',
  document_type: 'ID_PROOF',
  title: '',
  description: '',
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
};

const getFileType = (url = '', fileName = '') => {
  const lower = (url + fileName).toLowerCase();
  if (lower.includes('.pdf')) return 'pdf';
  if (lower.match(/\.(mp4|mov|webm|ogg)/) || lower.includes('video/upload') || lower.includes('video')) return 'video';
  if (lower.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|avif)/)) return 'image';
  return 'image';
};

const DocumentPreviewContent = ({ doc }) => {
  if (!doc) return null;
  const fileType = getFileType(doc.file_url || '', doc.file_name || '');
  return (
    <div
      style={{ background: '#000' }}
      className="flex min-h-full w-full flex-col"
    >
      {/* dark title strip */}
      <div
        style={{ background: 'rgba(0,0,0,0.7)' }}
        className="flex shrink-0 items-center justify-center px-12 py-2"
      >
        <span className="max-w-md truncate text-center text-xs font-medium text-slate-400">
          {doc.title || doc.file_name || 'Document preview'}
        </span>
      </div>

      {/* media area */}
      <div className="flex flex-1 items-center justify-center p-3">
        {fileType === 'pdf' ? (
          <iframe
            src={doc.file_url}
            title={doc.title || 'PDF preview'}
            style={{ border: 'none', background: '#fff' }}
            className="h-[80vh] w-full max-w-5xl rounded-xl"
          />
        ) : fileType === 'video' ? (
          <video
            src={doc.file_url}
            controls
            autoPlay
            className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-xl"
          />
        ) : (
          <img
            src={doc.file_url}
            alt={doc.title || doc.file_name || 'Document'}
            className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-xl"
          />
        )}
      </div>
    </div>
  );
};

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState(defaultForm);
  const [previewDoc, setPreviewDoc] = useState(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await apiCall('/api/v1/admin/documents', 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to fetch documents');
      }
      setDocuments(Array.isArray(payload?.data) ? payload.data : []);
    } catch (error) {
      handleApiError(error, 'Unable to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFieldChange = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formState.customer_id || !formState.title || !formState.file) {
      toast.error('Customer ID, title and document file are required');
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('customer_id', formState.customer_id);
      formData.append('file', formState.file);
      formData.append('document_type', formState.document_type);
      formData.append('title', formState.title);
      formData.append('description', formState.description || '');

      const response = await apiCall('/api/v1/admin/documents', 'POST', formData, {
        'Content-Type': undefined,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to upload document');
      }

      toast.success('Document uploaded successfully');
      setFormState(defaultForm);
      setIsModalOpen(false);
      await loadDocuments();
    } catch (error) {
      handleApiError(error, 'Unable to upload document');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (document) => {
    const confirmed = window.confirm(`Delete ${document?.file_name || 'this document'}?`);
    if (!confirmed) return;

    try {
      const response = await apiCall(`/api/v1/admin/documents/${document.id}`, 'DELETE');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || 'Unable to delete document');
      }
      toast.success('Document deleted successfully');
      await loadDocuments();
    } catch (error) {
      handleApiError(error, 'Unable to delete document');
    }
  };

  const hasDocuments = useMemo(() => documents.length > 0, [documents.length]);
  const totalPages = Math.max(1, Math.ceil(documents.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDocuments = documents.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className=" space-y-3 pb-6">
      <div className="px-2 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mt-1 bg-gradient-to-r from-slate-900 via-violet-700 to-indigo-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl dark:from-slate-100 dark:via-violet-300 dark:to-indigo-300">Document Management</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage all uploaded traveler and booking documents in one place.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadDocuments}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4" />
              Upload document
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 px-4">
        <div className="flex items-center justify-end gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">{documents.length} total records</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading documents...</div>
        ) : !hasDocuments ? (
          <div className="p-12 text-center text-sm text-gray-500">No documents uploaded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/70">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Document</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Customer</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Type</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Uploaded</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Size</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => doc.file_url && setPreviewDoc(doc)}
                    className={`transition-colors ${doc.file_url ? 'cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{doc.title || doc.file_name || 'Untitled document'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{doc.file_name || 'N/A'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      <div className="font-medium">{doc.customer_name || doc.customer_id || 'N/A'}</div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {doc.document_type || 'N/A'}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">{formatDate(doc.uploaded_at)}</td>
                    <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">{doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'N/A'}</td>

                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <ActionMenu
                          menuId={doc.id}
                          actions={[
                            {
                              label: 'Preview Document',
                              icon: <Eye className="h-4 w-4 text-emerald-500" />,
                              onClick: () => doc.file_url && setPreviewDoc(doc),
                              disabled: !doc.file_url,
                            },
                            {
                              label: 'Delete Document',
                              icon: <Trash2 className="h-4 w-4 text-red-500" />,
                              className: 'text-red-600 hover:text-red-700 dark:text-red-400',
                              onClick: () => handleDelete(doc),
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

      {documents.length > 0 && (
        <Pagination
          currentPage={safePage}
          totalItems={documents.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onLimitChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Document file preview modal — image / video / PDF */}
      <MediaViewerModal isOpen={!!previewDoc} onClose={() => setPreviewDoc(null)}>
        <DocumentPreviewContent doc={previewDoc} />
      </MediaViewerModal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload document"
        icon={FileText}
        size="lg"
        footer={(
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" form="document-form" disabled={saving} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? 'Uploading...' : 'Upload document'}
            </button>
          </div>
        )}
      >
        <form id="document-form" onSubmit={handleSubmit} className="space-y-5 p-1">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Customer ID</label>
              <input
                value={formState.customer_id}
                onChange={(event) => handleFieldChange('customer_id', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Enter customer UUID"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Document type</label>
              <SelectField
                options={documentTypeOptions}
                value={documentTypeOptions.find((option) => option.value === formState.document_type) || null}
                onChange={(selected) => handleFieldChange('document_type', selected?.value || '')}
                isSearchable={false}
                placeholder="Select document type"
                menuPlacement="auto"
                classNamePrefix="react-select"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
              <input
                value={formState.title}
                onChange={(event) => handleFieldChange('title', event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Enter title"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={formState.description}
                onChange={(event) => handleFieldChange('description', event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Optional description"
              />
            </div>

            <div className="md:col-span-2">
              <DragDropUpload
                label="Document file"
                value={formState.file}
                onChange={(url) => handleFieldChange('file', url)}
                accept="application/pdf,image/*"
                helperText="PDF, JPG, PNG, TIFF"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DocumentManagement;
