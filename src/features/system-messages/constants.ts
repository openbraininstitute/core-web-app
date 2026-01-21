/**
 * System Messages Configuration Constants
 */

// SSE Connection Configuration
export const SSE_RECONNECT_INITIAL_DELAY = 1000; // 1 second
export const SSE_RECONNECT_MAX_DELAY = 30000; // 30 seconds
export const SSE_HEARTBEAT_TIMEOUT = 60000; // 60 seconds

// Polling Configuration (fallback when SSE is disconnected)
export const POLLING_INTERVAL = 30000; // 30 seconds

// Cache Configuration
export const MAX_CACHED_MESSAGES = 50;

// Dismissal Configuration
export const DISMISSAL_EXPIRATION_DAYS = 30;

// Route Scope Definitions
export const APP_ROUTES_PREFIX = "/app/virtual-lab";

// Circuit Breaker Configuration
export const CIRCUIT_BREAKER_THRESHOLD = 3; // failures before opening
export const CIRCUIT_BREAKER_RESET_TIMEOUT = 60000; // 60 seconds

// Scheduling Configuration
export const SCHEDULE_CHECK_INTERVAL = 60000; // 60 seconds

// LocalStorage Keys
export const STORAGE_KEY_DISMISSED_IDS = "system-messages-dismissed";
export const STORAGE_KEY_LAST_EVENT_ID = "system-messages-last-event-id";

// BroadcastChannel Name
export const BROADCAST_CHANNEL_NAME = "system-messages-sync";

// Severity Priority Order (higher index = higher priority)
export const SEVERITY_PRIORITY: Record<string, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

// Allowed HTML Tags for Sanitization
export const ALLOWED_HTML_TAGS = [
  "p",
  "a",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "br",
];

// Allowed HTML Attributes for Sanitization
export const ALLOWED_HTML_ATTRIBUTES = ["href", "target", "rel", "class"];
