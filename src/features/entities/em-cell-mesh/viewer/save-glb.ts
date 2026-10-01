import { saveAs } from 'file-saver';

import { GLB_CACHE, readEntry } from './engine/asset-cache';

import type { DownloadRequest } from './engine/download';

/** The mesh's GLB as a file, from the cache where it is there. */
export async function saveGlb(request: DownloadRequest, name: string): Promise<void> {
  let bytes = await readEntry(GLB_CACHE, request.url, request.size).catch(() => null);
  if (!bytes) {
    const response = await fetch(request.url, { headers: request.headers });
    if (!response.ok) throw new Error(`the download failed (${response.status})`);
    bytes = await response.arrayBuffer();
  }
  const file = name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'em-cell-mesh';
  saveAs(new Blob([bytes], { type: 'model/gltf-binary' }), `${file}.glb`);
}
