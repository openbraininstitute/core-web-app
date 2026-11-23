/**
 * How much of a box lies inside another, 0 to 1, by volume (by extent along an axis where it is flat): a skeleton made
 * from a mesh lies wholly inside the mesh's box; one from another cell, or another segmentation, does not.
 */
export function shareInside(
  box: { min: Vec3; max: Vec3 },
  outer: { min: Vec3; max: Vec3 }
): number {
  let share = 1;
  for (let k = 0; k < 3; k++) {
    const extent = box.max[k] - box.min[k];
    const overlap = Math.min(box.max[k], outer.max[k]) - Math.max(box.min[k], outer.min[k]);
    if (overlap < 0) return 0;
    share *= extent > 1e-6 ? Math.min(1, overlap / extent) : 1;
  }
  return share;
}

/**
 * Where the EM viewer puts the origin: the centre of the GLB's box, µm. Its decoder recentres the mesh there
 * (`decodeGlb`), and the skeleton and spines, in the file's own frame, are moved by as much to sit on it. Read from the
 * GLB's JSON chunk, which comes first: the download is stopped as soon as that has arrived.
 */

import { EM_UNIT_UM } from '@/features/entities/em-cell-mesh/viewer/engine/decode';
import { meshHeader, readGlbJson } from '@/features/entities/em-cell-mesh/viewer/engine/glb';

import type { Vec3 } from './types';

/** The GLB's box, µm in the file's frame, and its centre. */
export interface MeshBox {
  centre: Vec3;
  min: Vec3;
  max: Vec3;
}

export async function meshCentre(
  request: { url: string; headers: Record<string, string> },
  signal?: AbortSignal
): Promise<MeshBox> {
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
          const um = (v: readonly number[]) => v.map((x) => x * EM_UNIT_UM) as Vec3;
          const [min, max] = [um(bounds.min), um(bounds.max)];
          return { centre: [0, 1, 2].map((k) => (min[k] + max[k]) / 2) as Vec3, min, max };
        }
      }
      if (done) throw new Error('the GLB ended before its JSON chunk');
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}
