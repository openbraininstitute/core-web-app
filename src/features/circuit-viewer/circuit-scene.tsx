import { RiCloseLine } from '@remixicon/react';
import chroma from 'chroma-js';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CircuitNodesTable } from '@/features/circuit-nodes';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { resolvePopulation } from '@/features/circuit-nodes/population-utils';
import {
  CircuitVisualization,
  MemodelVisualization,
} from '@/features/scan-config/components/circuit-viz/circuit-viz';
import { CircuitViewerChrome } from '@/features/scan-config/components/color-by/circuit-viewer-chrome';
import { adaptColorToBackground } from '@/features/scan-config/components/color-by/contrast';
import { recedeMarkerColor } from '@/features/scan-config/components/color-by/palette';
import { useCircuitColorBy } from '@/features/scan-config/components/color-by/use-circuit-color-by';
import { useFullscreenElement } from '@/features/scan-config/components/color-by/use-fullscreen-element';
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
import { classNames } from '@/util/utils';

import { PaneResizeHandle } from './pane-resize-handle';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { IViewerModeOption } from '@/features/scan-config/components/color-by/mode-toggle';
import type { TElectrodeArrayEntity } from '@/features/scan-config/components/model-preview/use-electrode-overlays';
import type { MorphoViewerOverlayTransformEvent, MorphoViewerSpikes } from '@/morpho-viewer';

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

/**
 * A spike replay and the controls driving it.
 *
 * The viewer owns the clock: it advances simulated time on every painted frame
 * and reports where it got to through {@link ISpikeReplayBinding.onTimeChange}.
 * `timeInMs` is therefore a seek, not a mirror — feeding the reported time
 * straight back would fight the animation.
 */
export interface ISpikeReplayBinding {
  data?: MorphoViewerSpikes;
  /** Move the playhead here. Only read when it changes. */
  timeInMs?: number;
  /** The playhead on every painted frame. Throttle before putting it in state. */
  onTimeChange?(timeInMs: number): void;
  playing?: boolean;
  /** Also fires with `false` when playback reaches the end of the recording. */
  onPlayingChange?(playing: boolean): void;
  /** Simulated milliseconds per wall-clock second. */
  speed?: number;
  /** Wall-clock seconds for a spike to fade to `1/e` of full brightness. */
  afterglowInSeconds?: number;
}

/** The MEModel on show. Only its id and name are read here. */
export type TSceneMemodel = Pick<EntityCoreIdentifiableNamed, 'id' | 'name'>;

/** Exactly one of circuit or memodel. */
type TSceneSubject =
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
  /** Spikes to replay over the circuit, and the transport driving them. */
  spikes?: ISpikeReplayBinding;
  /** Morph the cell into a dendrogram of the same segments. MEModels only. */
  dendrogram?: boolean;
  /**
   * The SONATA population being drawn, whenever it changes.
   *
   * The nodes table lets a user switch populations mid-session, so a host that
   * has to line other data up against these nodes — spikes, most of all —
   * cannot resolve the population once and keep it.
   */
  onPopulationChange?: (population: NodePopulation | undefined) => void;
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
  spikes,
  dendrogram = false,
  onPopulationChange,
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
  const enableColorBy = features?.colorBy ?? true;
  const enableCellHover = features?.cellHover ?? true;
  // An MEModel has no nodes file to list.
  const enableNodesTable = Boolean(circuit) && (features?.nodesTable ?? true);

  const [showTable, setShowTable] = useState(false);
  const [tableHeight, setTableHeight] = useState<number | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const portalContainer = useFullscreenElement();

  const { config: circuitConfig } = useCircuitConfig(circuit);
  const [populationName, setPopulationName] = useState<string | undefined>();

  const population = useMemo(
    () => (circuitConfig ? resolvePopulation(circuitConfig.nodes, populationName) : undefined),
    [circuitConfig, populationName]
  );

  useEffect(() => {
    onPopulationChange?.(population);
  }, [population, onPopulationChange]);

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

  const { containerRef, config, colorsByNode, defaultColor, theme, signals, colorBy, menu } =
    useCircuitColorBy(circuit, {
      supportsAxons,
      supportsElectrodes: enableElectrodes && electrodesAvailable,
      supportsMorphologyLocations: hasMorphologyLocationsOnScreen,
      defaultNeuronOpacity,
      population,
      subject: memodel,
    });

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

  // Props shared by both viz surfaces. An MEModel has no colour-by, so
  // `colorsByNode` and `defaultColor` stay on the circuit branch.
  const sharedVizProps = {
    showAxons: config.showAxons,
    backgroundColor: config.backgroundColor,
    scalebarColor: theme?.foreground,
    signals,
    overlays: styledOverlays,
    overlaysInteractive,
    onOverlayTransform: handleOverlayTransform,
    highlightedOverlayId,
    neuronOpacity: config.neuronOpacity,
    electrodeRadius: config.electrodeRadius,
    features: vizFeatures,
    spikes,
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
  };

  return (
    // Transparent to the pointer as a whole: whatever a host stacks underneath —
    // a designer image, a raster — has to stay clickable through the gaps. The
    // canvas and the chrome buttons each opt back in.
    <div ref={containerRef} className="pointer-events-none relative h-full min-h-0 overflow-hidden">
      <div
        className={classNames(
          'absolute inset-0',
          active ? 'pointer-events-auto' : 'invisible pointer-events-none'
        )}
        aria-hidden={!active}
        inert={!active || undefined}
      >
        {largeCircuit && circuit ? (
          <LargeCircuitPreview
            key={circuit.id}
            circuit={circuit}
            population={population}
            colorsByNode={enableColorBy ? colorsByNode : undefined}
            backgroundColor={config.backgroundColor}
            scalebarColor={theme?.foreground}
            signals={signals}
            overlays={styledOverlays}
            overlaysInteractive={overlaysInteractive}
            onOverlayTransform={handleOverlayTransform}
            highlightedOverlayId={highlightedOverlayId}
            neuronOpacity={config.neuronOpacity}
            electrodeRadius={config.electrodeRadius}
            features={vizFeatures}
            spikes={spikes}
          />
        ) : memodel ? (
          <MemodelVisualization
            key={memodel.id}
            memodelId={memodel.id}
            dendrogram={dendrogram}
            {...sharedVizProps}
          />
        ) : (
          circuit && (
            <CircuitVisualization
              key={circuit.id}
              circuit={circuit}
              population={population}
              colorsByNode={enableColorBy ? colorsByNode : undefined}
              defaultColor={defaultColor}
              {...sharedVizProps}
            />
          )
        )}
      </div>

      <CircuitViewerChrome
        modeToggle={modeToggle}
        vizActive={active}
        theme={theme}
        table={enableNodesTable ? { active: showTable, onToggle: handleToggleTable } : undefined}
        viz={{
          menu,
          colorBy: enableColorBy ? colorBy : undefined,
          electrodesInteractive: overlaysInteractive,
          morphologyLocationsInteractive: canPickMorphologyLocations,
        }}
      />

      {showTable && circuit && tableHeight !== null && containerHeight > 0 && (
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
            onPopulationChange={setPopulationName}
            portalContainer={portalContainer}
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
