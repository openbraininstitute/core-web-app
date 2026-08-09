import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import authFetch from '@/auth-fetch';
import { config } from '@/config';
import { loadMorphologyTree } from '@/features/scan-config/components/circuit-viz/sequential-loader';
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
} from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader/morphology-surface';
import { transform } from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader/transform';
import { SynapseGroupsArraySchema } from '@/features/scan-config/types';
import { MorphoViewerTreeItemType } from '@/morpho-viewer';
import useWorkspace from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import { useCircuitNodes } from './use-obi-one-viz-source';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { Vec3 } from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader/sdf';
import type { Node, Nodes, SynapseGroup, SynapseGroups } from '@/features/scan-config/types';
import type { MorphoViewerTreeItem } from '@/morpho-viewer';
import type { SmallCircuitSynapseGroup } from './types';

/**
 * Afferent synapses for a circuit, positioned against the surface the viewer draws.
 *
 * The raw coordinates come from OBI-One `/circuit/viz/{id}/synapses` — the edge file's
 * `afferent_surface` positions. Those are not directly drawable: SONATA computes a somatic
 * synapse against a *spherical* soma while the viewer draws the soma as a capsule stack, so
 * raw somatic coordinates sink inside or float outside the rendered mesh. This hook rebuilds
 * the drawn surface from the same `/circuit/viz` morphology the viewer paints and projects
 * them onto it — the correction added in #1845, applied to the server's coordinates.
 *
 * @param circuit - The circuit whose afferent synapses to load.
 * @returns One group per edge population. Empty until everything has loaded, and for circuits
 * that record connectivity without geometry.
 */
export function useCircuitSynapses(circuit: ICircuit): SmallCircuitSynapseGroup[] {
  const { virtualLabId, projectId } = useWorkspace();
  const circuitId = circuit.id;
  const { data: nodes } = useCircuitNodes(circuitId, virtualLabId, projectId);

  const { data: projected } = useQuery({
    queryKey: keyBuilder.circuitSynapses(circuitId),
    enabled: Boolean(nodes),
    queryFn: async () => {
      const groups = await fetchSynapseGroups(circuitId, virtualLabId, projectId);
      return projectSynapseGroups(groups, nodes ?? [], { virtualLabId, projectId, circuitId });
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Offset so the first population avoids slot 0, the blue the neuron itself wears.
  return useMemo(() => {
    return (projected ?? []).map((coordinates, index) => ({
      color: categoricalColor(index + 2),
      coordinates,
    }));
  }, [projected]);
}

async function fetchSynapseGroups(
  circuitId: string,
  virtualLabId: string,
  projectId: string
): Promise<SynapseGroups> {
  const res = await authFetch(`${config.OBI_ONE_URL}/circuit/viz/${circuitId}/synapses`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'virtual-lab-id': virtualLabId,
      'project-id': projectId,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch circuit synapses for id "${circuitId}"!`);
  }

  const json = await res.json();
  return SynapseGroupsArraySchema.parse(json);
}

type ProjectionContext = { virtualLabId: string; projectId: string; circuitId: string };

/** The signed distance fields one cell needs, built once and shared. */
type CellSurfaces = {
  /** What the soma painter draws — where SONATA's soma synapses belong. */
  soma: SurfaceSdf | null;
  /** Everything the cell draws, for rescuing near-soma synapses against. */
  whole: SurfaceSdf | null;
  /** Where the spherical-soma model can reach — see {@link rescueOffSurface}. */
  somaEnvelope: SomaEnvelope | null;
};

/**
 * One morphology sample, kept in both spaces: local because that is where the renderer
 * decides how thick to draw a segment, world because that is where the synapses are.
 */
type Sample = { local: Vec3; point: SurfacePoint };

/**
 * The segment between two samples as the viewer paints it, radii and all.
 *
 * Passing the same sample twice gives the degenerate segment a parentless root is drawn as,
 * which the renderer draws at its true radius.
 *
 * @see drawnRadiusFactor — why the radii are not the ones the morphology states.
 */
function drawnSegment(from: Sample, to: Sample): SurfaceSegment {
  const factor = drawnRadiusFactor(from.local, to.local);
  return {
    from: { ...from.point, radius: from.point.radius * factor },
    to: { ...to.point, radius: to.point.radius * factor },
  };
}

/**
 * How far outside the drawn surface a synapse has to sit before it is worth moving. About
 * the radius the viewer gives a marker: any closer and the marker still touches its branch.
 */
const OFF_SURFACE_TOLERANCE = 0.5;

async function projectSynapseGroups(
  groups: SynapseGroups,
  nodes: Nodes,
  context: ProjectionContext
): Promise<Float32Array[]> {
  const surfaces = await buildTargetSurfaces(groups, nodes, context);
  return groups.map((group) => projectGroup(group, surfaces));
}

/**
 * Build the drawn-surface fields for every cell the synapses land on.
 *
 * Loads the *full* morphology tree (axon included) regardless of the axon toggle: synapses
 * are drawn on hidden axons too, and projecting them against a tree missing those branches
 * would rescue them onto surfaces they do not belong to.
 */
async function buildTargetSurfaces(
  groups: SynapseGroups,
  nodes: Nodes,
  { virtualLabId, projectId, circuitId }: ProjectionContext
): Promise<Map<number, CellSurfaces>> {
  const targets = new Set<number>();
  for (const group of groups) {
    for (const target of group.target_node_ids) targets.add(target);
  }

  const surfaces = new Map<number, CellSurfaces>();
  for (const target of targets) {
    // `target_node_id` indexes the target population; `nodes` holds the selected node set.
    // Those coincide for the single-cell circuits this hook serves — hence the lookup guard.
    const node = nodes[target];
    if (!node) continue;

    const tree = await loadMorphologyTree({
      virtualLabId,
      projectId,
      circuitId,
      cellId: `${circuitId} #${target}`,
      name: node.morphology_name,
      file: node.morphology_file,
      showAxon: true,
    });
    if (!tree) continue;

    surfaces.set(target, buildCellSurfaces(tree.data.roots, node));
  }
  return surfaces;
}

/**
 * Reconstruct the segments the viewer draws for one cell, in world coordinates, and turn
 * them into signed distance fields.
 *
 * Mirrors the viewer's own segment construction: a parentless root is drawn as a degenerate
 * segment (a sphere), every other sample as a cone from its parent — soma-typed ones by the
 * soma painter, the rest by the neurite painter. Reconstructing the soma any other way, by
 * chaining samples in traversal order say, invents surfaces the viewer never draws, and
 * synapses projected onto those hang off the mesh.
 */
function buildCellSurfaces(roots: MorphoViewerTreeItem[], node: Node): CellSurfaces {
  const placement = { center: node.position, orientation: node.orientation };
  const somaSegments: SurfaceSegment[] = [];
  const wholeSegments: SurfaceSegment[] = [];
  const stack = roots.map((item) => ({ item, parent: null as Sample | null }));
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) continue;

    const { item, parent } = entry;
    const [x, y, z] = transform(item.x, item.y, item.z, placement);
    const sample: Sample = {
      local: [item.x, item.y, item.z],
      point: { x, y, z, radius: item.radius },
    };
    const segment = parent ? drawnSegment(parent, sample) : drawnSegment(sample, sample);
    if (!parent || item.type === MorphoViewerTreeItemType.Soma) somaSegments.push(segment);
    wholeSegments.push(segment);

    for (const child of item.children ?? []) stack.push({ item: child, parent: sample });
  }

  return {
    soma: createSurfaceSdf(somaSegments),
    whole: createSurfaceSdf(wholeSegments),
    somaEnvelope: somaEnvelopeOf(somaSegments, node.position),
  };
}

/**
 * Move each synapse of one population onto the drawn surface.
 *
 * Soma synapses get projected onto the drawn soma or they float free of it. Neurite synapses
 * are left where SONATA put them, with one exception: a few arrive near the soma yet clear of
 * everything drawn, and those get pulled back onto the mesh — see {@link rescueOffSurface}.
 */
function projectGroup(group: SynapseGroup, surfaces: Map<number, CellSurfaces>): Float32Array {
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
