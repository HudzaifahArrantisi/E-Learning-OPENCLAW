import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const ToastNotification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-5 right-5 max-w-sm w-full px-4 py-3 rounded-lg shadow-lg
        ${type === 'success' ? 'bg-green-100 border-l-4 border-green-500 text-green-700' :
           type === 'error' ? 'bg-red-100 border-l-4 border-red-500 text-red-700' : ''}`}
    >
      <div className="flex items-start">
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 flex-shrink-0 focus:outline-none text-gray-500 hover:text-gray-700 transition">
          ✕
        </button>
      </div>
    </motion.div>
  );
};

export default ToastNotification;