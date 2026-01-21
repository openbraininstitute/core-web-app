/**
 * System Messages Type Definitions
 *
 * Comprehensive TypeScript interfaces and types for the system messages feature.
 * These types define the structure of messages, their display configurations,
 * targeting rules, scheduling, and state management.
 */

// ============================================================================
// Core Enums and Type Aliases
// ============================================================================

/**
 * Message severity levels, ordered from lowest to highest priority.
 * Used for visual styling and priority ordering.
 */
export type TMessageSeverity = "info" | "warning" | "error" | "critical";

/**
 * Display type determines how and where the message is rendered.
 *
 * - `inline-top`: Dismissible banner at the top of the viewport
 * - `inline-bottom`: Dismissible banner at the bottom of the viewport
 * - `modal`: Centered dialog with backdrop overlay
 * - `route-specific`: Intercepts matching routes and replaces page content
 * - `global-takeover-full`: Full-screen overlay blocking entire platform
 * - `global-takeover-app`: Overlay blocking only /app/virtual-lab routes
 * - `global-takeover-website`: Overlay blocking only / routes (excluding /app/virtual-lab)
 */
export type TMessageDisplayType =
  | "inline-top"
  | "inline-bottom"
  | "modal"
  | "route-specific"
  | "global-takeover-full"
  | "global-takeover-app"
  | "global-takeover-website";

/**
 * Content type determines how the message body is parsed and rendered.
 */
export type TMessageContentType = "html" | "markdown" | "json";

/**
 * Action types define the behavior when a message action button is clicked.
 *
 * - `dismiss`: Dismisses the message
 * - `retry`: Retries a failed operation
 * - `navigate`: Navigates to a URL
 * - `custom`: Executes a custom callback
 */
export type TMessageActionType = "dismiss" | "retry" | "navigate" | "custom";

/**
 * Message status for lifecycle management.
 *
 * - `draft`: Message is created but not yet active
 * - `scheduled`: Message is scheduled for future activation
 * - `active`: Message is currently being displayed
 * - `inactive`: Message has been manually deactivated
 * - `expired`: Message has passed its end time
 */
export type TMessageStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "inactive"
  | "expired";

/**
 * Activation mode determines how a message becomes active.
 *
 * - `manual`: Only activated via explicit API call
 * - `scheduled`: Automatically activated at schedule_start time
 * - `immediate`: Active immediately upon creation
 */
export type TActivationMode = "manual" | "scheduled" | "immediate";

/**
 * SSE connection status for real-time updates.
 */
export type TConnectionStatus = "connected" | "disconnected" | "reconnecting";

// ============================================================================
// Message Action Interface
// ============================================================================

/**
 * Defines an interactive action button within a message.
 */
export interface IMessageAction {
  /** Unique identifier for the action */
  id: string;
  /** Button label text */
  label: string;
  /** Action type determining behavior on click */
  type: TMessageActionType;
  /** Visual style variant */
  variant: "primary" | "secondary" | "danger";
  /** URL for navigate actions */
  url?: string;
  /** Link target for navigate actions */
  target?: "_blank" | "_self";
  /** Rel attribute for links */
  rel?: string;
  /** Callback identifier for custom actions */
  callbackId?: string;
}

// ============================================================================
// Message Targeting Interface
// ============================================================================

/**
 * Defines targeting rules for message display.
 * Messages are shown only when all specified conditions are met.
 */
export interface IMessageTargeting {
  /** Glob patterns for route matching (e.g., '/app/**', '/explore/*') */
  routes?: string[];
  /** Required user roles to see the message */
  userRoles?: string[];
  /** Required feature flags to be enabled */
  featureFlags?: string[];
}

// ============================================================================
// Message Schedule Interface
// ============================================================================

/**
 * Defines the scheduling configuration for a message.
 */
export interface IMessageSchedule {
  /** ISO 8601 datetime for when the message should become active */
  startTime?: string;
  /** ISO 8601 datetime for when the message should be deactivated */
  endTime?: string;
  /** IANA timezone identifier (e.g., 'America/New_York', 'UTC') */
  timezone: string;
  /** Cron expression for recurring schedules */
  recurring?: string;
}

// ============================================================================
// Message Styling Interface
// ============================================================================

/**
 * Defines custom styling options for a message.
 */
export interface IMessageStyling {
  /** Custom CSS class to apply to the message container */
  customClass?: string;
  /** Theme variant override */
  themeVariant?: "light" | "dark" | "system";
  /** Custom icon identifier to override default severity icon */
  iconOverride?: string;
}

// ============================================================================
// System Message Interface
// ============================================================================

/**
 * Complete system message object with all properties.
 */
export interface ISystemMessage {
  /** Unique identifier (UUID) */
  id: string;
  /** Message title/headline */
  title: string;
  /** Message body content */
  content: string;
  /** Content format type */
  contentType: TMessageContentType;
  /** Severity level for styling and priority */
  severity: TMessageSeverity;
  /** Display type determining rendering location/style */
  displayType: TMessageDisplayType;
  /** Whether the message can be dismissed by the user */
  dismissible: boolean;
  /** Whether to show even if previously dismissed */
  alwaysShow: boolean;
  /** Interactive action buttons */
  actions: IMessageAction[];
  /** Targeting rules for conditional display */
  targeting: IMessageTargeting;
  /** Scheduling configuration */
  schedule: IMessageSchedule;
  /** Custom styling options */
  styling: IMessageStyling;
  /** Additional metadata for extensibility */
  metadata: Record<string, unknown>;

  // Activation Control
  /** Current lifecycle status */
  status: TMessageStatus;
  /** How the message becomes active */
  activationMode: TActivationMode;
  /** Computed: true if status === 'active' */
  isActive: boolean;
  /** If true, scheduling won't reactivate this message */
  manuallyDeactivated: boolean;
  /** When the message was last activated */
  activatedAt?: string;
  /** When the message was last deactivated */
  deactivatedAt?: string;

  // Timestamps
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last update timestamp */
  updatedAt: string;
  /** Version number for optimistic concurrency */
  version: number;
}

// ============================================================================
// State Management Types
// ============================================================================

/**
 * Client-side message state managed by Jotai.
 */
export interface IMessageState {
  /** List of all fetched messages */
  messages: ISystemMessage[];
  /** Set of dismissed message IDs */
  dismissedIds: Set<string>;
  /** Current SSE connection status */
  connectionStatus: TConnectionStatus;
  /** Last received SSE event ID for resumption */
  lastEventId: string | null;
  /** Current error state, if any */
  error: Error | null;
}

/**
 * Dismissal record stored in localStorage.
 */
export interface IDismissalRecord {
  /** Message ID that was dismissed */
  messageId: string;
  /** ISO 8601 timestamp when dismissed */
  dismissedAt: string;
  /** Message version at time of dismissal */
  messageVersion: number;
}

// ============================================================================
// SSE Event Types
// ============================================================================

/**
 * SSE event types for real-time message updates.
 */
export type TSSEEventType = "message" | "update" | "delete" | "heartbeat";

/**
 * SSE event payload structure.
 */
export interface ISSEEvent {
  /** Event type */
  type: TSSEEventType;
  /** Event data - full message for message/update, id only for delete, null for heartbeat */
  data: ISystemMessage | { id: string } | null;
  /** Unique event ID for resumption */
  id: string;
  /** ISO 8601 timestamp of the event */
  timestamp: string;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Filters for querying messages from the API.
 */
export interface IMessageFilters {
  /** Filter by status */
  status?: TMessageStatus | TMessageStatus[];
  /** Filter by severity */
  severity?: TMessageSeverity | TMessageSeverity[];
  /** Filter by display type */
  displayType?: TMessageDisplayType | TMessageDisplayType[];
  /** Filter by date range start */
  startDate?: string;
  /** Filter by date range end */
  endDate?: string;
  /** Include soft-deleted messages */
  includeDeleted?: boolean;
}

/**
 * Pagination parameters for list queries.
 */
export interface IPaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
}

/**
 * Paginated response wrapper.
 */
export interface IPaginatedResponse<T> {
  /** Response data */
  data: T[];
  /** Pagination metadata */
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

/**
 * Single item response wrapper.
 */
export interface ISingleResponse<T> {
  /** Response data */
  data: T;
}

/**
 * API error response structure.
 */
export interface IApiError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Detailed validation errors, if applicable */
  details?: Array<{
    field: string;
    message: string;
  }>;
  /** Retry-after seconds for rate limiting */
  retryAfter?: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Context for template variable substitution.
 */
export interface ITemplateContext {
  /** User's display name */
  userName?: string;
  /** Support email address */
  supportEmail?: string;
  /** Original requested path (for route-specific messages) */
  originalPath?: string;
  /** Any additional context values */
  [key: string]: string | undefined;
}

/**
 * Targeting context for evaluating message visibility.
 */
export interface ITargetingContext {
  /** Current route pathname */
  pathname: string;
  /** Current user's roles */
  userRoles: string[];
  /** Currently enabled feature flags */
  featureFlags: string[];
}

// ============================================================================
// SSE Client Types
// ============================================================================

/**
 * Configuration for the SSE client.
 */
export interface ISSEClientConfig {
  /** SSE endpoint URL */
  url: string;
  /** Initial reconnection delay in milliseconds */
  reconnectDelay: number;
  /** Maximum reconnection delay in milliseconds */
  maxReconnectDelay: number;
  /** Heartbeat timeout in milliseconds */
  heartbeatTimeout: number;
}

/**
 * Callback handlers for SSE client events.
 */
export interface ISSEClientCallbacks {
  /** Called when a message event is received */
  onMessage: (event: ISSEEvent) => void;
  /** Called when connection status changes */
  onStatusChange: (status: TConnectionStatus) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}
