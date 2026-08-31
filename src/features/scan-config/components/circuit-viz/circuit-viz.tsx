import { useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_ELECTRODE_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
import { useMorphologyLocationSelection } from '@/features/scan-config/components/hooks/use-morphology-location-selection';
import { circuitSceneAnchorAtom } from '@/features/scan-config/components/model-preview/circuit-scene-anchor';
import { resolveScalebar } from '@/features/scan-config/components/shared/3d-viewer';
import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';
import { MorphoViewerCircuitMultipleNeurons } from '@/morpho-viewer';

import { MorphologyLocationLabels } from './morphology-location/labels';
import { MorphologyLocationPopover } from './morphology-location/popover';
import { sequentialCellLoader } from './sequential-loader';
import {
  circuitDrawsSynapses,
  useMemodelVisualizationSource,
  useSmallCircuitSource,
} from './sources';
import { parseNodeKey } from './sources/node-key';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { ISpikeReplayBinding } from '@/features/circuit-viewer/types';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { IFormBindingOptions } from '@/features/scan-config/components/model-preview/morphology-locations-block';
import type { Cell } from '@/features/scan-config/types';
import type {
  MorphoViewerOverlayTransformEvent,
  MorphoViewerSignals,
  MorphoViewerSmallCircuitCell,
} from '@/morpho-viewer';
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
  /**
   * SONATA node population to draw. Host-owned and shared with colour-by, so
   * `nodeColors` stays indexed against the same nodes this draws.
   */
  population?: NodePopulation;
  /** per-node colors (a palette + column per node); undefined → viewer default (blue). */
  nodeColors?: NodeColors;
  /** default color for nodes with no property color (adapts to bg in adaptive mode). */
  defaultColor?: string;
  /**
   * Every population to draw, in declared order, including `population`. The
   * others are drawn receded, keeping the morphologies of those that have any,
   * or not at all when their nodes carry no positions.
   */
  populations: readonly NodePopulation[];
  /**
   * Populations taken out of the scene, by name. Here that is a real saving
   * rather than a repaint: a hidden population contributes no cells, and the
   * viewer only asks for the morphologies of cells it has been given.
   */
  hiddenPopulations?: readonly string[];
  /** Colour for the populations that are not on show. */
  recededColor?: string;
  /** Called with the population name when a cell of another population is clicked. */
  onPopulationClick?: (populationName: string) => void;
  showAxons: boolean;
  backgroundColor: string;
  /** scalebar pin/label color (adaptive mode); undefined → package default. */
  scalebarColor?: string;
  /** Draw the scalebar down the side of the canvas. */
  showScalebar?: boolean;
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
  /** Morph the cell into a dendrogram of the same segments. */
  dendrogram?: boolean;
  /** Called with the camera zoom whenever it changes, the user's own scrolling included. */
  onZoomChange?: (zoom: number) => void;
  /** Spikes to replay over the circuit, and the transport driving them. */
  spikes?: ISpikeReplayBinding;
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
 * Node placement and synapses are read from the circuit's own SONATA files — placement
 * through the shared nodes worker, which the nodes table and colour-by already have the
 * file open in. Morphologies come from OBI-One `/circuit/viz`, whose sections carry the
 * `sonata_section_id` a click needs to become a morphology location.
 */
export function CircuitVisualization({
  populations,
  hiddenPopulations,
  recededColor,
  onPopulationClick,
  ...props
}: CircuitVizProps) {
  const source = useSmallCircuitSource({
    circuit: props.circuit,
    population: props.population,
    populations,
    hiddenPopulations,
    showAxons: props.showAxons,
    nodeColors: props.nodeColors,
    defaultColor: props.defaultColor,
    recededColor,
    withSynapses: circuitDrawsSynapses(props.circuit.scale),
  });
  const subjectName = props.population?.name;
  const handleCellClick = useCallback(
    (cell: MorphoViewerSmallCircuitCell | undefined) => {
      const node = cell && parseNodeKey(cell.id);
      if (node && node.population !== subjectName) onPopulationClick?.(node.population);
    },
    [subjectName, onPopulationClick]
  );
  return (
    <CircuitVizView
      {...props}
      source={source}
      onCellClick={onPopulationClick ? handleCellClick : undefined}
    />
  );
}

/** The view reads no entity fields, so it serves circuits and MEModels alike. */
type TCircuitVizViewProps = Omit<
  CircuitVizProps,
  // `nodeColors` and `defaultColor` feed `useSmallCircuitSource` in the
  // wrapper; the view itself never reads them.
  | 'circuit'
  | 'population'
  | 'populations'
  | 'hiddenPopulations'
  | 'recededColor'
  | 'onPopulationClick'
  | 'nodeColors'
  | 'defaultColor'
> & {
  source: SmallCircuitSource;
  /** Whole-cell clicks, from the same pick pass as `cellHover`. */
  onCellClick?: (cell: MorphoViewerSmallCircuitCell | undefined) => void;
};

function CircuitVizView({
  showAxons,
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
  features,
  source,
  morphologyLocations,
  dendrogram = false,
  onZoomChange,
  spikes,
  onCellClick,
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
  const { cells, isLoading, error, loadCell, retry, synapses, anchor, download } = source;
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
    if (anchor) setCircuitSceneAnchor(anchor);
  }, [anchor, setCircuitSceneAnchor]);

  const scalebar = useMemo(
    () => resolveScalebar(showScalebar, scalebarColor),
    [scalebarColor, showScalebar]
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

  // Wait on the viewer's paint only where there is a viewer: with no cells it
  // is never mounted, so its progress would never arrive and the indicator
  // would sit for good over a scene the user emptied on purpose. Whether an
  // empty scene is that or one still arriving is the source's to say.
  const painting = cells.length > 0 && (progress < 1 || !morphologiesPainted);
  const loading = !error && (isLoading || painting);

  // What the second phase is counting. The scene already marks the cells with
  // no morphology coming, and morphoviewer counts the rest — so the two agree
  // without a second source of truth, or a change to the viewer.
  const morphologyCount = useMemo(() => cells.filter((cell) => !cell.somaOnly).length, [cells]);

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
          dendrogram={dendrogram}
          onZoomChange={onZoomChange}
          scalebar={scalebar}
          backgroundColor={backgroundColor}
          signals={signals}
          circuit={cells}
          onCellHover={enableCellHover ? handleCellHover : undefined}
          onCellClick={onCellClick}
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
          spikes={spikes?.data}
          spikeTime={spikes?.timeInMs}
          onSpikeTimeChange={spikes?.onTimeChange}
          spikePlaying={spikes?.playing}
          onSpikePlayingChange={spikes?.onPlayingChange}
          spikeSpeed={spikes?.speed}
          spikeAfterglowInSeconds={spikes?.afterglowInSeconds}
        />
      )}
      <MorphologyLocationLabels labels={locationLabels} />
      <MorphologyLocationPopover hover={locationHover} pickMode={locationPickMode} />
      {loading && (
        <VisualizationLoadingIndicator
          download={download}
          morphologies={{ loaded: Math.round(progress * morphologyCount), total: morphologyCount }}
        />
      )}
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

type TMemodelVizProps = Omit<TCircuitVizViewProps, 'source' | 'onCellClick'> & {
  memodelId: string;
};

/** A single MEModel on the small-circuit viewer, served from its cell morphology. */
export function MemodelVisualization({ memodelId, ...props }: TMemodelVizProps) {
  const source = useMemodelVisualizationSource({ memodelId, showAxons: props.showAxons });
  return <CircuitVizView {...props} source={source} />;
}
