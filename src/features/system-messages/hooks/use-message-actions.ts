/**
 * Message Actions Hook
 *
 * Provides actions for interacting with system messages:
 * - Dismissing messages
 * - Executing action callbacks (dismiss, retry, navigate, custom)
 *
 * @module hooks/use-message-actions
 */

"use client";

import { useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import {
  clearDismissalAtom,
  dismissMessageAtom,
  setErrorAtom,
} from "../state/atoms";
import type { IMessageAction, ISystemMessage } from "../types";

// ============================================================================
// Custom Action Callback Registry
// ============================================================================

/**
 * Type for custom action callback functions.
 */
export type TCustomActionCallback = (
  action: IMessageAction,
  message?: ISystemMessage,
) => void | Promise<void>;

/**
 * Registry for custom action callbacks.
 * Allows components to register handlers for custom action types.
 */
const customActionCallbacks = new Map<string, TCustomActionCallback>();

/**
 * Registers a custom action callback.
 *
 * @param callbackId - Unique identifier for the callback
 * @param callback - Function to execute when the action is triggered
 */
export function registerCustomAction(
  callbackId: string,
  callback: TCustomActionCallback,
): void {
  customActionCallbacks.set(callbackId, callback);
}

/**
 * Unregisters a custom action callback.
 *
 * @param callbackId - Unique identifier for the callback to remove
 */
export function unregisterCustomAction(callbackId: string): void {
  customActionCallbacks.delete(callbackId);
}

/**
 * Gets a registered custom action callback.
 *
 * @param callbackId - Unique identifier for the callback
 * @returns The callback function or undefined if not found
 */
export function getCustomAction(
  callbackId: string,
): TCustomActionCallback | undefined {
  return customActionCallbacks.get(callbackId);
}

// ============================================================================
// Retry Callback Registry
// ============================================================================

/**
 * Type for retry callback functions.
 */
export type TRetryCallback = () => void | Promise<void>;

/**
 * Registry for retry callbacks.
 * Allows components to register handlers for retry actions.
 */
const retryCallbacks = new Map<string, TRetryCallback>();

/**
 * Registers a retry callback.
 *
 * @param callbackId - Unique identifier for the callback
 * @param callback - Function to execute when retry is triggered
 */
export function registerRetryCallback(
  callbackId: string,
  callback: TRetryCallback,
): void {
  retryCallbacks.set(callbackId, callback);
}

/**
 * Unregisters a retry callback.
 *
 * @param callbackId - Unique identifier for the callback to remove
 */
export function unregisterRetryCallback(callbackId: string): void {
  retryCallbacks.delete(callbackId);
}

// ============================================================================
// Hook Return Type
// ============================================================================

/**
 * Return type for the useMessageActions hook.
 */
export interface IUseMessageActionsReturn {
  /**
   * Dismisses a message by ID.
   * Stores the dismissal in localStorage for persistence.
   *
   * @param messageId - ID of the message to dismiss
   * @param messageVersion - Optional version number for tracking updates
   */
  dismissMessage: (messageId: string, messageVersion?: number) => void;

  /**
   * Clears a previous dismissal, allowing the message to be shown again.
   *
   * @param messageId - ID of the message to clear dismissal for
   */
  clearDismissal: (messageId: string) => void;

  /**
   * Executes an action from a message.
   * Handles dismiss, retry, navigate, and custom action types.
   *
   * @param action - The action to execute
   * @param message - Optional message context for custom actions
   */
  executeAction: (
    action: IMessageAction,
    message?: ISystemMessage,
  ) => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for message interaction actions.
 *
 * Provides functions to:
 * - Dismiss messages (persisted to localStorage)
 * - Execute action callbacks (dismiss, retry, navigate, custom)
 *
 * @example
 * ```tsx
 * function MessageActions({ message }: { message: ISystemMessage }) {
 *   const { dismissMessage, executeAction } = useMessageActions();
 *
 *   return (
 *     <div>
 *       {message.actions.map(action => (
 *         <button
 *           key={action.id}
 *           onClick={() => executeAction(action, message)}
 *         >
 *           {action.label}
 *         </button>
 *       ))}
 *       {message.dismissible && (
 *         <button onClick={() => dismissMessage(message.id, message.version)}>
 *           Dismiss
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMessageActions(): IUseMessageActionsReturn {
  const router = useRouter();
  const dismissMessageAtomSetter = useSetAtom(dismissMessageAtom);
  const clearDismissalAtomSetter = useSetAtom(clearDismissalAtom);
  const setError = useSetAtom(setErrorAtom);

  /**
   * Dismisses a message by ID.
   */
  const dismissMessage = useCallback(
    (messageId: string, messageVersion?: number) => {
      dismissMessageAtomSetter(messageId, messageVersion);
    },
    [dismissMessageAtomSetter],
  );

  /**
   * Clears a previous dismissal.
   */
  const clearDismissal = useCallback(
    (messageId: string) => {
      clearDismissalAtomSetter(messageId);
    },
    [clearDismissalAtomSetter],
  );

  /**
   * Executes an action from a message.
   */
  const executeAction = useCallback(
    async (action: IMessageAction, message?: ISystemMessage) => {
      try {
        switch (action.type) {
          case "dismiss":
            // Dismiss the message
            if (message) {
              dismissMessage(message.id, message.version);
            }
            break;

          case "retry":
            // Execute retry callback if registered
            if (action.callbackId) {
              const retryCallback = retryCallbacks.get(action.callbackId);
              if (retryCallback) {
                await retryCallback();
              } else {
                console.warn(
                  `[useMessageActions] Retry callback not found: ${action.callbackId}`,
                );
              }
            }
            break;

          case "navigate":
            // Navigate to the specified URL
            if (action.url) {
              if (action.target === "_blank") {
                // Open in new tab
                window.open(
                  action.url,
                  "_blank",
                  action.rel || "noopener noreferrer",
                );
              } else {
                // Navigate in same tab
                if (
                  action.url.startsWith("http://") ||
                  action.url.startsWith("https://")
                ) {
                  // External URL
                  window.location.href = action.url;
                } else {
                  // Internal route - use Next.js router
                  router.push(action.url);
                }
              }
            }
            break;

          case "custom":
            // Execute custom callback if registered
            if (action.callbackId) {
              const customCallback = customActionCallbacks.get(
                action.callbackId,
              );
              if (customCallback) {
                await customCallback(action, message);
              } else {
                console.warn(
                  `[useMessageActions] Custom callback not found: ${action.callbackId}`,
                );
              }
            }
            break;

          default:
            console.warn(
              `[useMessageActions] Unknown action type: ${action.type}`,
            );
        }
      } catch (error) {
        // Log error and display notification
        console.error("[useMessageActions] Action execution failed:", error);
        setError({
          error:
            error instanceof Error
              ? error
              : new Error("Action execution failed"),
          autoClearMs: 5000,
        });
      }
    },
    [dismissMessage, router, setError],
  );

  return {
    dismissMessage,
    clearDismissal,
    executeAction,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for just the dismiss action.
 * Useful when you only need to dismiss messages.
 */
export function useDismissMessage(): (
  messageId: string,
  messageVersion?: number,
) => void {
  const dismissMessageAtomSetter = useSetAtom(dismissMessageAtom);

  return useCallback(
    (messageId: string, messageVersion?: number) => {
      dismissMessageAtomSetter(messageId, messageVersion);
    },
    [dismissMessageAtomSetter],
  );
}
