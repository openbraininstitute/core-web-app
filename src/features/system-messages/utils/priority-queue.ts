/**
 * Priority Queue Utility
 *
 * Provides functions for ordering system messages by priority.
 * Messages are sorted by severity (critical > error > warning > info)
 * and then by timestamp (newest first).
 *
 * @module utils/priority-queue
 */

import { SEVERITY_PRIORITY } from "../constants";
import type { ISystemMessage, TMessageSeverity } from "../types";

/**
 * Gets the numeric priority value for a severity level.
 * Higher values indicate higher priority.
 *
 * @param severity - The severity level to get priority for
 * @returns Numeric priority value (0-3)
 */
export function getSeverityPriority(severity: TMessageSeverity): number {
  return SEVERITY_PRIORITY[severity] ?? 0;
}

/**
 * Compares two messages by severity and timestamp for sorting.
 *
 * Sort order:
 * 1. Higher severity first (critical > error > warning > info)
 * 2. For same severity, newer messages first (by createdAt timestamp)
 *
 * @param a - First message to compare
 * @param b - Second message to compare
 * @returns Negative if a should come first, positive if b should come first, 0 if equal
 *
 * @example
 * ```typescript
 * const messages = [infoMessage, criticalMessage, warningMessage];
 * messages.sort(compareBySeverityAndTime);
 * // Result: [criticalMessage, warningMessage, infoMessage]
 * ```
 */
export function compareBySeverityAndTime(
  a: ISystemMessage,
  b: ISystemMessage,
): number {
  // First compare by severity (higher priority first)
  const severityDiff =
    getSeverityPriority(b.severity) - getSeverityPriority(a.severity);

  if (severityDiff !== 0) {
    return severityDiff;
  }

  // Same severity - compare by timestamp (newest first)
  const timeA = new Date(a.createdAt).getTime();
  const timeB = new Date(b.createdAt).getTime();

  return timeB - timeA;
}

/**
 * Sorts an array of messages by priority.
 *
 * Creates a new sorted array without modifying the original.
 * Messages are ordered by:
 * 1. Severity (critical > error > warning > info)
 * 2. Timestamp (newest first for same severity)
 *
 * @param messages - Array of messages to sort
 * @returns New array sorted by priority
 *
 * @example
 * ```typescript
 * const sorted = sortByPriority(messages);
 * // First message will be the highest priority (critical, newest)
 * ```
 */
export function sortByPriority(messages: ISystemMessage[]): ISystemMessage[] {
  return [...messages].sort(compareBySeverityAndTime);
}

/**
 * Gets the highest priority message from an array.
 *
 * @param messages - Array of messages to search
 * @returns The highest priority message, or undefined if array is empty
 *
 * @example
 * ```typescript
 * const topMessage = getHighestPriority(messages);
 * if (topMessage) {
 *   // Handle the most important message
 * }
 * ```
 */
export function getHighestPriority(
  messages: ISystemMessage[],
): ISystemMessage | undefined {
  if (messages.length === 0) {
    return undefined;
  }

  return messages.reduce((highest, current) => {
    return compareBySeverityAndTime(current, highest) < 0 ? current : highest;
  });
}

/**
 * Filters messages to only include those at or above a minimum severity.
 *
 * @param messages - Array of messages to filter
 * @param minSeverity - Minimum severity level to include
 * @returns Filtered array containing only messages at or above the minimum severity
 *
 * @example
 * ```typescript
 * // Get only error and critical messages
 * const urgent = filterByMinSeverity(messages, 'error');
 * ```
 */
export function filterByMinSeverity(
  messages: ISystemMessage[],
  minSeverity: TMessageSeverity,
): ISystemMessage[] {
  const minPriority = getSeverityPriority(minSeverity);
  return messages.filter(
    (msg) => getSeverityPriority(msg.severity) >= minPriority,
  );
}

/**
 * Groups messages by severity level.
 *
 * @param messages - Array of messages to group
 * @returns Object with severity levels as keys and arrays of messages as values
 *
 * @example
 * ```typescript
 * const grouped = groupBySeverity(messages);
 * console.log(grouped.critical.length); // Number of critical messages
 * ```
 */
export function groupBySeverity(
  messages: ISystemMessage[],
): Record<TMessageSeverity, ISystemMessage[]> {
  const groups: Record<TMessageSeverity, ISystemMessage[]> = {
    info: [],
    warning: [],
    error: [],
    critical: [],
  };

  for (const message of messages) {
    groups[message.severity].push(message);
  }

  return groups;
}
