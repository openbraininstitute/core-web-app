import { MorphoViewerTreeItemType } from '@/morpho-viewer/tree-item-type';

import type { Sections } from '@/features/scan-config/types';

/** A section of a morphology: how far along the neurites from the soma it starts, its length and its type. */
export type SectionPath = { start: number; length: number; type: MorphoViewerTreeItemType };

/**
 * Each section's path along the morphology by its SONATA id: from the soma's surface to the
 * section's first point, the lengths of the sections on the way summed, and its own length.
 * The soma is 0 and has no length of its own.
 */
export function sectionPaths(sections: Sections): Map<number, SectionPath> {
  const byId = new Map(sections.map((section) => [section.id, section]));
  const lengthOf = new Map<string, number>();
  for (const section of sections) {
    let length = 0;
    for (let i = 1; i < section.points.length; i += 1) {
      const [x0, y0, z0] = section.points[i - 1];
      const [x1, y1, z1] = section.points[i];
      length += Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    }
    lengthOf.set(section.id, section.type === MorphoViewerTreeItemType.Soma ? 0 : length);
  }
  // Up to the soma, then back down: each section's start known once its parent's is.
  const startOf = new Map<string, number>();
  const start = (id: string): number => {
    const chain: string[] = [];
    let at: string | null = id;
    while (at !== null && !startOf.has(at)) {
      const section = byId.get(at);
      if (!section || section.parent_id === null || section.parent_id === 'soma') {
        if (section) startOf.set(at, 0);
        break;
      }
      chain.push(at);
      at = section.parent_id;
    }
    for (let i = chain.length - 1; i >= 0; i -= 1) {
      const parent = byId.get(chain[i])?.parent_id;
      const parentStart = parent ? (startOf.get(parent) ?? 0) : 0;
      startOf.set(chain[i], parentStart + (parent ? (lengthOf.get(parent) ?? 0) : 0));
    }
    return startOf.get(id) ?? 0;
  };
  const paths = new Map<number, SectionPath>();
  for (const section of sections) {
    if (section.sonata_section_id === undefined) continue;
    paths.set(section.sonata_section_id, {
      start: start(section.id),
      length: lengthOf.get(section.id) ?? 0,
      type: section.type,
    });
  }
  return paths;
}
