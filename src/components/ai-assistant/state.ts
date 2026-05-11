import { atom } from 'jotai';

import type { AiAgentRateLimitEndpoint } from '@/services/ai-agent/hooks/rate-limit';

export const atomRateLimit = atom<AiAgentRateLimitEndpoint | null>(null);
