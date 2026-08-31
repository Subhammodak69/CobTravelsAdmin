import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CloudUpload, Loader2, X } from 'lucide-react';
import { uploadFile } from '../../utils/apiCall';
import MediaPreviewModal from './MediaPreviewModal';

const isVideoUrl = (url = '') => {
  if (!url) return false;
  const lowerUrl = String(url).toLowerCase();
  return (
    lowerUrl.includes('.mp4') ||
    lowerUrl.includes('.mov') ||
    lowerUrl.includes('.webm') ||
    lowerUrl.includes('.ogg') ||
    lowerUrl.includes('video/upload') ||
    lowerUrl.includes('video')
  );
};

const DragDropUpload = ({
  label = 'Upload file',
  value = '',
  onChange,
  accept = 'image/*',
  helperText = 'PNG, JPG, WEBP, PDF up to 10MB',
  disabled = false,
}) => {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || '');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPreview(value || '');
  }, [value]);

  const handleUpload = useCallback(async (file) => {
    if (!file || !onChange) return;

    setLoading(true);
    setError('');

    try {
      const uploadResult = await uploadFile(file);
      const uploadUrl = uploadResult?.url || uploadResult?.data?.url || '';

      if (!uploadUrl) {
        throw new Error('Upload response did not include a file URL.');
      }

      setPreview(uploadUrl);
      onChange(uploadUrl, uploadResult);
    } catch (uploadError) {
      setError(uploadError?.message || 'Image upload failed.');
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    handleUpload(file);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const clearPreview = () => {
    setPreview('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
    onChange?.('', null);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {preview && !disabled && (
          <button
            type="button"
            onClick={clearPreview}
            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
          >
            <X className="h-3 w-3" />
            Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={disabled || loading}
      />

      <button
        type="button"
        onClick={openPicker}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        disabled={disabled || loading}
        className={[
          'inline-flex max-w-[22rem] items-center justify-between gap-2 rounded-xl border border-dashed px-3 py-2 text-left transition-all duration-200',
          isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40',
          disabled || loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
          </span>
          <span className="font-medium">{loading ? 'Uploading...' : 'Choose file'}</span>
        </span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">{helperText}</span>
      </button>

      {preview && (
        <div className="w-fit max-w-[12rem] rounded-xl border border-gray-200 bg-white p-1.5 dark:border-gray-700 dark:bg-gray-900/40">
          <MediaPreviewModal
            src={preview}
            alt="Preview"
            type={isVideoUrl(preview) ? 'video' : 'image'}
            thumbnailClassName="h-20 w-32 rounded-md object-cover"
            className="block"
          />
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-red-500">{error}</p>
      )}
    </div>
  );
};

export default DragDropUpload;
