import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import ModalScrollLock from './ModalScrollLock';

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } },
};

const viewerVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 360, damping: 28, mass: 0.75 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 12,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
};

const MediaViewerModal = ({ isOpen, onClose, children, className = '' }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <ModalScrollLock />
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            variants={backdropVariants}
            onClick={onClose}
          />

          <motion.div
            variants={viewerVariants}
            className={`relative z-10 flex flex-col max-h-[96vh] w-full max-w-[96vw] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 ${className}`}
            style={{ background: '#000' }}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
              aria-label="Close media preview"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex min-h-0 w-full flex-1 items-start justify-center overflow-y-auto" style={{ background: '#000' }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaViewerModal;
