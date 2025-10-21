import z from 'zod';
import snakeCase from 'es-toolkit/compat/snakeCase';
import kebabCase from 'es-toolkit/compat/kebabCase';
import { NextRequest, NextResponse } from 'next/server';
import { TEntityTypeDict } from '@/api/entitycore/types';
import { getDownloadStreamHeaders } from '@/features/entity-download/utils';
import { createDownloadStream } from '@/features/entity-download/download-stream';
import { getSessionServer } from '@/auth-server';

const downloadRequestSchema = z.object({
  virtualLabId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  entityIds: z.string().uuid().array().max(100),
});

/**
 * Handles POST requests for downloading entities as a compressed tar.gz file
 *
 * @param request - The incoming Next.js request
 * @param params - Route parameters containing the entity type
 * @returns A NextResponse with a downloadable tar.gz stream of entities
 *
 * Expected JSON body:
 * {
 *   virtualLabId?: string | null,  // Optional UUID of virtual lab context
 *   projectId?: string | null,     // Optional UUID of project context
 *   entityIds: string[]            // Array of entity UUIDs to download (max 100)
 * }
 */
export async function POST(request: NextRequest, { params }: { params: { entityType: string } }) {
  const { entityType: entityTypeRaw } = await params;
  const entityType = snakeCase(entityTypeRaw) as TEntityTypeDict;

  const session = await getSessionServer();
  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  const reqDataRaw = await request.json();
  const reqData = downloadRequestSchema.parse(reqDataRaw);

  const downloadStream = await createDownloadStream({ entityType, ...reqData });

  return new NextResponse(downloadStream, {
    headers: getDownloadStreamHeaders({ filename: `${kebabCase(entityType)}.tar.gz` }),
  });
}
