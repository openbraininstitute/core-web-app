'use client';

import { useQueryClient } from '@tanstack/react-query';
import pLimit from 'p-limit';
import { useEffect, useState } from 'react';

import { circuitMorphologyPath } from '@/api/one/circuit-visualization';
import { loadSections } from '@/features/circuit-viewer/morphologies/load/read-sections';
import { sectionTypeLabel } from '@/features/scan-config/components/circuit-viz/section-type-label';
import {
  morphologyFileOf,
  resolveMorphologyLocation,
} from '@/features/scan-config/components/circuit-viz/sources/resolve-morphology-path';
import { sectionPaths } from '@/features/sonata-viewer/path-distance';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { logError } from '@/utils/logger';

import type { ColumnValues, ParsedCircuitConfig } from '@/features/circuit-nodes/types';
import type { Compartment } from '@/features/sonata-viewer/compartment-rows';
import type { SectionPath } from '@/features/sonata-viewer/path-distance';

/** Morphologies asked for at once: a report may record thousands of cells. */
const MORPHOLOGY_LOADS = 8;

/**
 * Where each of a report's compartments is on its cell, by trace: how far along its
 * neurites from the soma, in µm, and its section's type.
 */
export type CompartmentPlaces = {
  distances: ReadonlyMap<number, number>;
  types: ReadonlyMap<number, string>;
};

/**
 * The places of a report's compartments, measured on their cells' morphologies once those
 * load: through the 3D view's cache, so one it has drawn is not asked for again. A
 * compartment set's offset says where along its section each one is; without one, a
 * section's compartments are at its segments' centres, as NEURON reports them. Null until
 * they are in, and where the circuit has no morphologies to measure on.
 */
export function useCompartmentPlaces({
  enabled,
  circuitId,
  circuitConfig,
  populationName,
  compartments,
  offsets,
  getColumn,
}: {
  enabled: boolean;
  circuitId: string | undefined;
  circuitConfig: ParsedCircuitConfig | undefined;
  populationName: string | undefined;
  compartments: ReadonlyMap<number, readonly Compartment[]>;
  /** Each compartment's offset along its section, where a compartment set says it. */
  offsets: ReadonlyMap<number, number> | undefined;
  getColumn: (name: string) => Promise<ColumnValues>;
}): CompartmentPlaces | null {
  const { virtualLabId, projectId } = useWorkspace();
  const queryClient = useQueryClient();
  const [found, setFound] = useState<{
    compartments: ReadonlyMap<number, readonly Compartment[]>;
    offsets: ReadonlyMap<number, number> | undefined;
    places: CompartmentPlaces;
  }>();
  useEffect(() => {
    if (!enabled || !circuitId || !circuitConfig || !populationName) return;
    if (compartments.size === 0) return;
    const location = resolveMorphologyLocation(circuitConfig.raw, populationName);
    if (!location) return;
    let cancelled = false;
    // rejecting what it drops, so the measuring it leaves behind ends
    const limit = pLimit({ concurrency: MORPHOLOGY_LOADS, rejectOnClear: true });
    const measure = async () => {
      const morphologies = await getColumn('morphology');
      const nameOf = (nodeId: number) =>
        morphologies.kind === 'categorical'
          ? morphologies.library[morphologies.indices[nodeId]]
          : morphologies.kind === 'string'
            ? morphologies.values[nodeId]
            : undefined;
      const pathsOf = new Map<string, Promise<Map<number, SectionPath> | null>>();
      const failed = new Set<string>();
      const distances = new Map<number, number>();
      const types = new Map<number, string>();
      await Promise.all(
        [...compartments].map(async ([nodeId, list]) => {
          const name = nameOf(nodeId);
          if (!name) return;
          let pending = pathsOf.get(name);
          if (!pending) {
            pending = limit(() =>
              loadSections(queryClient, {
                path: circuitMorphologyPath(circuitId, morphologyFileOf(location, name), name),
                virtualLabId,
                projectId,
              })
            )
              .then(sectionPaths)
              // one morphology that will not load leaves its cells unmeasured, and no other
              .catch(() => {
                if (!cancelled) failed.add(name);
                return null;
              });
            pathsOf.set(name, pending);
          }
          const paths = await pending;
          if (!paths) return;
          // A section's several compartments in turn, for their segments' centres.
          const inSection = new Map<number, number>();
          for (const c of list) {
            if (c.section !== null) inSection.set(c.section, (inSection.get(c.section) ?? 0) + 1);
          }
          const counted = new Map<number, number>();
          for (const c of list) {
            const path = c.section === null ? undefined : paths.get(c.section);
            if (c.section === null || !path) continue;
            const nth = (counted.get(c.section) ?? 0) + 1;
            counted.set(c.section, nth);
            const offset =
              offsets?.get(c.traceIndex) ?? (nth - 0.5) / (inSection.get(c.section) ?? 1);
            distances.set(c.traceIndex, path.start + offset * path.length);
            const type = sectionTypeLabel(path.type);
            if (type) types.set(c.traceIndex, type);
          }
        })
      );
      if (failed.size > 0) {
        logError(`${failed.size} morphologies could not be measured on:`, [...failed].slice(0, 5));
      }
      if (!cancelled) setFound({ compartments, offsets, places: { distances, types } });
    };
    measure().catch((error: unknown) =>
      logError('The compartments could not be measured on their cells:', error)
    );
    return () => {
      cancelled = true;
      // the morphologies not yet asked for; those on their way are shared with the 3D view
      limit.clearQueue();
    };
  }, [
    enabled,
    circuitId,
    circuitConfig,
    populationName,
    compartments,
    offsets,
    getColumn,
    virtualLabId,
    projectId,
    queryClient,
  ]);
  return found?.compartments === compartments && found.offsets === offsets ? found.places : null;
}
