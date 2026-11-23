import type { ChatStatus } from 'ai';

const BUSY_CHAT_STATUSES: ReadonlySet<ChatStatus> = new Set(['submitted', 'streaming']);

/** No reply in flight: a failed reply (`error`) is idle too, so it never leaves the config locked. */
export function isChatIdle(status: ChatStatus): boolean {
  return !BUSY_CHAT_STATUSES.has(status);
}
