# Implementation Plan: System Messages

## Overview

This implementation plan breaks down the system messages feature into discrete, incremental tasks. Each task builds on previous work and includes property-based tests where applicable. The implementation follows a bottom-up approach: types → utilities → state → API → components → integration.

## Tasks

- [x] 1. Set up feature structure and core types
  - [x] 1.1 Create feature directory structure under `src/features/system-messages/`
    - Create folders: `api/`, `state/`, `hooks/`, `components/`, `utils/`, `__tests__/`
    - Create `index.ts` for public API exports
    - Create `constants.ts` for configuration values
    - _Requirements: 1.1, 6.5_

  - [x] 1.2 Implement TypeScript type definitions in `types.ts`
    - Define `TMessageSeverity`, `TMessageDisplayType`, `TMessageContentType`, `TMessageActionType` types
    - `TMessageDisplayType` includes: `inline-top`, `inline-bottom`, `modal`, `route-specific`, `global-takeover-full`, `global-takeover-app`, `global-takeover-website`
    - Define `IMessageAction`, `IMessageTargeting`, `IMessageSchedule`, `IMessageStyling` interfaces
    - Define `TMessageStatus`, `TActivationMode` types for activation control
    - Define `ISystemMessage` interface with all fields including activation control
    - Define `IMessageState`, `ISSEEvent`, `TConnectionStatus` types
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.7, 9.8_

  - [ ]* 1.3 Write property test for message structure validation
    - **Property 1: Message Structure Validation**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

- [x] 2. Implement utility functions
  - [x] 2.1 Implement template substitution utility in `utils/template.ts`
    - Create `substituteTemplateVars(content: string, context: Record<string, string>): string`
    - Handle `{{key}}` placeholder format
    - Handle missing keys gracefully (leave placeholder or empty)
    - _Requirements: 1.7, 4.3_

  - [ ]* 2.2 Write property test for template substitution
    - **Property 2: Template Substitution Round-Trip**
    - **Validates: Requirements 1.7, 4.3**

  - [x] 2.3 Implement HTML sanitization utility in `utils/sanitizer.ts`
    - Create `sanitizeHtml(html: string): string` using DOMPurify
    - Configure allowed tags: `p`, `a`, `strong`, `em`, `ul`, `ol`, `li`, `br`
    - Configure allowed attributes: `href`, `target`, `rel`, `class`
    - _Requirements: 4.1_

  - [ ]* 2.4 Write property test for HTML sanitization
    - **Property 8: HTML Sanitization**
    - **Validates: Requirements 4.1**

  - [x] 2.5 Implement priority queue utility in `utils/priority-queue.ts`
    - Create `compareBySeverityAndTime(a: SystemMessage, b: SystemMessage): number`
    - Create `sortByPriority(messages: SystemMessage[]): SystemMessage[]`
    - Severity order: critical > error > warning > info
    - Secondary sort by timestamp (newest first)
    - _Requirements: 3.7_

  - [ ]* 2.6 Write property test for priority ordering
    - **Property 6: Message Priority Ordering**
    - **Validates: Requirements 3.7**

  - [x] 2.7 Implement route matching utility in `utils/route-matcher.ts`
    - Create `matchesRoute(pattern: string, path: string): boolean` with glob support
    - Create `matchesTargeting(targeting: MessageTargeting, context: TargetingContext): boolean`
    - _Requirements: 3.4_

  - [ ]* 2.8 Write property test for route pattern matching
    - **Property 7: Route Pattern Matching**
    - **Validates: Requirements 3.4**

  - [x] 2.9 Implement schedule utilities in `utils/schedule.ts`
    - Create `isWithinSchedule(schedule: MessageSchedule): boolean`
    - Create `isMessageActive(message: SystemMessage): boolean` considering status and activation mode
    - Create `parseCronExpression(cron: string): CronSchedule`
    - _Requirements: 9.1, 9.2, 9.7, 9.8_

  - [ ]* 2.10 Write property test for schedule lifecycle
    - **Property 16: Schedule Lifecycle**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 3. Checkpoint - Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement state management with Jotai
  - [x] 4.1 Create core atoms in `state/atoms.ts`
    - Create `messagesAtom` for message list
    - Create `dismissedIdsAtom` with localStorage persistence using `atomWithStorage`
    - Create `connectionStatusAtom` for SSE connection state
    - Create `lastEventIdAtom` for SSE resumption
    - Create `errorAtom` for error state
    - _Requirements: 2.1, 10.1_

  - [x] 4.2 Create derived selectors in `state/selectors.ts`
    - Create `activeMessagesAtom` filtering by dismissals, schedule, targeting, and status
    - Create `globalTakeoverFullAtom` for full platform takeover
    - Create `globalTakeoverAppAtom` for /app/virtual-lab takeover
    - Create `globalTakeoverWebsiteAtom` for / website takeover
    - Create `inlineTopMessagesAtom`, `inlineBottomMessagesAtom`
    - Create `modalMessagesAtom`, `routeSpecificMessagesAtom`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 3.8, 10.2_

  - [x] 4.3 Implement dismissal management
    - Create `dismissMessageAtom` write atom for dismissing messages
    - Implement 30-day expiration cleanup for dismissal records
    - Handle `alwaysShow` flag to bypass dismissals
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 4.4 Write property test for dismissal persistence
    - **Property 19: Dismissal Persistence**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

  - [x] 4.5 Implement cache size management
    - Add cache eviction when exceeding 50 messages
    - Evict oldest messages by timestamp first
    - _Requirements: 6.3_

  - [ ]* 4.6 Write property test for cache size invariant
    - **Property 10: Cache Size Invariant**
    - **Validates: Requirements 6.3**

- [x] 5. Implement SSE client
  - [x] 5.1 Create SSE client class in `api/sse-client.ts`
    - Implement `SSEClient` class with connection management
    - Handle `message`, `update`, `delete`, `heartbeat` event types
    - Implement `connect(lastEventId?: string)` and `disconnect()` methods
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.2 Implement reconnection with exponential backoff
    - Initial delay: 1000ms, max delay: 30000ms
    - Formula: `delay = min(initialDelay * 2^attempts, maxDelay)`
    - Notify status change to 'reconnecting'
    - _Requirements: 2.4_

  - [ ]* 5.3 Write property test for SSE reconnection backoff
    - **Property 3: SSE Reconnection Backoff**
    - **Validates: Requirements 2.4**

  - [x] 5.4 Implement BroadcastChannel for tab synchronization
    - Elect leader tab for SSE connection
    - Broadcast received messages to follower tabs
    - Handle leader election on tab close
    - _Requirements: 6.2_

  - [x] 5.5 Implement fallback polling mechanism
    - Poll every 30 seconds when SSE is disconnected
    - Switch back to SSE when connection is restored
    - _Requirements: 2.5_

- [x] 6. Implement API client
  - [x] 6.1 Create message API client in `api/client.ts`
    - Extend existing `ApiClient` pattern
    - Implement `getMessages(filters?: MessageFilters): Promise<SystemMessage[]>`
    - Implement `getMessage(id: string): Promise<SystemMessage>`
    - _Requirements: 8.2, 8.3_

  - [x] 6.2 Implement circuit breaker pattern
    - Create `CircuitBreaker` class with threshold of 3 failures
    - Reset timeout of 60 seconds
    - Wrap API calls with circuit breaker
    - _Requirements: 11.5_

  - [ ]* 6.3 Write property test for error resilience
    - **Property 20: Error Resilience**
    - **Validates: Requirements 11.1, 11.3, 11.4, 11.5**

- [ ] 7. Checkpoint - Ensure API and state tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement React hooks
  - [x] 8.1 Create main hook in `hooks/use-system-messages.ts`
    - Return active messages by display type
    - Handle SSE connection lifecycle
    - Provide connection status
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 8.2 Create message actions hook in `hooks/use-message-actions.ts`
    - Implement `dismissMessage(id: string)` action
    - Implement `executeAction(action: MessageAction)` handler
    - Handle action callbacks (dismiss, retry, navigate, custom)
    - _Requirements: 4.6, 10.1_

  - [x] 8.3 Create navigation guard hook in `hooks/use-navigation-guard.ts`
    - Define route scope constants: `APP_ROUTES_PREFIX = '/app/virtual-lab'`
    - Implement `isAppRoute(pathname)` and `isWebsiteRoute(pathname)` helpers
    - Determine applicable takeover based on current route and takeover scope
    - Intercept Next.js router navigation (`push`, `replace`, `back`) for blocked scopes
    - Intercept link clicks and browser navigation within blocked scopes
    - Store pending navigation target
    - Release navigation when takeover clears
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 8.4 Write property test for navigation guard lifecycle
    - **Property 9: Navigation Guard Lifecycle**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

- [x] 9. Implement display components
  - [x] 9.1 Create MessageRenderer component in `components/message-renderer.tsx`
    - Handle HTML content with sanitization
    - Handle Markdown content with react-markdown
    - Handle JSON template content
    - Implement placeholder substitution
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 9.2 Create ActionButton component in `components/action-button.tsx`
    - Support primary, secondary, danger variants
    - Handle dismiss, retry, navigate, custom action types
    - Implement keyboard accessibility (Enter/Space activation)
    - _Requirements: 4.5, 4.6, 7.2_

  - [x] 9.3 Create InlineBanner component in `components/inline-banner.tsx`
    - Support top and bottom positioning
    - Implement severity-based styling (info, warning, error, critical)
    - Add dismiss button for dismissible messages
    - Implement enter/exit animations with Framer Motion
    - Support reduced motion preference
    - _Requirements: 3.1, 3.2, 7.5_

  - [x] 9.4 Create MessageModal component in `components/message-modal.tsx`
    - Implement centered dialog with backdrop
    - Add focus trapping within modal
    - Implement keyboard navigation (Tab, Escape)
    - Add ARIA attributes for accessibility
    - _Requirements: 3.3, 7.3_

  - [x] 9.5 Create GlobalTakeover component in `components/global-takeover.tsx`
    - Implement full-screen overlay with portal rendering
    - Support three scopes: `global-takeover-full`, `global-takeover-app`, `global-takeover-website`
    - Determine applicable takeover based on current pathname
    - Display scope-specific description (platform/app/website unavailable)
    - Add focus trapping (prevent Escape from closing)
    - Display pending navigation notice
    - Handle non-dismissible messages
    - Implement severity-based styling
    - _Requirements: 3.6, 3.7, 3.8, 3.9, 5.4, 7.3_

  - [x] 9.6 Create RouteSpecificMessage component in `components/route-specific-message.tsx`
    - Display message page for route-specific messages
    - Show original requested path to user
    - Implement severity-based styling
    - Include back navigation option
    - _Requirements: 3.4, 3.5, 5.8_

  - [x] 9.7 Create Next.js proxy for route interception
    - Create `proxy.ts` (Next.js 16 replaces middleware.ts) to check for route-specific messages
    - Rewrite matching routes to `/_system-message` page
    - Pass messageId and originalPath as query params
    - Configure matcher to exclude static files and API routes
    - _Requirements: 3.4, 3.5, 5.8_

  - [x] 9.8 Create system message page at `app/_system-message/page.tsx`
    - Render RouteSpecificMessage component
    - Handle loading states
    - _Requirements: 3.4, 3.5_

  - [ ]* 9.9 Write property test for display type rendering
    - **Property 5: Display Type Rendering**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

  - [ ]* 9.10 Write property test for route interception
    - **Property 10: Route Interception**
    - **Validates: Requirements 3.4, 3.5, 5.8**

  - [x] 9.11 Create MessageContainer component in `components/message-container.tsx`
    - Orchestrate rendering of all message types
    - Implement lazy loading of display components
    - Handle empty state (render nothing when no messages)
    - _Requirements: 6.1, 6.6_

  - [ ]* 9.12 Write property test for empty state rendering
    - **Property 11: Empty State Rendering**
    - **Validates: Requirements 6.6**

- [x] 10. Implement accessibility features
  - [x] 10.1 Add ARIA live region announcements
    - Create `AriaAnnouncer` component for screen reader announcements
    - Use `aria-live="polite"` for info/warning, `aria-live="assertive"` for error/critical
    - _Requirements: 7.1_

  - [ ]* 10.2 Write property test for ARIA announcements
    - **Property 12: ARIA Live Region Announcement**
    - **Validates: Requirements 7.1**

  - [ ]* 10.3 Write property test for keyboard accessibility
    - **Property 13: Keyboard Accessibility**
    - **Validates: Requirements 7.2**

  - [ ]* 10.4 Write property test for reduced motion support
    - **Property 14: Reduced Motion Support**
    - **Validates: Requirements 7.5**

- [ ] 11. Checkpoint - Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Create provider and integrate with app
  - [x] 12.1 Create SystemMessagesProvider in `components/system-messages-provider.tsx`
    - Initialize SSE connection on mount
    - Provide message state to children
    - Handle cleanup on unmount
    - _Requirements: 2.1, 2.6_

  - [x] 12.2 Update root layout to include SystemMessagesProvider
    - Add provider wrapper in `src/app/layout.tsx`
    - Add GlobalTakeover component
    - Add MessageContainer for inline messages
    - _Requirements: 3.5, 3.6_

  - [x] 12.3 Export public API from `index.ts`
    - Export types, hooks, and components
    - Export utility functions for external use
    - _Requirements: All_

- [x] 13. Implement manual activation control
  - [x] 13.1 Add activation mode handling to state selectors
    - Filter messages by `status === 'active'`
    - Handle `activationMode` in `isMessageActive` utility
    - Respect `manuallyDeactivated` flag
    - _Requirements: 9.7, 9.8, 9.11_

  - [ ]* 13.2 Write property test for manual activation control
    - **Property 17: Manual Activation Control**
    - **Validates: Requirements 9.7, 9.8, 9.9, 9.10, 9.11**

- [x] 14. Final checkpoint - Full integration test
  - Ensure all tests pass, ask the user if questions arise.
  - Verify bundle size is under 15KB gzipped for core functionality
  - Test SSE connection and reconnection
  - Test all display types render correctly
  - Test navigation blocking with global takeover
  - Test dismissal persistence across page reloads

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows the existing codebase patterns (Jotai, Tailwind, Framer Motion)
