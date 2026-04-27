import { handleTaskJobReadRoute } from '@/features/task-logs-stream/endpoints/read';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleTaskJobReadRoute({ request, id });
}
