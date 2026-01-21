/**
 * System Messages Hooks
 *
 * React hooks for consuming and interacting with system messages.
 *
 * @module hooks
 */

// Message actions hook
export {
  getCustomAction,
  type IUseMessageActionsReturn,
  registerCustomAction,
  registerRetryCallback,
  type TCustomActionCallback,
  type TRetryCallback,
  unregisterCustomAction,
  unregisterRetryCallback,
  useDismissMessage,
  useMessageActions,
} from "./use-message-actions";
// Navigation guard hook
export {
  type IUseNavigationGuardReturn,
  useBlockingMessage,
  useIsNavigationBlocked,
  useNavigationGuard,
} from "./use-navigation-guard";
// Main system messages hook
export {
  type IUseSystemMessagesReturn,
  useConnectionStatus,
  useHasTakeover,
  useInlineBottomMessages,
  useInlineTopMessages,
  useModalMessages,
  useRouteSpecificMessages,
  useSystemMessages,
} from "./use-system-messages";
