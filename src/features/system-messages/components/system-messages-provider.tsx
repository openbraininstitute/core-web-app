/**
 * System Messages Provider Component
 *
 * Provides system messages context to the application.
 * Initializes SSE connection on mount and handles cleanup on unmount.
 *
 * @module components/system-messages-provider
 */

'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { usePathname } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef } from 'react';

import { createSSEClient, type SSEClient } from '../api/sse-client';
import {
  addMessageAtom,
  cleanupExpiredDismissalsAtom,
  connectionStatusAtom,
  lastEventIdAtom,
  removeMessageAtom,
  setErrorAtom,
} from '../state/atoms';
import { targetingContextAtom } from '../state/selectors';
import type { ISSEEvent, ISystemMessage, TConnectionStatus } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the SystemMessagesProvider component.
 */
export interface ISystemMessagesProviderProps {
  /** Child components to render */
  children: ReactNode;
  /** Optional initial targeting context */
  initialContext?: {
    userRoles?: string[];
    featureFlags?: string[];
  };
  /** Whether to automatically connect to SSE on mount (default: true) */
  autoConnect?: boolean;
  /** Custom SSE endpoint URL */
  sseUrl?: string;
}

// ============================================================================
// Main Provider Component
// ============================================================================

/**
 * System Messages Provider Component.
 *
 * Initializes the SSE connection for real-time system message updates.
 * This component should be placed inside an existing JotaiProvider.
 *
 * Features:
 * - Initializes SSE connection on mount
 * - Provides message state to children via Jotai atoms
 * - Handles cleanup on unmount
 * - Updates targeting context on route changes
 * - Cleans up expired dismissals on mount
 *
 * @example
 * ```tsx
 * // In root layout (inside existing JotaiProvider)
 * import { SystemMessagesProvider } from '@/features/system-messages';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <JotaiProvider>
 *           <SystemMessagesProvider>
 *             {children}
 *           </SystemMessagesProvider>
 *         </JotaiProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function SystemMessagesProvider({
  children,
  initialContext,
  autoConnect = true,
  sseUrl,
}: ISystemMessagesProviderProps) {
  const pathname = usePathname();
  const sseClientRef = useRef<SSEClient | null>(null);
  const isInitializedRef = useRef(false);

  // State setters
  const setConnectionStatus = useSetAtom(connectionStatusAtom);
  const setLastEventId = useSetAtom(lastEventIdAtom);
  const addMessage = useSetAtom(addMessageAtom);
  const removeMessage = useSetAtom(removeMessageAtom);
  const setError = useSetAtom(setErrorAtom);
  const setTargetingContext = useSetAtom(targetingContextAtom);
  const cleanupExpiredDismissals = useSetAtom(cleanupExpiredDismissalsAtom);

  // Get last event ID for resumption
  const lastEventId = useAtomValue(lastEventIdAtom);

  // ============================================================================
  // SSE Event Handlers
  // ============================================================================

  /**
   * Handles incoming SSE events.
   */
  const handleSSEMessage = useCallback(
    (event: ISSEEvent) => {
      // Update last event ID for resumption
      setLastEventId(event.id);

      switch (event.type) {
        case 'message':
        case 'update':
          if (event.data && 'title' in event.data) {
            addMessage(event.data as ISystemMessage);
          }
          break;

        case 'delete':
          if (event.data && 'id' in event.data) {
            removeMessage((event.data as { id: string }).id);
          }
          break;

        case 'heartbeat':
          // Heartbeat received, connection is healthy
          break;
      }
    },
    [addMessage, removeMessage, setLastEventId]
  );

  /**
   * Handles SSE connection status changes.
   */
  const handleStatusChange = useCallback(
    (status: TConnectionStatus) => {
      setConnectionStatus(status);
    },
    [setConnectionStatus]
  );

  /**
   * Handles SSE errors.
   */
  const handleError = useCallback(
    (error: Error) => {
      setError({ error, autoClearMs: 10000 });
    },
    [setError]
  );

  // ============================================================================
  // Initialize SSE Connection
  // ============================================================================

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Clean up expired dismissals on mount
    cleanupExpiredDismissals();

    // Set initial targeting context if provided
    if (initialContext) {
      setTargetingContext((prev) => ({
        ...prev,
        userRoles: initialContext.userRoles ?? prev.userRoles,
        featureFlags: initialContext.featureFlags ?? prev.featureFlags,
      }));
    }

    // Create SSE client
    const config = sseUrl ? { url: sseUrl } : undefined;
    sseClientRef.current = createSSEClient(
      {
        onMessage: handleSSEMessage,
        onStatusChange: handleStatusChange,
        onError: handleError,
      },
      config
    );

    // Connect if autoConnect is enabled
    if (autoConnect) {
      sseClientRef.current.connect(lastEventId ?? undefined);
    }

    // Cleanup on unmount
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect();
        sseClientRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [
    autoConnect,
    sseUrl,
    handleSSEMessage,
    handleStatusChange,
    handleError,
    lastEventId,
    cleanupExpiredDismissals,
    setTargetingContext,
    initialContext,
  ]);

  // ============================================================================
  // Update Targeting Context on Route Change
  // ============================================================================

  useEffect(() => {
    setTargetingContext((prev) => ({
      ...prev,
      pathname,
    }));
  }, [pathname, setTargetingContext]);

  return <>{children}</>;
}

// ============================================================================
// Exports
// ============================================================================

export default SystemMessagesProvider;
