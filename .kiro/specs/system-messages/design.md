# Design Document: System Messages

## Overview

This design document outlines the architecture for a production-ready system messages and announcements feature for the Open Blue Brain Platform. The solution provides real-time message delivery via Server-Sent Events (SSE), multiple display mechanisms (inline alerts, modals, route-specific, global takeovers), rich templating with dynamic content, and comprehensive lifecycle management.

### Design Principles

1. **Performance First**: Lazy loading, shared connections, minimal bundle impact
2. **Resilience**: Graceful degradation, circuit breakers, fallback mechanisms
3. **Accessibility**: WCAG 2.1 AA compliance, screen reader support, keyboard navigation
4. **Developer Experience**: Type-safe APIs, clear abstractions, testable components
5. **Scalability**: Efficient state management, optimized re-renders, memory-conscious caching

### Technology Choices

| Concern | Choice | Justification |
|---------|--------|---------------|
| State Management | Jotai | Already used in codebase, atomic updates, minimal boilerplate |
| Real-time | SSE | Lower overhead than WebSockets, automatic reconnection, HTTP/2 multiplexing |
| Styling | Tailwind + CSS Modules | Consistent with existing codebase, design system integration |
| Animation | Framer Motion | Already in dependencies, GPU-accelerated, respects reduced motion |
| Markdown | react-markdown | Already in dependencies, GFM support, customizable renderers |
| API Client | Existing ApiClient | Consistent patterns, built-in caching, retry logic |

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Browser                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  SSE Client     │  │ Message Manager │  │    Display Controller       │  │
│  │  (Singleton)    │──│  (Jotai Store)  │──│  (React Components)         │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
│           │                    │                         │                   │
│           │           ┌────────┴────────┐               │                   │
│           │           │ Navigation Guard │               │                   │
│           │           │ (Next.js Router) │               │                   │
│           │           └─────────────────┘               │                   │
│           │                                              │                   │
│  ┌────────┴────────────────────────────────────────────┴───────────────┐   │
│  │                    BroadcastChannel (Tab Sync)                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS/SSE
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Message API    │  │ Scheduling      │  │    SSE Broadcaster          │  │
│  │  (REST)         │──│ Engine          │──│    (Event Emitter)          │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────────────────┘  │
│           │                    │                                             │
│  ┌────────┴────────────────────┴────────────────────────────────────────┐   │
│  │                         Database (PostgreSQL)                         │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
src/
├── features/
│   └── system-messages/
│       ├── index.ts                    # Public API exports
│       ├── types.ts                    # TypeScript interfaces
│       ├── constants.ts                # Configuration constants
│       │
│       ├── api/
│       │   ├── client.ts               # API client for messages
│       │   └── sse-client.ts           # SSE connection manager
│       │
│       ├── state/
│       │   ├── atoms.ts                # Jotai atoms for message state
│       │   └── selectors.ts            # Derived state selectors
│       │
│       ├── hooks/
│       │   ├── use-system-messages.ts  # Main hook for consuming messages
│       │   ├── use-message-actions.ts  # Hook for message interactions
│       │   └── use-navigation-guard.ts # Hook for route blocking
│       │
│       ├── components/
│       │   ├── system-messages-provider.tsx  # Context provider
│       │   ├── message-container.tsx         # Orchestrates display
│       │   ├── inline-banner.tsx             # Top/bottom banners
│       │   ├── message-modal.tsx             # Modal display
│       │   ├── global-takeover.tsx           # Full-screen overlay
│       │   ├── route-specific-message.tsx    # Route interception display
│       │   ├── message-renderer.tsx          # Content rendering
│       │   └── action-button.tsx             # Interactive buttons
│       │
│       └── utils/
│           ├── sanitizer.ts            # HTML sanitization
│           ├── template.ts             # Placeholder substitution
│           └── priority-queue.ts       # Message ordering
```

## Components and Interfaces

### Core Types

```typescript
// types.ts

export type TMessageSeverity = 'info' | 'warning' | 'error' | 'critical';

export type TMessageDisplayType = 
  | 'inline-top' 
  | 'inline-bottom' 
  | 'modal' 
  | 'route-specific' 
  | 'global-takeover-full'      // Blocks entire platform (/ and /app/virtual-lab)
  | 'global-takeover-app'       // Blocks only /app/virtual-lab routes
  | 'global-takeover-website';  // Blocks only / routes (excluding /app/virtual-lab)

export type TMessageContentType = 'html' | 'markdown' | 'json';

export type TMessageActionType = 'dismiss' | 'retry' | 'navigate' | 'custom';

export interface IMessageAction {
  id: string;
  label: string;
  type: TMessageActionType;
  variant: 'primary' | 'secondary' | 'danger';
  url?: string;
  target?: '_blank' | '_self';
  callbackId?: string;
}

export interface IMessageTargeting {
  routes?: string[];           // Glob patterns for route matching
  userRoles?: string[];        // Required user roles
  featureFlags?: string[];     // Required feature flags
}

export interface IMessageSchedule {
  startTime?: string;          // ISO 8601 datetime (optional - can use manual activation)
  endTime?: string;            // ISO 8601 datetime
  timezone: string;            // IANA timezone
  recurring?: string;          // Cron expression for recurring
}

// Message status for manual activation control
export type TMessageStatus = 'draft' | 'scheduled' | 'active' | 'inactive' | 'expired';

// Activation mode determines how the message becomes active
export type TActivationMode = 'manual' | 'scheduled' | 'immediate';

export interface IMessageStyling {
  customClass?: string;
  themeVariant?: 'light' | 'dark' | 'system';
  iconOverride?: string;
}

export interface ISystemMessage {
  id: string;
  title: string;
  content: string;
  contentType: TMessageContentType;
  severity: TMessageSeverity;
  displayType: TMessageDisplayType;
  dismissible: boolean;
  alwaysShow: boolean;
  actions: IMessageAction[];
  targeting: IMessageTargeting;
  schedule: IMessageSchedule;
  styling: IMessageStyling;
  metadata: Record<string, unknown>;
  // Activation control
  status: TMessageStatus;           // Current status (draft, scheduled, active, inactive, expired)
  activationMode: TActivationMode;  // How the message becomes active
  isActive: boolean;               // Computed: true if status === 'active'
  manuallyDeactivated: boolean;    // If true, scheduling won't reactivate
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface IMessageState {
  messages: ISystemMessage[];
  dismissedIds: Set<string>;
  connectionStatus: TConnectionStatus;
  lastEventId: string | null;
  error: Error | null;
}

export type TConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface ISSEEvent {
  type: 'message' | 'update' | 'delete' | 'heartbeat';
  data: ISystemMessage | { id: string } | null;
  id: string;
  timestamp: string;
}
```

### SSE Client

```typescript
// api/sse-client.ts

export interface ISSEClientConfig {
  url: string;
  reconnectDelay: number;
  maxReconnectDelay: number;
  heartbeatTimeout: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  
  constructor(
    private config: ISSEClientConfig,
    private onMessage: (event: ISSEEvent) => void,
    private onStatusChange: (status: TConnectionStatus) => void
  ) {
    this.initBroadcastChannel();
  }

  connect(lastEventId?: string): void {
    // Establish SSE connection with Last-Event-ID header
    // Set up event listeners for message, error, open
    // Start heartbeat monitoring
  }

  disconnect(): void {
    // Clean up EventSource, timers, and BroadcastChannel
  }

  private handleReconnect(): void {
    // Exponential backoff: delay = min(initialDelay * 2^attempts, maxDelay)
    // Notify status change to 'reconnecting'
  }

  private initBroadcastChannel(): void {
    // Share connection state across tabs
    // Elect leader tab for SSE connection
    // Broadcast received messages to follower tabs
  }
}
```

### State Management

```typescript
// state/atoms.ts

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Core message state
export const messagesAtom = atom<ISystemMessage[]>([]);

// Dismissed message IDs persisted to localStorage
export const dismissedIdsAtom = atomWithStorage<string[]>(
  'system-messages-dismissed',
  []
);

// Connection status
export const connectionStatusAtom = atom<TConnectionStatus>('disconnected');

// Last received event ID for resumption
export const lastEventIdAtom = atom<string | null>(null);

// Derived: Active messages (filtered by dismissals and targeting)
export const activeMessagesAtom = atom((get) => {
  const messages = get(messagesAtom);
  const dismissedIds = new Set(get(dismissedIdsAtom));
  
  return messages
    .filter(msg => !dismissedIds.has(msg.id) || msg.alwaysShow)
    .filter(msg => isWithinSchedule(msg.schedule))
    .filter(msg => matchesTargeting(msg.targeting))
    .sort(compareBySeverityAndTime);
});

// Derived: Global takeover messages by scope
export const globalTakeoverFullAtom = atom((get) => {
  const active = get(activeMessagesAtom);
  return active.find(msg => msg.displayType === 'global-takeover-full') ?? null;
});

export const globalTakeoverAppAtom = atom((get) => {
  const active = get(activeMessagesAtom);
  return active.find(msg => msg.displayType === 'global-takeover-app') ?? null;
});

export const globalTakeoverWebsiteAtom = atom((get) => {
  const active = get(activeMessagesAtom);
  return active.find(msg => msg.displayType === 'global-takeover-website') ?? null;
});

// Combined: Get applicable takeover for current route
export const applicableTakeoverAtom = atom((get) => {
  const full = get(globalTakeoverFullAtom);
  if (full) return full;
  
  // Route-based takeover selection happens in the hook
  // based on current pathname
  return null;
});

// Derived: Inline messages by position
export const inlineTopMessagesAtom = atom((get) => {
  const active = get(activeMessagesAtom);
  return active.filter(msg => msg.displayType === 'inline-top');
});

export const inlineBottomMessagesAtom = atom((get) => {
  const active = get(activeMessagesAtom);
  return active.filter(msg => msg.displayType === 'inline-bottom');
});

// Derived: Modal messages
export const modalMessagesAtom = atom((get) => {
  const active = get(activeMessagesAtom);
  return active.filter(msg => msg.displayType === 'modal');
});
```

### Navigation Guard Hook

```typescript
// hooks/use-navigation-guard.ts

import { useRouter, usePathname } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';

// Route scope definitions
const APP_ROUTES_PREFIX = '/app/virtual-lab';
const WEBSITE_ROUTES = '/'; // Everything not under /app/virtual-lab

function isAppRoute(pathname: string): boolean {
  return pathname.startsWith(APP_ROUTES_PREFIX);
}

function isWebsiteRoute(pathname: string): boolean {
  return !pathname.startsWith(APP_ROUTES_PREFIX);
}

export function useNavigationGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const globalTakeoverFull = useAtomValue(globalTakeoverFullAtom);
  const globalTakeoverApp = useAtomValue(globalTakeoverAppAtom);
  const globalTakeoverWebsite = useAtomValue(globalTakeoverWebsiteAtom);
  const pendingNavigation = useRef<string | null>(null);

  // Determine which takeover applies to current route
  const applicableTakeover = (() => {
    if (globalTakeoverFull) return globalTakeoverFull;
    if (isAppRoute(pathname) && globalTakeoverApp) return globalTakeoverApp;
    if (isWebsiteRoute(pathname) && globalTakeoverWebsite) return globalTakeoverWebsite;
    return null;
  })();

  // Check if a target route is blocked
  const isRouteBlocked = (targetPath: string): boolean => {
    if (globalTakeoverFull) return true;
    if (isAppRoute(targetPath) && globalTakeoverApp) return true;
    if (isWebsiteRoute(targetPath) && globalTakeoverWebsite) return true;
    return false;
  };

  useEffect(() => {
    if (!applicableTakeover) {
      // Release navigation if takeover cleared
      if (pendingNavigation.current) {
        router.push(pendingNavigation.current);
        pendingNavigation.current = null;
      }
      return;
    }

    // ... rest of navigation interception logic
  }, [applicableTakeover, router, pathname]);

  return {
    isBlocked: !!applicableTakeover,
    blockedMessage: applicableTakeover,
    blockScope: applicableTakeover?.displayType,
    pendingNavigation: pendingNavigation.current,
    isRouteBlocked,
    clearPending: () => { pendingNavigation.current = null; }
  };
}
```

### Route Interceptor for Route-Specific Messages

The Route Interceptor pattern allows route-specific messages to replace page content without requiring if/else logic in individual page components. This is implemented using Next.js 16's `proxy.ts` file (formerly `middleware.ts`) + layout wrapper pattern.

```typescript
// proxy.ts (Next.js 16 proxy for route interception - replaces middleware.ts)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Check for route-specific messages via API
  // This is a lightweight check that returns only matching message IDs
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/system-messages/check-route?path=${encodeURIComponent(pathname)}`,
    { headers: { 'x-internal-request': 'true' } }
  );
  
  if (response.ok) {
    const { hasBlockingMessage, messageId } = await response.json();
    
    if (hasBlockingMessage) {
      // Rewrite to the system message page instead of the actual route
      const url = request.nextUrl.clone();
      url.pathname = '/_system-message';
      url.searchParams.set('messageId', messageId);
      url.searchParams.set('originalPath', pathname);
      return NextResponse.rewrite(url);
    }
  }
  
  return NextResponse.next();
}

// Matcher config for proxy
export const config = {
  matcher: [
    // Match all routes except static files and API routes
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
    },
  ],
};
```

```typescript
// app/_system-message/page.tsx (Route-specific message display page)

import { Suspense } from 'react';
import { RouteSpecificMessage } from '@/features/system-messages/components/route-specific-message';

interface IPageProps {
  searchParams: Promise<{
    messageId: string;
    originalPath: string;
  }>;
}

export default async function SystemMessagePage({ searchParams }: IPageProps) {
  const params = await searchParams;
  
  return (
    <Suspense fallback={<SystemMessageSkeleton />}>
      <RouteSpecificMessage 
        messageId={params.messageId}
        originalPath={params.originalPath}
      />
    </Suspense>
  );
}
```

```typescript
// components/route-specific-message.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageRenderer } from './message-renderer';
import { ActionButton } from './action-button';
import { getSystemMessage } from '../api/client';
import type { TMessageSeverity } from '../types';

interface IRouteSpecificMessageProps {
  messageId: string;
  originalPath: string;
}

export function RouteSpecificMessage({ messageId, originalPath }: IRouteSpecificMessageProps) {
  const { data: message, isLoading } = useQuery({
    queryKey: ['system-message', messageId],
    queryFn: () => getSystemMessage(messageId),
  });

  if (isLoading || !message) {
    return <SystemMessageSkeleton />;
  }

  const severityStyles: Record<TMessageSeverity, string> = {
    info: 'from-blue-50 to-blue-100 border-blue-500',
    warning: 'from-amber-50 to-amber-100 border-amber-500',
    error: 'from-red-50 to-red-100 border-red-500',
    critical: 'from-red-100 to-red-200 border-red-700',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          max-w-2xl w-full mx-4 p-8 rounded-2xl shadow-xl
          bg-gradient-to-br ${severityStyles[message.severity]}
          border-l-4
        `}
      >
        <div className="flex items-center gap-3 mb-6">
          <SeverityIcon severity={message.severity} size="large" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{message.title}</h1>
            <p className="text-sm text-gray-500">
              This feature is temporarily unavailable
            </p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none mb-6 text-gray-700">
          <MessageRenderer
            content={message.content}
            contentType={message.contentType}
            context={{ originalPath }}
          />
        </div>

        {/* Show what route was blocked */}
        <div className="mb-6 p-3 bg-white/50 rounded-lg text-sm">
          <span className="text-gray-500">Requested page: </span>
          <code className="text-gray-700 bg-gray-200 px-1 rounded">{originalPath}</code>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {message.actions.map((action) => (
            <ActionButton key={action.id} action={action} />
          ))}
          
          {/* Default back button */}
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
```

### Global Takeover (Full Page Blocker) Component

The Global Takeover is a critical component that completely blocks user navigation until the system message is acknowledged, expired, or deactivated. It supports three scopes:

- **global-takeover-full**: Blocks the entire platform (both "/" website and "/app/virtual-lab" application)
- **global-takeover-app**: Blocks only the "/app/virtual-lab" application routes
- **global-takeover-website**: Blocks only the "/" website routes (excluding "/app/virtual-lab")

```typescript
// components/GlobalTakeover.tsx

'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { 
  globalTakeoverFullAtom, 
  globalTakeoverAppAtom, 
  globalTakeoverWebsiteAtom,
  dismissMessageAtom 
} from '../state/atoms';
import { MessageRenderer } from './MessageRenderer';
import { ActionButton } from './ActionButton';
import { useNavigationGuard } from '../hooks/use-navigation-guard';

const APP_ROUTES_PREFIX = '/app/virtual-lab';

interface GlobalTakeoverProps {
  onAcknowledge?: (messageId: string) => void;
}

export function GlobalTakeover({ onAcknowledge }: GlobalTakeoverProps) {
  const pathname = usePathname();
  const fullTakeover = useAtomValue(globalTakeoverFullAtom);
  const appTakeover = useAtomValue(globalTakeoverAppAtom);
  const websiteTakeover = useAtomValue(globalTakeoverWebsiteAtom);
  const dismissMessage = useSetAtom(dismissMessageAtom);
  const { isBlocked, pendingNavigation, clearPending } = useNavigationGuard();
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Determine which takeover applies to current route
  const isAppRoute = pathname.startsWith(APP_ROUTES_PREFIX);
  const message = (() => {
    if (fullTakeover) return fullTakeover;
    if (isAppRoute && appTakeover) return appTakeover;
    if (!isAppRoute && websiteTakeover) return websiteTakeover;
    return null;
  })();

  // Get scope description for display
  const scopeDescription = (() => {
    if (!message) return '';
    switch (message.displayType) {
      case 'global-takeover-full':
        return 'The entire platform is currently unavailable.';
      case 'global-takeover-app':
        return 'The application is currently unavailable. You can still access the main website.';
      case 'global-takeover-website':
        return 'The website is currently unavailable. You can still access the application.';
      default:
        return '';
    }
  })();

  // Store the previously focused element to restore later
  useEffect(() => {
    if (message) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [message]);

  // Focus trap - keep focus within the takeover
  useEffect(() => {
    if (!message || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Escape from closing (must acknowledge)
      if (e.key === 'Escape') {
        e.preventDefault();
        return;
      }

      // Tab trap
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [message]);

  // Restore focus when takeover is dismissed
  useEffect(() => {
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  const handleAcknowledge = useCallback(() => {
    if (!message) return;
    
    if (message.dismissible) {
      dismissMessage(message.id);
    }
    onAcknowledge?.(message.id);
    
    // If there was a pending navigation, offer to continue
    if (pendingNavigation) {
      // Navigation will be handled by useNavigationGuard when message clears
    }
  }, [message, dismissMessage, onAcknowledge, pendingNavigation]);

  if (!message) return null;

  const severityStyles = {
    info: 'bg-blue-50 border-blue-500',
    warning: 'bg-amber-50 border-amber-500',
    error: 'bg-red-50 border-red-500',
    critical: 'bg-red-100 border-red-700',
  };

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="takeover-title"
        aria-describedby="takeover-content"
      >
        {/* Backdrop - blocks all interaction */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          aria-hidden="true"
        />
        
        {/* Content container */}
        <motion.div
          ref={containerRef}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`
            relative z-10 w-full max-w-2xl mx-4 p-8 rounded-2xl shadow-2xl
            border-l-4 ${severityStyles[message.severity]}
          `}
        >
          {/* Severity indicator */}
          <div className="flex items-center gap-3 mb-4">
            <SeverityIcon severity={message.severity} />
            <h1 
              id="takeover-title"
              className="text-2xl font-bold text-gray-900"
            >
              {message.title}
            </h1>
          </div>

          {/* Scope description */}
          <p className="text-sm text-gray-500 mb-4">{scopeDescription}</p>

          {/* Message content */}
          <div 
            id="takeover-content"
            className="prose prose-sm max-w-none mb-6 text-gray-700"
          >
            <MessageRenderer
              content={message.content}
              contentType={message.contentType}
            />
          </div>

          {/* Pending navigation notice */}
          {pendingNavigation && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
              Your navigation to <code className="bg-gray-200 px-1 rounded">{pendingNavigation}</code> is pending. 
              It will continue after you acknowledge this message.
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-end">
            {message.actions.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                onComplete={action.type === 'dismiss' ? handleAcknowledge : undefined}
              />
            ))}
            
            {/* Default acknowledge button if no dismiss action */}
            {!message.actions.some(a => a.type === 'dismiss') && message.dismissible && (
              <button
                onClick={handleAcknowledge}
                className="px-6 py-2 bg-primary-8 text-white rounded-lg font-medium
                         hover:bg-primary-9 focus:outline-none focus:ring-2 
                         focus:ring-primary-8 focus:ring-offset-2 transition-colors"
              >
                I Understand
              </button>
            )}
          </div>

          {/* Non-dismissible notice */}
          {!message.dismissible && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              This message cannot be dismissed. It will be removed when the system status changes.
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Render in portal to ensure it's above everything
  return typeof document !== 'undefined' 
    ? createPortal(content, document.body) 
    : null;
}

function SeverityIcon({ severity }: { severity: MessageSeverity }) {
  const icons = {
    info: '🔵',
    warning: '⚠️',
    error: '❌',
    critical: '🚨',
  };
  return <span className="text-2xl" aria-hidden="true">{icons[severity]}</span>;
}
```

### Global Takeover Integration in Layout

The GlobalTakeover component must be integrated at the root layout level to ensure it can block all navigation:

```typescript
// In src/app/layout.tsx or a dedicated provider

import { GlobalTakeover } from '@/features/system-messages/components/GlobalTakeover';
import { SystemMessagesProvider } from '@/features/system-messages/components/SystemMessagesProvider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SystemMessagesProvider>
          {children}
          {/* Global takeover renders above everything via portal */}
          <GlobalTakeover />
        </SystemMessagesProvider>
      </body>
    </html>
  );
}
```

### Navigation Blocking Mechanism

The navigation blocking works at multiple levels:

1. **Next.js Router Interception**: Patches `router.push`, `router.replace`, and `router.back` to prevent programmatic navigation
2. **Link Click Interception**: Intercepts clicks on `<Link>` components and `<a>` tags
3. **Browser Navigation**: Uses `beforeunload` event to warn about leaving the page
4. **History API**: Intercepts `popstate` events to prevent back/forward navigation

```typescript
// hooks/use-navigation-guard.ts (extended)

export function useNavigationGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const globalTakeover = useAtomValue(globalTakeoverAtom);
  const pendingNavigation = useRef<string | null>(null);
  const originalMethods = useRef<{
    push: typeof router.push;
    replace: typeof router.replace;
    back: typeof router.back;
  } | null>(null);

  useEffect(() => {
    if (!globalTakeover) {
      // Restore original methods
      if (originalMethods.current) {
        Object.assign(router, originalMethods.current);
        originalMethods.current = null;
      }
      
      // Execute pending navigation
      if (pendingNavigation.current) {
        const target = pendingNavigation.current;
        pendingNavigation.current = null;
        router.push(target);
      }
      return;
    }

    // Store original methods
    originalMethods.current = {
      push: router.push.bind(router),
      replace: router.replace.bind(router),
      back: router.back.bind(router),
    };

    // Intercept all navigation methods
    router.push = (href: string) => {
      pendingNavigation.current = href;
      console.warn('[NavigationGuard] Navigation blocked:', href);
    };

    router.replace = (href: string) => {
      pendingNavigation.current = href;
      console.warn('[NavigationGuard] Navigation blocked:', href);
    };

    router.back = () => {
      console.warn('[NavigationGuard] Back navigation blocked');
    };

    // Intercept browser navigation
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      // Push current state back to prevent navigation
      window.history.pushState(null, '', pathname);
    };

    // Intercept page unload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'A system message requires your attention.';
      return e.returnValue;
    };

    // Intercept link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.href && !link.href.startsWith('javascript:')) {
        e.preventDefault();
        e.stopPropagation();
        pendingNavigation.current = link.href;
        console.warn('[NavigationGuard] Link click blocked:', link.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, true);

    // Push initial state to enable popstate interception
    window.history.pushState(null, '', pathname);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
      
      if (originalMethods.current) {
        Object.assign(router, originalMethods.current);
      }
    };
  }, [globalTakeover, router, pathname]);

  return {
    isBlocked: !!globalTakeover,
    blockedMessage: globalTakeover,
    pendingNavigation: pendingNavigation.current,
    clearPending: () => { pendingNavigation.current = null; },
  };
}
```

### Message Renderer Component

```typescript
// components/MessageRenderer.tsx

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

interface MessageRendererProps {
  content: string;
  contentType: MessageContentType;
  context?: Record<string, string>;
}

export function MessageRenderer({ 
  content, 
  contentType, 
  context = {} 
}: MessageRendererProps) {
  // Substitute placeholders: {{key}} -> context[key]
  const processedContent = substituteTemplateVars(content, context);

  switch (contentType) {
    case 'html':
      return (
        <div 
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(processedContent, {
              ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'ul', 'ol', 'li', 'br'],
              ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
            })
          }} 
        />
      );
    
    case 'markdown':
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            a: ({ href, children }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-8 underline hover:text-primary-9"
              >
                {children}
              </a>
            )
          }}
        >
          {processedContent}
        </ReactMarkdown>
      );
    
    case 'json':
      return <JsonTemplateRenderer template={processedContent} context={context} />;
    
    default:
      return <p>{processedContent}</p>;
  }
}
```

## Data Models

### Database Schema (PostgreSQL)

```sql
-- System Messages Table
CREATE TABLE system_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(20) NOT NULL DEFAULT 'markdown',
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  display_type VARCHAR(30) NOT NULL DEFAULT 'inline-top',
  dismissible BOOLEAN NOT NULL DEFAULT true,
  always_show BOOLEAN NOT NULL DEFAULT false,
  actions JSONB NOT NULL DEFAULT '[]',
  targeting JSONB NOT NULL DEFAULT '{}',
  -- Scheduling (optional - can use manual activation instead)
  schedule_start TIMESTAMPTZ,
  schedule_end TIMESTAMPTZ,
  schedule_timezone VARCHAR(50) DEFAULT 'UTC',
  schedule_recurring VARCHAR(100),
  -- Activation control
  activation_mode VARCHAR(20) NOT NULL DEFAULT 'manual',  -- 'manual', 'scheduled', 'immediate'
  status VARCHAR(20) NOT NULL DEFAULT 'draft',            -- 'draft', 'scheduled', 'active', 'inactive', 'expired'
  manually_deactivated BOOLEAN NOT NULL DEFAULT false,    -- Prevents auto-reactivation
  activated_at TIMESTAMPTZ,                               -- When the message was last activated
  deactivated_at TIMESTAMPTZ,                             -- When the message was last deactivated
  -- Styling and metadata
  styling JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  CONSTRAINT valid_display_type CHECK (display_type IN ('inline-top', 'inline-bottom', 'modal', 'route-specific', 'global-takeover-full', 'global-takeover-app', 'global-takeover-website')),
  CONSTRAINT valid_content_type CHECK (content_type IN ('html', 'markdown', 'json')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'scheduled', 'active', 'inactive', 'expired')),
  CONSTRAINT valid_activation_mode CHECK (activation_mode IN ('manual', 'scheduled', 'immediate'))
);

-- Indexes for common queries
CREATE INDEX idx_messages_status ON system_messages(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_active ON system_messages(status) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_messages_schedule ON system_messages(schedule_start, schedule_end) WHERE activation_mode = 'scheduled';
CREATE INDEX idx_messages_severity ON system_messages(severity, created_at DESC);

-- Message Dismissals Table (for server-side tracking if needed)
CREATE TABLE message_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES system_messages(id),
  user_id UUID,
  session_id VARCHAR(255),
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_dismissal UNIQUE (message_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE(session_id, ''))
);
```

### Activation Modes

The system supports three activation modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| `manual` | Message is activated/deactivated only via API calls | Ad-hoc announcements, emergency alerts |
| `scheduled` | Message activates at `schedule_start` and deactivates at `schedule_end` | Planned maintenance windows |
| `immediate` | Message is active immediately upon creation | Urgent system-wide alerts |

### Status Transitions

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
┌─────────┐    ┌───────────┐    ┌────────┐    ┌──────────┐   │
│  draft  │───▶│ scheduled │───▶│ active │───▶│ inactive │───┘
└─────────┘    └───────────┘    └────────┘    └──────────┘
     │              │                │              │
     │              │                │              │
     │              ▼                ▼              ▼
     │         ┌─────────┐     ┌─────────┐    ┌─────────┐
     └────────▶│ active  │     │ expired │    │ expired │
               └─────────┘     └─────────┘    └─────────┘
               (immediate)     (end time)     (end time)

Transitions:
- draft → scheduled: When schedule is set and activation_mode = 'scheduled'
- draft → active: When activation_mode = 'immediate' or manual activation
- scheduled → active: When current_time >= schedule_start
- active → inactive: Manual deactivation via API
- active → expired: When current_time >= schedule_end
- inactive → active: Manual reactivation (only if manually_deactivated = false)
```

### API Response Types

```typescript
// API response for listing messages
interface MessagesListResponse {
  data: SystemMessage[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

// API response for single message
interface MessageResponse {
  data: SystemMessage;
}

// API request for creating/updating messages
interface MessageCreateRequest {
  title: string;
  content: string;
  contentType?: MessageContentType;
  severity?: MessageSeverity;
  displayType?: MessageDisplayType;
  dismissible?: boolean;
  alwaysShow?: boolean;
  actions?: MessageAction[];
  targeting?: MessageTargeting;
  schedule?: {
    startTime?: string;
    endTime?: string;
    timezone?: string;
    recurring?: string;
  };
  styling?: MessageStyling;
  metadata?: Record<string, unknown>;
}

// SSE stream event format
interface SSEStreamEvent {
  event: 'message' | 'update' | 'delete' | 'heartbeat';
  id: string;
  data: string; // JSON stringified SystemMessage or { id: string }
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties have been identified. Properties have been consolidated where multiple acceptance criteria test related behaviors.

### Property 1: Message Structure Validation

*For any* SystemMessage object, it SHALL contain all required fields (id, title, content, contentType, severity, displayType) with valid values according to their type constraints, and optional fields (schedule, targeting, styling, actions) SHALL conform to their respective schemas when present.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

### Property 2: Template Substitution Round-Trip

*For any* message content string containing placeholders in the format `{{key}}` and *for any* context object with matching keys, the Message_Renderer SHALL substitute all placeholders with their corresponding context values, and the resulting string SHALL contain no unsubstituted placeholders for keys present in the context.

**Validates: Requirements 1.7, 4.3**

### Property 3: SSE Reconnection Backoff

*For any* sequence of SSE connection failures, the reconnection delay SHALL follow exponential backoff where delay(n) = min(initialDelay × 2^n, maxDelay), and the delay SHALL never exceed the configured maximum.

**Validates: Requirements 2.4**

### Property 4: Message Update Propagation

*For any* message update event received via SSE, the Message_Manager state SHALL reflect the updated message properties within the same event loop tick, and *for any* message delete event, the message SHALL be removed from the active messages list.

**Validates: Requirements 2.3**

### Property 5: Display Type Rendering

*For any* SystemMessage with a valid displayType, the Display_Controller SHALL render it in the correct position/format: "inline-top" renders at viewport top, "inline-bottom" renders at viewport bottom, "modal" renders as centered dialog, "route-specific" intercepts the route and renders message page instead of actual content, "global-takeover-full" renders full-screen overlay blocking entire platform, "global-takeover-app" renders overlay blocking only /app/virtual-lab routes, and "global-takeover-website" renders overlay blocking only / routes.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

### Property 6: Message Priority Ordering

*For any* collection of active messages, the Priority_Queue SHALL order them such that messages with higher severity appear before lower severity (critical > error > warning > info), and within the same severity level, newer messages (by timestamp) appear before older ones.

**Validates: Requirements 3.7**

### Property 7: Route Pattern Matching

*For any* message with route-specific targeting and *for any* current route path, the message SHALL be displayed if and only if the current route matches at least one of the configured route patterns using glob matching semantics.

**Validates: Requirements 3.4**

### Property 8: HTML Sanitization

*For any* HTML content string, the Message_Renderer SHALL remove all script tags, event handlers, and dangerous attributes while preserving safe structural tags (p, a, strong, em, ul, ol, li, br) and safe attributes (href, target, rel, class).

**Validates: Requirements 4.1**

### Property 9: Navigation Guard Lifecycle

*For any* global-takeover message, the Navigation_Guard SHALL block navigation attempts within the applicable scope: "global-takeover-full" blocks all routes, "global-takeover-app" blocks only /app/virtual-lab routes, "global-takeover-website" blocks only / routes. The guard SHALL preserve the intended navigation target and release navigation control immediately when the message is acknowledged or expires. *For any* sequence of multiple global-takeover messages within the same scope, they SHALL be displayed in priority order requiring sequential acknowledgment.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

### Property 10: Route Interception

*For any* route-specific message with a configured route pattern, WHEN a user navigates to a matching route, the Route_Interceptor SHALL replace the entire page content with the message display page without requiring modifications to individual page components. The original requested path SHALL be preserved and displayed to the user.

**Validates: Requirements 3.4, 3.5, 5.8**

### Property 10: Cache Size Invariant

*For any* sequence of message additions to the Message_Manager cache, the cache size SHALL never exceed 50 messages, and when the limit is reached, the oldest messages by timestamp SHALL be evicted first.

**Validates: Requirements 6.3**

### Property 11: Empty State Rendering

*For any* state where no active messages exist, the Display_Controller SHALL render zero DOM nodes for message display components.

**Validates: Requirements 6.6**

### Property 12: ARIA Live Region Announcement

*For any* new message added to the active messages list, the Display_Controller SHALL announce it via ARIA live region with politeness level "polite" for info/warning severity and "assertive" for error/critical severity.

**Validates: Requirements 7.1**

### Property 13: Keyboard Accessibility

*For any* interactive element within a rendered message (buttons, links), the element SHALL be focusable via keyboard (tabindex >= 0), have a visible focus indicator, and respond to Enter/Space key activation.

**Validates: Requirements 7.2**

### Property 14: Reduced Motion Support

*For any* animation in the message display system, WHEN the user has prefers-reduced-motion set to "reduce", the animation SHALL be disabled or replaced with an instant transition.

**Validates: Requirements 7.5**

### Property 15: Soft Delete Behavior

*For any* message that has been soft-deleted via the DELETE endpoint, the message SHALL not appear in list queries but SHALL still exist in the database with a non-null deleted_at timestamp.

**Validates: Requirements 8.5**

### Property 16: Schedule Lifecycle

*For any* message with a scheduled start time and activation mode "scheduled", the message SHALL transition to "active" status when current time >= start time. *For any* message with a scheduled end time, the message SHALL transition to "inactive" status when current time >= end time. *For any* message that has been manually deactivated, the Scheduling_Engine SHALL not reactivate it regardless of schedule.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 17: Manual Activation Control

*For any* message with activation mode "manual", the message SHALL only become active when explicitly activated via the activate endpoint, regardless of any schedule configuration. *For any* message with activation mode "immediate", the message SHALL be active immediately upon creation. *For any* manually deactivated message, the manuallyDeactivated flag SHALL be true and prevent automatic reactivation.

**Validates: Requirements 9.7, 9.8, 9.9, 9.10, 9.11**

### Property 18: Cron Expression Parsing

*For any* valid cron expression in the recurring schedule field, the Scheduling_Engine SHALL correctly calculate the next activation time according to standard cron semantics (minute, hour, day-of-month, month, day-of-week).

**Validates: Requirements 9.4**

### Property 19: Dismissal Persistence

*For any* dismissible message that a user dismisses, the dismissal SHALL be stored with the message ID and timestamp. *For any* subsequent message load, dismissed messages SHALL be filtered out unless the message has been updated since dismissal or is marked as "always show". Dismissal records older than 30 days SHALL be automatically expired.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

### Property 20: Error Resilience

*For any* API error, the Message_Manager SHALL continue operating with cached messages. *For any* render error, the Message_Renderer SHALL display a fallback with the message title. *For any* callback error, the Display_Controller SHALL catch the error and display a notification. After 3 consecutive API failures, the circuit breaker SHALL disable API calls for 60 seconds.

**Validates: Requirements 11.1, 11.3, 11.4, 11.5**

## Error Handling

### Client-Side Error Handling

| Error Type | Handling Strategy | User Impact |
|------------|-------------------|-------------|
| SSE Connection Failure | Exponential backoff reconnection, fallback to polling | None (transparent) |
| API Request Failure | Retry with backoff, use cached data, circuit breaker | Stale messages possible |
| Render Error | Catch and display fallback message | Degraded message display |
| Action Callback Error | Catch, log, show error notification | Action may not complete |
| localStorage Unavailable | Fall back to sessionStorage | Dismissals not persisted across sessions |

### Server-Side Error Handling

| Error Type | Handling Strategy | Response |
|------------|-------------------|----------|
| Validation Error | Return 400 with detailed error messages | `{ error: { code: 'VALIDATION_ERROR', details: [...] } }` |
| Not Found | Return 404 | `{ error: { code: 'NOT_FOUND', message: '...' } }` |
| Database Error | Log, return 500 with generic message | `{ error: { code: 'INTERNAL_ERROR', message: '...' } }` |
| Rate Limit | Return 429 with retry-after header | `{ error: { code: 'RATE_LIMITED', retryAfter: 60 } }` |

### Circuit Breaker Implementation

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure: number | null = null;
  private readonly threshold = 3;
  private readonly resetTimeout = 60000; // 60 seconds

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures < this.threshold) return false;
    if (Date.now() - (this.lastFailure ?? 0) > this.resetTimeout) {
      this.reset();
      return false;
    }
    return true;
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
  }

  private reset(): void {
    this.failures = 0;
    this.lastFailure = null;
  }
}
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, integration points, and error conditions
- **Property tests**: Verify universal properties hold across all valid inputs using randomized testing

### Property-Based Testing Configuration

- **Library**: fast-check (TypeScript property-based testing library)
- **Minimum iterations**: 100 per property test
- **Shrinking**: Enabled for minimal counterexamples
- **Seed**: Configurable for reproducibility

### Test Organization

```
src/features/system-messages/
├── __tests__/
│   ├── unit/
│   │   ├── message-renderer.test.ts
│   │   ├── sse-client.test.ts
│   │   ├── navigation-guard.test.ts
│   │   └── priority-queue.test.ts
│   │
│   ├── properties/
│   │   ├── message-validation.property.ts
│   │   ├── template-substitution.property.ts
│   │   ├── priority-ordering.property.ts
│   │   ├── route-matching.property.ts
│   │   ├── html-sanitization.property.ts
│   │   ├── schedule-lifecycle.property.ts
│   │   ├── dismissal-persistence.property.ts
│   │   └── error-resilience.property.ts
│   │
│   └── integration/
│       ├── api-endpoints.test.ts
│       └── sse-stream.test.ts
```

### Property Test Annotation Format

Each property test must be annotated with:
- Feature name
- Property number from design document
- Requirements it validates

Example:
```typescript
/**
 * Feature: system-messages
 * Property 6: Message Priority Ordering
 * Validates: Requirements 3.7
 */
describe('Property 6: Message Priority Ordering', () => {
  it('orders messages by severity then timestamp', () => {
    fc.assert(
      fc.property(
        fc.array(arbitrarySystemMessage(), { minLength: 2, maxLength: 20 }),
        (messages) => {
          const sorted = sortByPriority(messages);
          return isSortedBySeverityThenTimestamp(sorted);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Generators for Property Tests

```typescript
// Arbitrary generators for property-based testing
import * as fc from 'fast-check';

const arbitrarySeverity = fc.constantFrom('info', 'warning', 'error', 'critical');

const arbitraryDisplayType = fc.constantFrom(
  'inline-top', 'inline-bottom', 'modal', 'route-specific', 'global-takeover'
);

const arbitraryContentType = fc.constantFrom('html', 'markdown', 'json');

const arbitraryMessageAction = fc.record({
  id: fc.uuid(),
  label: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom('dismiss', 'retry', 'navigate', 'custom'),
  variant: fc.constantFrom('primary', 'secondary', 'danger'),
  url: fc.option(fc.webUrl()),
  target: fc.option(fc.constantFrom('_blank', '_self')),
});

const arbitrarySystemMessage = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 255 }),
  content: fc.string({ minLength: 1, maxLength: 10000 }),
  contentType: arbitraryContentType,
  severity: arbitrarySeverity,
  displayType: arbitraryDisplayType,
  dismissible: fc.boolean(),
  alwaysShow: fc.boolean(),
  actions: fc.array(arbitraryMessageAction, { maxLength: 5 }),
  targeting: fc.record({
    routes: fc.option(fc.array(fc.string(), { maxLength: 10 })),
    userRoles: fc.option(fc.array(fc.string(), { maxLength: 5 })),
    featureFlags: fc.option(fc.array(fc.string(), { maxLength: 5 })),
  }),
  schedule: fc.record({
    startTime: fc.date().map(d => d.toISOString()),
    endTime: fc.option(fc.date().map(d => d.toISOString())),
    timezone: fc.constant('UTC'),
  }),
  styling: fc.record({
    customClass: fc.option(fc.string()),
    themeVariant: fc.option(fc.constantFrom('light', 'dark', 'system')),
  }),
  metadata: fc.dictionary(fc.string(), fc.jsonValue()),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString()),
  version: fc.nat(),
});

const arbitraryTemplateWithPlaceholders = fc.tuple(
  fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
  fc.string({ minLength: 0, maxLength: 100 })
).map(([keys, baseText]) => {
  const placeholders = keys.map(k => `{{${k}}}`).join(' ');
  const context = Object.fromEntries(keys.map(k => [k, fc.sample(fc.string(), 1)[0]]));
  return { template: `${baseText} ${placeholders}`, context, keys };
});
```

### Unit Test Coverage Requirements

| Component | Coverage Target | Focus Areas |
|-----------|-----------------|-------------|
| SSEClient | 90% | Connection lifecycle, reconnection, event parsing |
| MessageManager | 85% | State updates, filtering, caching |
| MessageRenderer | 90% | All content types, sanitization, placeholders |
| NavigationGuard | 85% | Blocking, releasing, pending navigation |
| PriorityQueue | 95% | Sorting correctness, edge cases |
| API Client | 80% | Request/response handling, error cases |
