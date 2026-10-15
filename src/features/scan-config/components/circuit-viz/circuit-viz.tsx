import { useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { populationAt } from '@/features/circuit-viewer/morphologies/cell-colors';
import { LazyCircuitCells } from '@/features/circuit-viewer/morphologies/lazy-circuit-cells';
import { PLACEHOLDER_SOMA_RADIUS } from '@/features/circuit-viewer/morphologies/load/place-trees';
import { useTreeMorphologies } from '@/features/circuit-viewer/morphologies/use-tree-morphologies';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import { DEFAULT_ELECTRODE_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
import { circuitSceneAnchorAtom } from '@/features/scan-config/components/model-preview/circuit-scene-anchor';
import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';

import { MorphologyLocationLabels } from './morphology-location/labels';
import { MorphologyLocationPopover } from './morphology-location/popover';
import { useLocationSelection } from './morphology-location/use-location-selection';
import {
  circuitDrawsSynapses,
  useMemodelVisualizationSource,
  useSmallCircuitSource,
} from './sources';
import { SynapseLegend } from './synapse-legend';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { ElectrodeTransform } from '@/features/circuit-viewer/morphologies/types';
import type { CircuitViewerSignals } from '@/features/circuit-viewer/signals';
import type { ISpikeReplayBinding } from '@/features/circuit-viewer/types';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { IFormBindingOptions } from '@/features/scan-config/components/model-preview/morphology-locations-block';
import type { SmallCircuitSource } from './sources';

/** Nothing hidden, shared so the initial state is one object rather than one per viewer. */
const EMPTY_LABELS: ReadonlySet<string> = new Set();

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
   * Populations taken out of the scene, by name: their cells are not drawn, and
   * their morphologies are not read while they are hidden.
   */
  hiddenPopulations?: readonly string[];
  /** Colour for the populations that are not on show. */
  recededColor?: string;
  /** Called with the population name when a cell of another population is clicked. */
  onPopulationClick?: (populationName: string) => void;
  showAxons: boolean;
  backgroundColor: string;
  /** Draw the scalebar down the side of the canvas. */
  showScalebar?: boolean;
  /** signal bus: camera reset, snapshot, zoom and the form hint's nudge */
  signals: CircuitViewerSignals;
  /** World-coordinate electrode overlays from {@link usePlacedElectrodeOverlays}. */
  overlays?: ICircuitOverlayGroup[];
  /**
   * Enable left-drag (translate) / right-drag or Alt/Shift (rotate) on overlays.
   * Why gated: only when `setConfig` exists so 3D edits can write the form.
   */
  overlaysInteractive?: boolean;
  /**
   * Told on gesture end with absolute origin + rotation.
   * Host applies via {@link applyElectrodeOverlayTransform}.
   */
  onOverlayTransform?: (event: ElectrodeTransform) => void;
  /** Form-selected electrode block name → highlight in the 3D view. */
  highlightedOverlayId?: string | null;
  /**
   * How opaque the somas drawn alone are (0–1). The morphologies are drawn
   * opaque whatever this is, with the electrodes in front of them.
   */
  neuronOpacity?: number;
  /** Electrode marker radius in world units. */
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
  /**
   * Whether the host draws its own controls in the viewer's top-right corner.
   * The synapse legend sits below them when it does and takes the corner itself
   * when it does not.
   */
  chromeTopRight?: boolean;
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
  nodeColors,
  ...props
}: CircuitVizProps) {
  const source = useSmallCircuitSource({
    circuit: props.circuit,
    population: props.population,
    populations,
    hiddenPopulations,
    nodeColors,
    recededColor,
    withSynapses: circuitDrawsSynapses(props.circuit.scale),
  });
  const subjectName = props.population?.name;
  const counted = source.tree?.somas.populations;
  const handleCellClick = useCallback(
    (cell: number) => {
      const name = populationAt(counted ?? [], cell);
      if (name !== undefined && name !== subjectName) onPopulationClick?.(name);
    },
    [counted, subjectName, onPopulationClick]
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
  | 'circuit'
  | 'population'
  | 'populations'
  | 'hiddenPopulations'
  | 'recededColor'
  | 'onPopulationClick'
  | 'nodeColors'
> & {
  source: SmallCircuitSource;
  /** Whole-cell clicks, by the cell's number in the source's scene. */
  onCellClick?: (cell: number) => void;
};

function CircuitVizView({
  showAxons,
  backgroundColor,
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
  chromeTopRight = false,
  onCellClick,
  defaultColor = DEFAULT_NEURON_COLOR,
}: TCircuitVizViewProps) {
  const { tree, cellColors, hidden, locationCells, error, synapses, anchor, download } = source;
  const morphologies = useTreeMorphologies(tree, { axons: showAxons, hidden });
  const { locations, hover, labels, pickMode } = useLocationSelection({
    ...morphologyLocations,
    cells: locationCells,
    backgroundColor,
  });
  // Labels the legend is hiding. Held here because the legend names them and the viewer is handed what is left.
  const [hiddenSynapses, setHiddenSynapses] = useState<ReadonlySet<string>>(EMPTY_LABELS);
  const toggleSynapseLabel = useCallback((label: string) => {
    setHiddenSynapses((current) => {
      const next = new Set(current);
      if (!next.delete(label)) next.add(label);
      return next;
    });
  }, []);
  // Memoised: other groups are drawn again.
  const visibleSynapses = useMemo(
    () =>
      hiddenSynapses.size === 0
        ? synapses
        : synapses?.filter((group) => !hiddenSynapses.has(group.label)),
    [synapses, hiddenSynapses]
  );

  // Publish circuit centre so Add-electrode can seed origin_* in-view.
  const setCircuitSceneAnchor = useSetAtom(circuitSceneAnchorAtom);
  useEffect(() => {
    if (anchor) setCircuitSceneAnchor(anchor);
  }, [anchor, setCircuitSceneAnchor]);

  // A morphology that cannot be read leaves its cell a soma; only a scene where none could be read is worth covering.
  const unread = morphologies.total > 0 && morphologies.failed === morphologies.total;
  const loading = !error && (!tree || morphologies.loaded < morphologies.total);

  return (
    <div className="h-full w-full relative">
      {tree && (
        <LazyCircuitCells
          somas={tree.somas}
          somaRadius={PLACEHOLDER_SOMA_RADIUS}
          somaOpacity={neuronOpacity}
          data={morphologies.data}
          follow
          crowding={false}
          dendrogram={dendrogram}
          cellColors={cellColors}
          defaultColor={defaultColor}
          cellHover={features?.cellHover ?? true}
          // Not while a location is being placed: a tap meant for a neurite would also put another population on show,
          // recolouring the scene and swapping the nodes table under the user. The checklist still changes population.
          onCellClick={pickMode ? undefined : onCellClick}
          electrodes={overlays}
          electrodeRadius={electrodeRadius}
          selectedElectrode={highlightedOverlayId}
          onElectrodeTransform={overlaysInteractive ? onOverlayTransform : undefined}
          locations={locations}
          synapses={visibleSynapses}
          spikes={spikes}
          backgroundColor={backgroundColor}
          showScalebar={showScalebar}
          signals={signals}
          onZoomChange={onZoomChange}
        />
      )}
      <SynapseLegend
        groups={synapses}
        belowChrome={chromeTopRight}
        hidden={hiddenSynapses}
        onToggle={toggleSynapseLabel}
      />
      <MorphologyLocationLabels labels={labels} />
      <MorphologyLocationPopover hover={hover} pickMode={pickMode} />
      {loading && (
        <VisualizationLoadingIndicator
          download={download}
          morphologies={{ loaded: morphologies.loaded, total: morphologies.total }}
        />
      )}
      {(error || unread) && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4"
        >
          <details className="text-red-500">
            <summary>
              <strong>Couldn't load the visualization</strong>
            </summary>
            <div>{error?.message ?? 'The morphologies could not be read.'}</div>
          </details>
          {/* What the source failed at, the circuit's config or its placement, is not read again from here. */}
          {!error && (
            <button
              type="button"
              onClick={morphologies.retry}
              className="rounded-full bg-white px-3 py-1 text-sm text-primary-9 shadow-md ring-1 ring-black/5 hover:bg-neutral-100"
            >
              Try again
            </button>
          )}
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
  const source = useMemodelVisualizationSource({ memodelId });
  return <CircuitVizView {...props} source={source} />;
}
