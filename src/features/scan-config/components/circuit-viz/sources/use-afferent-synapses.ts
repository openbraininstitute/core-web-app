import { File as H5File } from 'h5wasm';
import { useEffect, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { placementAt } from '@/features/circuit-nodes/geometry-utils';
import {
  loadAfferentSynapses,
  Report,
} from '@/features/scan-config/components/circuit-viz/synapses';
import { categoricalColor } from '@/features/scan-config/components/color-by/palette';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { unlinkFromFS, writeToFS } from '@/utils/h5/fs';
import { logError } from '@/utils/logger';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { NodeGeometry, ParsedCircuitConfig } from '@/features/circuit-nodes/types';
import type { MorphoViewerTree } from '@/morpho-viewer';
import type { TSmallCircuitSynapseGroup } from './types';

type Options = {
  /** Off for circuits whose cell count puts the projection out of budget. */
  enabled: boolean;
  circuit: ICircuit;
  config: ParsedCircuitConfig | undefined;
  /** Placement of the drawn population; synapses wait for it. */
  geometry: NodeGeometry | null;
  /**
   * One node's morphology, in morphology-local coordinates. Asked for with its
   * axons whatever the viewer is showing — see below.
   */
  loadTree: (nodeIndex: number) => Promise<MorphoViewerTree | null>;
};

/**
 * Afferent synapses for the drawn circuit, one coloured group per edge
 * population.
 *
 * The work is more than reading coordinates: SONATA computes soma synapses
 * against a spherical soma, so they have to be projected back onto the soma the
 * viewer actually paints. That needs each target cell's morphology, which is
 * why this hangs off `loadTree` rather than reading the edge files alone.
 *
 * Morphologies are always requested whole, axons included, even while the
 * viewer is hiding them. `afferent_section_id` indexes the complete morphology,
 * and hiding a neurite is a display choice: reprojecting a synapse onto a mesh
 * with sections removed would move it onto a branch that was never its target.
 * It also keeps the toggle from restarting this work.
 *
 * Failures are logged rather than returned. Synapses are an overlay on a
 * circuit that draws perfectly well without them, and the viewer's error state
 * covers the canvas — so an unreadable edge file would hide a correct render
 * behind a banner about the one thing that is missing from it.
 */
export function useAfferentSynapses({
  enabled,
  circuit,
  config,
  geometry,
  loadTree,
}: Options): TSmallCircuitSynapseGroup[] {
  const ctx = useWorkspace();
  const [groups, setGroups] = useState<TSmallCircuitSynapseGroup[]>([]);

  const circuitId = circuit.id;
  const circuitAssetId = config?.circuitAssetId;
  const edges = config?.edges;

  useEffect(() => {
    if (!enabled || !geometry || !edges || !circuitAssetId) return;

    let cancelled = false;
    const report = new Report();

    const openEdgesFile = async (file: string) => {
      const response = await downloadAsset({
        ctx,
        entityType: EntityTypeDict.Circuit,
        entityId: circuitId,
        id: circuitAssetId,
        assetPath: file,
        asRawResponse: true,
      });
      const buffer = await response.arrayBuffer();
      const { filename } = await writeToFS(fsKeyOf(circuitAssetId, file), buffer);
      const opened = new H5File(filename, 'r');
      return {
        file: opened,
        // Both halves matter: the handle holds HDF5's own caches, and the file
        // holds a copy of every byte downloaded. h5wasm is a 32-bit build, so
        // leaving edge files behind spends an address space the nodes reader
        // shares.
        close: async () => {
          opened.close();
          await unlinkFromFS(filename);
        },
      };
    };

    loadAfferentSynapses({
      report,
      edges: groupByFile(edges),
      openEdgesFile,
      placementOf: (index) => placementAt(geometry, index),
      loadTree,
    })
      .then((loaded) => {
        if (cancelled) return;
        // One colour per edge population, from the colourblind-safe categorical
        // set. Offset so the first population lands on bluish green: slot 0 is
        // the blue that DEFAULT_NEURON_COLOR and the first colour-by category
        // both already use, and synapses sit directly on the morphology wearing
        // it.
        //
        // The offset is temporary: it moves the clash rather than removing it,
        // since slot 2 is also the third colour-by category. Synapses need a
        // palette of their own, split from the node one, once the colour
        // requirements are formalized.
        setGroups(
          loaded.map(({ coordinates }, index) => ({
            color: categoricalColor(index + 2),
            coordinates,
          }))
        );
      })
      .catch((e) => {
        if (cancelled) return;
        report.logFailure(e);
        logError('Unable to load afferent synapses:', e);
        // Dropped, not kept: whatever is on screen was projected onto a
        // different placement, and leaving it there draws synapses on cells
        // that have moved.
        setGroups([]);
      })
      .finally(() => {
        if (!cancelled) report.debug();
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, ctx, circuitId, circuitAssetId, edges, geometry, loadTree]);

  return groups;
}

/** Populations sharing a file are read from one open handle. */
function groupByFile(edges: ParsedCircuitConfig['edges']) {
  const byFile = new Map<string, string[]>();
  for (const edge of edges) {
    const populations = byFile.get(edge.file);
    if (populations) populations.push(edge.name);
    else byFile.set(edge.file, [edge.name]);
  }
  return [...byFile].map(([file, populations]) => ({ file, populations }));
}

/**
 * MEMFS is flat, so the asset path has to survive as a single filename.
 *
 * Hashed rather than substituted: mapping every separator to `_` would let
 * `a/b.h5` and `a_b.h5` land on one file, and the second circuit to ask would
 * silently read the first one's edges.
 */
function fsKeyOf(circuitAssetId: string, file: string): string {
  return `edges-${circuitAssetId}-${hashString(file)}`;
}

/** FNV-1a, in hex. Not a checksum — just a filename that keeps paths apart. */
function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
