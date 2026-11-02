import { useCallback, useMemo, useState } from 'react';

import { LazyCircuitCells } from '@/features/circuit-viewer/morphologies/lazy-circuit-cells';
import { PLACEHOLDER_SOMA_RADIUS } from '@/features/circuit-viewer/morphologies/load/place-trees';
import { useCellClick } from '@/features/circuit-viewer/morphologies/use-cell-click';
import { useTreeMorphologies } from '@/features/circuit-viewer/morphologies/use-tree-morphologies';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import { DEFAULT_ELECTRODE_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
import { usePublishAnchor } from '@/features/scan-config/components/model-preview/circuit-scene-anchor';
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

import type {
  CircuitCellsHostProps,
  CircuitViewerHostProps,
} from '@/features/circuit-viewer/host-props';
import type { Population } from '@/features/circuit-viewer/morphologies/types';
import type { IFormBindingOptions } from '@/features/scan-config/components/model-preview/morphology-locations-block';
import type { SmallCircuitSource } from './sources';

/** Nothing hidden, shared so the initial state is one object rather than one per viewer. */
const EMPTY_LABELS: ReadonlySet<string> = new Set();
const NO_POPULATIONS: Population[] = [];

interface CircuitVizProps extends CircuitViewerHostProps, CircuitCellsHostProps {
  /**
   * Binding for picking morphology locations in 3D.
   *
   * Resolved here rather than in the parent because both the markers and the pick handler
   * need the loaded cells, which only this component has.
   */
  morphologyLocations?: IMorphologyLocationsBinding;
  /** Morph the cell into a dendrogram of the same segments. */
  dendrogram?: boolean;
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
  shownCells,
  highlightedCell,
  recededColor,
  onPopulationClick,
  nodeColors,
  onSubjectCellClick,
  onPositionlessPopulationsChange,
  ...props
}: CircuitVizProps) {
  const source = useSmallCircuitSource({
    circuit: props.circuit,
    population: props.population,
    populations,
    hiddenPopulations,
    shownCells,
    highlightedCell,
    nodeColors,
    recededColor,
    withSynapses: circuitDrawsSynapses(props.circuit.scale),
    onPositionlessPopulationsChange,
  });

  const handleCellClick = useCellClick(
    source.tree?.somas.populations ?? NO_POPULATIONS,
    props.population?.name,
    onPopulationClick,
    onSubjectCellClick
  );
  return (
    <CircuitVizView
      {...props}
      source={source}
      onCellClick={onPopulationClick || onSubjectCellClick ? handleCellClick : undefined}
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
  | 'shownCells'
  | 'highlightedCell'
  | 'recededColor'
  | 'onPopulationClick'
  | 'onSubjectCellClick'
  | 'onPositionlessPopulationsChange'
  | 'nodeColors'
> & {
  source: SmallCircuitSource;
  /** Whole-cell clicks, by the cell's number in the source's scene. */
  onCellClick?: (cell: number) => void;
};

function CircuitVizView({
  showAxons = true,
  backgroundColor,
  showScalebar = true,
  spin,
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
  onGlowAvailableChange,
  onEmptyClick,
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
  usePublishAnchor(anchor);

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
          cellHover={(source.hover ?? true) && (features?.cellHover ?? true)}
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
          onGlowAvailable={onGlowAvailableChange}
          onEmptyClick={onEmptyClick}
          backgroundColor={backgroundColor}
          showScalebar={showScalebar}
          spin={spin}
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
