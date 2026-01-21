/**
 * System Messages Feature
 *
 * Provides real-time system messages and announcements for the Open Blue Brain Platform.
 * Supports multiple display types: inline banners, modals, route-specific, and global takeovers.
 */

// API
export {
  checkRoute,
  getMessage,
  getMessage as getSystemMessage,
  getMessages,
  getSystemMessagesClient,
  type IRequestOptions,
  type IRouteCheckResponse,
  resetClient,
  SystemMessagesApiClient,
  SystemMessagesApiError,
} from "./api/client";
export { createSSEClient, SSEClient } from "./api/sse-client";

// Components
export {
  ActionButton,
  type IActionButtonProps,
} from "./components/action-button";
export {
  AriaAnnouncer,
  formatAnnouncementText,
  getAriaLivePoliteness,
  type IAriaAnnouncerProps,
} from "./components/aria-announcer";
export {
  GlobalTakeover,
  type IGlobalTakeoverProps,
} from "./components/global-takeover";
export {
  type IInlineBannerListProps,
  type IInlineBannerProps,
  InlineBanner,
  InlineBannerList,
} from "./components/inline-banner";
export {
  type IMessageContainerProps,
  InlineBottomContainer,
  InlineTopContainer,
  MessageContainer,
  MessageDebugPanel,
  ModalContainer,
} from "./components/message-container";
export {
  type IMessageModalProps,
  MessageModal,
} from "./components/message-modal";
export {
  type IMessageRendererProps,
  MessageRenderer,
} from "./components/message-renderer";
export {
  type IRouteSpecificMessageProps,
  RouteSpecificMessage,
  RouteSpecificMessageSkeleton,
} from "./components/route-specific-message";
export {
  type ISystemMessagesProviderProps,
  SystemMessagesProvider,
} from "./components/system-messages-provider";
export {
  type ISystemMessagesWrapperProps,
  SystemMessagesWrapper,
} from "./components/system-messages-wrapper";

// Constants
export * from "./constants";

// Hooks
export {
  getCustomAction,
  type IUseMessageActionsReturn,
  type IUseNavigationGuardReturn,
  type IUseSystemMessagesReturn,
  registerCustomAction,
  registerRetryCallback,
  type TCustomActionCallback,
  type TRetryCallback,
  unregisterCustomAction,
  unregisterRetryCallback,
  useBlockingMessage,
  useConnectionStatus,
  useDismissMessage,
  useHasTakeover,
  useInlineBottomMessages,
  useInlineTopMessages,
  useIsNavigationBlocked,
  useMessageActions,
  useModalMessages,
  useNavigationGuard,
  useRouteSpecificMessages,
  useSystemMessages,
} from "./hooks";

// State Management
export * from "./state";

// Types - explicitly export to avoid module resolution issues
export type {
  IApiError,
  IDismissalRecord,
  IMessageAction,
  IMessageFilters,
  IMessageSchedule,
  IMessageState,
  IMessageStyling,
  IMessageTargeting,
  IPaginatedResponse,
  IPaginationParams,
  ISingleResponse,
  ISSEClientCallbacks,
  ISSEClientConfig,
  ISSEEvent,
  ISystemMessage,
  ITargetingContext,
  ITemplateContext,
  TActivationMode,
  TConnectionStatus,
  TMessageActionType,
  TMessageContentType,
  TMessageDisplayType,
  TMessageSeverity,
  TMessageStatus,
  TSSEEventType,
} from "./types";
export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  createCircuitBreaker,
  type ICircuitBreakerConfig,
  type ICircuitBreakerStats,
  type TCircuitState,
} from "./utils/circuit-breaker";
// Utilities
export {
  compareBySeverityAndTime,
  filterByMinSeverity,
  getHighestPriority,
  getSeverityPriority,
  groupBySeverity,
  sortByPriority,
} from "./utils/priority-queue";
export {
  createTargetingContext,
  isAppRoute,
  isWebsiteRoute,
  matchesAnyRoute,
  matchesRoute,
  matchesTargeting,
} from "./utils/route-matcher";
export {
  containsDangerousHtml,
  type ISanitizeOptions,
  sanitizeHtml,
  sanitizeHtmlWithReport,
} from "./utils/sanitizer";
export {
  getNextActivationTime,
  type ICronSchedule,
  isMessageActive,
  isScheduleExpired,
  isWithinSchedule,
  matchesCronSchedule,
  parseCronExpression,
} from "./utils/schedule";
export {
  extractTemplateKeys,
  hasTemplatePlaceholders,
  type ISubstituteOptions,
  substituteTemplateVars,
} from "./utils/template";
