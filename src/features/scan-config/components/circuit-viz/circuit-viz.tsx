import { useSetAtom } from 'jotai';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { match } from 'ts-pattern';

import { DEFAULT_ELECTRODE_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
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
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { CircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { Cell, MorphoViewerTreeItem, Sections } from '@/features/scan-config/types';
import type { MorphoViewerOverlayTransformEvent, MorphoViewerSignals } from '@/morpho-viewer';
import type { SmallCircuitSource } from './sources';

import styles from './circuit-viz.module.css';

/**
 * Synapse marker radius in world units. Much smaller than an electrode contact:
 * a single neuron carries thousands of them, so anything larger reads as a
 * crust over the morphology instead of discrete contact points.
 */
const SYNAPSE_RADIUS = 0.5;

/** Per-pixel floor so synapses stay visible once the camera pulls back. */
const SYNAPSE_MIN_RADIUS_IN_PIXELS = 2;

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
  /**
   * Viewer feature flags from domain `viewer` (via host).
   * Only `cellHover` is consumed here today.
   */
  features?: Partial<Pick<IEntityViewerFeatures, 'cellHover'>>;
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
  electrodeRadius = DEFAULT_ELECTRODE_RADIUS,
  features,
  source,
  clearSequentialOnAxonToggle = false,
  errorActions,
}: CircuitVizViewProps) {
  const enableCellHover = features?.cellHover ?? true;
  const [progress, setProgress] = useState(0);
  // Stay covered for a paint frame after morphoviewer reports 100%, so the
  // neurite mesh replaces the soma placeholder before the overlay lifts.
  const [morphologiesPainted, setMorphologiesPainted] = useState(false);
  const { cells, isLoading, error, loadCell, synapses } = source;
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

  // Empty highlightedCellIds → morphoviewer flat overlay stays black (ADD black
  // = no wash-out). Hosts pass features.cellHover from domain `viewer`.
  const [highlightedCellId, setHighlightedCellId] = useState('');
  // Dragging an electrode must not leave a neuron lit under it. morphoviewer
  // only reports overlay transforms once the gesture ends, so the drag is
  // detected here from the pointer: press clears any highlight and suspends
  // hover, release resumes it.
  //
  // A ref, not state: nothing renders from this flag, and morphoviewer
  // re-subscribes whenever `onCellHover` changes identity — a stateful flag
  // would rebuild the closure and churn that listener on every drag.
  const draggingOverlayRef = useRef(false);
  const handleCellHover = useCallback((cell: Cell | undefined): void => {
    if (draggingOverlayRef.current) return;
    setHighlightedCellId(cell?.id ?? '');
  }, []);
  const suspendHoverHighlight = () => {
    if (!overlaysInteractive) return;
    draggingOverlayRef.current = true;
    setHighlightedCellId('');
  };
  const resumeHoverHighlight = () => {
    draggingOverlayRef.current = false;
  };
  // Stable array identity: morphoviewer's `highlightedCellIds` setter bails out
  // on reference equality, so a fresh array each render forces a repaint pass.
  const highlightedCellIds = useMemo(
    () => (enableCellHover ? [highlightedCellId] : []),
    [enableCellHover, highlightedCellId]
  );

  const prevAxonRef = useRef(showAxons);
  useEffect(() => {
    if (!clearSequentialOnAxonToggle) return;
    if (prevAxonRef.current !== showAxons) {
      prevAxonRef.current = showAxons;
      sequentialCellLoader.clear();
      setProgress(0);
      setMorphologiesPainted(false);
    }
  }, [showAxons, clearSequentialOnAxonToggle]);

  useEffect(() => {
    if (progress < 1) {
      setMorphologiesPainted(false);
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setMorphologiesPainted(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [progress]);

  const loading = !error && (isLoading || progress < 1 || !morphologiesPainted);

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
    <div
      className="h-full w-full relative"
      onPointerDown={suspendHoverHighlight}
      onPointerUp={resumeHoverHighlight}
      onPointerCancel={resumeHoverHighlight}
      onPointerLeave={resumeHoverHighlight}
    >
      {cells.length > 0 && (
        <MorphoViewerSmallCircuit
          className={styles.morphoViewer}
          gizmo
          scalebar={scalebar}
          backgroundColor={backgroundColor}
          signals={signals}
          circuit={cells}
          onCellHover={enableCellHover ? handleCellHover : undefined}
          highlightedCellIds={highlightedCellIds}
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
          synapses={synapses}
          synapsesRadius={SYNAPSE_RADIUS}
          synapsesMinRadiusInPixels={SYNAPSE_MIN_RADIUS_IN_PIXELS}
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
