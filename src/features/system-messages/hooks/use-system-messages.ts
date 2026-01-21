/**
 * Main System Messages Hook
 *
 * Provides access to active system messages by display type,
 * manages SSE connection lifecycle, and exposes connection status.
 *
 * @module hooks/use-system-messages
 */

"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";

import { createSSEClient, type SSEClient } from "../api/sse-client";
import {
  addMessageAtom,
  connectionStatusAtom,
  lastEventIdAtom,
  removeMessageAtom,
  setErrorAtom,
} from "../state/atoms";
import {
  activeMessagesAtom,
  globalTakeoverAppAtom,
  globalTakeoverFullAtom,
  globalTakeoverWebsiteAtom,
  inlineBottomMessagesAtom,
  inlineTopMessagesAtom,
  messagesByDisplayTypeAtom,
  modalMessagesAtom,
  routeSpecificMessagesAtom,
  targetingContextAtom,
} from "../state/selectors";
import type {
  ISSEEvent,
  ISystemMessage,
  ITargetingContext,
  TConnectionStatus,
} from "../types";

// ============================================================================
// Hook Return Type
// ============================================================================

/**
 * Return type for the useSystemMessages hook.
 */
export interface IUseSystemMessagesReturn {
  /** All active messages sorted by priority */
  activeMessages: ISystemMessage[];
  /** Messages grouped by display type */
  messagesByDisplayType: {
    inlineTop: ISystemMessage[];
    inlineBottom: ISystemMessage[];
    modal: ISystemMessage[];
    routeSpecific: ISystemMessage[];
    globalTakeoverFull: ISystemMessage[];
    globalTakeoverApp: ISystemMessage[];
    globalTakeoverWebsite: ISystemMessage[];
  };
  /** Inline top banner messages */
  inlineTopMessages: ISystemMessage[];
  /** Inline bottom banner messages */
  inlineBottomMessages: ISystemMessage[];
  /** Modal messages */
  modalMessages: ISystemMessage[];
  /** Route-specific messages */
  routeSpecificMessages: ISystemMessage[];
  /** Full platform takeover message (if any) */
  globalTakeoverFull: ISystemMessage | null;
  /** App-only takeover message (if any) */
  globalTakeoverApp: ISystemMessage | null;
  /** Website-only takeover message (if any) */
  globalTakeoverWebsite: ISystemMessage | null;
  /** Current SSE connection status */
  connectionStatus: TConnectionStatus;
  /** Whether any takeover is active */
  hasTakeover: boolean;
  /** Update the targeting context (pathname, roles, feature flags) */
  updateTargetingContext: (context: Partial<ITargetingContext>) => void;
  /** Manually connect to SSE (usually handled automatically) */
  connect: () => void;
  /** Manually disconnect from SSE */
  disconnect: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Main hook for consuming system messages.
 *
 * Provides:
 * - Active messages filtered and sorted by priority
 * - Messages grouped by display type for easy rendering
 * - SSE connection lifecycle management
 * - Connection status monitoring
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     inlineTopMessages,
 *     modalMessages,
 *     connectionStatus,
 *   } = useSystemMessages();
 *
 *   return (
 *     <>
 *       {inlineTopMessages.map(msg => <Banner key={msg.id} message={msg} />)}
 *       {modalMessages[0] && <Modal message={modalMessages[0]} />}
 *     </>
 *   );
 * }
 * ```
 */
export function useSystemMessages(): IUseSystemMessagesReturn {
  // SSE client reference
  const sseClientRef = useRef<SSEClient | null>(null);

  // State atoms
  const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);
  const [lastEventId, setLastEventId] = useAtom(lastEventIdAtom);
  const setTargetingContext = useSetAtom(targetingContextAtom);

  // Write atoms
  const addMessage = useSetAtom(addMessageAtom);
  const removeMessage = useSetAtom(removeMessageAtom);
  const setError = useSetAtom(setErrorAtom);

  // Derived selectors
  const activeMessages = useAtomValue(activeMessagesAtom);
  const messagesByDisplayType = useAtomValue(messagesByDisplayTypeAtom);
  const inlineTopMessages = useAtomValue(inlineTopMessagesAtom);
  const inlineBottomMessages = useAtomValue(inlineBottomMessagesAtom);
  const modalMessages = useAtomValue(modalMessagesAtom);
  const routeSpecificMessages = useAtomValue(routeSpecificMessagesAtom);
  const globalTakeoverFull = useAtomValue(globalTakeoverFullAtom);
  const globalTakeoverApp = useAtomValue(globalTakeoverAppAtom);
  const globalTakeoverWebsite = useAtomValue(globalTakeoverWebsiteAtom);

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
        case "message":
        case "update":
          if (event.data && "title" in event.data) {
            addMessage(event.data as ISystemMessage);
          }
          break;

        case "delete":
          if (event.data && "id" in event.data) {
            removeMessage((event.data as { id: string }).id);
          }
          break;

        case "heartbeat":
          // Heartbeat received, connection is healthy
          break;
      }
    },
    [addMessage, removeMessage, setLastEventId],
  );

  /**
   * Handles SSE connection status changes.
   */
  const handleStatusChange = useCallback(
    (status: TConnectionStatus) => {
      setConnectionStatus(status);
    },
    [setConnectionStatus],
  );

  /**
   * Handles SSE errors.
   */
  const handleError = useCallback(
    (error: Error) => {
      setError({ error, autoClearMs: 10000 });
    },
    [setError],
  );

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connects to the SSE stream.
   */
  const connect = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.connect(lastEventId ?? undefined);
    }
  }, [lastEventId]);

  /**
   * Disconnects from the SSE stream.
   */
  const disconnect = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
    }
  }, []);

  // ============================================================================
  // Targeting Context Management
  // ============================================================================

  /**
   * Updates the targeting context for message filtering.
   */
  const updateTargetingContext = useCallback(
    (context: Partial<ITargetingContext>) => {
      setTargetingContext((prev) => ({
        ...prev,
        ...context,
      }));
    },
    [setTargetingContext],
  );

  // ============================================================================
  // SSE Lifecycle Effect
  // ============================================================================

  useEffect(() => {
    // Create SSE client on mount
    sseClientRef.current = createSSEClient({
      onMessage: handleSSEMessage,
      onStatusChange: handleStatusChange,
      onError: handleError,
    });

    // Connect to SSE stream
    sseClientRef.current.connect(lastEventId ?? undefined);

    // Cleanup on unmount
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect();
        sseClientRef.current = null;
      }
    };
  }, [handleSSEMessage, handleStatusChange, handleError, lastEventId]);

  // ============================================================================
  // Return Value
  // ============================================================================

  const hasTakeover = !!(
    globalTakeoverFull ||
    globalTakeoverApp ||
    globalTakeoverWebsite
  );

  return {
    activeMessages,
    messagesByDisplayType,
    inlineTopMessages,
    inlineBottomMessages,
    modalMessages,
    routeSpecificMessages,
    globalTakeoverFull,
    globalTakeoverApp,
    globalTakeoverWebsite,
    connectionStatus,
    hasTakeover,
    updateTargetingContext,
    connect,
    disconnect,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for accessing only the connection status.
 * Useful when you only need to display connection state.
 */
export function useConnectionStatus(): TConnectionStatus {
  return useAtomValue(connectionStatusAtom);
}

/**
 * Hook for accessing only inline top messages.
 */
export function useInlineTopMessages(): ISystemMessage[] {
  return useAtomValue(inlineTopMessagesAtom);
}

/**
 * Hook for accessing only inline bottom messages.
 */
export function useInlineBottomMessages(): ISystemMessage[] {
  return useAtomValue(inlineBottomMessagesAtom);
}

/**
 * Hook for accessing only modal messages.
 */
export function useModalMessages(): ISystemMessage[] {
  return useAtomValue(modalMessagesAtom);
}

/**
 * Hook for accessing only route-specific messages.
 */
export function useRouteSpecificMessages(): ISystemMessage[] {
  return useAtomValue(routeSpecificMessagesAtom);
}

/**
 * Hook for checking if any global takeover is active.
 */
export function useHasTakeover(): boolean {
  const full = useAtomValue(globalTakeoverFullAtom);
  const app = useAtomValue(globalTakeoverAppAtom);
  const website = useAtomValue(globalTakeoverWebsiteAtom);
  return !!(full || app || website);
}
