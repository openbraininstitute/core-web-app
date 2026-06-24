import snakeCase from 'es-toolkit/compat/snakeCase';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { ticketStore } from '@/features/entity-download/ticket-store';

import type { TEntityTypeDict } from '@/api/entitycore/types';

const createAssetFolderTicketSchema = z.object({
  entityType: z.enum(['circuit']),
  entityId: z.uuid(),
  assetId: z.uuid(),
  prefix: z.string().min(1),
  filename: z.string().min(1),
  virtualLabId: z.uuid().optional().nullable(),
  projectId: z.uuid().optional().nullable(),
});

/**
 * Creates a download ticket for a folder inside one asset of a single entity.
 * The GET endpoint streams a tar.gz of every file under `prefix`.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  try {
    const reqData = createAssetFolderTicketSchema.parse(await request.json());

    const ticketId = ticketStore.createTicket({
      kind: 'asset-folder',
      entityType: snakeCase(reqData.entityType) as TEntityTypeDict,
      entityId: reqData.entityId,
      assetId: reqData.assetId,
      prefix: reqData.prefix,
      filename: reqData.filename,
      virtualLabId: reqData.virtualLabId,
      projectId: reqData.projectId,
    });

    return NextResponse.json({ ticketId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create download ticket' }, { status: 500 });
  }
}
