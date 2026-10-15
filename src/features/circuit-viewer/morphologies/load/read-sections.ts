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

// By path, which carries everything that varies.
const kept = new Map<string, Kept>();

/**
 * A morphology's sections, parsed, kept an hour from the last time they were asked for. Rejects where they cannot be
 * read or parsed, and is then read again the next time.
 */
export function loadSections({
  path,
  virtualLabId,
  projectId,
}: SectionsRequest): Promise<Sections> {
  let entry = kept.get(path);
  if (!entry) {
    const sections = fetchCircuitViz(path, { virtualLabId, projectId }).then((json) =>
      SectionsArraySchema.parse(json)
    );
    const added: Kept = { sections };
    sections.catch(() => forget(path, added));
    kept.set(path, added);
    entry = added;
  }
  const asked = entry;
  clearTimeout(asked.expiry);
  asked.expiry = setTimeout(() => forget(path, asked), KEPT_FOR_MS);
  return asked.sections;
}

function forget(path: string, entry: Kept) {
  clearTimeout(entry.expiry);
  if (kept.get(path) === entry) kept.delete(path);
}
