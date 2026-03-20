import kebabCase from 'es-toolkit/compat/kebabCase';
import snakeCase from 'es-toolkit/compat/snakeCase';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { createDownloadStream } from '@/features/entity-download/download-stream';
import { ticketStore } from '@/features/entity-download/ticket-store';
import { getDownloadStreamHeaders } from '@/features/entity-download/utils';

import type { TEntityTypeDict } from '@/api/entitycore/types';

/**
 * Handles GET requests for downloading an entity archive via a download ticket
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { entityType: string; ticketId: string } }
) {
  const { entityType: entityTypeRaw, ticketId } = await params;

  const entityType = snakeCase(entityTypeRaw) as TEntityTypeDict;

  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  try {
    const ticket = ticketStore.getTicket(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Download ticket not found or expired' }, { status: 404 });
    }

    // If the ticket is for a different entity type, reject the request
    if (ticket.entityType !== entityType) {
      return NextResponse.json(
        { error: 'Entity type mismatch between ticket and request' },
        { status: 400 }
      );
    }

    ticketStore.deleteTicket(ticketId);

    const downloadStream = await createDownloadStream({
      entityType: ticket.entityType,
      virtualLabId: ticket.virtualLabId,
      projectId: ticket.projectId,
      entityIds: ticket.entityIds,
    });

    return new NextResponse(downloadStream, {
      headers: getDownloadStreamHeaders({
        filename: `${kebabCase(entityType)}.tar.gz`,
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to process download request' }, { status: 500 });
  }
}
