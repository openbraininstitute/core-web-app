import type { NextRequest } from 'next/server';

/** Janelia's coarse skeletons of the Male CNS v1.0 bodies, as SWC in voxels of 8 nm. */
const SKELETONS =
  'https://storage.googleapis.com/flyem-male-cns/v1.0/segmentation/skeletons-malecns/skeletons-swc';

/**
 * A Male CNS neuron's skeleton, for the brains walkthrough to draw the one picked: fetched here, as Janelia's
 * bucket answers no page from another site.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ body: string }> }) {
  const { body } = await params;
  if (!/^\d{1,12}$/.test(body)) return new Response('Not a body id', { status: 400 });
  const response = await fetch(`${SKELETONS}/${body}.swc`);
  if (!response.ok) return new Response('No skeleton for that body', { status: response.status });
  return new Response(response.body, {
    headers: { 'content-type': 'text/plain', 'cache-control': 'public, max-age=86400' },
  });
}
