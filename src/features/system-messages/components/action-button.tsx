/**
 * Action Button Component
 *
 * Renders interactive action buttons for system messages.
 * Supports primary, secondary, and danger variants with full keyboard accessibility.
 *
 * @module components/action-button
 */

'use client';

import { type KeyboardEvent, type MouseEvent, useCallback } from 'react';

import { useMessageActions } from '../hooks/use-message-actions';
import type { IMessageAction, ISystemMessage } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the ActionButton component.
 */
export interface IActionButtonProps {
  /** The action configuration */
  action: IMessageAction;
  /** Optional message context for action execution */
  message?: ISystemMessage;
  /** Callback fired after action completes successfully */
  onComplete?: () => void;
  /** Callback fired if action fails */
  onError?: (error: Error) => void;
  /** Additional CSS class name */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// Styles
// ============================================================================

/**
 * Base button styles shared across all variants.
 */
const baseStyles = `
  inline-flex items-center justify-center
  font-medium rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
`
  .trim()
  .replace(/\s+/g, ' ');

/**
 * Variant-specific styles.
 */
const variantStyles: Record<IMessageAction['variant'], string> = {
  primary: `
    bg-primary-8 text-white
    hover:bg-primary-9
    focus:ring-primary-8
  `
    .trim()
    .replace(/\s+/g, ' '),
  secondary: `
    bg-gray-100 text-gray-700
    hover:bg-gray-200
    focus:ring-gray-500
    border border-gray-300
  `
    .trim()
    .replace(/\s+/g, ' '),
  danger: `
    bg-red-600 text-white
    hover:bg-red-700
    focus:ring-red-600
  `
    .trim()
    .replace(/\s+/g, ' '),
};

/**
 * Size-specific styles.
 */
const sizeStyles: Record<NonNullable<IActionButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

// ============================================================================
// Component
// ============================================================================

/**
 * Renders an action button for system messages.
 *
 * Features:
 * - Supports primary, secondary, and danger variants
 * - Handles dismiss, retry, navigate, and custom action types
 * - Full keyboard accessibility (Enter/Space activation)
 * - Visible focus indicators
 *
 * @example
 * ```tsx
 * <ActionButton
 *   action={{
 *     id: 'dismiss-btn',
 *     label: 'Dismiss',
 *     type: 'dismiss',
 *     variant: 'secondary'
 *   }}
 *   message={currentMessage}
 *   onComplete={() => console.log('Dismissed!')}
 * />
 * ```
 */
export function ActionButton({
  action,
  message,
  onComplete,
  onError,
  className = '',
  disabled = false,
  size = 'md',
}: IActionButtonProps) {
  const { executeAction } = useMessageActions();

  /**
   * Handles button click/activation.
   */
  const handleClick = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (disabled) return;

      try {
        await executeAction(action, message);
        onComplete?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Action failed');
        onError?.(err);
      }
    },
    [action, message, executeAction, onComplete, onError, disabled]
  );

  /**
   * Handles keyboard activation (Enter/Space).
   */
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    // Enter and Space should trigger the button
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.currentTarget.click();
    }
  }, []);

  // Build class names
  const buttonClasses = [baseStyles, variantStyles[action.variant], sizeStyles[size], className]
    .filter(Boolean)
    .join(' ');

  // For navigate actions with external URLs, render as a link
  if (action.type === 'navigate' && action.url && action.target === '_blank') {
    return (
      <a
        href={action.url}
        target="_blank"
        rel={action.rel || 'noopener noreferrer'}
        className={buttonClasses}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          onComplete?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (disabled) {
              e.preventDefault();
            }
          }
        }}
        aria-disabled={disabled}
      >
        {action.label}
        <ExternalLinkIcon className="ml-1.5 h-4 w-4" />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={buttonClasses}
      aria-label={action.label}
    >
      {action.label}
    </button>
  );
}

// ============================================================================
// Icons
// ============================================================================

/**
 * External link icon for navigate actions.
 */
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default ActionButton;
