import { type NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { createDownloadStream } from '@/features/entity-download/download-stream';
import { ticketStore } from '@/features/entity-download/ticket-store';
import { getDownloadStreamHeaders } from '@/features/entity-download/utils';

/**
 * Streams a tar.gz of all files under `ticket.prefix` inside a single asset.
 */
export async function GET(_request: NextRequest, { params }: { params: { ticketId: string } }) {
  const { ticketId } = await params;

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

    if (ticket.kind !== 'asset-folder') {
      return NextResponse.json({ error: 'Invalid ticket kind for this route' }, { status: 400 });
    }

    ticketStore.deleteTicket(ticketId);

    const downloadStream = await createDownloadStream(ticket);

    return new NextResponse(downloadStream, {
      headers: getDownloadStreamHeaders({ filename: ticket.filename }),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to process download request' }, { status: 500 });
  }
}
