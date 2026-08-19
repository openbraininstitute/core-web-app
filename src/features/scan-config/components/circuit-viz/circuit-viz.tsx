import { useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_ELECTRODE_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
import { useMorphologyLocationSelection } from '@/features/scan-config/components/hooks/use-morphology-location-selection';
import { circuitSceneAnchorAtom } from '@/features/scan-config/components/model-preview/circuit-scene-anchor';
import { VERTICAL_SCALEBAR } from '@/features/scan-config/components/shared/3d-viewer';
import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';
import { MorphoViewerCircuitMultipleNeurons } from '@/morpho-viewer';

import { MorphologyLocationLabels } from './morphology-location/labels';
import { MorphologyLocationPopover } from './morphology-location/popover';
import { sequentialCellLoader } from './sequential-loader';
import { useCircuitSynapses, useObiOneVizSource } from './sources';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { IFormBindingOptions } from '@/features/scan-config/components/model-preview/morphology-locations-block';
import type { Cell } from '@/features/scan-config/types';
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
   * World-coordinate electrode overlays from {@link usePlacedElectrodeOverlays}.
   * Passed through to morphoviewer as point clouds (not Three.js helpers).
   */
  overlays?: ICircuitOverlayGroup[];
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
  /**
   * Binding for picking morphology locations in 3D.
   *
   * Resolved here rather than in the parent because both the markers and the pick handler
   * need the loaded cells, which only this component has.
   */
  morphologyLocations?: IMorphologyLocationsBinding;
}

export interface IMorphologyLocationsBinding extends IFormBindingOptions {
  /** Marker radius in world units, from the viewer settings slider. */
  markerRadius?: number;
  /** Show a `Type[section]` tag beside each location, from the viewer settings toggle. */
  showLabels?: boolean;
}

/**
 * Small-circuit GPU surface.
 *
 * Nodes and synapses are read from the circuit's SONATA files in the browser; morphologies
 * come from OBI-One `/circuit/viz`, whose sections carry the `sonata_section_id` a click
 * needs to become a morphology location.
 */
function CircuitViz(props: CircuitVizProps) {
  const source = useObiOneVizSource({
    circuitId: props.circuit.id,
    showAxons: props.showAxons,
    colorsByNode: props.colorsByNode,
    defaultColor: props.defaultColor,
  });
  const synapses = useCircuitSynapses(props.circuit);
  const withSynapses = useMemo(() => ({ ...source, synapses }), [source, synapses]);
  return <CircuitVizView {...props} source={withSynapses} />;
}

/** The view reads no entity fields, so it serves any small-circuit source. */
type TCircuitVizViewProps = Omit<CircuitVizProps, 'circuit'> & {
  source: SmallCircuitSource;
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
  morphologyLocations,
}: TCircuitVizViewProps) {
  const enableCellHover = features?.cellHover ?? true;
  const {
    selection: locationSelection,
    hover: locationHover,
    labels: locationLabels,
    pickMode: locationPickMode,
  } = useMorphologyLocationSelection({
    ...morphologyLocations,
    cells: source.cells,
    sonataSectionIds: source.sonataSectionIds,
    backgroundColor,
  });
  const [progress, setProgress] = useState(0);
  const [morphologiesPainted, setMorphologiesPainted] = useState(false);
  const { cells, isLoading, error, loadCell, retry, synapses } = source;
  const setCircuitSceneAnchor = useSetAtom(circuitSceneAnchorAtom);

  const [reloadNonce, setReloadNonce] = useState(0);

  const resetPaint = useCallback(() => {
    setProgress(0);
    setMorphologiesPainted(false);
  }, []);

  const handleRetry = useCallback(() => {
    resetPaint();
    setReloadNonce((nonce) => nonce + 1);
    retry();
  }, [resetPaint, retry]);

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

  const highlightedCellIds = useMemo(
    () => (enableCellHover ? [highlightedCellId] : []),
    [enableCellHover, highlightedCellId]
  );

  // OBI-One axon toggle remounts morph keys — clear the sequential morphology cache.
  const prevAxonRef = useRef(showAxons);
  useEffect(() => {
    if (prevAxonRef.current !== showAxons) {
      prevAxonRef.current = showAxons;
      sequentialCellLoader.clear();
      resetPaint();
    }
  }, [showAxons, resetPaint]);

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
        <MorphoViewerCircuitMultipleNeurons
          gizmo
          key={reloadNonce}
          className={styles.morphoViewer}
          scalebar={scalebar}
          backgroundColor={backgroundColor}
          signals={signals}
          circuit={cells}
          onCellHover={enableCellHover ? handleCellHover : undefined}
          locationSelection={locationSelection}
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
      <MorphologyLocationLabels labels={locationLabels} />
      <MorphologyLocationPopover hover={locationHover} pickMode={locationPickMode} />
      {loading && <VisualizationLoadingIndicator progress={progress} />}
      {error && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4"
        >
          <details className="text-red-500">
            <summary>
              <strong>Couldn't load the visualization</strong>
            </summary>
            <div>{error.message}</div>
          </details>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-full bg-white px-3 py-1 text-sm text-primary-9 shadow-md ring-1 ring-black/5 hover:bg-neutral-100"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export default CircuitViz;
