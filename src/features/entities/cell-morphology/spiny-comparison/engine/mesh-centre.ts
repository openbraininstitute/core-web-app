/**
 * Where the EM viewer puts the origin: the centre of the GLB's box, µm. Its decoder recentres the mesh there
 * (`decodeGlb`), and the skeleton and spines, in the file's own frame, are moved by as much to sit on it. Read from the
 * GLB's JSON chunk, which comes first: the download is stopped as soon as that has arrived.
 */

import { EM_UNIT_UM } from '@/features/entities/em-cell-mesh/viewer/engine/decode';
import { meshHeader, readGlbJson } from '@/features/entities/em-cell-mesh/viewer/engine/glb';

import type { Vec3 } from './types';

export async function meshCentre(
  request: { url: string; headers: Record<string, string> },
  signal?: AbortSignal
): Promise<Vec3> {
  const response = await fetch(request.url, { headers: request.headers, signal });
  if (!response.ok || !response.body) throw new Error(`GLB fetch failed (${response.status})`);
  const reader = response.body.getReader();
  let bytes = new Uint8Array(0);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) {
        const next = new Uint8Array(bytes.length + value.length);
        next.set(bytes);
        next.set(value, bytes.length);
        bytes = next;
        const json = readGlbJson(bytes);
        if (json) {
          const { bounds } = meshHeader(json);
          if (!bounds) throw new Error('the GLB says nothing of its extent');
          return [0, 1, 2].map((k) => ((bounds.min[k] + bounds.max[k]) / 2) * EM_UNIT_UM) as Vec3;
        }
      }
      if (done) throw new Error('the GLB ended before its JSON chunk');
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}
