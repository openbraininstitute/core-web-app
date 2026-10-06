import { saveAs } from 'file-saver';
import { useState } from 'react';

import { fileName } from '@/features/viewer-3d/chrome/debug-rows';
import { errorMessage } from '@/utils/error';
import { logError } from '@/utils/logger';

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
  saveAs(new Blob([bytes], { type: 'model/gltf-binary' }), `${fileName(name, 'em-cell-mesh')}.glb`);
}

/** Saving the GLB, nothing until the request is known, and why the last try failed. */
export function useSaveGlb(request: DownloadRequest | null, name: string) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    if (!request) return;
    setSaving(true);
    setError(null);
    saveGlb(request, name)
      .catch((e: unknown) => {
        logError('Could not download the EM cell mesh', e);
        setError(errorMessage(e));
      })
      .finally(() => setSaving(false));
  };
  return { save, saving, error };
}
