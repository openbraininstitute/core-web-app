/**
 * The Cache Storage buckets holding a project's files. They belong to the user who filled them: whoever signs in next
 * on the same browser must not find them. The names live here, not with the features, so that the sign-in check and
 * the log-out page can list them without pulling in the viewers' code.
 */
export const PROJECT_DATA_CACHES = {
  circuitH5: 'circuit-h5-v1',
  connectivityH5: 'connectivity-h5-v1',
  ephysNwb: 'ephys-nwb-v1',
  ephysNwbAssets: 'ephys-nwb-assets',
  morphologyPack: 'circuit-morphology-mpack',
  emCellMeshGlb: 'em-cell-mesh-glb',
  emCellMeshStandIn: 'em-cell-mesh-stand-in',
  emCellMeshFull: 'em-cell-mesh-full',
  analysisAssets: 'analysis-pdf-cache-v1',
} as const;

/** Earlier names of the buckets above, deleted along with them. */
const RENAMED = ['obi-circuit-h5-v1', 'obi-connectivity-h5-v1', 'obi-ephys-nwb-v1'];

/** Whose files the buckets hold: a digest of the user's id. */
const OWNER_KEY = 'project-data-owner';

/** Delete every bucket. Resolves whether all of them went; one that wasn't there counts as gone. */
export async function clearProjectDataCaches(): Promise<boolean> {
  if (typeof caches === 'undefined') return true;
  const results = await Promise.allSettled(
    [...Object.values(PROJECT_DATA_CACHES), ...RENAMED].map((name) => caches.delete(name))
  );
  return results.every((r) => r.status === 'fulfilled');
}

async function digest(userId: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

/**
 * Make the buckets the signed-in user's. Unless they hold that user's files already, they are deleted, and the user
 * is written down as their owner only once all of them went: a deletion cut short, by a failure or a closed tab, is
 * tried again on the next load.
 */
export async function claimProjectDataCaches(userId: string): Promise<void> {
  const owner = await digest(userId).catch(() => null);
  if (owner && readOwner() === owner) return;
  if (!(await clearProjectDataCaches()) || !owner) return;
  try {
    localStorage.setItem(OWNER_KEY, owner);
  } catch {
    // Without the note, the buckets are deleted on every load: the safe way round.
  }
}
