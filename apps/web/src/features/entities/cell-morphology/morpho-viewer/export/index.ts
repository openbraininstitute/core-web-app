/**
 * The mesh on show as a file, written in a worker. Imported on the first export only, and the worker brings
 * glTF-Transform and the Draco encoder.
 */
import * as Comlink from 'comlink';

import { type Palette, typeRgb } from '../engine/colors';

import type { MeshResult } from '../engine/mesher';
import type { ExportApi } from './export.worker';

export type ExportFormat = 'glb' | 'draco' | 'stl';

/** Always a plain PBR material with float attributes, whatever look is on screen; the bumps are the look's only. */
export async function exportMesh(
  format: ExportFormat,
  r: MeshResult,
  palette: Palette
): Promise<Blob> {
  const worker = new Worker(new URL('./export.worker.ts', import.meta.url), { type: 'module' });
  const api = Comlink.wrap<ExportApi>(worker);
  // Comlink never settles a call to a worker that died, out of memory say.
  const died = new Promise<never>((_, reject) =>
    worker.addEventListener('error', (e) => reject(new Error(e.message || 'Export worker failed')))
  );
  try {
    if (format === 'stl') {
      const stl = await Promise.race([api.stl(r.positions, r.indices), died]);
      return new Blob([stl], { type: 'model/stl' });
    }
    const glb = await Promise.race([
      api.glb(
        {
          positions: r.positions,
          normals: r.normals,
          indices: r.indices,
          types: r.vertexTypes,
          palette: typeRgb(palette),
          voxel: r.stats.voxel,
        },
        format === 'draco'
      ),
      died,
    ]);
    return new Blob([glb], { type: 'model/gltf-binary' });
  } finally {
    api[Comlink.releaseProxy]();
    worker.terminate();
  }
}
