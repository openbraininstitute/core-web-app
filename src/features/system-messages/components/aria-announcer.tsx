/**
 * ARIA Announcer Component
 *
 * Provides screen reader announcements for system messages using ARIA live regions.
 * Uses appropriate politeness levels based on message severity:
 * - `aria-live="polite"` for info/warning messages
 * - `aria-live="assertive"` for error/critical messages
 *
 * @module components/aria-announcer
 */

'use client';

import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';

import { activeMessagesAtom } from '../state/selectors';
import type { ISystemMessage, TMessageSeverity } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the AriaAnnouncer component.
 */
export interface IAriaAnnouncerProps {
  /** Additional CSS class name for the container */
  className?: string;
  /** Delay in ms before announcing a message (allows for visual rendering first) */
  announceDelay?: number;
  /** Whether to include message content in announcements (default: false, title only) */
  includeContent?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default delay before announcing messages */
const DEFAULT_ANNOUNCE_DELAY = 100;

/** Time to keep announcement in live region before clearing */
const ANNOUNCEMENT_DURATION = 1000;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Determines the appropriate aria-live politeness level based on severity.
 *
 * @param severity - Message severity level
 * @returns 'assertive' for error/critical, 'polite' for info/warning
 */
export function getAriaLivePoliteness(severity: TMessageSeverity): 'polite' | 'assertive' {
  switch (severity) {
    case 'error':
    case 'critical':
      return 'assertive';
    case 'info':
    case 'warning':
    default:
      return 'polite';
  }
}

/**
 * Formats a message for screen reader announcement.
 *
 * @param message - System message to format
 * @param includeContent - Whether to include message content
 * @returns Formatted announcement text
 */
export function formatAnnouncementText(message: ISystemMessage, includeContent = false): string {
  const severityLabel = getSeverityLabel(message.severity);
  const parts = [severityLabel, message.title];

  if (includeContent && message.content) {
    // Strip HTML tags for plain text announcement
    const plainContent = stripHtmlTags(message.content);
    if (plainContent) {
      parts.push(plainContent);
    }
  }

  return parts.join(': ');
}

/**
 * Gets a human-readable label for the severity level.
 */
function getSeverityLabel(severity: TMessageSeverity): string {
  switch (severity) {
    case 'critical':
      return 'Critical alert';
    case 'error':
      return 'Error';
    case 'warning':
      return 'Warning';
    case 'info':
    default:
      return 'Information';
  }
}

/**
 * Strips HTML tags from content for plain text announcement.
 */
function stripHtmlTags(html: string): string {
  // Simple regex-based stripping for announcement purposes
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// Component
// ============================================================================

/**
 * ARIA Announcer component for screen reader announcements.
 *
 * This component maintains two visually hidden live regions:
 * - One with `aria-live="polite"` for info/warning messages
 * - One with `aria-live="assertive"` for error/critical messages
 *
 * When new messages appear, they are announced to screen readers
 * using the appropriate politeness level based on severity.
 *
 * @example
 * ```tsx
 * // In root layout or provider
 * <AriaAnnouncer />
 *
 * // With content included in announcements
 * <AriaAnnouncer includeContent />
 * ```
 */
export function AriaAnnouncer({
  className = '',
  announceDelay = DEFAULT_ANNOUNCE_DELAY,
  includeContent = false,
}: IAriaAnnouncerProps) {
  // Track active messages
  const activeMessages = useAtomValue(activeMessagesAtom);

  // Track previously seen message IDs to detect new messages
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  // Announcement state for each politeness level
  const [politeAnnouncement, setPoliteAnnouncement] = useState('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('');

  // Clear announcement timers
  const politeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const assertiveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to detect and announce new messages
  useEffect(() => {
    const currentIds = new Set(activeMessages.map((m) => m.id));
    const seenIds = seenMessageIdsRef.current;

    // Find new messages (not previously seen)
    const newMessages = activeMessages.filter((m) => !seenIds.has(m.id));

    // Update seen IDs
    seenMessageIdsRef.current = currentIds;

    // Announce new messages
    if (newMessages.length > 0) {
      // Group by politeness level
      const politeMessages = newMessages.filter(
        (m) => getAriaLivePoliteness(m.severity) === 'polite'
      );
      const assertiveMessages = newMessages.filter(
        (m) => getAriaLivePoliteness(m.severity) === 'assertive'
      );

      // Schedule announcements with delay
      if (politeMessages.length > 0) {
        setTimeout(() => {
          const text = politeMessages
            .map((m) => formatAnnouncementText(m, includeContent))
            .join('. ');
          setPoliteAnnouncement(text);

          // Clear after duration
          if (politeTimerRef.current) {
            clearTimeout(politeTimerRef.current);
          }
          politeTimerRef.current = setTimeout(() => {
            setPoliteAnnouncement('');
          }, ANNOUNCEMENT_DURATION);
        }, announceDelay);
      }

      if (assertiveMessages.length > 0) {
        setTimeout(() => {
          const text = assertiveMessages
            .map((m) => formatAnnouncementText(m, includeContent))
            .join('. ');
          setAssertiveAnnouncement(text);

          // Clear after duration
          if (assertiveTimerRef.current) {
            clearTimeout(assertiveTimerRef.current);
          }
          assertiveTimerRef.current = setTimeout(() => {
            setAssertiveAnnouncement('');
          }, ANNOUNCEMENT_DURATION);
        }, announceDelay);
      }
    }
  }, [activeMessages, announceDelay, includeContent]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (politeTimerRef.current) {
        clearTimeout(politeTimerRef.current);
      }
      if (assertiveTimerRef.current) {
        clearTimeout(assertiveTimerRef.current);
      }
    };
  }, []);

  // Visually hidden styles for screen reader only content
  const srOnlyStyles: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  };

  return (
    <div className={className} data-testid="aria-announcer">
      {/* Polite live region for info/warning messages */}
      <output
        aria-live="polite"
        aria-atomic="true"
        style={srOnlyStyles}
        data-testid="aria-announcer-polite"
      >
        {politeAnnouncement}
      </output>

      {/* Assertive live region for error/critical messages */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={srOnlyStyles}
        data-testid="aria-announcer-assertive"
      >
        {assertiveAnnouncement}
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default AriaAnnouncer;
