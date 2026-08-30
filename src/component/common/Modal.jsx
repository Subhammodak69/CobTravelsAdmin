import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import ModalScrollLock from './ModalScrollLock';

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 18 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 14,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
};

const Modal = ({ isOpen, onClose, title, icon: Icon, children, onConfirm, confirmText = 'Confirm', footer, size = '2xl', className = '', contentClassName = 'p-4', closeText = 'Close', hideCloseButton = false }) => {
  const sizeClasses = {
    sm: 'max-w-lg max-h-[70vh]',
    md: 'max-w-xl max-h-[75vh]',
    lg: 'max-w-2xl max-h-[80vh]',
    xl: 'max-w-3xl max-h-[85vh]',
    '2xl': 'max-w-4xl max-h-[90vh]',
    '3xl': 'max-w-5xl max-h-[92vh]',
    full: 'max-w-full max-h-[95vh]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <ModalScrollLock />
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50"
            variants={backdropVariants}
            onClick={onClose}
          />
          <motion.div
            variants={modalVariants}
            className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-950 w-full mx-4 z-10 flex flex-col ${sizeClasses[size] || sizeClasses.md} ${className}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
          >
            {/* Fixed Header */}
            <div className="shrink-0 rounded-2xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              <div className="flex justify-between items-center px-5 py-4 bg-gray-50/80 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700">
                <h3 id="modal-title" className="text-lg font-semibold flex items-center gap-3 text-slate-800 dark:text-gray-100">
                  {Icon && (
                    <span className="flex items-center justify-center h-8 w-8 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
                      <Icon size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </span>
                  )}
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className={`overflow-y-auto flex-1 custom-scrollbar ${contentClassName}`}>
              {children}
            </div>

            {/* Fixed Footer - Always shows Close on right unless hidden */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl">
              <div className="flex items-center gap-3 w-full justify-end">
                {footer || (
                  <>
                    {onConfirm && (
                      <button type="button" onClick={onConfirm} className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all">
                        {confirmText}
                      </button>
                    )}
                    {!hideCloseButton && (
                      <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-2xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-all shrink-0"
                      >
                        {closeText}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
