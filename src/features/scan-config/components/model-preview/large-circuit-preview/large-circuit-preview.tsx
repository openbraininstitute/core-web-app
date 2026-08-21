import { saveAs } from 'file-saver';
import { useSetAtom } from 'jotai';
import React from 'react';

import { positionAt } from '@/features/circuit-nodes/geometry-utils';
import { useNodeGeometry } from '@/features/circuit-nodes/hooks/use-node-geometry';
import { DEFAULT_ELECTRODE_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
import { circuitSceneAnchorAtom } from '@/features/scan-config/components/model-preview/circuit-scene-anchor';
import { resolveScalebar } from '@/features/scan-config/components/shared/3d-viewer';
import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';
import {
  MorphoViewerCircuitMultipleNeuronsSomaOnly,
  useMorphoViewerDebugMode,
} from '@/morpho-viewer';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import { useSomaRadius } from './hooks';

import type { ICircuit } from '@/api/entitycore/types';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { MorphoViewerOverlayTransformEvent, MorphoViewerSignals } from '@/morpho-viewer';

import styles from './large-circuit-preview.module.css';

/**
 * Stands in for a per-cell morphology id, which somas-only has no use for.
 *
 * The viewer reads `morphologyId` in exactly one place — `sameGeometry`, to
 * decide whether a new `cellInfos` array is a recolour or a rebuild — and it
 * compares the position alongside it in the same loop. The position is what
 * actually discriminates, so one shared string behaves identically to a
 * distinct one per node and allocates nothing at region scale.
 */
const SHARED_MORPHOLOGY_ID = '';

export interface LargeCircuitPreviewProps {
  className?: string;
  circuit: ICircuit;
  /**
   * Host-owned, so `colorsByNode` is indexed against the cells it colours.
   *
   * Required but nullable: undefined is the honest value while
   * `circuit_config.json` is still loading, but a caller that leaves it out
   * altogether would land on "this circuit declares no node populations" — a
   * message blaming the data for a bug in the call.
   */
  population: NodePopulation | undefined;
  /** per-node colors aligned by node index; undefined → viewer default  */
  colorsByNode?: string[];
  backgroundColor: string;
  /** scalebar pin/label color (adaptive mode); undefined → package default  */
  scalebarColor?: string;
  /** Draw the scalebar down the side of the canvas. */
  showScalebar?: boolean;
  /** signal bus: dispatch camera reset / snapshot; `snapshotReady` returns the image */
  signals: MorphoViewerSignals;
  /**
   * World-coordinate electrode overlays (same pipeline as CircuitViz).
   * Large circuits draw somas only; overlay interaction is identical.
   */
  overlays?: ICircuitOverlayGroup[];
  /** Enable left-drag / right-drag on electrode overlays when form can write back. */
  overlaysInteractive?: boolean;
  /** Gesture-end transform → host `applyElectrodeOverlayTransform`. */
  onOverlayTransform?: (event: MorphoViewerOverlayTransformEvent) => void;
  /** Form-selected electrode block name → highlight in the 3D view. */
  highlightedOverlayId?: string | null;
  /** Soma paint opacity (0–1); electrodes stay fully opaque independently. */
  neuronOpacity?: number;
  /** Electrode marker radius (world units). */
  electrodeRadius?: number;
  /**
   * Viewer feature flags from domain `viewer` (via host).
   * Reserved for parity with {@link CircuitViz}; soma-only path has no cell hover.
   */
  features?: Partial<Pick<IEntityViewerFeatures, 'cellHover'>>;
}

interface CellInfo {
  /**
   * Required by morphoviewer, but never rendered: it feeds one
   * change-detection diff (`sameGeometry`) that gates the cheap recolour path,
   * and that diff compares positions in the same loop. The node index is
   * therefore as good as a real morphology name here, and reading the
   * `morphology` column to fill it would cost a JS string per node.
   */
  morphologyId: string;
  position: [number, number, number];
  color?: string;
}

export function LargeCircuitPreview({
  className,
  circuit,
  population,
  colorsByNode,
  backgroundColor,
  scalebarColor,
  showScalebar = true,
  signals,
  overlays,
  overlaysInteractive = false,
  onOverlayTransform,
  highlightedOverlayId = null,
  neuronOpacity,
  electrodeRadius = DEFAULT_ELECTRODE_RADIUS,
}: LargeCircuitPreviewProps) {
  const debugMode = useMorphoViewerDebugMode();
  const somaRadius = useSomaRadius(circuit);
  // Somas only: no morphology names needed, so the `morphology` column is left
  // unread rather than decoded into one JS string per node.
  const { geometry, error } = useNodeGeometry({ circuit, population });
  const setCircuitSceneAnchor = useSetAtom(circuitSceneAnchorAtom);
  React.useEffect(() => {
    if (!geometry || geometry.count === 0) return;
    // Read directly rather than through `positionAt`: a running sum has no
    // use for a tuple per node.
    const { count, positions: xyz } = geometry;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (let i = 0; i < count; i++) {
      sx += xyz[i * 3];
      sy += xyz[i * 3 + 1];
      sz += xyz[i * 3 + 2];
    }
    setCircuitSceneAnchor([sx / count, sy / count, sz / count]);
  }, [geometry, setCircuitSceneAnchor]);
  const scalebar = React.useMemo(
    () => resolveScalebar(showScalebar, scalebarColor),
    [scalebarColor, showScalebar]
  );
  const handleDownload = () => {
    if (!geometry) return;
    const { count } = geometry;
    const triples = Array.from({ length: count }, (_, i) => positionAt(geometry, i));
    const blob = new Blob([JSON.stringify(triples)], { type: 'application/json' });
    saveAs(blob, `${circuit.id}.json`);
  };
  // Split from the recolour below so a colour change rebuilds only the
  // `CellInfo` wrappers, not a position tuple per node as well.
  const positions = React.useMemo(() => {
    if (!geometry) return [];
    return Array.from({ length: geometry.count }, (_, i) => positionAt(geometry, i));
  }, [geometry]);

  const cellInfos = React.useMemo(
    () =>
      positions.map(
        (position, i): CellInfo => ({
          morphologyId: SHARED_MORPHOLOGY_ID,
          position,
          color: colorsByNode?.[i],
        })
      ),
    [positions, colorsByNode]
  );

  const morphoOverlays = React.useMemo(
    () =>
      overlays?.map(({ color, coordinates, id, kind, origin, rotation }) => ({
        color,
        coordinates,
        id,
        kind,
        origin,
        rotation,
      })),
    [overlays]
  );

  return (
    <div className={cn(className, 'relative h-full w-full', styles.largeCircuitPreview)}>
      {!geometry && !error && <VisualizationLoadingIndicator />}
      {error && (
        <div className={styles.error}>
          <h2>
            Unable to load circuit <strong>{circuit.name}</strong>!
          </h2>
          <p>{error.message}</p>
        </div>
      )}
      {geometry && !error && (
        <MorphoViewerCircuitMultipleNeuronsSomaOnly
          somaRadius={somaRadius}
          gizmo
          scalebar={scalebar}
          cellInfos={cellInfos}
          backgroundColor={backgroundColor}
          signals={signals}
          overlays={morphoOverlays}
          overlaysRadius={electrodeRadius}
          overlaysMinRadiusInPixels={Math.max(2, Math.round(electrodeRadius * 0.32))}
          overlaysInteractive={overlaysInteractive}
          onOverlayTransform={onOverlayTransform}
          highlightedOverlayId={highlightedOverlayId}
          neuronOpacity={neuronOpacity}
          controls={[
            debugMode
              ? [
                  <Button key="download" onClick={handleDownload} className={styles.downloadButton}>
                    Download {geometry.count} nodes
                  </Button>,
                ]
              : [],
          ]}
        />
      )}
    </div>
  );
}
