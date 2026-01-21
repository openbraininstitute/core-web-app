/**
 * Global Takeover Component
 *
 * Renders a full-screen overlay that blocks navigation during critical system states.
 * Supports three scopes: full platform, app-only, and website-only.
 *
 * @module components/global-takeover
 */

'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAtomValue, useSetAtom } from 'jotai';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { APP_ROUTES_PREFIX } from '../constants';
import { useNavigationGuard } from '../hooks/use-navigation-guard';
import { dismissMessageAtom } from '../state/atoms';
import {
  globalTakeoverAppAtom,
  globalTakeoverFullAtom,
  globalTakeoverWebsiteAtom,
} from '../state/selectors';
import type { ISystemMessage, TMessageDisplayType, TMessageSeverity } from '../types';
import { ActionButton } from './action-button';
import { MessageRenderer } from './message-renderer';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the GlobalTakeover component.
 */
export interface IGlobalTakeoverProps {
  /** Callback fired when the message is acknowledged */
  onAcknowledge?: (messageId: string) => void;
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
  info: 'bg-blue-50 border-blue-500',
  warning: 'bg-amber-50 border-amber-500',
  error: 'bg-red-50 border-red-500',
  critical: 'bg-red-100 border-red-700',
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

const contentVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the scope description based on display type.
 */
function getScopeDescription(displayType: TMessageDisplayType): string {
  switch (displayType) {
    case 'global-takeover-full':
      return 'The entire platform is currently unavailable.';
    case 'global-takeover-app':
      return 'The application is currently unavailable. You can still access the main website.';
    case 'global-takeover-website':
      return 'The website is currently unavailable. You can still access the application.';
    default:
      return '';
  }
}

/**
 * Checks if the current path is an app route.
 */
function isAppRoute(pathname: string): boolean {
  return pathname.startsWith(APP_ROUTES_PREFIX);
}

// ============================================================================
// Component
// ============================================================================

/**
 * Renders a full-screen overlay that blocks navigation during critical system states.
 *
 * Features:
 * - Full-screen overlay with portal rendering
 * - Three scopes: global-takeover-full, global-takeover-app, global-takeover-website
 * - Determines applicable takeover based on current pathname
 * - Displays scope-specific description
 * - Focus trapping (prevents Escape from closing)
 * - Displays pending navigation notice
 * - Handles non-dismissible messages
 * - Severity-based styling
 *
 * @example
 * ```tsx
 * // In root layout
 * <GlobalTakeover onAcknowledge={(id) => console.log('Acknowledged:', id)} />
 * ```
 */
export function GlobalTakeover({ onAcknowledge, className = '' }: IGlobalTakeoverProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const dismissMessage = useSetAtom(dismissMessageAtom);
  const { pendingNavigation, clearPending } = useNavigationGuard();

  // Get takeover messages from state
  const fullTakeover = useAtomValue(globalTakeoverFullAtom);
  const appTakeover = useAtomValue(globalTakeoverAppAtom);
  const websiteTakeover = useAtomValue(globalTakeoverWebsiteAtom);

  // Refs for focus management
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Determine which takeover applies to current route
  const message: ISystemMessage | null = (() => {
    if (fullTakeover) return fullTakeover;
    if (isAppRoute(pathname) && appTakeover) return appTakeover;
    if (!isAppRoute(pathname) && websiteTakeover) return websiteTakeover;
    return null;
  })();

  /**
   * Store previously focused element when takeover appears.
   */
  useEffect(() => {
    if (message) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [message]);

  /**
   * Restore focus when takeover is dismissed.
   */
  useEffect(() => {
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  /**
   * Focus trap - keep focus within the takeover.
   */
  useEffect(() => {
    if (!message || !containerRef.current) return;

    const container = containerRef.current;

    // Get focusable elements
    const getFocusableElements = () => {
      return container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    };

    // Focus the first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    /**
     * Handle keyboard events.
     */
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Escape from closing (must acknowledge)
      if (e.key === 'Escape') {
        e.preventDefault();
        return;
      }

      // Tab trap
      if (e.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [message]);

  /**
   * Prevent body scroll when takeover is active.
   */
  useEffect(() => {
    if (message) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [message]);

  /**
   * Handles acknowledge action.
   */
  const handleAcknowledge = useCallback(() => {
    if (!message) return;

    if (message.dismissible) {
      dismissMessage(message.id, message.version);
    }
    onAcknowledge?.(message.id);

    // Clear pending navigation (it will be executed by useNavigationGuard)
    clearPending();
  }, [message, dismissMessage, onAcknowledge, clearPending]);

  // Don't render on server or if no message
  if (typeof document === 'undefined' || !message) return null;

  const scopeDescription = getScopeDescription(message.displayType);

  const content = (
    <AnimatePresence>
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={shouldReduceMotion ? reducedMotionVariants : backdropVariants}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
        className={`fixed inset-0 z-99999 flex items-center justify-center ${className}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="takeover-title"
        aria-describedby="takeover-content"
      >
        {/* Backdrop - blocks all interaction */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />

        {/* Content container */}
        <motion.div
          ref={containerRef}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={shouldReduceMotion ? reducedMotionVariants : contentVariants}
          transition={
            shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }
          }
          className={`
            relative z-10 w-full max-w-2xl mx-4 p-8 rounded-2xl shadow-2xl
            border-l-4 ${severityStyles[message.severity]}
          `}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`shrink-0 ${iconColors[message.severity]}`}>
              <SeverityIcon severity={message.severity} size="large" />
            </div>
            <div>
              <h1 id="takeover-title" className="text-2xl font-bold text-gray-900">
                {message.title}
              </h1>
              <p className="text-sm text-gray-500">{scopeDescription}</p>
            </div>
          </div>

          {/* Message content */}
          <div id="takeover-content" className="prose prose-sm max-w-none mb-6 text-gray-700">
            <MessageRenderer content={message.content} contentType={message.contentType} />
          </div>

          {/* Pending navigation notice */}
          {pendingNavigation && (
            <div className="mb-6 p-3 bg-white/50 rounded-lg text-sm">
              <span className="text-gray-500">Your navigation to </span>
              <code className="text-gray-700 bg-gray-200 px-1 rounded">{pendingNavigation}</code>
              <span className="text-gray-500">
                {' '}
                is pending. It will continue after you acknowledge this message.
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-end">
            {message.actions.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                message={message}
                onComplete={action.type === 'dismiss' ? handleAcknowledge : undefined}
              />
            ))}

            {/* Default acknowledge button if no dismiss action and message is dismissible */}
            {message.dismissible && !message.actions.some((a) => a.type === 'dismiss') && (
              <button
                type="button"
                onClick={handleAcknowledge}
                className="px-6 py-2 bg-primary-8 text-white rounded-lg font-medium hover:bg-primary-9 focus:outline-none focus:ring-2 focus:ring-primary-8 focus:ring-offset-2 transition-colors"
              >
                I Understand
              </button>
            )}
          </div>

          {/* Non-dismissible notice */}
          {!message.dismissible && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              This message cannot be dismissed. It will be removed when the system status changes.
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

// ============================================================================
// Icons
// ============================================================================

/**
 * Severity icon component with size variants.
 */
function SeverityIcon({
  severity,
  size = 'medium',
}: {
  severity: TMessageSeverity;
  size?: 'small' | 'medium' | 'large';
}) {
  const sizeClasses = {
    small: 'h-5 w-5',
    medium: 'h-6 w-6',
    large: 'h-8 w-8',
  };

  const className = sizeClasses[size];

  switch (severity) {
    case 'info':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
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
        <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
}

// ============================================================================
// Exports
// ============================================================================

export default GlobalTakeover;
