import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { auth } from '@/auth';
import { formatBytes } from '@/utils/format';
import { log } from '@/utils/logger';

const querySchema = z.object({
  entityType: z.enum(EntityTypeDict),
  entityId: z.uuid(),
  virtualLabId: z.uuid(),
  projectId: z.uuid(),
  configAssetId: z.uuid(),
  assetPath: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { entityType, entityId, virtualLabId, projectId, configAssetId, assetPath } = parsed.data;

  try {
    const response = await downloadAsset({
      entityType,
      entityId,
      id: configAssetId,
      assetPath,
      asRawResponse: true,
      ctx: { virtualLabId, projectId },
    });

    if (response.ok) {
      const { url, headers } = response;
      const size = formatBytes(Number(headers.get('content-length')));
      return NextResponse.json({ url, size }, { status: 200 });
    }
    return NextResponse.json(
      { error: 'Failed to process download request' },
      { status: response.status }
    );
  } catch (error) {
    log('error', error);
    return NextResponse.json({ error: 'Failed to process download request' }, { status: 500 });
  }
}
