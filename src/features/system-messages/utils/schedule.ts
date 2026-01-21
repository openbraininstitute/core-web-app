/**
 * Schedule Utilities
 *
 * Provides functions for evaluating message schedules and activation status.
 * Handles timezone-aware date comparisons and cron expression parsing.
 *
 * @module utils/schedule
 */

import type { IMessageSchedule, ISystemMessage } from "../types";

/**
 * Parsed cron schedule representation.
 * Supports standard 5-field cron format: minute hour day month weekday
 */
export interface ICronSchedule {
  /** Minutes (0-59) or '*' for any */
  minute: number[] | "*";
  /** Hours (0-23) or '*' for any */
  hour: number[] | "*";
  /** Day of month (1-31) or '*' for any */
  dayOfMonth: number[] | "*";
  /** Month (1-12) or '*' for any */
  month: number[] | "*";
  /** Day of week (0-6, 0=Sunday) or '*' for any */
  dayOfWeek: number[] | "*";
}

/**
 * Parses a cron field into an array of numbers or '*'.
 *
 * Supports:
 * - '*' for any value
 * - Single numbers: '5'
 * - Ranges: '1-5'
 * - Lists: '1,3,5'
 * - Step values: '*\/5' (every 5)
 *
 * @param field - Cron field string
 * @param min - Minimum valid value
 * @param max - Maximum valid value
 * @returns Array of valid values or '*'
 */
function parseCronField(
  field: string,
  min: number,
  max: number,
): number[] | "*" {
  if (field === "*") {
    return "*";
  }

  const values: number[] = [];

  // Handle step values (e.g., */5)
  if (field.includes("/")) {
    const [range, stepStr] = field.split("/");
    const step = Number.parseInt(stepStr, 10);
    const start = range === "*" ? min : Number.parseInt(range, 10);

    for (let i = start; i <= max; i += step) {
      values.push(i);
    }
    return values;
  }

  // Handle lists (e.g., 1,3,5)
  const parts = field.split(",");

  for (const part of parts) {
    // Handle ranges (e.g., 1-5)
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = Number.parseInt(startStr, 10);
      const end = Number.parseInt(endStr, 10);

      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max && !values.includes(i)) {
          values.push(i);
        }
      }
    } else {
      const num = Number.parseInt(part, 10);
      if (num >= min && num <= max && !values.includes(num)) {
        values.push(num);
      }
    }
  }

  return values.sort((a, b) => a - b);
}

/**
 * Parses a cron expression into a structured schedule object.
 *
 * Supports standard 5-field cron format:
 * `minute hour day-of-month month day-of-week`
 *
 * @param cron - Cron expression string (e.g., "0 9 * * 1-5")
 * @returns Parsed cron schedule object
 * @throws Error if the cron expression is invalid
 *
 * @example
 * ```typescript
 * // Every weekday at 9 AM
 * const schedule = parseCronExpression("0 9 * * 1-5");
 * // Result: { minute: [0], hour: [9], dayOfMonth: '*', month: '*', dayOfWeek: [1,2,3,4,5] }
 * ```
 */
export function parseCronExpression(cron: string): ICronSchedule {
  const fields = cron.trim().split(/\s+/);

  if (fields.length !== 5) {
    throw new Error(
      `Invalid cron expression: expected 5 fields, got ${fields.length}`,
    );
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

  return {
    minute: parseCronField(minute, 0, 59),
    hour: parseCronField(hour, 0, 23),
    dayOfMonth: parseCronField(dayOfMonth, 1, 31),
    month: parseCronField(month, 1, 12),
    dayOfWeek: parseCronField(dayOfWeek, 0, 6),
  };
}

/**
 * Checks if a date matches a cron schedule.
 *
 * @param date - Date to check
 * @param schedule - Parsed cron schedule
 * @returns True if the date matches the schedule
 */
export function matchesCronSchedule(
  date: Date,
  schedule: ICronSchedule,
): boolean {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const dayOfWeek = date.getDay();

  const matchesField = (value: number, field: number[] | "*"): boolean => {
    return field === "*" || field.includes(value);
  };

  return (
    matchesField(minute, schedule.minute) &&
    matchesField(hour, schedule.hour) &&
    matchesField(dayOfMonth, schedule.dayOfMonth) &&
    matchesField(month, schedule.month) &&
    matchesField(dayOfWeek, schedule.dayOfWeek)
  );
}

/**
 * Converts a date to a specific timezone.
 *
 * @param date - Date to convert
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @returns Date adjusted to the specified timezone
 */
function getDateInTimezone(date: Date, timezone: string): Date {
  // Use Intl.DateTimeFormat to get the date parts in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? "0";

  return new Date(
    Number.parseInt(getPart("year"), 10),
    Number.parseInt(getPart("month"), 10) - 1,
    Number.parseInt(getPart("day"), 10),
    Number.parseInt(getPart("hour"), 10),
    Number.parseInt(getPart("minute"), 10),
    Number.parseInt(getPart("second"), 10),
  );
}

/**
 * Checks if the current time is within a message's schedule window.
 *
 * Evaluates:
 * - Start time (if specified): current time must be >= start time
 * - End time (if specified): current time must be < end time
 * - Recurring schedule (if specified): current time must match cron pattern
 *
 * All times are evaluated in the schedule's specified timezone.
 *
 * @param schedule - Message schedule configuration
 * @param now - Current time (defaults to new Date())
 * @returns True if the current time is within the schedule window
 *
 * @example
 * ```typescript
 * const schedule = {
 *   startTime: '2024-01-01T09:00:00Z',
 *   endTime: '2024-12-31T17:00:00Z',
 *   timezone: 'America/New_York'
 * };
 *
 * isWithinSchedule(schedule); // true if current time is within range
 * ```
 */
export function isWithinSchedule(
  schedule: IMessageSchedule,
  now: Date = new Date(),
): boolean {
  const { startTime, endTime, timezone, recurring } = schedule;

  // Get current time in the schedule's timezone
  const nowInTimezone = getDateInTimezone(now, timezone);

  // Check start time
  if (startTime) {
    const start = getDateInTimezone(new Date(startTime), timezone);
    if (nowInTimezone < start) {
      return false;
    }
  }

  // Check end time
  if (endTime) {
    const end = getDateInTimezone(new Date(endTime), timezone);
    if (nowInTimezone >= end) {
      return false;
    }
  }

  // Check recurring schedule
  if (recurring) {
    try {
      const cronSchedule = parseCronExpression(recurring);
      if (!matchesCronSchedule(nowInTimezone, cronSchedule)) {
        return false;
      }
    } catch {
      // Invalid cron expression - treat as not matching
      return false;
    }
  }

  return true;
}

/**
 * Determines if a message should be considered active based on its status,
 * activation mode, and schedule.
 *
 * Activation rules:
 * - Status must be 'active' for the message to be shown
 * - If `manuallyDeactivated` is true, the message is never active
 * - For 'immediate' mode: active immediately when status is 'active'
 * - For 'manual' mode: active only when status is 'active' (set via API)
 * - For 'scheduled' mode: active when status is 'active' AND within schedule
 *
 * @param message - System message to evaluate
 * @param now - Current time (defaults to new Date())
 * @returns True if the message should be displayed
 *
 * @example
 * ```typescript
 * const message = {
 *   status: 'active',
 *   activationMode: 'scheduled',
 *   manuallyDeactivated: false,
 *   schedule: { startTime: '...', endTime: '...', timezone: 'UTC' },
 *   // ... other fields
 * };
 *
 * isMessageActive(message); // true if status is active and within schedule
 * ```
 */
export function isMessageActive(
  message: ISystemMessage,
  now: Date = new Date(),
): boolean {
  const { status, activationMode, manuallyDeactivated, schedule } = message;

  // If manually deactivated, never show
  if (manuallyDeactivated) {
    return false;
  }

  // Status must be 'active'
  if (status !== "active") {
    return false;
  }

  // For scheduled mode, also check the schedule window
  if (activationMode === "scheduled") {
    return isWithinSchedule(schedule, now);
  }

  // For 'immediate' and 'manual' modes, status === 'active' is sufficient
  return true;
}

/**
 * Gets the next activation time for a scheduled message.
 *
 * @param schedule - Message schedule configuration
 * @param from - Starting point for calculation (defaults to now)
 * @returns Next activation Date, or null if no future activation
 */
export function getNextActivationTime(
  schedule: IMessageSchedule,
  from: Date = new Date(),
): Date | null {
  const { startTime, endTime } = schedule;

  // If there's a start time in the future, that's the next activation
  if (startTime) {
    const start = new Date(startTime);
    if (start > from) {
      // But only if it's before the end time
      if (!endTime || start < new Date(endTime)) {
        return start;
      }
    }
  }

  // For recurring schedules, we'd need to calculate the next cron match
  // This is a simplified implementation - full cron calculation is complex
  return null;
}

/**
 * Checks if a message's schedule has expired.
 *
 * @param schedule - Message schedule configuration
 * @param now - Current time (defaults to new Date())
 * @returns True if the schedule has an end time that has passed
 */
export function isScheduleExpired(
  schedule: IMessageSchedule,
  now: Date = new Date(),
): boolean {
  const { endTime, timezone } = schedule;

  if (!endTime) {
    return false;
  }

  const nowInTimezone = getDateInTimezone(now, timezone);
  const end = getDateInTimezone(new Date(endTime), timezone);

  return nowInTimezone >= end;
}
