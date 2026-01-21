# Requirements Document

## Introduction

This document defines the requirements for a robust, scalable system messages and announcements feature for the Open Blue Brain Platform web application. The feature enables administrators to communicate maintenance notices, system alerts, internal issues, and general announcements to end users through various display mechanisms including inline alerts, modals, route-specific displays, and global takeovers.

## Glossary

- **System_Message**: A structured notification object containing content, metadata, display configuration, and lifecycle information
- **Message_Manager**: The client-side service responsible for fetching, caching, and managing system messages
- **Display_Controller**: The component responsible for rendering messages according to their display type and priority
- **SSE_Client**: The Server-Sent Events client that maintains a persistent connection for real-time message updates
- **Navigation_Guard**: The mechanism that blocks route navigation when a global takeover message is active
- **Message_Renderer**: The component that transforms message content (HTML/Markdown/JSON) into rendered UI
- **Priority_Queue**: The data structure that orders messages by priority and timestamp for display
- **Message_API**: The backend REST API for CRUD operations on system messages
- **Scheduling_Engine**: The backend service that activates/deactivates messages based on start/end times

## Requirements

### Requirement 1: Message Data Model

**User Story:** As a system administrator, I want a comprehensive message data model, so that I can create rich, targeted announcements with full lifecycle control.

#### Acceptance Criteria

1. THE System_Message SHALL contain a unique identifier, title, content body, severity level (info, warning, error, critical), and display type (inline, modal, route-specific, global-takeover)
2. THE System_Message SHALL contain scheduling metadata including start time, end time, and timezone
3. THE System_Message SHALL contain targeting rules including route patterns, user roles, and feature flags
4. THE System_Message SHALL contain action definitions including button labels, URLs, and callback identifiers (retry, contact-support, dismiss)
5. THE System_Message SHALL contain styling overrides including custom CSS classes and theme variants
6. WHEN a System_Message is created THEN the Message_API SHALL validate all required fields and return appropriate error messages for invalid data
7. THE System_Message SHALL support content in HTML, Markdown, and JSON template formats with dynamic placeholder substitution

### Requirement 2: Real-Time Message Delivery

**User Story:** As an end user, I want to receive system messages in real-time, so that I am immediately informed of important announcements without refreshing the page.

#### Acceptance Criteria

1. WHEN the application loads THEN the SSE_Client SHALL establish a persistent connection to the message stream endpoint
2. WHEN a new message is published THEN the SSE_Client SHALL receive the message within 2 seconds
3. WHEN a message is updated or deactivated THEN the SSE_Client SHALL receive the update and the Display_Controller SHALL reflect the change immediately
4. IF the SSE connection is lost THEN the SSE_Client SHALL attempt reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)
5. WHILE the SSE connection is disconnected THEN the Message_Manager SHALL fall back to polling every 30 seconds
6. WHEN the SSE connection is re-established THEN the SSE_Client SHALL request any missed messages since the last received timestamp

### Requirement 3: Message Display Types

**User Story:** As a system administrator, I want multiple display options for messages, so that I can choose the appropriate presentation based on message urgency and context.

#### Acceptance Criteria

1. WHEN a message has display type "inline-top" THEN the Display_Controller SHALL render it as a dismissible banner at the top of the viewport
2. WHEN a message has display type "inline-bottom" THEN the Display_Controller SHALL render it as a dismissible banner at the bottom of the viewport
3. WHEN a message has display type "modal" THEN the Display_Controller SHALL render it as a centered dialog with backdrop overlay
4. WHEN a message has display type "route-specific" THEN the Display_Controller SHALL intercept the matching route and render the message page instead of the actual page content
5. WHEN a route-specific message is active THEN the system SHALL use a route interceptor pattern to replace page content without requiring if/else logic in individual page components
6. WHEN a message has display type "global-takeover-full" THEN the Navigation_Guard SHALL block all navigation across the entire platform (both "/" website and "/app/virtual-lab" application routes)
7. WHEN a message has display type "global-takeover-app" THEN the Navigation_Guard SHALL block navigation only within the "/app/virtual-lab" application routes while allowing access to the "/" website routes
8. WHEN a message has display type "global-takeover-website" THEN the Navigation_Guard SHALL block navigation only within the "/" website routes while allowing access to the "/app/virtual-lab" application routes
9. WHILE any global-takeover message is active THEN the Display_Controller SHALL render a full-screen overlay blocking the affected content area
10. WHEN multiple messages are active THEN the Priority_Queue SHALL order them by severity (critical > error > warning > info) then by timestamp (newest first)

### Requirement 4: Message Rendering and Templating

**User Story:** As a system administrator, I want rich templating capabilities, so that I can create dynamic, branded messages with interactive elements.

#### Acceptance Criteria

1. WHEN message content is HTML THEN the Message_Renderer SHALL sanitize and render it preserving safe tags and attributes
2. WHEN message content is Markdown THEN the Message_Renderer SHALL parse and render it with support for GFM extensions
3. WHEN message content contains placeholders (e.g., {{userName}}, {{supportEmail}}) THEN the Message_Renderer SHALL substitute them with context values
4. THE Message_Renderer SHALL support embedded links with configurable target (_blank, _self) and rel attributes
5. THE Message_Renderer SHALL support action buttons with configurable styles (primary, secondary, danger) and click handlers
6. WHEN an action button is clicked THEN the Display_Controller SHALL execute the configured callback (dismiss, retry, navigate, custom)
7. THE Message_Renderer SHALL apply consistent styling from the application design system while allowing per-message overrides

### Requirement 5: Navigation Control

**User Story:** As a system administrator, I want to control user navigation during critical system states, so that users cannot access potentially broken functionality.

#### Acceptance Criteria

1. WHEN a global-takeover-full message is active THEN the Navigation_Guard SHALL intercept all navigation attempts across the entire platform
2. WHEN a global-takeover-app message is active THEN the Navigation_Guard SHALL intercept navigation attempts only within "/app/virtual-lab" routes
3. WHEN a global-takeover-website message is active THEN the Navigation_Guard SHALL intercept navigation attempts only within "/" website routes (excluding "/app/virtual-lab")
4. WHEN a user attempts to navigate to a blocked area THEN the Navigation_Guard SHALL display the takeover message instead of navigating
5. WHEN a global-takeover message is acknowledged or expires THEN the Navigation_Guard SHALL release navigation control immediately
6. THE Navigation_Guard SHALL preserve the intended navigation target and offer to redirect after acknowledgment
7. IF multiple global-takeover messages are active for the same scope THEN the Navigation_Guard SHALL display them in priority order, requiring sequential acknowledgment
8. WHEN a route-specific message targets a route pattern THEN the Route_Interceptor SHALL replace the entire page content with the message display without modifying individual page components

### Requirement 6: Performance and Efficiency

**User Story:** As a developer, I want the system messages feature to have minimal performance impact, so that the application remains fast and responsive.

#### Acceptance Criteria

1. THE Message_Manager SHALL lazy-load message display components only when messages are present
2. THE SSE_Client SHALL use a single shared connection across all browser tabs via BroadcastChannel API
3. THE Message_Manager SHALL cache active messages in memory with a maximum of 50 messages
4. WHEN rendering messages THEN the Display_Controller SHALL use CSS transforms for animations to avoid layout thrashing
5. THE system messages bundle SHALL not exceed 15KB gzipped for the core functionality
6. WHEN no messages are active THEN the Display_Controller SHALL render nothing (zero DOM nodes)

### Requirement 7: Accessibility

**User Story:** As a user with disabilities, I want system messages to be fully accessible, so that I can perceive and interact with all announcements.

#### Acceptance Criteria

1. THE Display_Controller SHALL announce new messages to screen readers using ARIA live regions with appropriate politeness (polite for info/warning, assertive for error/critical)
2. THE Message_Renderer SHALL ensure all interactive elements are keyboard accessible with visible focus indicators
3. WHEN a modal message is displayed THEN the Display_Controller SHALL trap focus within the modal and return focus to the trigger element on close
4. THE Message_Renderer SHALL maintain a minimum color contrast ratio of 4.5:1 for all text content
5. THE Display_Controller SHALL support reduced motion preferences by disabling animations when prefers-reduced-motion is set
6. WHEN a message contains an image THEN the Message_Renderer SHALL require alt text or mark it as decorative

### Requirement 8: Backend API

**User Story:** As a system administrator, I want a comprehensive API for managing messages, so that I can create, update, and control announcements programmatically.

#### Acceptance Criteria

1. THE Message_API SHALL provide a POST /api/system-messages endpoint for creating new messages with validation
2. THE Message_API SHALL provide a GET /api/system-messages endpoint for listing messages with filtering by status, severity, and date range
3. THE Message_API SHALL provide a GET /api/system-messages/:id endpoint for retrieving a single message
4. THE Message_API SHALL provide a PATCH /api/system-messages/:id endpoint for updating message properties
5. THE Message_API SHALL provide a DELETE /api/system-messages/:id endpoint for soft-deleting messages
6. THE Message_API SHALL provide a POST /api/system-messages/:id/activate endpoint for manually activating a scheduled message
7. THE Message_API SHALL provide a POST /api/system-messages/:id/deactivate endpoint for immediately deactivating an active message
8. THE Message_API SHALL provide a GET /api/system-messages/stream endpoint for SSE connections with message filtering

### Requirement 9: Scheduling and Lifecycle

**User Story:** As a system administrator, I want to schedule messages in advance or manually control their activation, so that I can prepare announcements for planned maintenance windows or respond to emergencies immediately.

#### Acceptance Criteria

1. WHEN a message has a start time in the future and activation mode is "scheduled" THEN the Scheduling_Engine SHALL activate it automatically at the specified time
2. WHEN a message has an end time THEN the Scheduling_Engine SHALL deactivate it automatically at the specified time
3. WHEN a message is manually deactivated THEN the Scheduling_Engine SHALL not reactivate it even if within the scheduled window
4. THE Message_API SHALL support recurring schedules with cron-like expressions for repeated announcements
5. WHEN a scheduled message is modified THEN the Scheduling_Engine SHALL recalculate activation times immediately
6. THE Scheduling_Engine SHALL process schedule checks every 60 seconds with drift compensation
7. WHEN activation mode is "manual" THEN the message SHALL only become active via explicit API call to the activate endpoint
8. WHEN activation mode is "immediate" THEN the message SHALL become active immediately upon creation
9. THE Message_API SHALL provide a POST /api/system-messages/:id/activate endpoint for manually activating any message regardless of schedule
10. THE Message_API SHALL provide a POST /api/system-messages/:id/deactivate endpoint for manually deactivating any active message
11. WHEN a message is manually deactivated THEN the system SHALL set the manuallyDeactivated flag to prevent automatic reactivation

### Requirement 10: State Persistence

**User Story:** As an end user, I want my message dismissals to be remembered, so that I don't see the same announcement repeatedly.

#### Acceptance Criteria

1. WHEN a user dismisses a dismissible message THEN the Message_Manager SHALL store the dismissal in localStorage with the message ID and timestamp
2. WHEN loading messages THEN the Message_Manager SHALL filter out previously dismissed messages unless they have been updated since dismissal
3. THE Message_Manager SHALL expire dismissal records after 30 days to prevent localStorage bloat
4. WHEN a message is marked as "always show" THEN the Message_Manager SHALL display it regardless of previous dismissals
5. IF localStorage is unavailable THEN the Message_Manager SHALL fall back to session-based dismissal tracking

### Requirement 11: Error Handling

**User Story:** As a developer, I want robust error handling, so that the system messages feature degrades gracefully under failure conditions.

#### Acceptance Criteria

1. IF the Message_API returns an error THEN the Message_Manager SHALL log the error and continue with cached messages
2. IF the SSE connection fails to establish THEN the SSE_Client SHALL fall back to polling without user-visible errors
3. IF message content fails to render THEN the Message_Renderer SHALL display a fallback message with the raw title
4. IF a message action callback throws an error THEN the Display_Controller SHALL log the error and display a generic error notification
5. THE Message_Manager SHALL implement circuit breaker pattern, disabling API calls for 60 seconds after 3 consecutive failures
