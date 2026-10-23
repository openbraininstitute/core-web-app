import { fetchCircuitViz } from '@/api/one/circuit-visualization';
import { SectionsArraySchema } from '@/features/scan-config/types';

import type { Sections } from '@/features/scan-config/types';

/** Where one morphology's sections are read: a `/circuit/viz` or `/memodel/viz` path, in a workspace. */
export type SectionsRequest = { path: string; virtualLabId: string; projectId: string };

const KEPT_FOR_MS = 60 * 60 * 1000;

interface Kept {
  sections: Promise<Sections>;
  expiry?: ReturnType<typeof setTimeout>;
}

const kept = new Map<string, Kept>();

/**
 * A morphology's sections, parsed, kept an hour from the last time they were asked for in the same workspace. Rejects
 * where they cannot be read or parsed, and is then read again the next time, so a retry reads them anew.
 */
export function loadSections(request: SectionsRequest): Promise<Sections> {
  const key = `${request.virtualLabId} ${request.projectId} ${request.path}`;
  const entry = kept.get(key) ?? remember(key, request);
  clearTimeout(entry.expiry);
  entry.expiry = setTimeout(() => forget(key, entry), KEPT_FOR_MS);
  return entry.sections;
}

function remember(key: string, { path, virtualLabId, projectId }: SectionsRequest): Kept {
  const sections = fetchCircuitViz(path, { virtualLabId, projectId }).then((json) =>
    SectionsArraySchema.parse(json)
  );
  const entry: Kept = { sections };
  sections.catch(() => forget(key, entry));
  kept.set(key, entry);
  return entry;
}

function forget(key: string, entry: Kept) {
  clearTimeout(entry.expiry);
  if (kept.get(key) === entry) kept.delete(key);
}
