import { RiCloseLine } from '@remixicon/react';
import chroma from 'chroma-js';
import { isEqual } from 'es-toolkit';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { NodePopulationType } from '@/api/entitycore/types/entities/circuit';
import { CircuitNodesTable } from '@/features/circuit-nodes';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { NO_NAMES, resolvePopulation } from '@/features/circuit-nodes/population-utils';
import {
  CircuitVisualization,
  MemodelVisualization,
} from '@/features/scan-config/components/circuit-viz/circuit-viz';
import { CircuitViewerChrome } from '@/features/scan-config/components/color-by/circuit-viewer-chrome';
import { adaptColorToBackground } from '@/features/scan-config/components/color-by/contrast';
import {
  fadedNeuronColor,
  recedeMarkerColor,
} from '@/features/scan-config/components/color-by/palette';
import { useCircuitColorBy } from '@/features/scan-config/components/color-by/use-circuit-color-by';
import { applyElectrodeOverlayTransform } from '@/features/scan-config/components/model-preview/apply-electrode-overlay-transform';
import {
  type ICircuitOverlayGroup,
  scopeOverlaysToSelection,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import { LargeCircuitPreview } from '@/features/scan-config/components/model-preview/large-circuit-preview';
import {
  hasAnyLocation,
  type IFormBindingOptions,
  morphologyLocationPickMode,
  morphologyLocationsHintHoveredAtom,
  supportsMorphologyLocationPicking,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';
import {
  electrodeBlockPath,
  useElectrodeOverlays,
} from '@/features/scan-config/components/model-preview/use-electrode-overlays';
import { useViewerZoom } from '@/features/scan-config/components/zoom-slider/use-viewer-zoom';
import { classNames } from '@/util/utils';

import { PaneResizeHandle } from './pane-resize-handle';
import { useSceneTablePane } from './scene-table-pane';
import { useCellFocus } from './use-cell-focus';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { ISpikeReplayBinding } from '@/features/circuit-viewer/types';
import type { SceneLocationMarker } from '@/features/scan-config/components/circuit-viz/circuit-viz';
import type { ICircuitViewerChromeProps } from '@/features/scan-config/components/color-by/circuit-viewer-chrome';
import type { IViewerModeOption } from '@/features/scan-config/components/color-by/mode-toggle';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { PopulationsControls } from '@/features/scan-config/components/color-by/use-circuit-color-by';
import type { TElectrodeArrayEntity } from '@/features/scan-config/components/model-preview/use-electrode-overlays';
import type { MorphoViewerOverlayTransformEvent } from '@/morpho-viewer';

const NOTHING_HIDDEN: readonly string[] = [];
/** The form's root element its neuron sets are in. */
const NEURON_SETS = 'neuron_sets';
const MIN_TABLE_HEIGHT = 280;
const DEFAULT_TABLE_HEIGHT_RATIO = 0.4;

/** The stored electrode-overlay source and which of its electrodes to draw. */
export interface IElectrodeOverlayOptions {
  /** Stored recording array supplying the overlays when there is no live config. */
  arrayEntity?: TElectrodeArrayEntity | null;
  /**
   * Electrode ids to draw. Omit to draw every overlay (scan-config behaviour);
   * pass an explicit list — `[]` included — to hand visibility to the host, which
   * then also owns it: the viewer's own show/hide toggle stops gating them.
   */
  visibleIds?: readonly string[];
}

/** The MEModel on show. Only its id and name are read here. */
export type TSceneMemodel = Pick<EntityCoreIdentifiableNamed, 'id' | 'name'>;

/** Exactly one of circuit or memodel. */
export type TSceneSubject =
  | { circuit: ICircuit; memodel?: never }
  | { memodel: TSceneMemodel; circuit?: never };

interface ICircuitSceneOptions {
  /** Draw somas only. Region-scale circuits have too many cells for morphologies. */
  largeCircuit?: boolean;
  /**
   * Whether this scene is the view currently on show.
   *
   * `false` hides it and stands its controls down without unmounting anything —
   * a remount would tear down the WebGL context and re-download every
   * morphology, which is far too expensive for switching tabs.
   */
  active?: boolean;
  /**
   * Domain-resolved viewer features (electrodes / colorBy / hover / nodes table).
   * Omit for defaults: electrodes off, colorBy / cellHover / nodesTable on.
   */
  features?: Partial<IEntityViewerFeatures>;
  /**
   * Initial neuron opacity (0–1). Host-owned so the viewer stays reusable
   * (scan-config, data details, …). Omit for full opacity; pass
   * {@link ELECTRODE_FOCUSED_NEURON_OPACITY} when electrodes should dominate.
   */
  defaultNeuronOpacity?: number;
  /** The live form this viewer edits; omit for a read-only preview. */
  form?: IFormBindingOptions;
  /**
   * The electrode-overlay layer. Omit entirely for a plain circuit viewer.
   *
   * Grouped rather than spread across the prop list so the overlay concern can
   * grow (new sources, new selection modes) without every host and intermediate
   * component re-declaring another optional prop.
   */
  electrodes?: IElectrodeOverlayOptions;
  /** Extra icons for the view-mode pill. Omit when this is the only view. */
  modeToggle?: readonly IViewerModeOption[];
  /**
   * Element the fullscreen button blows up. The host owns it because the scene
   * is only part of the view: blowing it up alone would leave the preview's
   * designer image, or spike replay's raster, outside the fullscreen element.
   * Omit to leave the button out.
   */
  fullscreen?: { target: HTMLElement | null };
  /**
   * Where the colour-by control goes instead of the scene's top-right corner,
   * such as the host's header row; null while that element mounts.
   */
  colorByTarget?: HTMLElement | null;
  /** What colouring by no property is called in the colour-by control, where "All" would mislead. */
  colorByNoneLabel?: string;
  /**
   * One flag per cell of the population on show, 0 for a cell filtered out:
   * left undrawn, but kept in its place, so spikes still find theirs.
   */
  shownCells?: Uint8Array;
  /**
   * A cell of the population on show to point out, by node index, such as the
   * table row under the pointer: the rest faded where the scene draws somas,
   * and where it draws morphologies, highlighted with the rest hidden.
   */
  highlightedCell?: number;
  /** Told the node index of a clicked cell of the population on show. */
  onCellClick?: (index: number) => void;
  /**
   * Colours for the population's cells in place of the colour-by's, such as a
   * recording's values as it plays; a host passing them turns colour-by off.
   */
  nodeColorsOverride?: NodeColors;
  /** How many of the population's cells are selected, said with a reset at the top centre. */
  selection?: ICircuitViewerChromeProps['selection'];
  /**
   * A column of `nodeColorsOverride` whose cells are drawn faint, in a colour
   * that follows the background: such as the cells a report did not record.
   */
  fadedColumn?: number;
  /**
   * Told the colour-by mapping of the population on show, or null with none, so
   * a host drawing the same cells elsewhere - spike replay's raster - can match.
   */
  onNodeColorsChange?: (colors: { population: string; nodeColors: NodeColors } | null) => void;
  /** Spikes to replay over the circuit, and the transport driving them. */
  spikes?: ISpikeReplayBinding;
  /**
   * Balls on cells of the population on show, at sections and offsets along them, each in a
   * colour of its own: such as a compartment report's locations, coloured as it plays.
   */
  locationMarkers?: readonly SceneLocationMarker[];
  /** Morph the cell into a dendrogram of the same segments. MEModels only. */
  dendrogram?: boolean;
  /**
   * The SONATA population to draw. Omit to let the scene pick one and let the
   * nodes table, or a click on another population in 3D, switch it. A host
   * only sets this when it has taken that choice over, which means it has
   * also turned the table off.
   */
  populationName?: string;
  /**
   * The SONATA population being drawn, whenever it changes.
   *
   * The nodes table lets a user switch populations mid-session, so a host that
   * has to line other data up against these nodes — spikes, most of all —
   * cannot resolve the population once and keep it.
   */
  onPopulationChange?: (population: NodePopulation | undefined) => void;
  /**
   * Draw the circuit's other populations too, receded around the one on show,
   * so that clicking any of them selects it, in the nodes table as well.
   * Defaults on. Off draws only the population on show. Spike replay sets it
   * off because its cell indices are relative to that population, so the other
   * populations carry no spike data.
   */
  showUnselectedPopulations?: boolean;
}

export type ICircuitSceneProps = ICircuitSceneOptions & TSceneSubject;

/**
 * The circuit in 3D, with the chrome that drives it: view-mode pill, settings,
 * colour-by dropdown and key, and the nodes table.
 *
 * Everything a host needs to show a circuit and nothing about what else might
 * be on screen beside it — the scan-config preview pairs it with a designer
 * image, spike replay pairs it with a raster.
 *
 * How electrode sync works here:
 * - {@link useElectrodeOverlays} → coloured overlays from every source
 * - form selection → `highlightedOverlayId` + selection styling
 * - morphoviewer `onOverlayTransform` (phase `end`) →
 *   {@link applyElectrodeOverlayTransform} → `setConfig`
 *
 * Why: keep 3D↔form bidirectional without pushing config on every pointer move.
 * Only overlays the form owns take part in that write-back — see
 * `draggableOverlayIds`.
 */
export function CircuitScene({
  circuit,
  memodel,
  largeCircuit = false,
  active = true,
  features,
  defaultNeuronOpacity,
  form,
  electrodes,
  modeToggle,
  fullscreen,
  colorByTarget,
  colorByNoneLabel,
  shownCells,
  highlightedCell,
  onCellClick,
  nodeColorsOverride,
  fadedColumn,
  selection,
  onNodeColorsChange,
  spikes,
  locationMarkers,
  dendrogram = false,
  populationName: hostPopulationName,
  onPopulationChange,
  showUnselectedPopulations = true,
}: ICircuitSceneProps) {
  const {
    config: scanConfig,
    onConfigChange: setConfig,
    selectedRootElement,
    selectedEntry,
    onCreateEntry,
    supportsExplicitLocations,
  } = form ?? {};
  const { arrayEntity, visibleIds: visibleOverlayIds } = electrodes ?? {};
  const enableElectrodes = features?.electrodes ?? false;
  // An MEModel is one cell with no nodes file: nothing to colour by, list, or highlight.
  const enableColorBy = Boolean(circuit) && (features?.colorBy ?? true);
  const enableCellHover = Boolean(circuit) && (features?.cellHover ?? true);
  const enableNodesTable = Boolean(circuit) && (features?.nodesTable ?? true);

  const [showTable, setShowTable] = useState(false);
  const [tableHeight, setTableHeight] = useState<number | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  // Where the host lays the table out in a pane of its own, beside the view rather than over
  // it: always there, so the view offers no button for it.
  const tablePane = useSceneTablePane();
  const paneTable = enableNodesTable ? tablePane : null;
  const claimPane = paneTable?.claim;
  useEffect(() => claimPane?.(), [claimPane]);

  const { config: circuitConfig } = useCircuitConfig(circuit);
  const [tablePopulationName, setTablePopulationName] = useState<string | undefined>();
  const populationName = hostPopulationName ?? tablePopulationName;

  const population = useMemo(
    () => (circuitConfig ? resolvePopulation(circuitConfig.nodes, populationName) : undefined),
    [circuitConfig, populationName]
  );

  // Reported by whichever viewer draws the circuit, and kept with the circuit it
  // came from so another circuit's report never applies to this one.
  const [reportedPositionless, setReportedPositionless] = useState<{
    circuitId: string;
    names: ReadonlySet<string>;
  } | null>(null);
  const circuitId = circuit?.id;
  const handlePositionlessPopulationsChange = useCallback(
    (names: ReadonlySet<string>) => {
      if (!circuitId) return;
      // Kept as it was when the names are: a viewer reports an empty set as it
      // mounts, and an equal one on every unrelated retry.
      setReportedPositionless((previous) => {
        const current = previous?.circuitId === circuitId ? previous.names : NO_NAMES;
        return isEqual(current, names) ? previous : { circuitId, names };
      });
    },
    [circuitId]
  );
  const positionless =
    reportedPositionless && reportedPositionless.circuitId === circuitId
      ? reportedPositionless.names
      : NO_NAMES;
  const subjectUnplaceable = population !== undefined && positionless.has(population.name);

  useEffect(() => {
    onPopulationChange?.(population);
  }, [population, onPopulationChange]);

  // With the table in a pane of its own beside the scene, as while a simulation
  // is configured, the two work as the results' views do: the scene shows the
  // ticked rows, else those the filter keeps, a row under the pointer lights its
  // cell, and a cell clicked marks its row and brings it into view. A host that
  // says any of this itself is listened to instead.
  const tableDriven = Boolean(paneTable) && circuit !== undefined;
  // Kept with the circuit as well as the population, as the positionless
  // populations are: another circuit's population of the same name is other cells.
  const focus = useCellFocus({
    scope: circuit && population ? `${circuit.id}/${population.name}` : '',
    tableShown: tableDriven,
  });
  const [tableCells, setTableCells] = useState<{
    circuitId: string;
    population: string;
    cells: Uint32Array | null;
    rowCount: number;
  }>();
  const [tableResetRequest, setTableResetRequest] = useState(0);
  const narrowed =
    tableDriven &&
    tableCells?.circuitId === circuit?.id &&
    tableCells?.population === population?.name
      ? tableCells
      : null;
  const tableShownCells = useMemo(() => {
    if (!narrowed?.cells) return undefined;
    const flags = new Uint8Array(narrowed.rowCount);
    for (const cell of narrowed.cells) if (cell < flags.length) flags[cell] = 1;
    return flags;
  }, [narrowed]);
  const held = focus.focusedCell !== null;
  const selectedCount = held ? 1 : (narrowed?.cells?.length ?? null);
  // The chip's reset undoes what its count says: the cell held first, then the
  // table's own filters and ticks.
  const tableSelection =
    narrowed && selectedCount !== null
      ? {
          count: selectedCount,
          total: narrowed.rowCount,
          held,
          onReset: held ? focus.releaseCell : () => setTableResetRequest((n) => n + 1),
        }
      : undefined;
  const sceneShownCells = shownCells ?? (tableDriven ? tableShownCells : undefined);
  const sceneHighlightedCell =
    highlightedCell ?? (tableDriven ? (focus.highlightedCell ?? undefined) : undefined);
  const sceneCellClick = onCellClick ?? (tableDriven ? focus.handleCellClick : undefined);
  const sceneSelection = selection ?? tableSelection;
  // The table's neurons as a block of the form's neuron sets, opened there.
  const createNeuronSet =
    onCreateEntry && scanConfig && NEURON_SETS in scanConfig
      ? (block: Record<string, unknown>) => onCreateEntry(NEURON_SETS, block)
      : undefined;

  // What the viewers draw, in declared order: every population, or only the
  // one on show.
  const populations = useMemo((): readonly NodePopulation[] => {
    if (showUnselectedPopulations) return circuitConfig?.nodes ?? [];
    return population ? [population] : [];
  }, [showUnselectedPopulations, circuitConfig, population]);
  // A host that pins the population owns that choice, so 3D selection is off.
  const handlePopulationClick =
    hostPopulationName === undefined ? setTablePopulationName : undefined;

  // Every small-circuit source filters axon sections, so the toggle is offered wherever the
  // morphology itself is drawn.
  const supportsAxons = !largeCircuit;

  const canPickMorphologyLocations =
    !largeCircuit &&
    morphologyLocationPickMode({
      config: scanConfig,
      selectedRootElement,
      selectedEntry,
      onConfigChange: setConfig,
      onCreateEntry,
      supportsExplicitLocations,
    }) !== null;
  // Gated on markers, not on picking, so the menu stays out of blocks with nothing to show.
  const hasMorphologyLocationsOnScreen =
    !largeCircuit &&
    (supportsMorphologyLocationPicking({
      config: scanConfig,
      selectedRootElement,
      selectedEntry,
    }) ||
      hasAnyLocation(scanConfig));

  const {
    overlays,
    available: electrodesAvailable,
    draggableOverlayIds,
    overlayIdByBlockPath,
  } = useElectrodeOverlays({
    config: enableElectrodes ? scanConfig : undefined,
    arrayEntity: enableElectrodes ? arrayEntity : undefined,
  });

  const handleOverlayTransform = useCallback(
    (event: MorphoViewerOverlayTransformEvent) => {
      if (!setConfig || !enableElectrodes) return;
      // Overlays the form does not own (arrays a simulation only references)
      // have nowhere to write back to.
      if (!draggableOverlayIds.has(event.id)) return;
      // 3D already updates optimistically during the gesture; write the form
      // only on drop so React/config churn does not lag the drag.
      if (event.phase !== 'end') return;
      setConfig((prev) => applyElectrodeOverlayTransform(prev, event));
    },
    [setConfig, enableElectrodes, draggableOverlayIds]
  );

  const {
    containerRef,
    config,
    nodeColors,
    defaultColor,
    recededColor,
    theme,
    signals,
    colorBy,
    onHiddenPopulationsChange,
    menu,
    onResetView,
  } = useCircuitColorBy(circuit, {
    supportsAxons,
    supportsElectrodes: enableElectrodes && electrodesAvailable,
    supportsMorphologyLocations: hasMorphologyLocationsOnScreen,
    supportsSomaSize: largeCircuit,
    defaultNeuronOpacity,
    population,
    subject: memodel,
  });

  // A viewer whose WebGL context the browser took back - it takes the oldest
  // when a page asks for more than it allows - is drawn black from then on:
  // built anew, it draws again. Caught on the way down, since the loss does
  // not bubble up from its canvas.
  const sceneRef = useRef<HTMLDivElement>(null);
  const [rebuilds, setRebuilds] = useState(0);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const onLost = (event: Event) => {
      if (event.target instanceof HTMLCanvasElement) setRebuilds((n) => n + 1);
    };
    scene.addEventListener('webglcontextlost', onLost, true);
    return () => {
      scene.removeEventListener('webglcontextlost', onLost, true);
      // Handed back on the way out rather than at the next collection.
      for (const canvas of scene.querySelectorAll('canvas')) {
        const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  }, []);

  // The override's faint column painted for the background on show, and drawn
  // flat, so every cell in it is the one shade.
  const overrideColors = useMemo(() => {
    if (!nodeColorsOverride || fadedColumn === undefined) return nodeColorsOverride;
    const palette = [...nodeColorsOverride.palette];
    palette[fadedColumn] = fadedNeuronColor(config.backgroundColor);
    return { ...nodeColorsOverride, palette, flatColumns: [fadedColumn] };
  }, [nodeColorsOverride, fadedColumn, config.backgroundColor]);

  // A mapping with no column per node is colour-by off.
  const populationOnShow = population?.name;
  const handedColors =
    enableColorBy && populationOnShow && nodeColors && nodeColors.columnByNode.length > 0
      ? nodeColors
      : undefined;
  useEffect(() => {
    onNodeColorsChange?.(
      populationOnShow && handedColors
        ? { population: populationOnShow, nodeColors: handedColors }
        : null
    );
  }, [onNodeColorsChange, populationOnShow, handedColors]);

  // Offered only where the other populations are on screen to begin with, and
  // only where there is more than one: with a single population, hiding it is
  // the empty scene and nothing else. That is the same condition that decides
  // whether clicking a population in 3D selects it.
  const hasPopulationsChecklist =
    showUnselectedPopulations && (circuitConfig?.nodes?.length ?? 0) > 1;

  // A virtual population is an input to the circuit rather than part of it, so
  // it starts out of the scene. Never the one on show: that leaves nothing to
  // look at, and a circuit declaring a single population has no checklist to
  // bring it back. `null` is the checklist untouched, the only state the
  // default applies to; `[]` is the user asking for all of them.
  //
  // Nothing is hidden where that checklist is not drawn, whatever the circuit's
  // stored setting says: it is the only way back, and the notices reporting a
  // hidden selection or an empty scene come from it too. The setting is per
  // circuit, so a population hidden in the standalone viewer would otherwise
  // empty the scene of spike replay, which pins its own population.
  const hiddenPopulations = useMemo(
    () =>
      hasPopulationsChecklist
        ? (config.hiddenPopulations ??
          populations
            .filter((p) => p.type === NodePopulationType.Virtual && p.name !== population?.name)
            .map((p) => p.name))
        : NOTHING_HIDDEN,
    [hasPopulationsChecklist, config.hiddenPopulations, populations, population?.name]
  );

  const populationsControl = useMemo((): PopulationsControls | undefined => {
    const nodes = circuitConfig?.nodes;
    if (!hasPopulationsChecklist || !nodes) return undefined;
    return {
      populations: nodes,
      hidden: hiddenPopulations,
      onChange: onHiddenPopulationsChange,
      // The resolved name, not what the host or the table asked for: with
      // neither naming one, the scene falls back to the first population, and
      // that is the one on show.
      selected: population?.name,
      onSelect: handlePopulationClick,
      positionless,
    };
  }, [
    hasPopulationsChecklist,
    circuitConfig,
    hiddenPopulations,
    onHiddenPopulationsChange,
    population?.name,
    handlePopulationClick,
    positionless,
  ]);

  // Selecting the block an overlay came from highlights it, whichever root
  // element that block lives under (`electrode_locations` while building an
  // array, `recordings` while configuring a simulation).
  const highlightedOverlayId =
    enableElectrodes && selectedRootElement && selectedEntry
      ? (overlayIdByBlockPath.get(electrodeBlockPath(selectedRootElement, selectedEntry)) ?? null)
      : null;
  const scopedOverlays = useMemo(
    () => scopeOverlaysToSelection(overlays, visibleOverlayIds),
    [overlays, visibleOverlayIds]
  );
  // When the host supplies `visibleIds` it owns visibility outright. Letting the
  // viewer's own show/hide toggle also gate them strands the host control: with
  // the toggle off, ticking an electrode draws nothing and the auto-enable effect
  // below cannot recover (it reads `styledOverlays`, which is already empty).
  const hostOwnsVisibility = visibleOverlayIds !== undefined;
  const visibleOverlays =
    enableElectrodes && (hostOwnsVisibility || config.showElectrodes) ? scopedOverlays : undefined;
  const styledOverlays = useMemo(
    () => styleOverlaysForSelection(visibleOverlays, highlightedOverlayId, config.backgroundColor),
    [visibleOverlays, highlightedOverlayId, config.backgroundColor]
  );
  // Handles appear only when something drawn can actually be moved: a scene of
  // referenced-only arrays (a simulation's recordings) stays static even though
  // the host passed a write path for the rest of the form.
  const overlaysInteractive = Boolean(
    enableElectrodes &&
      setConfig &&
      styledOverlays?.some((group) => draggableOverlayIds.has(group.id))
  );

  // Selecting an electrode (or having overlays) turns the toggle on so markers
  // are visible after Add without hunting the settings menu.
  useEffect(() => {
    if (!enableElectrodes || config.showElectrodes || !menu.onToggleElectrodes) return;
    if (!highlightedOverlayId && !(styledOverlays && styledOverlays.length > 0)) return;
    menu.onToggleElectrodes(true);
  }, [
    enableElectrodes,
    highlightedOverlayId,
    styledOverlays,
    config.showElectrodes,
    menu.onToggleElectrodes,
  ]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  function handleToggleTable() {
    setShowTable((prev) => {
      const next = !prev;
      if (next && tableHeight === null && containerHeight > 0) {
        setTableHeight(
          Math.max(MIN_TABLE_HEIGHT, Math.round(containerHeight * DEFAULT_TABLE_HEIGHT_RATIO))
        );
      }
      return next;
    });
  }

  const maxTableHeight = containerHeight > 0 ? containerHeight : MIN_TABLE_HEIGHT;
  const clampedHeight = tableHeight
    ? Math.min(maxTableHeight, Math.max(MIN_TABLE_HEIGHT, tableHeight))
    : MIN_TABLE_HEIGHT;

  const vizFeatures = useMemo(() => ({ cellHover: enableCellHover }), [enableCellHover]);

  // Pointing at the form hint grows the morphologies once, so the two panes read as one
  // feature. The signal rejects until the viewer registers it, which is not worth reporting.
  const hintHovered = useAtomValue(morphologyLocationsHintHoveredAtom);
  useEffect(() => {
    if (!hintHovered || !canPickMorphologyLocations || !active) return;
    signals.nudgeMorphology.dispatch().catch(() => {});
  }, [hintHovered, canPickMorphologyLocations, active, signals]);

  const zoom = useViewerZoom(signals);

  // Props shared by both viz surfaces. An MEModel has no colour-by, so
  // `nodeColors` and `defaultColor` stay on the circuit branch.
  //
  // Memoised explicitly, not left to the compiler: a zoom tick changes this object, and a
  // fresh one re-renders the 3D surface every frame of a scroll-zoom.
  const sharedVizProps = useMemo(
    () => ({
      showAxons: config.showAxons,
      backgroundColor: config.backgroundColor,
      scalebarColor: theme?.foreground,
      showScalebar: config.showScalebar,
      signals,
      overlays: styledOverlays,
      overlaysInteractive,
      onOverlayTransform: handleOverlayTransform,
      highlightedOverlayId,
      neuronOpacity: config.neuronOpacity,
      electrodeRadius: config.electrodeRadius,
      features: vizFeatures,
      spikes,
      // The colour-by toolbar is what sits in the viewer's top-right, so the
      // synapse legend drops below it exactly when that toolbar is drawn there.
      chromeTopRight: enableColorBy && colorByTarget === undefined,
      // Subscribed only while the slider is shown: the viewer reports every zoom change, and
      // with the slider off that is a render per frame of a scroll-zoom for nothing on screen.
      onZoomChange: config.showZoomSlider ? zoom.onZoomChange : undefined,
      morphologyLocations: {
        config: scanConfig,
        onConfigChange: setConfig,
        selectedRootElement,
        selectedEntry,
        onCreateEntry,
        supportsExplicitLocations,
        markerRadius: config.morphologyLocationRadius,
        showLabels: config.showMorphologyLocationLabels,
      },
    }),
    [
      config.showAxons,
      config.backgroundColor,
      config.showScalebar,
      config.neuronOpacity,
      config.electrodeRadius,
      config.morphologyLocationRadius,
      config.showMorphologyLocationLabels,
      config.showZoomSlider,
      enableColorBy,
      colorByTarget,
      theme?.foreground,
      signals,
      styledOverlays,
      overlaysInteractive,
      handleOverlayTransform,
      highlightedOverlayId,
      vizFeatures,
      spikes,
      zoom.onZoomChange,
      scanConfig,
      setConfig,
      selectedRootElement,
      selectedEntry,
      onCreateEntry,
      supportsExplicitLocations,
    ]
  );

  return (
    <div
      ref={containerRef}
      // Transparent to the pointer as a whole: whatever a host stacks
      // underneath, a designer image or a raster, has to stay clickable through
      // the gaps. The canvas and the chrome buttons each opt back in.
      className="pointer-events-none relative h-full min-h-0 overflow-hidden"
    >
      <div
        ref={sceneRef}
        data-testid="viewer-scene"
        className={classNames(
          'absolute inset-0',
          active ? 'pointer-events-auto' : 'invisible pointer-events-none'
        )}
        aria-hidden={!active}
        inert={!active || undefined}
        onPointerDownCapture={tableDriven ? focus.handleScenePointerDown : undefined}
        onPointerUpCapture={tableDriven ? focus.handleScenePointerUp : undefined}
      >
        {largeCircuit && circuit ? (
          <LargeCircuitPreview
            key={`${circuit.id}:${rebuilds}`}
            circuit={circuit}
            population={population}
            populations={populations}
            hiddenPopulations={hiddenPopulations}
            shownCells={sceneShownCells}
            highlightedCell={sceneHighlightedCell}
            nodeColors={overrideColors ?? (enableColorBy ? nodeColors : undefined)}
            recededColor={recededColor}
            onPopulationClick={handlePopulationClick}
            onSubjectCellClick={sceneCellClick}
            onPositionlessPopulationsChange={handlePositionlessPopulationsChange}
            backgroundColor={config.backgroundColor}
            scalebarColor={theme?.foreground}
            showScalebar={config.showScalebar}
            signals={signals}
            overlays={styledOverlays}
            overlaysInteractive={overlaysInteractive}
            onOverlayTransform={handleOverlayTransform}
            highlightedOverlayId={highlightedOverlayId}
            neuronOpacity={config.neuronOpacity}
            somaSizeScale={config.somaSizeScale}
            electrodeRadius={config.electrodeRadius}
            features={vizFeatures}
            spikes={spikes}
          />
        ) : memodel ? (
          <MemodelVisualization
            key={`${memodel.id}:${rebuilds}`}
            memodelId={memodel.id}
            dendrogram={dendrogram}
            {...sharedVizProps}
          />
        ) : (
          circuit && (
            <CircuitVisualization
              key={`${circuit.id}:${rebuilds}`}
              circuit={circuit}
              population={population}
              populations={populations}
              hiddenPopulations={hiddenPopulations}
              shownCells={sceneShownCells}
              highlightedCell={sceneHighlightedCell}
              nodeColors={overrideColors ?? (enableColorBy ? nodeColors : undefined)}
              defaultColor={defaultColor}
              recededColor={recededColor}
              onPopulationClick={handlePopulationClick}
              onSubjectCellClick={sceneCellClick}
              onPositionlessPopulationsChange={handlePositionlessPopulationsChange}
              locationMarkers={locationMarkers}
              {...sharedVizProps}
            />
          )
        )}
      </div>

      <CircuitViewerChrome
        modeToggle={modeToggle}
        vizActive={active}
        theme={theme}
        table={
          enableNodesTable && !paneTable
            ? { active: showTable, onToggle: handleToggleTable }
            : undefined
        }
        fullscreen={fullscreen}
        colorByTarget={colorByTarget}
        colorByNoneLabel={colorByNoneLabel}
        selection={sceneSelection}
        viz={{
          // A replay's afterglow is set with the rest of how the scene is drawn.
          menu:
            spikes?.data && spikes.onAfterglowChange
              ? {
                  ...menu,
                  spikeAfterglowInSeconds: spikes.afterglowInSeconds,
                  onSpikeAfterglowChange: spikes.onAfterglowChange,
                }
              : menu,
          onResetView,
          // Nothing of the population on show is drawn to colour.
          colorBy: enableColorBy && !subjectUnplaceable ? colorBy : undefined,
          populations: populationsControl,
          electrodesInteractive: overlaysInteractive,
          morphologyLocationsInteractive: canPickMorphologyLocations,
          // Omitted rather than hidden downstream: the large-circuit viewer takes no zoom
          // props, and with the setting off there is nothing to drive.
          zoom: largeCircuit || !config.showZoomSlider ? undefined : zoom,
        }}
      />

      {paneTable?.target &&
        circuit &&
        createPortal(
          <CircuitNodesTable
            circuit={circuit}
            populationName={populationName}
            onPopulationChange={setTablePopulationName}
            cells={{
              onShownCellsChange: setTableCells,
              onHoveredCellChange: focus.handleHoveredCell,
              focusedCell: focus.focusedCell ?? undefined,
              heldCell: focus.focusedCell?.nodeId ?? null,
              resetRequest: tableResetRequest,
              onCreateNeuronSet: createNeuronSet,
            }}
          />,
          paneTable.target
        )}
      {!paneTable && showTable && circuit && tableHeight !== null && containerHeight > 0 && (
        <div
          className="pointer-events-auto absolute left-0 right-0 bottom-0 z-30 flex flex-col border-t border-neutral-200 bg-white"
          style={{ height: clampedHeight }}
        >
          <PaneResizeHandle
            containerRef={containerRef}
            minHeight={MIN_TABLE_HEIGHT}
            onResize={setTableHeight}
          />
          <button
            type="button"
            aria-label="Close nodes table"
            onClick={() => setShowTable(false)}
            className="absolute right-2 top-2 z-10 inline-flex size-7 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm ring-1 ring-black/5 hover:bg-neutral-100"
          >
            <RiCloseLine className="size-4" />
          </button>
          <CircuitNodesTable
            circuit={circuit}
            populationName={populationName}
            onPopulationChange={setTablePopulationName}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Make every electrode legible on the current canvas, then recede the ones the
 * form is not editing.
 *
 * Why adapt at all: neuron colours already go through
 * {@link adaptColorToBackground}; electrodes did not, so a near-black probe was
 * invisible on the dark canvas and pale hues washed out on the light one. This
 * runs unconditionally — colours must read even when nothing is selected.
 *
 * Why opaque throughout: electrodes stay 100% opaque even at low neuron
 * opacity — translucent rgba let the circuit show through the markers.
 */
function styleOverlaysForSelection(
  overlays: ICircuitOverlayGroup[] | undefined,
  selectedId: string | null,
  background: string
): ICircuitOverlayGroup[] | undefined {
  if (!overlays?.length) return overlays;
  return overlays.map((group) => {
    const legible = forceOpaqueRgb(adaptColorToBackground(group.color, background));
    if (!selectedId || group.id === selectedId) return { ...group, color: legible };
    return { ...group, color: recedeMarkerColor(legible, background) };
  });
}

/**
 * Strip any CSS alpha so morphoviewer palette texels stay fully opaque.
 *
 * Same `try`/`catch` shape as {@link adaptColorToBackground} and
 * {@link recedeMarkerColor}, the two functions this one sits between: a colour
 * chroma cannot read is passed through rather than thrown away.
 */
function forceOpaqueRgb(color: string): string {
  try {
    return chroma(color).alpha(1).hex();
  } catch {
    return color;
  }
}
