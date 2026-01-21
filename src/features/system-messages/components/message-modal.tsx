/**
 * Message Modal Component
 *
 * Renders system messages as centered modal dialogs with backdrop.
 * Implements focus trapping, keyboard navigation, and ARIA accessibility.
 *
 * @module components/message-modal
 */

'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useMessageActions } from '../hooks/use-message-actions';
import type { ISystemMessage, TMessageSeverity } from '../types';
import { ActionButton } from './action-button';
import { MessageRenderer } from './message-renderer';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the MessageModal component.
 */
export interface IMessageModalProps {
  /** The message to display */
  message: ISystemMessage;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback fired when the modal should close */
  onClose?: () => void;
  /** Additional CSS class name */
  className?: string;
}

// ============================================================================
// Styles
// ============================================================================

/**
 * Severity-based border and accent colors.
 */
const severityStyles: Record<TMessageSeverity, string> = {
  info: 'border-l-blue-500',
  warning: 'border-l-amber-500',
  error: 'border-l-red-500',
  critical: 'border-l-red-700',
};

/**
 * Severity-based icon colors.
 */
const iconColors: Record<TMessageSeverity, string> = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
  critical: 'text-red-700',
};

// ============================================================================
// Animation Variants
// ============================================================================

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ============================================================================
// Component
// ============================================================================

/**
 * Renders a system message as a modal dialog.
 *
 * Features:
 * - Centered dialog with backdrop overlay
 * - Focus trapping within modal
 * - Keyboard navigation (Tab, Escape)
 * - ARIA attributes for accessibility
 * - Respects prefers-reduced-motion preference
 *
 * @example
 * ```tsx
 * <MessageModal
 *   message={systemMessage}
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 * />
 * ```
 */
export function MessageModal({ message, isOpen, onClose, className = '' }: IMessageModalProps) {
  const { dismissMessage } = useMessageActions();
  const shouldReduceMotion = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /**
   * Handles dismiss/close action.
   */
  const handleClose = useCallback(() => {
    if (message.dismissible) {
      dismissMessage(message.id, message.version);
    }
    onClose?.();
  }, [dismissMessage, message.id, message.version, message.dismissible, onClose]);

  /**
   * Store previously focused element when modal opens.
   */
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  /**
   * Restore focus when modal closes.
   */
  useEffect(() => {
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  /**
   * Focus trap and keyboard handling.
   */
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;

    // Get all focusable elements
    const getFocusableElements = () => {
      return modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    /**
     * Handle keyboard events for focus trap and escape.
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close on Escape if dismissible
      if (event.key === 'Escape' && message.dismissible) {
        event.preventDefault();
        handleClose();
        return;
      }

      // Focus trap on Tab
      if (event.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (event.shiftKey) {
          // Shift + Tab: go to last element if on first
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: go to first element if on last
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, message.dismissible, handleClose]);

  /**
   * Prevent body scroll when modal is open.
   */
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Don't render on server
  if (typeof document === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={shouldReduceMotion ? reducedMotionVariants : backdropVariants}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={message.dismissible ? handleClose : undefined}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={shouldReduceMotion ? reducedMotionVariants : modalVariants}
            transition={
              shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }
            }
            className={`
              relative z-10 w-full max-w-lg mx-4
              bg-white rounded-xl shadow-2xl
              border-l-4 ${severityStyles[message.severity]}
              ${className}
            `}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-content"
          >
            {/* Header */}
            <div className="flex items-start gap-3 p-6 pb-4">
              {/* Severity Icon */}
              <div className={`shrink-0 ${iconColors[message.severity]}`}>
                <SeverityIcon severity={message.severity} />
              </div>

              {/* Title */}
              <h2 id="modal-title" className="flex-1 text-lg font-semibold text-gray-900">
                {message.title}
              </h2>

              {/* Close Button */}
              {message.dismissible && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-8 transition-colors"
                  aria-label="Close modal"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div id="modal-content" className="px-6 pb-4 text-gray-600">
              <MessageRenderer content={message.content} contentType={message.contentType} />
            </div>

            {/* Actions */}
            {(message.actions.length > 0 || message.dismissible) && (
              <div className="flex flex-wrap justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
                {message.actions.map((action) => (
                  <ActionButton
                    key={action.id}
                    action={action}
                    message={message}
                    onComplete={action.type === 'dismiss' ? handleClose : undefined}
                  />
                ))}
                {message.dismissible && !message.actions.some((a) => a.type === 'dismiss') && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-8 focus:ring-offset-2 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

// ============================================================================
// Icons
// ============================================================================

/**
 * Severity icon component.
 */
function SeverityIcon({ severity }: { severity: TMessageSeverity }) {
  switch (severity) {
    case 'info':
      return (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'error':
    case 'critical':
      return (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
}

/**
 * Close icon for dismiss button.
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default MessageModal;
