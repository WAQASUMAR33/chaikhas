'use client';

/**
 * Reusable Modal Component
 * For dialogs and forms
 */

import { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Define size classes
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with enhanced blur effect - more transparent, stronger blur */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-lg transition-opacity duration-300 z-40"
        onClick={onClose}
      ></div>

      {/* Modal Container with animation */}
      <div className="flex min-h-full items-center justify-center p-4 relative z-50">
        <div
          className={`relative bg-white rounded-2xl shadow-2xl ${sizes[size]} w-full transform transition-all duration-300 z-50 scale-100 opacity-100`}
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            animation: 'modalSlideIn 0.3s ease-out'
          }}
        >
          {/* Header with gradient accent */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 rounded-t-2xl">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-[#FF5F15] to-[#FF8C42] rounded-full"></span>
              {title}
            </h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 transition-all duration-200"
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Content with better spacing */}
          <div className="p-6 bg-white text-gray-900 rounded-b-2xl">{children}</div>
        </div>
      </div>
    </div>
  );
}

