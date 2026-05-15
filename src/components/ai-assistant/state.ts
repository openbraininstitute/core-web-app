import { atom } from 'jotai';

import type { AiAgentRateLimitEndpoint } from '@/services/ai-agent/hooks/rate-limit';

export const atomRateLimit = atom<AiAgentRateLimitEndpoint | null>(null);

/**
 * Atom used to pre-fill the chat prompt from external components.
 * When set to a non-empty string, the Footer component will pick it up,
 * populate the input, and reset this atom to ''.
 */
export const draftPromptAtom = atom<string>('');
