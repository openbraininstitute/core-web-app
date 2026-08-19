import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { STATIC_RESOURCE_QUERY_OPTIONS } from '@/features/scan-config/components/circuit-viz/query-options';
import {
  projectionCellLoader,
  SequentialLoaderClearedError,
} from '@/features/scan-config/components/circuit-viz/sequential-loader';
import { categoricalColor } from '@/features/scan-config/components/color-by/palette';
import {
  createSurfaceSdf,
  drawnRadiusFactor,
  isSomaSection,
  projectOntoSurface,
  rescueOffSurface,
  type SomaEnvelope,
  type SurfacePoint,
  type SurfaceSdf,
  type SurfaceSegment,
  somaEnvelopeOf,
  transform,
} from '@/features/scan-config/components/drawn-surface';
import { getCircuitLoader } from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader';
import { MorphoViewerTreeItemType } from '@/morpho-viewer';
import useWorkspace from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { logError } from '@/utils/logger';

import { circuitNodesQueryOptions, makeNodeKey } from './use-obi-one-viz-source';

import type { ICircuit } from '@/api/entitycore/types';
import type { Vec3 } from '@/features/scan-config/components/drawn-surface';
import type { Node, Nodes, TSynapseGroup, TSynapseGroups } from '@/features/scan-config/types';
import type { MorphoViewerTreeItem } from '@/morpho-viewer';
import type { TSmallCircuitSynapseGroup } from './types';

/**
 * Afferent synapses read from the circuit's SONATA edge files in the browser, projected onto
 * the drawn surface: SONATA computes somatic synapses against a spherical soma, so their raw
 * coordinates must be snapped onto the capsule stack the viewer paints.
 *
 * Only a single-scale circuit has them, so any other scale skips the request.
 *
 * @param circuit - The circuit whose afferent synapses to load.
 * @returns One coloured group per edge population; empty until loaded.
 */
export function useCircuitSynapses(circuit: ICircuit): TSmallCircuitSynapseGroup[] {
  const { virtualLabId, projectId } = useWorkspace();
  const queryClient = useQueryClient();
  const circuitId = circuit.id;

  const { data: projected } = useQuery({
    enabled: circuit.scale === CircuitScaleDictionary.Single,
    queryKey: keyBuilder.circuitSynapses(circuitId),
    queryFn: async () => {
      try {
        const loader = getCircuitLoader({ circuitId, virtualLabId, projectId });
        const [groups, nodes] = await Promise.all([
          loader.getAfferentSynapses(),
          queryClient.ensureQueryData(circuitNodesQueryOptions(circuitId, virtualLabId, projectId)),
        ]);
        return projectSynapseGroups(groups, nodes, { virtualLabId, projectId, circuitId });
      } catch (error) {
        logError(`Afferent synapses of circuit "${circuitId}" could not be loaded:`, error);
        throw error;
      }
    },
    ...STATIC_RESOURCE_QUERY_OPTIONS,
  });

  // Slot 0 is the blue the neuron itself wears; population colours start at 2.
  return useMemo(() => {
    return (projected ?? []).map((coordinates, index) => ({
      color: categoricalColor(index + 2),
      coordinates,
    }));
  }, [projected]);
}

type TProjectionContext = { virtualLabId: string; projectId: string; circuitId: string };

/** The signed distance fields one cell needs, built once and shared. */
type TCellSurfaces = {
  /** What the soma painter draws — where SONATA's soma synapses belong. */
  soma: SurfaceSdf | null;
  /** Everything the cell draws, for rescuing near-soma synapses against. */
  whole: SurfaceSdf | null;
  /** Where the spherical-soma model can reach — see {@link rescueOffSurface}. */
  somaEnvelope: SomaEnvelope | null;
};

/** One morphology sample in local (radius decisions) and world (synapse) space. */
type TSample = { local: Vec3; point: SurfacePoint };

/** A segment as the viewer paints it — see {@link drawnRadiusFactor} for the radii. */
function drawnSegment(from: TSample, to: TSample): SurfaceSegment {
  const factor = drawnRadiusFactor(from.local, to.local);
  return {
    from: { ...from.point, radius: from.point.radius * factor },
    to: { ...to.point, radius: to.point.radius * factor },
  };
}

/** Distance from the drawn surface below which a synapse marker still touches its branch. */
const OFF_SURFACE_TOLERANCE = 0.5;

async function projectSynapseGroups(
  groups: TSynapseGroups,
  nodes: Nodes,
  context: TProjectionContext
): Promise<Float32Array[]> {
  const surfaces = await buildTargetSurfaces(groups, nodes, context);
  return groups.map((group) => projectGroup(group, surfaces));
}

/**
 * Drawn-surface fields per target cell, from the full morphology tree — synapses are drawn
 * on hidden axons too. A cell that fails to load keeps its synapses at raw coordinates.
 */
async function buildTargetSurfaces(
  groups: TSynapseGroups,
  nodes: Nodes,
  { virtualLabId, projectId, circuitId }: TProjectionContext
): Promise<Map<number, TCellSurfaces>> {
  const targets = new Set<number>();
  const somaTargets = new Set<number>();
  for (const group of groups) {
    const count = Math.min(group.target_node_ids.length, group.section_ids.length);
    for (let i = 0; i < count; i++) {
      targets.add(group.target_node_ids[i]);
      if (isSomaSection(group.section_ids[i])) somaTargets.add(group.target_node_ids[i]);
    }
  }

  const surfaces = new Map<number, TCellSurfaces>();
  for (const target of targets) {
    const node = nodes[target];
    if (!node) continue;

    const cellId = makeNodeKey(circuitId, target);
    try {
      const tree = await projectionCellLoader.load({
        virtualLabId,
        projectId,
        circuitId,
        cellId,
        name: node.morphology_name,
        file: node.morphology_file,
        showAxon: true,
      });
      if (!tree) continue;

      surfaces.set(target, buildCellSurfaces(tree.data.roots, node, somaTargets.has(target)));
    } catch (error) {
      if (error instanceof SequentialLoaderClearedError) continue;

      logError(`Synapses of cell "${cellId}" stay unprojected:`, error);
    }
  }
  return surfaces;
}

/**
 * Rebuild the segments the viewer draws for one cell, in world coordinates, as signed
 * distance fields: a parentless root as a degenerate segment (a sphere), every other sample
 * as a cone from its parent — soma-typed ones belong to the soma surface.
 */
function buildCellSurfaces(
  roots: MorphoViewerTreeItem[],
  node: Node,
  wantSoma: boolean
): TCellSurfaces {
  const placement = { center: node.position, orientation: node.orientation };
  const somaSegments: SurfaceSegment[] = [];
  const wholeSegments: SurfaceSegment[] = [];
  const stack = roots.map((item) => ({ item, parent: null as TSample | null }));
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) continue;

    const { item, parent } = entry;
    const [x, y, z] = transform(item.x, item.y, item.z, placement);
    const sample: TSample = {
      local: [item.x, item.y, item.z],
      point: { x, y, z, radius: item.radius },
    };
    const segment = parent ? drawnSegment(parent, sample) : drawnSegment(sample, sample);
    if (!parent || item.type === MorphoViewerTreeItemType.Soma) somaSegments.push(segment);
    wholeSegments.push(segment);

    for (const child of item.children ?? []) stack.push({ item: child, parent: sample });
  }

  return {
    soma: wantSoma ? createSurfaceSdf(somaSegments) : null,
    whole: createSurfaceSdf(wholeSegments),
    somaEnvelope: somaEnvelopeOf(somaSegments, node.position),
  };
}

/** Project soma synapses onto the drawn soma, rescue near-soma strays, leave the rest raw. */
function projectGroup(group: TSynapseGroup, surfaces: Map<number, TCellSurfaces>): Float32Array {
  const { coordinates, section_ids: sectionIds, target_node_ids: targetIds } = group;
  const count = Math.floor(coordinates.length / 3);
  if (sectionIds.length !== count || targetIds.length !== count) {
    return Float32Array.from(coordinates);
  }

  const projected = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const surface: Vec3 = [coordinates[i * 3], coordinates[i * 3 + 1], coordinates[i * 3 + 2]];
    const cell = surfaces.get(targetIds[i]);
    const sdf = isSomaSection(sectionIds[i]) ? cell?.soma : undefined;
    let point = surface;
    if (sdf) {
      point = projectOntoSurface(surface, sdf);
    } else if (cell?.whole && cell.somaEnvelope) {
      point =
        rescueOffSurface(surface, cell.whole, cell.somaEnvelope, OFF_SURFACE_TOLERANCE) ?? surface;
    }
    projected.set(point, i * 3);
  }
  return projected;
}
