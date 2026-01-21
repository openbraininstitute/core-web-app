/**
 * System Messages State Module
 *
 * Exports all Jotai atoms and selectors for system messages state management.
 *
 * @module state
 */

// Core atoms
export {
  addMessageAtom,
  addSessionDismissal,
  cleanupExpiredDismissalsAtom,
  clearDismissalAtom,
  clearErrorAtom,
  clearSessionDismissal,
  connectionStatusAtom,
  dismissedIdsAtom,
  dismissedRecordsAtom,
  dismissMessageAtom,
  errorAtom,
  isLocalStorageAvailable,
  isSessionDismissed,
  lastEventIdAtom,
  messagesAtom,
  removeMessageAtom,
  setErrorAtom,
  setMessagesAtom,
} from "./atoms";

// Selectors
export {
  activeMessageCountAtom,
  activeMessagesAtom,
  allGlobalTakeoversAtom,
  allInlineMessagesAtom,
  currentModalAtom,
  currentRouteMessageAtom,
  globalTakeoverAppAtom,
  globalTakeoverFullAtom,
  globalTakeoverWebsiteAtom,
  hasActiveMessagesAtom,
  hasUrgentMessagesAtom,
  inlineBottomMessagesAtom,
  inlineTopMessagesAtom,
  messagesByDisplayTypeAtom,
  messagesBySeverityAtom,
  modalMessagesAtom,
  routeSpecificMessagesAtom,
  targetingContextAtom,
} from "./selectors";
