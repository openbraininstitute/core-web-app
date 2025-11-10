import { NextRequest, NextResponse } from 'next/server';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { TEntityTypeDict } from '@/api/entitycore/types';
import { formatBytes } from '@/utils/format';
import { log } from '@/utils/logger';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const entityType = query.get('entityType')! as TEntityTypeDict;
  const entityId = query.get('entityId')!;
  const virtualLabId = query.get('virtualLabId')!;
  const projectId = query.get('projectId')!;
  const configAssetId = query.get('configAssetId')!;
  const assetPath = query.get('assetPath')!;

  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }
  try {
    const response = await downloadAsset({
      entityType,
      entityId: entityId!,
      id: configAssetId!,
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
