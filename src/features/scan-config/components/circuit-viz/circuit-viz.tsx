import { useSetAtom } from 'jotai';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { match } from 'ts-pattern';

import { circuitSceneAnchorAtom } from '@/features/scan-config/components/model-preview/circuit-scene-anchor';
import { useDownloadHandler } from '@/features/scan-config/components/model-preview/viewer-layout/hooks';
import { VERTICAL_SCALEBAR } from '@/features/scan-config/components/shared/3d-viewer';
import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';
import { MorphoViewerSmallCircuit } from '@/morpho-viewer';
import { Button } from '@/ui/molecules/button';

import { sequentialCellLoader } from './sequential-loader';
import {
  loaderSupportsAxonToggle,
  resolveSmallCircuitLoaderKind,
  SmallCircuitLoaderKind,
  useObiOneVizSource,
  useSonataAssetSource,
} from './sources';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { CircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { Cell, MorphoViewerTreeItem, Sections } from '@/features/scan-config/types';
import type { MorphoViewerOverlayTransformEvent, MorphoViewerSignals } from '@/morpho-viewer';
import type { SmallCircuitSource } from './sources';

import styles from './circuit-viz.module.css';

interface CircuitVizProps {
  circuit: ICircuit;
  /** per-node colors aligned by node index; undefined → viewer default (blue). */
  colorsByNode?: string[];
  /** default color for nodes with no property color (adapts to bg in adaptive mode). */
  defaultColor?: string;
  showAxons: boolean;
  backgroundColor: string;
  /** scalebar pin/label color (adaptive mode); undefined → package default. */
  scalebarColor?: string;
  /** signal bus: dispatch camera reset / snapshot; `snapshotReady` returns the image */
  signals: MorphoViewerSignals;
  /**
   * World-coordinate electrode overlays from {@link useElectrodeLocationsOverlay}.
   * Passed through to morphoviewer as point clouds (not Three.js helpers).
   */
  overlays?: CircuitOverlayGroup[];
  /**
   * Enable left-drag (translate) / right-drag or Alt/Shift (rotate) on overlays.
   * Why gated: only when `setConfig` exists so 3D edits can write the form.
   */
  overlaysInteractive?: boolean;
  /**
   * Fired by morphoviewer on gesture end with absolute origin + rotation.
   * Host applies via {@link applyElectrodeOverlayTransform}.
   */
  onOverlayTransform?: (event: MorphoViewerOverlayTransformEvent) => void;
  /** Form-selected electrode block name → highlight in the 3D view. */
  highlightedOverlayId?: string | null;
  /**
   * Neuron paint opacity (0–1). Host defaults: 1 generally, 0.2 for the
   * extracellular recording array campaign. Electrode markers stay opaque.
   */
  neuronOpacity?: number;
  /** Electrode marker radius in world units (morphoviewer `overlaysRadius`). */
  electrodeRadius?: number;
}

/**
 * Small-circuit GPU surface. Data strategy is selected by circuit scale:
 * - pair / small → OBI-One `/circuit/viz`
 * - single → client SONATA asset
 *
 * Split child components keep Rules of Hooks intact (SONATA must not mount for pair).
 */
const CircuitViz = (props: CircuitVizProps) =>
  match(resolveSmallCircuitLoaderKind(props.circuit.scale))
    .with(SmallCircuitLoaderKind.SonataAsset, () => <CircuitVizSonata {...props} />)
    .with(SmallCircuitLoaderKind.ObiOneVisualization, () => <CircuitVizObiOne {...props} />)
    .exhaustive();

function CircuitVizObiOne(props: CircuitVizProps) {
  const source = useObiOneVizSource({
    circuitId: props.circuit.id,
    showAxons: props.showAxons,
    colorsByNode: props.colorsByNode,
    defaultColor: props.defaultColor,
  });
  return <CircuitVizView {...props} source={source} clearSequentialOnAxonToggle />;
}

function CircuitVizSonata(props: CircuitVizProps) {
  const source = useSonataAssetSource({
    circuit: props.circuit,
    colorsByNode: props.colorsByNode,
    defaultColor: props.defaultColor,
  });
  const handleDownload = useDownloadHandler(props.circuit);
  return (
    <CircuitVizView
      {...props}
      source={source}
      errorActions={
        <Button className="mt-3" onClick={handleDownload}>
          Download SONATA file
        </Button>
      }
    />
  );
}

type CircuitVizViewProps = CircuitVizProps & {
  source: SmallCircuitSource;
  /** OBI-One axon toggle remounts morph keys — clear the sequential morphology cache. */
  clearSequentialOnAxonToggle?: boolean;
  errorActions?: ReactNode;
};

function CircuitVizView({
  showAxons,
  backgroundColor,
  scalebarColor,
  signals,
  overlays,
  overlaysInteractive = false,
  onOverlayTransform,
  highlightedOverlayId = null,
  neuronOpacity,
  electrodeRadius = 10,
  source,
  clearSequentialOnAxonToggle = false,
  errorActions,
}: CircuitVizViewProps) {
  const [progress, setProgress] = useState(0);
  const { cells, isLoading, error, loadCell } = source;
  const setCircuitSceneAnchor = useSetAtom(circuitSceneAnchorAtom);

  // Publish circuit centre so Add-electrode can seed origin_* in-view.
  useEffect(() => {
    if (!cells.length) return;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (const cell of cells) {
      sx += cell.center[0];
      sy += cell.center[1];
      sz += cell.center[2];
    }
    const n = cells.length;
    setCircuitSceneAnchor([sx / n, sy / n, sz / n]);
  }, [cells, setCircuitSceneAnchor]);

  const scalebar = useMemo(
    () => (scalebarColor ? { ...VERTICAL_SCALEBAR, color: scalebarColor } : VERTICAL_SCALEBAR),
    [scalebarColor]
  );

  const [highlightedCellId, setHighlightedCellId] = useState('');
  const handleCellHover = (cell: Cell | undefined): void => {
    setHighlightedCellId(cell?.id ?? '');
  };

  const prevAxonRef = useRef(showAxons);
  useEffect(() => {
    if (!clearSequentialOnAxonToggle) return;
    if (prevAxonRef.current !== showAxons) {
      prevAxonRef.current = showAxons;
      sequentialCellLoader.clear();
      setProgress(0);
    }
  }, [showAxons, clearSequentialOnAxonToggle]);

  const loading = !error && (isLoading || progress < 1);

  // Pass interactive metadata through; morphoviewer ignores unknown fields safely.
  const morphoOverlays = useMemo(
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
    <div className="h-full w-full relative">
      {cells.length > 0 && (
        <MorphoViewerSmallCircuit
          className={styles.morphoViewer}
          gizmo
          scalebar={scalebar}
          backgroundColor={backgroundColor}
          signals={signals}
          circuit={cells}
          onCellHover={handleCellHover}
          highlightedCellIds={[highlightedCellId]}
          loadCell={loadCell}
          controls={[]}
          onLoadProgress={setProgress}
          overlays={morphoOverlays}
          overlaysRadius={electrodeRadius}
          overlaysMinRadiusInPixels={Math.max(2, Math.round(electrodeRadius * 0.32))}
          overlaysInteractive={overlaysInteractive}
          onOverlayTransform={onOverlayTransform}
          highlightedOverlayId={highlightedOverlayId}
          neuronOpacity={neuronOpacity}
        />
      )}
      {loading && <VisualizationLoadingIndicator progress={progress} />}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
          <details className="text-red-500">
            <summary>
              <strong>Couldn't load the visualization</strong>
            </summary>
            <div>{error.message}</div>
          </details>
          {errorActions}
        </div>
      )}
    </div>
  );
}

export function buildMorphoTree(
  sections: Sections,
  cellId: string
): {
  type: 'tree';
  data: {
    cellId: string;
    roots: MorphoViewerTreeItem[];
  };
} {
  const roots: MorphoViewerTreeItem[] = [];
  const terminalNodes = new Map<string, MorphoViewerTreeItem>();
  const somaNodes: MorphoViewerTreeItem[] = [];

  for (const sec of sections) {
    let prevNode: MorphoViewerTreeItem | null = null;

    if (sec.parent_id === 'soma' && somaNodes.length > 0) {
      if (somaNodes.length === 1) {
        prevNode = somaNodes[0];
      } else {
        const [nx, ny, nz] = sec.points[0];
        let minDistance = Infinity;

        for (const sNode of somaNodes) {
          const dist = Math.sqrt((sNode.x - nx) ** 2 + (sNode.y - ny) ** 2 + (sNode.z - nz) ** 2);
          if (dist < minDistance) {
            minDistance = dist;
            prevNode = sNode;
          }
        }
      }
    } else if (sec.parent_id !== null && sec.parent_id !== 'soma') {
      prevNode = terminalNodes.get(sec.parent_id) || null;
    }

    const isSoma = sec.id === 'soma';
    const startIdx = sec.parent_id === null || sec.parent_id === 'soma' ? 0 : 1;
    let lastNode = prevNode;

    for (let i = startIdx; i < sec.points.length; i++) {
      const [x, y, z] = sec.points[i];
      const node: MorphoViewerTreeItem = {
        x,
        y,
        z,
        radius: sec.radii[i],
        type: sec.type,
        sectionId: sec.id,
        segmentId: String(i),
        distanceFromSoma: 0,
      };

      if (!lastNode && !isSoma) {
        roots.push(node);
      } else if (isSoma && i === 0) {
        roots.push(node);
      } else if (lastNode) {
        lastNode.children = lastNode.children || [];
        lastNode.children.push(node);
      }

      lastNode = node;

      if (isSoma) {
        somaNodes.push(node);
      }
    }

    if (lastNode && !isSoma) {
      terminalNodes.set(sec.id, lastNode);
    }
  }

  return {
    type: 'tree',
    data: {
      cellId,
      roots: roots,
    },
  };
}

export { loaderSupportsAxonToggle, resolveSmallCircuitLoaderKind };
export default CircuitViz;
