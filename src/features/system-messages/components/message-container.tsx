/**
 * Message Container Component
 *
 * Orchestrates rendering of all system message types.
 * Implements lazy loading and handles empty state.
 *
 * @module components/message-container
 */

'use client';

import { AnimatePresence } from 'framer-motion';
import { useAtomValue } from 'jotai';
import dynamic from 'next/dynamic';
import { Suspense, useMemo } from 'react';

import {
  activeMessagesAtom,
  currentModalAtom,
  hasActiveMessagesAtom,
  inlineBottomMessagesAtom,
  inlineTopMessagesAtom,
} from '../state/selectors';

// ============================================================================
// Lazy-loaded Components
// ============================================================================

/**
 * Lazy-load display components to minimize initial bundle size.
 * Components are only loaded when messages of that type are present.
 */
const InlineBanner = dynamic(
  () => import('./inline-banner').then((mod) => ({ default: mod.InlineBanner })),
  { ssr: false }
);

const MessageModal = dynamic(
  () => import('./message-modal').then((mod) => ({ default: mod.MessageModal })),
  { ssr: false }
);

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the MessageContainer component.
 */
export interface IMessageContainerProps {
  /** Additional CSS class name */
  className?: string;
  /** Whether to render inline top messages */
  showInlineTop?: boolean;
  /** Whether to render inline bottom messages */
  showInlineBottom?: boolean;
  /** Whether to render modal messages */
  showModal?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Orchestrates rendering of all system message types.
 *
 * Features:
 * - Lazy loading of display components
 * - Handles empty state (renders nothing when no messages)
 * - Configurable display type rendering
 * - Efficient re-renders using Jotai selectors
 *
 * @example
 * ```tsx
 * // In root layout
 * <MessageContainer />
 *
 * // Or with specific display types
 * <MessageContainer showInlineTop showModal />
 * ```
 */
export function MessageContainer({
  className = '',
  showInlineTop = true,
  showInlineBottom = true,
  showModal = true,
}: IMessageContainerProps) {
  // Check if there are any active messages
  const hasActiveMessages = useAtomValue(hasActiveMessagesAtom);

  // Get messages by display type
  const inlineTopMessages = useAtomValue(inlineTopMessagesAtom);
  const inlineBottomMessages = useAtomValue(inlineBottomMessagesAtom);
  const currentModal = useAtomValue(currentModalAtom);

  // Memoize whether each type has messages
  const hasInlineTop = useMemo(
    () => showInlineTop && inlineTopMessages.length > 0,
    [showInlineTop, inlineTopMessages.length]
  );

  const hasInlineBottom = useMemo(
    () => showInlineBottom && inlineBottomMessages.length > 0,
    [showInlineBottom, inlineBottomMessages.length]
  );

  const hasModal = useMemo(() => showModal && currentModal !== null, [showModal, currentModal]);

  // Render nothing if no active messages (zero DOM nodes)
  if (!hasActiveMessages) {
    return null;
  }

  // Render nothing if no display types are enabled or have messages
  if (!hasInlineTop && !hasInlineBottom && !hasModal) {
    return null;
  }

  return (
    <div className={className}>
      {/* Inline Top Messages */}
      {hasInlineTop && (
        <Suspense fallback={null}>
          <div className="fixed top-0 left-0 right-0 z-50 space-y-2">
            <AnimatePresence mode="sync">
              {inlineTopMessages.map((message) => (
                <InlineBanner key={message.id} message={message} position="top" />
              ))}
            </AnimatePresence>
          </div>
        </Suspense>
      )}

      {/* Inline Bottom Messages */}
      {hasInlineBottom && (
        <Suspense fallback={null}>
          <div className="fixed bottom-0 left-0 right-0 z-50 space-y-2">
            <AnimatePresence mode="sync">
              {inlineBottomMessages.map((message) => (
                <InlineBanner key={message.id} message={message} position="bottom" />
              ))}
            </AnimatePresence>
          </div>
        </Suspense>
      )}

      {/* Modal Messages */}
      {hasModal && currentModal && (
        <Suspense fallback={null}>
          <MessageModal message={currentModal} isOpen={true} />
        </Suspense>
      )}
    </div>
  );
}

// ============================================================================
// Specialized Containers
// ============================================================================

/**
 * Container for inline top messages only.
 */
export function InlineTopContainer({ className = '' }: { className?: string }) {
  return (
    <MessageContainer
      className={className}
      showInlineTop
      showInlineBottom={false}
      showModal={false}
    />
  );
}

/**
 * Container for inline bottom messages only.
 */
export function InlineBottomContainer({ className = '' }: { className?: string }) {
  return (
    <MessageContainer
      className={className}
      showInlineTop={false}
      showInlineBottom
      showModal={false}
    />
  );
}

/**
 * Container for modal messages only.
 */
export function ModalContainer({ className = '' }: { className?: string }) {
  return (
    <MessageContainer
      className={className}
      showInlineTop={false}
      showInlineBottom={false}
      showModal
    />
  );
}

// ============================================================================
// Debug Component
// ============================================================================

/**
 * Debug component for viewing active messages.
 * Only use in development.
 */
export function MessageDebugPanel() {
  const activeMessages = useAtomValue(activeMessagesAtom);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-9999 max-w-sm p-4 bg-gray-900 text-white rounded-lg shadow-xl text-xs">
      <h3 className="font-bold mb-2">System Messages Debug</h3>
      <p className="mb-2">Active: {activeMessages.length}</p>
      <ul className="space-y-1">
        {activeMessages.map((msg) => (
          <li key={msg.id} className="truncate">
            [{msg.severity}] {msg.displayType}: {msg.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default MessageContainer;
