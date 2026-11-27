import { toNextJsHandler } from 'better-auth/next-js';

import { getAuth } from '@/features/auth/auth';

export const { GET, POST } = toNextJsHandler((request: Request) => getAuth().handler(request));
