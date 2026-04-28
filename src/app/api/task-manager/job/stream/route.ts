import { handleTaskLogsStreamRoute } from '@/features/task-logs-stream/endpoints/steam';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleTaskLogsStreamRoute({ request });
}
