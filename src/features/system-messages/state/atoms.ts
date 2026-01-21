/**
 * System Messages State Atoms
 *
 * Core Jotai atoms for managing system messages state.
 * Includes message storage, dismissal tracking, connection status, and error handling.
 *
 * @module state/atoms
 */

import { atom } from "jotai";
import { atomWithReset, atomWithStorage, RESET } from "jotai/utils";

import {
  DISMISSAL_EXPIRATION_DAYS,
  MAX_CACHED_MESSAGES,
  STORAGE_KEY_DISMISSED_IDS,
  STORAGE_KEY_LAST_EVENT_ID,
} from "../constants";
import type {
  IDismissalRecord,
  ISystemMessage,
  TConnectionStatus,
} from "../types";

// ============================================================================
// Core Message State
// ============================================================================

/**
 * Primary atom storing the list of system messages.
 * Messages are cached in memory with a maximum limit defined by MAX_CACHED_MESSAGES.
 */
export const messagesAtom = atom<ISystemMessage[]>([]);

/**
 * Write atom for adding/updating messages with cache size management.
 * Automatically evicts oldest messages when exceeding MAX_CACHED_MESSAGES.
 */
export const setMessagesAtom = atom(
  null,
  (_get, set, newMessages: ISystemMessage[]) => {
    let messages = newMessages;

    // Enforce cache size limit by evicting oldest messages
    if (messages.length > MAX_CACHED_MESSAGES) {
      // Sort by createdAt (oldest first) and keep only the newest MAX_CACHED_MESSAGES
      const sorted = [...messages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      messages = sorted.slice(sorted.length - MAX_CACHED_MESSAGES);
    }

    set(messagesAtom, messages);
  },
);

/**
 * Write atom for adding a single message to the store.
 * Handles deduplication and cache size management.
 */
export const addMessageAtom = atom(
  null,
  (get, set, message: ISystemMessage) => {
    const currentMessages = get(messagesAtom);

    // Check if message already exists (update if so)
    const existingIndex = currentMessages.findIndex((m) => m.id === message.id);

    let updatedMessages: ISystemMessage[];
    if (existingIndex >= 0) {
      // Update existing message
      updatedMessages = [...currentMessages];
      updatedMessages[existingIndex] = message;
    } else {
      // Add new message
      updatedMessages = [...currentMessages, message];
    }

    // Use setMessagesAtom to handle cache size management
    set(setMessagesAtom, updatedMessages);
  },
);

/**
 * Write atom for removing a message from the store.
 */
export const removeMessageAtom = atom(null, (get, set, messageId: string) => {
  const currentMessages = get(messagesAtom);
  const updatedMessages = currentMessages.filter((m) => m.id !== messageId);
  set(messagesAtom, updatedMessages);
});

// ============================================================================
// Dismissal State
// ============================================================================

/**
 * Dismissed message records persisted to localStorage.
 * Each record includes the message ID, dismissal timestamp, and message version.
 */
export const dismissedRecordsAtom = atomWithStorage<IDismissalRecord[]>(
  STORAGE_KEY_DISMISSED_IDS,
  [],
);

/**
 * Derived atom providing a Set of dismissed message IDs for efficient lookup.
 */
export const dismissedIdsAtom = atom((get) => {
  const records = get(dismissedRecordsAtom);
  return new Set(records.map((r) => r.messageId));
});

/**
 * Write atom for dismissing a message.
 * Creates a dismissal record with timestamp and message version.
 */
export const dismissMessageAtom = atom(
  null,
  (get, set, messageId: string, messageVersion?: number) => {
    const currentRecords = get(dismissedRecordsAtom);

    // Check if already dismissed
    if (currentRecords.some((r) => r.messageId === messageId)) {
      return;
    }

    const newRecord: IDismissalRecord = {
      messageId,
      dismissedAt: new Date().toISOString(),
      messageVersion: messageVersion ?? 1,
    };

    // Clean up expired records while adding new one
    const now = new Date();
    const expirationMs = DISMISSAL_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

    const validRecords = currentRecords.filter((record) => {
      const dismissedAt = new Date(record.dismissedAt);
      return now.getTime() - dismissedAt.getTime() < expirationMs;
    });

    set(dismissedRecordsAtom, [...validRecords, newRecord]);
  },
);

/**
 * Write atom for clearing a specific dismissal (e.g., when message is updated).
 */
export const clearDismissalAtom = atom(null, (get, set, messageId: string) => {
  const currentRecords = get(dismissedRecordsAtom);
  const updatedRecords = currentRecords.filter(
    (r) => r.messageId !== messageId,
  );
  set(dismissedRecordsAtom, updatedRecords);
});

/**
 * Write atom for cleaning up expired dismissal records.
 * Should be called periodically to prevent localStorage bloat.
 */
export const cleanupExpiredDismissalsAtom = atom(null, (get, set) => {
  const currentRecords = get(dismissedRecordsAtom);
  const now = new Date();
  const expirationMs = DISMISSAL_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

  const validRecords = currentRecords.filter((record) => {
    const dismissedAt = new Date(record.dismissedAt);
    return now.getTime() - dismissedAt.getTime() < expirationMs;
  });

  if (validRecords.length !== currentRecords.length) {
    set(dismissedRecordsAtom, validRecords);
  }
});

// ============================================================================
// Connection State
// ============================================================================

/**
 * SSE connection status atom.
 * Tracks whether the real-time connection is active, disconnected, or reconnecting.
 */
export const connectionStatusAtom = atom<TConnectionStatus>("disconnected");

/**
 * Last received SSE event ID for connection resumption.
 * Persisted to localStorage to survive page reloads.
 */
export const lastEventIdAtom = atomWithStorage<string | null>(
  STORAGE_KEY_LAST_EVENT_ID,
  null,
);

// ============================================================================
// Error State
// ============================================================================

/**
 * Current error state for the system messages feature.
 * Null when no error is present.
 * Uses atomWithReset to allow easy clearing.
 */
export const errorAtom = atomWithReset<Error | null>(null);

/**
 * Write atom for setting an error with optional auto-clear timeout.
 */
export const setErrorAtom = atom(
  null,
  (_get, set, args: { error: Error | null; autoClearMs?: number }) => {
    if (args.error === null) {
      set(errorAtom, RESET);
    } else {
      set(errorAtom, args.error);
    }

    if (args.error && args.autoClearMs) {
      setTimeout(() => {
        set(errorAtom, RESET);
      }, args.autoClearMs);
    }
  },
);

/**
 * Write atom for clearing the current error.
 */
export const clearErrorAtom = atom(null, (_get, set) => {
  set(errorAtom, RESET);
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if localStorage is available.
 * Used to determine if dismissals can be persisted.
 *
 * @returns True if localStorage is available and writable
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = "__system_messages_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Session-based dismissal storage for when localStorage is unavailable.
 * This is a fallback that only persists for the current session.
 */
const sessionDismissals = new Set<string>();

/**
 * Adds a dismissal to session storage (fallback).
 */
export function addSessionDismissal(messageId: string): void {
  sessionDismissals.add(messageId);
}

/**
 * Checks if a message is dismissed in session storage (fallback).
 */
export function isSessionDismissed(messageId: string): boolean {
  return sessionDismissals.has(messageId);
}

/**
 * Clears a dismissal from session storage (fallback).
 */
export function clearSessionDismissal(messageId: string): void {
  sessionDismissals.delete(messageId);
}
