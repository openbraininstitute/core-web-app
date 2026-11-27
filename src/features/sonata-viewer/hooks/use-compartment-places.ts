'use client';

import { useQueryClient } from '@tanstack/react-query';
import pLimit from 'p-limit';
import { useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';

import { circuitMorphologyPath } from '@/api/one/circuit-visualization';
import { NodesClosedError } from '@/features/circuit-nodes/hooks/nodes-worker-manager';
import { loadSections } from '@/features/circuit-viewer/morphologies/load/read-sections';
import { sectionTypeLabel } from '@/features/scan-config/components/circuit-viz/section-type-label';
import {
  morphologyFileOf,
  resolveMorphologyLocation,
} from '@/features/scan-config/components/circuit-viz/sources/resolve-morphology-path';
import { sectionPaths } from '@/features/sonata-viewer/path-distance';
import { UnmeasuredBy } from '@/features/sonata-viewer/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilderSonataViewer } from '@/ui/use-query-keys/sonata-viewer';
import { logError } from '@/utils/logger';

import type { ColumnValues, ParsedCircuitConfig } from '@/features/circuit-nodes/types';
import type { Compartment } from '@/features/sonata-viewer/compartment-rows';
import type { SectionPath } from '@/features/sonata-viewer/path-distance';
import type { TCompartmentPlacesState } from '@/features/sonata-viewer/types';

/** Morphologies asked for at once: a report may record thousands of cells. */
const MORPHOLOGY_LOADS = 8;

export const MAX_MEASURED_MORPHOLOGIES = 200;
/** Lower: OBI-One downloads the whole container for each morphology read from it. */
export const MAX_MEASURED_IN_CONTAINER = 20;
/** The most morphologies a population may keep in its container for any to be read from it. */
export const MAX_CONTAINER_MORPHOLOGIES = 200;

const PATHS_KEPT_FOR_MS = 60 * 60 * 1000;
const MORPHOLOGY_KEPT_FOR_MS = 60 * 1000;

const NO_PLACES: TCompartmentPlacesState = { places: null, unmeasured: null };

function morphologyCount(column: ColumnValues): number {
  return match(column)
    .with({ kind: 'categorical' }, ({ indices }) => new Set(indices).size)
    .with({ kind: 'string' }, ({ values }) => new Set(values).size)
    .otherwise(() => 0);
}

function passedLimit(
  container: boolean,
  inReport: number,
  inContainer: number
): TCompartmentPlacesState['unmeasured'] {
  return match({ container, inReport, inContainer })
    .with({ container: true, inContainer: P.number.gt(MAX_CONTAINER_MORPHOLOGIES) }, () => ({
      by: UnmeasuredBy.Container,
      morphologies: inContainer,
      limit: MAX_CONTAINER_MORPHOLOGIES,
    }))
    .with({ container: true, inReport: P.number.gt(MAX_MEASURED_IN_CONTAINER) }, () => ({
      by: UnmeasuredBy.ReportInContainer,
      morphologies: inReport,
      limit: MAX_MEASURED_IN_CONTAINER,
    }))
    .with({ container: false, inReport: P.number.gt(MAX_MEASURED_MORPHOLOGIES) }, () => ({
      by: UnmeasuredBy.Report,
      morphologies: inReport,
      limit: MAX_MEASURED_MORPHOLOGIES,
    }))
    .otherwise(() => null);
}

/**
 * The places of a report's compartments, measured on their cells' morphologies once those
 * load: through the 3D view's cache, so one it has drawn is not asked for again. Each
 * morphology's section paths are kept an hour, and the morphology itself only a minute. A
 * compartment set's offset says where along its section each one is; without one, a
 * section's compartments are at its segments' centres, as NEURON reports them. Places are
 * null until they are in, where the circuit has no morphologies to measure on, and where a
 * limit is passed.
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
}): TCompartmentPlacesState {
  const { virtualLabId, projectId } = useWorkspace();
  const queryClient = useQueryClient();
  const [found, setFound] = useState<{
    compartments: ReadonlyMap<number, readonly Compartment[]>;
    offsets: ReadonlyMap<number, number> | undefined;
    state: TCompartmentPlacesState;
  }>();
  useEffect(() => {
    if (!enabled || !circuitId || !circuitConfig || !populationName) return;
    if (compartments.size === 0) return;
    const location = resolveMorphologyLocation(circuitConfig.raw, populationName);
    if (!location) return;
    let cancelled = false;
    // rejecting what it drops, so the measuring it leaves behind ends
    const limit = pLimit({
      concurrency: location.container ? 1 : MORPHOLOGY_LOADS,
      rejectOnClear: true,
    });
    const measure = async () => {
      const morphologies = await getColumn('morphology');
      const nameOf = (nodeId: number) =>
        morphologies.kind === 'categorical'
          ? morphologies.library[morphologies.indices[nodeId]]
          : morphologies.kind === 'string'
            ? morphologies.values[nodeId]
            : undefined;
      const names = new Set<string>();
      for (const nodeId of compartments.keys()) {
        const name = nameOf(nodeId);
        if (name) names.add(name);
      }
      const inContainer = location.container ? morphologyCount(morphologies) : 0;
      const unmeasured = passedLimit(location.container, names.size, inContainer);
      if (unmeasured) {
        if (!cancelled) setFound({ compartments, offsets, state: { places: null, unmeasured } });
        return;
      }
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
            const request = {
              path: circuitMorphologyPath(circuitId, morphologyFileOf(location, name), name),
              virtualLabId,
              projectId,
            };
            pending = limit(() =>
              queryClient.fetchQuery({
                queryKey: keyBuilderSonataViewer.sectionPaths(request),
                queryFn: () =>
                  loadSections(queryClient, request, { gcTime: MORPHOLOGY_KEPT_FOR_MS }).then(
                    sectionPaths
                  ),
                staleTime: Number.POSITIVE_INFINITY,
                gcTime: PATHS_KEPT_FOR_MS,
                retry: false,
              })
            )
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
      if (!cancelled) {
        setFound({
          compartments,
          offsets,
          state: { places: { distances, types }, unmeasured: null },
        });
      }
    };
    measure().catch((error: unknown) => {
      if (error instanceof NodesClosedError) return;
      logError('The compartments could not be measured on their cells:', error);
    });
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
  return found?.compartments === compartments && found.offsets === offsets
    ? found.state
    : NO_PLACES;
}
