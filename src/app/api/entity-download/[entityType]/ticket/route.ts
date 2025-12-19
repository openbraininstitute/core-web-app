import snakeCase from 'es-toolkit/compat/snakeCase';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import { auth } from '@/auth';
import { ticketStore } from '@/features/entity-download/ticket-store';

// Schema for ticket creation request
const createTicketSchema = z.object({
  virtualLabId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  entityIds: z.string().uuid().array().max(100),
});

/**
 * Creates a download ticket for a batch of entity IDs
 *
 * @returns A ticket ID that can be used to initiate the download
 *
 * Expected JSON body:
 * {
 *   virtualLabId?: string | null,  // Optional UUID of virtual lab context
 *   projectId?: string | null,     // Optional UUID of project context
 *   entityIds: string[]            // Array of entity UUIDs to download (max 100)
 * }
 */
export async function POST(request: NextRequest, { params }: { params: { entityType: string } }) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  const { entityType: entityTypeRaw } = await params;
  const entityType = snakeCase(entityTypeRaw) as TEntityTypeDict;

  try {
    const reqData = createTicketSchema.parse(await request.json());

    // Store the download information with creation timestamp
    const ticketId = ticketStore.createTicket({
      entityType,
      virtualLabId: reqData.virtualLabId,
      projectId: reqData.projectId,
      entityIds: reqData.entityIds,
    });

    return NextResponse.json({ ticketId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create download ticket' }, { status: 500 });
  }
}
