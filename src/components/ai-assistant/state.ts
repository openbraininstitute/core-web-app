import { atom } from 'jotai';

import type { AiAgentRateLimitEndpoint } from '@/services/ai-agent/hooks/rate-limit';

export const atomRateLimit = atom<AiAgentRateLimitEndpoint | null>(null);

/**
 * Shared prompt atom — the single source of truth for the chat input value.
 * External components (e.g. "Edit with chat" button) can write to this directly.
 */
export const promptAtom = atom<string>('');
