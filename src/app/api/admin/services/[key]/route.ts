import { capabilityDenial } from '@/admin/server/require-capability';
import { probeFromServer } from '@/admin/server/service-probe';

import type { NextRequest } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const denial = await capabilityDenial('admin.access');
  if (denial) return denial;

  const probe = await probeFromServer((await params).key);
  if (!probe) return Response.json({ message: 'Unknown service' }, { status: 404 });

  return Response.json(probe, { headers: { 'cache-control': 'private, no-store' } });
}
