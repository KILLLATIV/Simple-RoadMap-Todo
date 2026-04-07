'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl flex flex-col gap-6"
          >
            <div>
              <h2 className="text-xl font-bold text-zinc-100 mb-2">{title}</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">{message}</p>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={onConfirm}
                className="px-5 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-sm active:scale-95"
              >
                Удалить
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
