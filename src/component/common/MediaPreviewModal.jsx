import React, { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import MediaViewerModal from './MediaViewerModal';

const isVideoUrl = (value = '') => {
  if (!value) return false;
  const lowerValue = String(value).toLowerCase();
  return (
    lowerValue.includes('.mp4') ||
    lowerValue.includes('.mov') ||
    lowerValue.includes('.webm') ||
    lowerValue.includes('.ogg') ||
    lowerValue.includes('video/upload') ||
    lowerValue.includes('video')
  );
};

const MediaPreviewModal = ({
  src,
  alt = 'Media preview',
  type,
  title,
  className = '',
  thumbnailClassName = '',
  children,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  const resolvedType = useMemo(() => {
    if (type) return type;
    return isVideoUrl(src) ? 'video' : 'image';
  }, [src, type]);

  const previewContent = children || (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {resolvedType === 'video' ? (
        <video src={src} className={thumbnailClassName || 'h-20 w-32 rounded-md object-cover bg-slate-100'} controls preload="metadata" />
      ) : (
        <img src={src} alt={alt} className={thumbnailClassName || 'h-20 w-32 rounded-md object-cover'} />
      )}
      {resolvedType === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow-md backdrop-blur-sm">
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </div>
        </div>
      )}
    </div>
  );

  if (!src || disabled) {
    return <>{previewContent}</>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative inline-flex items-center justify-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${className}`}
      >
        {previewContent}
      </button>

      <MediaViewerModal isOpen={open} onClose={() => setOpen(false)}>
        <div className="flex max-h-[96vh] w-full items-center justify-center bg-slate-950 p-2 sm:p-4">
          {resolvedType === 'video' ? (
            <video src={src} controls autoPlay className="max-h-[92vh] max-w-full rounded-xl object-contain" />
          ) : (
            <img src={src} alt={alt} className="max-h-[92vh] w-auto max-w-full rounded-xl object-contain" />
          )}
        </div>
      </MediaViewerModal>
    </>
  );
};

export default MediaPreviewModal;
