/**
 * Inline Banner Component
 *
 * Renders system messages as dismissible banners at the top or bottom of the viewport.
 * Supports severity-based styling and animations with reduced motion support.
 *
 * @module components/inline-banner
 */

'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback } from 'react';

import { useMessageActions } from '../hooks/use-message-actions';
import type { ISystemMessage, TMessageSeverity } from '../types';
import { ActionButton } from './action-button';
import { MessageRenderer } from './message-renderer';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the InlineBanner component.
 */
export interface IInlineBannerProps {
  /** The message to display */
  message: ISystemMessage;
  /** Position of the banner */
  position: 'top' | 'bottom';
  /** Callback fired when the banner is dismissed */
  onDismiss?: () => void;
  /** Additional CSS class name */
  className?: string;
}

// ============================================================================
// Styles
// ============================================================================

/**
 * Severity-based background and border colors.
 */
const severityStyles: Record<TMessageSeverity, string> = {
  info: 'bg-blue-50 border-blue-500 text-blue-900',
  warning: 'bg-amber-50 border-amber-500 text-amber-900',
  error: 'bg-red-50 border-red-500 text-red-900',
  critical: 'bg-red-100 border-red-700 text-red-900',
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

/**
 * Animation variants for top-positioned banners.
 */
const topVariants = {
  initial: { y: -100, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -100, opacity: 0 },
};

/**
 * Animation variants for bottom-positioned banners.
 */
const bottomVariants = {
  initial: { y: 100, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 100, opacity: 0 },
};

/**
 * Reduced motion variants (instant transitions).
 */
const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ============================================================================
// Component
// ============================================================================

/**
 * Renders a system message as an inline banner.
 *
 * Features:
 * - Top or bottom positioning
 * - Severity-based styling (info, warning, error, critical)
 * - Dismiss button for dismissible messages
 * - Enter/exit animations with Framer Motion
 * - Respects prefers-reduced-motion preference
 *
 * @example
 * ```tsx
 * <InlineBanner
 *   message={systemMessage}
 *   position="top"
 *   onDismiss={() => console.log('Dismissed')}
 * />
 * ```
 */
export function InlineBanner({ message, position, onDismiss, className = '' }: IInlineBannerProps) {
  const { dismissMessage } = useMessageActions();
  const shouldReduceMotion = useReducedMotion();

  /**
   * Handles dismiss button click.
   */
  const handleDismiss = useCallback(() => {
    dismissMessage(message.id, message.version);
    onDismiss?.();
  }, [dismissMessage, message.id, message.version, onDismiss]);

  // Select animation variants based on position and motion preference
  const variants = shouldReduceMotion
    ? reducedMotionVariants
    : position === 'top'
      ? topVariants
      : bottomVariants;

  // Position classes
  const positionClasses = position === 'top' ? 'top-0' : 'bottom-0';

  return (
    <motion.div
      layout
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={
        shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }
      }
      className={`
        fixed left-0 right-0 z-50 ${positionClasses}
        ${className}
      `}
      role="alert"
      aria-live={
        message.severity === 'critical' || message.severity === 'error' ? 'assertive' : 'polite'
      }
    >
      <div
        className={`
          mx-auto max-w-7xl px-4 py-3
          border-l-4 shadow-lg
          ${severityStyles[message.severity]}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Severity Icon */}
          <div className={`flex-shrink-0 ${iconColors[message.severity]}`}>
            <SeverityIcon severity={message.severity} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            {message.title && <h3 className="font-semibold text-sm mb-1">{message.title}</h3>}

            {/* Message Content */}
            <div className="text-sm">
              <MessageRenderer content={message.content} contentType={message.contentType} />
            </div>

            {/* Actions */}
            {message.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {message.actions.map((action) => (
                  <ActionButton key={action.id} action={action} message={message} size="sm" />
                ))}
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          {message.dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className={`
                flex-shrink-0 p-1 rounded-md
                hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${
                  message.severity === 'critical' || message.severity === 'error'
                    ? 'focus:ring-red-500'
                    : message.severity === 'warning'
                      ? 'focus:ring-amber-500'
                      : 'focus:ring-blue-500'
                }
                transition-colors
              `}
              aria-label="Dismiss message"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Inline Banner List Component
// ============================================================================

/**
 * Props for the InlineBannerList component.
 */
export interface IInlineBannerListProps {
  /** Messages to display */
  messages: ISystemMessage[];
  /** Position of the banners */
  position: 'top' | 'bottom';
  /** Additional CSS class name */
  className?: string;
}

/**
 * Renders a list of inline banners with staggered animations.
 */
export function InlineBannerList({ messages, position, className = '' }: IInlineBannerListProps) {
  return (
    <div
      className={`fixed ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 z-50 ${className}`}
    >
      <AnimatePresence mode="sync">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            style={{
              [position === 'top' ? 'marginTop' : 'marginBottom']: index > 0 ? '0.5rem' : 0,
            }}
          >
            <InlineBanner message={message} position={position} className="relative" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
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
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
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
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
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

export default InlineBanner;
