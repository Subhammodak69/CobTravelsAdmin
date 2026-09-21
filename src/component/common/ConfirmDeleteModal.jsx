import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from './Modal';

const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete item',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm Delete',
  confirming = false,
  itemLabel = '',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={Trash2}
      size="md"
      footer={(
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-500/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirming ? 'Deleting...' : confirmText}
          </button>
        </div>
      )}
    >
      <div className="space-y-4 p-1">
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-rose-900 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            Permanently delete {itemLabel || 'this item'}?
          </p>
          <p>{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;
