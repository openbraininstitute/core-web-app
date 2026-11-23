/**
 * The Cache Storage buckets holding a project's files. They belong to the user who filled them: whoever signs in next
 * on the same browser must not find them. The names live here, not with the features, so that the sign-in check and
 * the log-out page can list them without pulling in the viewers' code.
 *
 * Each name carries the date its contents last changed format (CLAUDE.md rule 17). To drop what one bucket holds,
 * move its date on: the older version is deleted on the next load.
 */
export const ProjectDataCache = {
  CircuitH5: 'project-data:202611201:cache:circuit-h5',
  ConnectivityH5: 'project-data:202611201:cache:connectivity-h5',
  EphysNwb: 'project-data:202611201:cache:ephys-nwb',
  EphysNwbAssets: 'project-data:202611201:cache:ephys-nwb-assets',
  MorphologyPack: 'project-data:202611201:cache:circuit-morphology-pack',
  EmCellMeshGlb: 'project-data:202611201:cache:em-cell-mesh-glb',
  EmCellMeshStandIn: 'project-data:202611201:cache:em-cell-mesh-stand-in',
  EmCellMeshFull: 'project-data:202611201:cache:em-cell-mesh-full',
  AnalysisAssets: 'project-data:202611201:cache:analysis-assets',
} as const;

export type TProjectDataCache = (typeof ProjectDataCache)[keyof typeof ProjectDataCache];

const AREA = 'project-data';

/** The names the buckets had before they were versioned. Fixed: a version change is found by its prefix. */
const UNVERSIONED = [
  'obi-circuit-h5-v1',
  'obi-connectivity-h5-v1',
  'obi-ephys-nwb-v1',
  'ephys-nwb-assets',
  'circuit-morphology-mpack',
  'em-cell-mesh-glb',
  'em-cell-mesh-stand-in',
  'em-cell-mesh-full',
  'analysis-pdf-cache-v1',
];

/** Whose files the buckets hold: a digest of the user's id. */
const OWNER_KEY = `${AREA}:202611201:owner:user`;

function versionOf(name: string): { bucket: string; version: number } | null {
  const [area, version, slice, bucket] = name.split(':');
  if (area !== AREA || slice !== 'cache' || !bucket) return null;
  return { bucket, version: Number(version) };
}

const CURRENT = new Map(
  Object.values(ProjectDataCache).flatMap((name) => {
    const parsed = versionOf(name);
    return parsed ? [[parsed.bucket, parsed.version] as const] : [];
  })
);

/**
 * Delete every bucket, those of other versions included. Resolves whether all of them went; one that wasn't there
 * counts as gone.
 */
export async function clearProjectDataCaches(): Promise<boolean> {
  if (typeof caches === 'undefined') return true;
  const held = await caches.keys().catch(() => null);
  const names = new Set([
    ...Object.values(ProjectDataCache),
    ...UNVERSIONED,
    ...(held ?? []).filter((name) => versionOf(name)),
  ]);
  const results = await Promise.allSettled([...names].map((name) => caches.delete(name)));
  return held !== null && results.every((r) => r.status === 'fulfilled');
}

/** Delete the buckets left at an older version. A newer one, from a tab running a later build, is left alone. */
async function dropOlderVersions(): Promise<void> {
  if (typeof caches === 'undefined') return;
  const stale = (await caches.keys()).filter((name) => {
    const parsed = versionOf(name);
    return parsed !== null && parsed.version < (CURRENT.get(parsed.bucket) ?? 0);
  });
  await Promise.allSettled(stale.map((name) => caches.delete(name)));
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
  if (owner && readOwner() === owner) {
    await dropOlderVersions().catch(() => {});
    return;
  }
  if (!(await clearProjectDataCaches()) || !owner) return;
  try {
    localStorage.setItem(OWNER_KEY, owner);
  } catch {
    // Without the note, the buckets are deleted on every load: the safe way round.
  }
}

/** Forget whose the buckets are, so that the next claim deletes them whoever it is for. */
export function disownProjectDataCaches(): void {
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {
    // Nothing to forget.
  }
}
