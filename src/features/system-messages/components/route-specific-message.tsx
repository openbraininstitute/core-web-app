/**
 * Route Specific Message Component
 *
 * Displays a full-page message for route-specific system messages.
 * Shows the original requested path and provides navigation options.
 *
 * @module components/route-specific-message
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useMessageActions } from '../hooks/use-message-actions';
import type { ISystemMessage, TMessageSeverity } from '../types';
import { ActionButton } from './action-button';
import { MessageRenderer } from './message-renderer';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the RouteSpecificMessage component.
 */
export interface IRouteSpecificMessageProps {
  /** The message to display */
  message: ISystemMessage;
  /** The original path that was requested */
  originalPath: string;
  /** Callback fired when the user navigates away */
  onNavigateAway?: () => void;
  /** Additional CSS class name */
  className?: string;
}

// ============================================================================
// Styles
// ============================================================================

/**
 * Severity-based gradient and border colors.
 */
const severityStyles: Record<TMessageSeverity, string> = {
  info: 'from-blue-50 to-blue-100 border-blue-500',
  warning: 'from-amber-50 to-amber-100 border-amber-500',
  error: 'from-red-50 to-red-100 border-red-500',
  critical: 'from-red-100 to-red-200 border-red-700',
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

const containerVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
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
 * Renders a full-page message for route-specific system messages.
 *
 * Features:
 * - Displays message page for route-specific messages
 * - Shows original requested path to user
 * - Severity-based styling
 * - Back navigation option
 * - Respects prefers-reduced-motion preference
 *
 * @example
 * ```tsx
 * <RouteSpecificMessage
 *   message={systemMessage}
 *   originalPath="/app/virtual-lab/projects"
 *   onNavigateAway={() => console.log('Navigating away')}
 * />
 * ```
 */
export function RouteSpecificMessage({
  message,
  originalPath,
  onNavigateAway,
  className = '',
}: IRouteSpecificMessageProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { dismissMessage } = useMessageActions();

  /**
   * Handles back navigation.
   */
  const handleGoBack = useCallback(() => {
    onNavigateAway?.();
    router.back();
  }, [router, onNavigateAway]);

  /**
   * Handles dismiss action.
   */
  const handleDismiss = useCallback(() => {
    if (message.dismissible) {
      dismissMessage(message.id, message.version);
    }
    onNavigateAway?.();
    router.back();
  }, [message, dismissMessage, router, onNavigateAway]);

  const variants = shouldReduceMotion ? reducedMotionVariants : containerVariants;

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 ${className}`}
    >
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={
          shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }
        }
        className={`
          max-w-2xl w-full mx-4 p-8 rounded-2xl shadow-xl
          bg-linear-to-br ${severityStyles[message.severity]}
          border-l-4
        `}
        role="main"
        aria-labelledby="route-message-title"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`shrink-0 ${iconColors[message.severity]}`}>
            <SeverityIcon severity={message.severity} />
          </div>
          <div>
            <h1 id="route-message-title" className="text-2xl font-bold text-gray-900">
              {message.title}
            </h1>
            <p className="text-sm text-gray-500">This feature is temporarily unavailable</p>
          </div>
        </div>

        {/* Message Content */}
        <div className="prose prose-sm max-w-none mb-6 text-gray-700">
          <MessageRenderer
            content={message.content}
            contentType={message.contentType}
            context={{ originalPath }}
          />
        </div>

        {/* Original Path Display */}
        <div className="mb-6 p-3 bg-white/50 rounded-lg text-sm">
          <span className="text-gray-500">Requested page: </span>
          <code className="text-gray-700 bg-gray-200 px-1 rounded">{originalPath}</code>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {message.actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              message={message}
              onComplete={action.type === 'dismiss' ? handleDismiss : undefined}
            />
          ))}

          {/* Default back button */}
          <button
            type="button"
            onClick={handleGoBack}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-1">
              <BackArrowIcon className="h-4 w-4" />
              Go Back
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

/**
 * Loading skeleton for the RouteSpecificMessage component.
 */
export function RouteSpecificMessageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
      <div className="max-w-2xl w-full mx-4 p-8 rounded-2xl shadow-xl bg-white border-l-4 border-gray-300 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-3 mb-6">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
          <div className="h-4 w-4/6 bg-gray-200 rounded" />
        </div>

        {/* Path skeleton */}
        <div className="mb-6 p-3 bg-gray-100 rounded-lg">
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>

        {/* Actions skeleton */}
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-gray-200 rounded-lg" />
          <div className="h-10 w-20 bg-gray-200 rounded-lg" />
        </div>
      </div>
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
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
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
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
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
 * Back arrow icon.
 */
function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default RouteSpecificMessage;
