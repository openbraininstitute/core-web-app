import { atom } from 'jotai';

import type { AiAgentRateLimitEndpoint } from '@/services/ai-agent/hooks/rate-limit';

export const atomRateLimit = atom<AiAgentRateLimitEndpoint | null>(null);

/**
 * Shared prompt atom — the single source of truth for the chat input value.
 * External components (e.g. "Edit with chat" button) can write to this directly.
 */
export const promptAtom = atom<string>('');

/**
 * When set, the Chat component will automatically send this question
 * via sendMessage once the chat is ready. Used by the "Try in Assistant"
 * button on the home page to inject a question into the chat pipeline
 * exactly like a clicked suggestion.
 */
export const pendingAssistantQuestionAtom = atom<string | null>(null);
