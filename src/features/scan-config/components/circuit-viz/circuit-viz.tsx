import { useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { LazyCircuitCells } from '@/features/circuit-viewer/morphologies/lazy-circuit-cells';
import { PLACEHOLDER_SOMA_RADIUS } from '@/features/circuit-viewer/morphologies/load/place-trees';
import { sectionNumbered } from '@/features/circuit-viewer/morphologies/sections';
import { useCellClick } from '@/features/circuit-viewer/morphologies/use-cell-click';
import { useTreeMorphologies } from '@/features/circuit-viewer/morphologies/use-tree-morphologies';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import { DEFAULT_ELECTRODE_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
import { useMorphologyLocationPreviews } from '@/features/scan-config/components/hooks/use-morphology-location-previews';
import { usePublishAnchor } from '@/features/scan-config/components/model-preview/circuit-scene-anchor';
import {
  hiddenLocationNodesAtom,
  isExplicitLocationsBlockType,
  MORPHOLOGY_LOCATIONS_CONFIG_KEY,
  readEntry,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';
import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';

import { GeneratedLocationsLegend } from './morphology-location/generated-legend';
import { MorphologyLocationLabels } from './morphology-location/labels';
import { MorphologyLocationPopover } from './morphology-location/popover';
import { MorphologyLocationPreviewStatus } from './morphology-location/preview-status';
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
import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
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
   * The host chrome's top-right column, which the legends flow into under the colour-by key so
   * the open key cannot cover them. Undefined when the host draws nothing there, and the legends
   * take the corner themselves; null while it mounts.
   */
  legendTarget?: HTMLElement | null;
  /** Background-derived chrome theme for the legends; null keeps the fixed light styling. */
  theme?: ViewerTheme | null;
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
      entityId={props.circuit.id}
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
  /** The circuit or MEModel on show, which generated morphology locations are previewed on. */
  entityId: string;
  /** Whole-cell clicks, by the cell's number in the source's scene. */
  onCellClick?: (cell: number) => void;
};

function CircuitVizView({
  showAxons = true,
  backgroundColor,
  showScalebar = true,
  spin,
  aoMoving,
  signals,
  overlays,
  overlaysInteractive = false,
  onOverlayTransform,
  highlightedOverlayId = null,
  neuronOpacity,
  electrodeRadius = DEFAULT_ELECTRODE_RADIUS,
  features,
  source,
  entityId,
  morphologyLocations,
  dendrogram = false,
  onZoomChange,
  spikes,
  onGlowAvailableChange,
  onEmptyClick,
  legendTarget,
  theme,
  onCellClick,
  defaultColor = DEFAULT_NEURON_COLOR,
  debugTarget,
}: TCircuitVizViewProps) {
  const {
    tree,
    cellColors,
    hidden,
    locationCells,
    locationFirstCell,
    locationNodeCount,
    error,
    synapses,
    anchor,
    download,
  } = source;
  const morphologies = useTreeMorphologies(tree, { axons: showAxons, hidden });
  const locationPreviews = useMorphologyLocationPreviews({
    config: morphologyLocations?.config,
    entityId,
    // The same single-morphology models the preview endpoint accepts.
    enabled: Boolean(morphologyLocations?.singleMorphology),
  });
  const openLocationBlock =
    morphologyLocations?.selectedRootElement === MORPHOLOGY_LOCATIONS_CONFIG_KEY
      ? readEntry(morphologyLocations.config, morphologyLocations.selectedEntry)
      : null;
  // Blocks the legend is hiding, by entry. Only the markers go: the legend still lists them.
  const [hiddenLocationBlocks, setHiddenLocationBlocks] =
    useState<ReadonlySet<string>>(EMPTY_LABELS);
  const toggleLocationBlock = useCallback(
    (entry: string) => setHiddenLocationBlocks((current) => toggled(current, entry)),
    []
  );
  const visibleGeneratedLocations = useMemo(
    () =>
      hiddenLocationBlocks.size === 0
        ? locationPreviews.locations
        : locationPreviews.locations.filter(({ entry }) => !hiddenLocationBlocks.has(entry)),
    [locationPreviews.locations, hiddenLocationBlocks]
  );
  // A location is drawn only where the drawn tree has its section; one on the axon is not while axons are hidden.
  const drawnGeneratedLocations = useMemo(() => {
    const { data } = morphologies;
    if (!data?.trees || morphologies.loaded < morphologies.total) return undefined;
    const drawn = new Map<string, number>();
    for (const { entry, section_id: sonataId } of locationPreviews.locations) {
      const placed = locationCells.some((cell) => sectionNumbered(data, cell, sonataId) !== null);
      drawn.set(entry, (drawn.get(entry) ?? 0) + (placed ? 1 : 0));
    }
    return drawn;
  }, [morphologies, locationPreviews.locations, locationCells]);
  usePublishHiddenLocationNodes(locationCells, locationFirstCell, locationNodeCount);
  const { locations, hover, labels, pickMode, blockType } = useLocationSelection({
    ...morphologyLocations,
    cells: locationCells,
    firstCell: locationFirstCell,
    backgroundColor,
    generatedLocations: visibleGeneratedLocations,
  });
  // Labels the legend is hiding. Held here because the legend names them and the viewer is handed what is left.
  const [hiddenSynapses, setHiddenSynapses] = useState<ReadonlySet<string>>(EMPTY_LABELS);
  const toggleSynapseLabel = useCallback(
    (label: string) => setHiddenSynapses((current) => toggled(current, label)),
    []
  );
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

  const legends = (
    <>
      <SynapseLegend
        groups={synapses}
        hidden={hiddenSynapses}
        onToggle={toggleSynapseLabel}
        theme={theme}
      />
      <GeneratedLocationsLegend
        entries={locationPreviews.entries}
        locations={locationPreviews.locations}
        drawn={drawnGeneratedLocations}
        errors={locationPreviews.errors}
        pending={locationPreviews.pending}
        // As the markers have it, so each swatch matches its block's markers.
        openEntry={morphologyLocations?.selectedEntry}
        backgroundColor={backgroundColor}
        hidden={hiddenLocationBlocks}
        onToggle={toggleLocationBlock}
        theme={theme}
      />
    </>
  );

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
          aoMoving={aoMoving}
          signals={signals}
          onZoomChange={onZoomChange}
          debugTarget={debugTarget}
          debugLoad={{
            loaded: morphologies.loaded,
            failed: morphologies.failed,
            total: morphologies.total,
          }}
        />
      )}
      {legendTarget === undefined ? (
        <div className="pointer-events-none absolute top-3 right-3 z-10 flex flex-col items-stretch gap-2">
          {legends}
        </div>
      ) : (
        legendTarget && createPortal(legends, legendTarget)
      )}
      <MorphologyLocationLabels labels={labels} />
      <MorphologyLocationPopover hover={hover} pickMode={pickMode} blockType={blockType} />
      {openLocationBlock && !isExplicitLocationsBlockType(openLocationBlock.type) && (
        <MorphologyLocationPreviewStatus
          pending={locationPreviews.pending.has(morphologyLocations?.selectedEntry ?? '')}
          error={locationPreviews.errors.get(morphologyLocations?.selectedEntry ?? '')}
        />
      )}
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

/** `set` with `key` added, or taken out if it was already there. */
function toggled(set: ReadonlySet<string>, key: string): ReadonlySet<string> {
  const next = new Set(set);
  if (!next.delete(key)) next.add(key);
  return next;
}

/**
 * Tells the form which nodes of the population locations are placed on carry no marker, so it can grey their rows out:
 * filtered out in the nodes table, without a morphology, or in a hidden population.
 */
function usePublishHiddenLocationNodes(
  drawn: readonly number[],
  firstCell: number,
  nodeCount: number
) {
  const setHiddenNodes = useSetAtom(hiddenLocationNodesAtom);
  useEffect(() => {
    const shown = new Set(drawn);
    const hidden = new Set<number>();
    for (let node = 0; node < nodeCount; node++) if (!shown.has(firstCell + node)) hidden.add(node);
    // Kept when unchanged, so the form does not render again for nothing.
    setHiddenNodes((previous) =>
      previous.size === hidden.size && [...hidden].every((id) => previous.has(id))
        ? previous
        : hidden
    );
  }, [drawn, firstCell, nodeCount, setHiddenNodes]);
  useEffect(() => () => setHiddenNodes(new Set()), [setHiddenNodes]);
}

/** A click on the cell comes as cell 0. */
type TMemodelVizProps = Omit<TCircuitVizViewProps, 'source' | 'entityId'> & {
  memodelId: string;
};

/** A single MEModel on the small-circuit viewer, served from its cell morphology. */
export function MemodelVisualization({ memodelId, ...props }: TMemodelVizProps) {
  const source = useMemodelVisualizationSource({ memodelId });
  return <CircuitVizView {...props} entityId={memodelId} source={source} />;
}
