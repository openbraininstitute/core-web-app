/**
 * System Messages Wrapper Component
 *
 * A client-side wrapper that provides system messages functionality
 * for the root layout. Includes the provider, global takeover, and message container.
 *
 * @module components/system-messages-wrapper
 */

'use client';

import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';

import { GlobalTakeover } from './global-takeover';
import { MessageContainer } from './message-container';
import { SystemMessagesProvider } from './system-messages-provider';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the SystemMessagesWrapper component.
 */
export interface ISystemMessagesWrapperProps {
  /** Child components to render */
  children: ReactNode;
  /** Optional initial targeting context */
  initialContext?: {
    userRoles?: string[];
    featureFlags?: string[];
  };
  /** Whether to automatically connect to SSE on mount (default: true) */
  autoConnect?: boolean;
  /** Custom SSE endpoint URL */
  sseUrl?: string;
  /** Whether to show the global takeover component (default: true) */
  showGlobalTakeover?: boolean;
  /** Whether to show the message container (default: true) */
  showMessageContainer?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * System Messages Wrapper Component.
 *
 * A complete wrapper that includes:
 * - JotaiProvider for state management
 * - SystemMessagesProvider for SSE connection
 * - GlobalTakeover for full-screen blocking messages
 * - MessageContainer for inline banners and modals
 *
 * Use this component in the root layout to enable system messages
 * across the entire application.
 *
 * @example
 * ```tsx
 * // In src/app/layout.tsx
 * import { SystemMessagesWrapper } from '@/features/system-messages';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SystemMessagesWrapper>
 *           {children}
 *         </SystemMessagesWrapper>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function SystemMessagesWrapper({
  children,
  initialContext,
  autoConnect = true,
  sseUrl,
  showGlobalTakeover = true,
  showMessageContainer = true,
}: ISystemMessagesWrapperProps) {
  return (
    <JotaiProvider>
      <SystemMessagesProvider
        initialContext={initialContext}
        autoConnect={autoConnect}
        sseUrl={sseUrl}
      >
        {children}
        {showGlobalTakeover && <GlobalTakeover />}
        {showMessageContainer && <MessageContainer />}
      </SystemMessagesProvider>
    </JotaiProvider>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default SystemMessagesWrapper;
