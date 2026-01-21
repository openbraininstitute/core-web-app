/**
 * System Messages State Selectors
 *
 * Derived Jotai atoms that compute filtered and sorted message lists
 * based on dismissals, schedules, targeting, and display types.
 *
 * @module state/selectors
 */

import { atom } from "jotai";

import type { ISystemMessage, ITargetingContext } from "../types";
import { sortByPriority } from "../utils/priority-queue";
import { matchesTargeting } from "../utils/route-matcher";
import { isMessageActive } from "../utils/schedule";
import { dismissedIdsAtom, dismissedRecordsAtom, messagesAtom } from "./atoms";

// ============================================================================
// Targeting Context Atom
// ============================================================================

/**
 * Current targeting context for evaluating message visibility.
 * Should be updated by the application based on current route, user, and feature flags.
 */
export const targetingContextAtom = atom<ITargetingContext>({
  pathname: "/",
  userRoles: [],
  featureFlags: [],
});

// ============================================================================
// Active Messages Selector
// ============================================================================

/**
 * Checks if a message should be shown based on dismissal status.
 * Considers the alwaysShow flag and message version updates.
 */
function shouldShowMessage(
  message: ISystemMessage,
  dismissedIds: Set<string>,
  dismissedRecords: Array<{ messageId: string; messageVersion: number }>,
): boolean {
  // Always show if alwaysShow flag is set
  if (message.alwaysShow) {
    return true;
  }

  // Check if dismissed
  if (!dismissedIds.has(message.id)) {
    return true;
  }

  // Check if message was updated since dismissal
  const dismissalRecord = dismissedRecords.find(
    (r) => r.messageId === message.id,
  );
  if (dismissalRecord && message.version > dismissalRecord.messageVersion) {
    // Message was updated since dismissal, show it again
    return true;
  }

  return false;
}

/**
 * Derived atom containing all active messages.
 * Filters by:
 * - Dismissal status (respecting alwaysShow and version updates)
 * - Message active status (status === 'active' and schedule)
 * - Targeting rules (routes, roles, feature flags)
 *
 * Results are sorted by priority (severity, then timestamp).
 */
export const activeMessagesAtom = atom((get) => {
  const messages = get(messagesAtom);
  const dismissedIds = get(dismissedIdsAtom);
  const dismissedRecords = get(dismissedRecordsAtom);
  const targetingContext = get(targetingContextAtom);

  const activeMessages = messages.filter((message) => {
    // Check dismissal status
    if (!shouldShowMessage(message, dismissedIds, dismissedRecords)) {
      return false;
    }

    // Check if message is active (status and schedule)
    if (!isMessageActive(message)) {
      return false;
    }

    // Check targeting rules
    if (!matchesTargeting(message.targeting, targetingContext)) {
      return false;
    }

    return true;
  });

  // Sort by priority (severity, then timestamp)
  return sortByPriority(activeMessages);
});

// ============================================================================
// Global Takeover Selectors
// ============================================================================

/**
 * Derived atom for full platform takeover message.
 * Returns the highest priority global-takeover-full message, or null if none.
 */
export const globalTakeoverFullAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return (
    activeMessages.find((msg) => msg.displayType === "global-takeover-full") ??
    null
  );
});

/**
 * Derived atom for app-only takeover message (/app/virtual-lab routes).
 * Returns the highest priority global-takeover-app message, or null if none.
 */
export const globalTakeoverAppAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return (
    activeMessages.find((msg) => msg.displayType === "global-takeover-app") ??
    null
  );
});

/**
 * Derived atom for website-only takeover message (/ routes excluding /app/virtual-lab).
 * Returns the highest priority global-takeover-website message, or null if none.
 */
export const globalTakeoverWebsiteAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return (
    activeMessages.find(
      (msg) => msg.displayType === "global-takeover-website",
    ) ?? null
  );
});

/**
 * Derived atom that returns all global takeover messages.
 * Useful for checking if any takeover is active.
 */
export const allGlobalTakeoversAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return activeMessages.filter(
    (msg) =>
      msg.displayType === "global-takeover-full" ||
      msg.displayType === "global-takeover-app" ||
      msg.displayType === "global-takeover-website",
  );
});

// ============================================================================
// Inline Message Selectors
// ============================================================================

/**
 * Derived atom for inline-top messages (banners at top of viewport).
 * Returns messages sorted by priority.
 */
export const inlineTopMessagesAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return activeMessages.filter((msg) => msg.displayType === "inline-top");
});

/**
 * Derived atom for inline-bottom messages (banners at bottom of viewport).
 * Returns messages sorted by priority.
 */
export const inlineBottomMessagesAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return activeMessages.filter((msg) => msg.displayType === "inline-bottom");
});

/**
 * Derived atom for all inline messages (both top and bottom).
 */
export const allInlineMessagesAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return activeMessages.filter(
    (msg) =>
      msg.displayType === "inline-top" || msg.displayType === "inline-bottom",
  );
});

// ============================================================================
// Modal Message Selectors
// ============================================================================

/**
 * Derived atom for modal messages.
 * Returns messages sorted by priority.
 */
export const modalMessagesAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return activeMessages.filter((msg) => msg.displayType === "modal");
});

/**
 * Derived atom for the current modal to display.
 * Returns the highest priority modal message, or null if none.
 * Only one modal should be shown at a time.
 */
export const currentModalAtom = atom((get) => {
  const modalMessages = get(modalMessagesAtom);
  return modalMessages[0] ?? null;
});

// ============================================================================
// Route-Specific Message Selectors
// ============================================================================

/**
 * Derived atom for route-specific messages.
 * These messages intercept specific routes and replace page content.
 */
export const routeSpecificMessagesAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return activeMessages.filter((msg) => msg.displayType === "route-specific");
});

/**
 * Derived atom that returns the route-specific message for the current route.
 * Returns null if no route-specific message matches the current pathname.
 */
export const currentRouteMessageAtom = atom((get) => {
  const routeMessages = get(routeSpecificMessagesAtom);
  // Route-specific messages are already filtered by targeting context
  // Return the highest priority one
  return routeMessages[0] ?? null;
});

// ============================================================================
// Utility Selectors
// ============================================================================

/**
 * Derived atom indicating whether any messages are currently active.
 */
export const hasActiveMessagesAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return activeMessages.length > 0;
});

/**
 * Derived atom returning the count of active messages.
 */
export const activeMessageCountAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return activeMessages.length;
});

/**
 * Derived atom returning messages grouped by display type.
 */
export const messagesByDisplayTypeAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);

  return {
    inlineTop: activeMessages.filter((m) => m.displayType === "inline-top"),
    inlineBottom: activeMessages.filter(
      (m) => m.displayType === "inline-bottom",
    ),
    modal: activeMessages.filter((m) => m.displayType === "modal"),
    routeSpecific: activeMessages.filter(
      (m) => m.displayType === "route-specific",
    ),
    globalTakeoverFull: activeMessages.filter(
      (m) => m.displayType === "global-takeover-full",
    ),
    globalTakeoverApp: activeMessages.filter(
      (m) => m.displayType === "global-takeover-app",
    ),
    globalTakeoverWebsite: activeMessages.filter(
      (m) => m.displayType === "global-takeover-website",
    ),
  };
});

/**
 * Derived atom returning messages grouped by severity.
 */
export const messagesBySeverityAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);

  return {
    info: activeMessages.filter((m) => m.severity === "info"),
    warning: activeMessages.filter((m) => m.severity === "warning"),
    error: activeMessages.filter((m) => m.severity === "error"),
    critical: activeMessages.filter((m) => m.severity === "critical"),
  };
});

/**
 * Derived atom indicating whether there are any critical or error messages.
 * Useful for showing urgent notification indicators.
 */
export const hasUrgentMessagesAtom = atom((get) => {
  const activeMessages = get(activeMessagesAtom);
  return activeMessages.some(
    (m) => m.severity === "critical" || m.severity === "error",
  );
});
