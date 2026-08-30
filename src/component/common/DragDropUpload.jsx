import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CloudUpload, Loader2, X } from 'lucide-react';
import { uploadFile } from '../../utils/apiCall';

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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {preview && !disabled && (
          <button
            type="button"
            onClick={clearPreview}
            className="inline-flex items-center gap-1 rounded-2xl border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            <X className="h-3.5 w-3.5" />
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

      <div
        onClick={openPicker}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
        className={[
          'relative min-h-[220px] cursor-pointer overflow-hidden rounded-2xl border border-dashed p-5 transition-all duration-200',
          isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40',
          disabled ? 'cursor-not-allowed opacity-60' : '',
        ].join(' ')}
      >
        <div className="flex h-full min-h-[180px] items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shadow-inner shadow-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-400">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <CloudUpload className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {loading ? 'Uploading...' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
          </div>
        </div>
      </div>

      {preview && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
          <img src={preview} alt="Preview" className="h-64 w-full rounded-xl object-cover" />
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-red-500">{error}</p>
      )}
    </div>
  );
};

export default DragDropUpload;
