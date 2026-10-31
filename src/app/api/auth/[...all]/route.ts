import { toNextJsHandler } from 'better-auth/next-js';

import { serverAuth } from '@/features/auth/server';

export const { GET, POST } = toNextJsHandler(serverAuth);
