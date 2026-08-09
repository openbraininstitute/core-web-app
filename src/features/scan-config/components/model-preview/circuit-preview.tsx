import { RiCloseLine } from '@remixicon/react';
import { Image as AntdImage } from 'antd';
import chroma from 'chroma-js';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { getAsset } from '@/api/entitycore/selectors/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { BrokenImageIcon, ImageIcon } from '@/components/icons/image-states';
import { CircuitNodesTable } from '@/features/circuit-nodes';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { resolvePopulation } from '@/features/circuit-nodes/population-utils';
import CircuitViz from '@/features/scan-config/components/circuit-viz/circuit-viz';
import { CircuitViewerChrome } from '@/features/scan-config/components/color-by/circuit-viewer-chrome';
import { adaptColorToBackground } from '@/features/scan-config/components/color-by/contrast';
import {
  type ViewerMode,
  ViewerModeDict,
} from '@/features/scan-config/components/color-by/mode-toggle';
import { useCircuitColorBy } from '@/features/scan-config/components/color-by/use-circuit-color-by';
import { useFullscreenElement } from '@/features/scan-config/components/color-by/use-fullscreen-element';
import { useCircuitImageURL } from '@/features/scan-config/components/hooks/circuit';
import { applyElectrodeOverlayTransform } from '@/features/scan-config/components/model-preview/apply-electrode-overlay-transform';
import {
  type ICircuitOverlayGroup,
  scopeOverlaysToSelection,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import { MORPHOLOGY_LOCATIONS_CONFIG_KEY } from '@/features/scan-config/components/model-preview/morphology-locations-key';
import {
  electrodeBlockPath,
  useElectrodeOverlays,
} from '@/features/scan-config/components/model-preview/use-electrode-overlays';
import { Skeleton } from '@/ui/molecules/skeleton';
import { classNames } from '@/util/utils';

import { LargeCircuitPreview } from './large-circuit-preview';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { TElectrodeArrayEntity } from '@/features/scan-config/components/model-preview/use-electrode-overlays';
import type { Config } from '@/features/scan-config/types';
import type { MorphoViewerOverlayTransformEvent } from '@/morpho-viewer';

const MIN_TABLE_HEIGHT = 280;
const DEFAULT_TABLE_HEIGHT_RATIO = 0.4;

function circuitHasDesignerImage(circuit: ICircuit): boolean {
  return (
    getAsset({
      assets: circuit.assets ?? [],
      label: AssetLabel.simulation_designer_image,
    }).getAllOrNull() !== null
  );
}

interface CircuitPreviewProps {
  className?: string;
  circuit: ICircuit;
  enableVisualization?: boolean;
  largeCircuit?: boolean;
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
  /**
   * The electrode-overlay layer. Omit entirely for a plain circuit viewer.
   *
   * Grouped rather than spread across the prop list so the overlay concern can
   * grow (new sources, new selection modes) without every host and intermediate
   * component re-declaring another optional prop.
   */
  electrodes?: ElectrodeOverlayOptions;
}

/** Everything the electrode-overlay layer needs, in one place. */
export interface ElectrodeOverlayOptions {
  /** Live scan-config; when it contains `electrode_locations`, overlays are fetched. */
  config?: Config;
  /**
   * Enables drag/rotate in 3D, writing origin/rotation back into the form.
   * Omit for read-only hosts — its absence is what makes overlays static.
   */
  onConfigChange?: (newConfig: Config | ((prev: Config) => Config)) => void;
  /**
   * Stored recording array whose `electrode_locations` asset supplies the
   * overlays when there is no live `config` (read-only detail views).
   */
  arrayEntity?: TElectrodeArrayEntity | null;
  /** Schema root currently selected in the form (`electrode_locations`, `recordings`, …). */
  selectedRootElement?: string;
  /** Dictionary entry name currently selected; highlights the overlay it produced. */
  selectedEntry?: string;
  /**
   * Electrode ids to draw. Omit to draw every overlay (scan-config behaviour);
   * pass an explicit list — `[]` included — to hand visibility to the host, which
   * then also owns it: the viewer's own show/hide toggle stops gating them.
   */
  visibleIds?: readonly string[];
}

/**
 * Hosts the circuit preview and owns all viewer chrome (mode toggle, settings,
 * color-by dropdown/key, nodes table).
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
export function CircuitPreview({
  className,
  circuit,
  enableVisualization = false,
  largeCircuit = false,
  features,
  defaultNeuronOpacity,
  electrodes,
}: CircuitPreviewProps) {
  const {
    config: scanConfig,
    onConfigChange: setConfig,
    arrayEntity,
    selectedRootElement,
    selectedEntry,
    visibleIds: visibleOverlayIds,
  } = electrodes ?? {};
  const enableElectrodes = features?.electrodes ?? false;
  const enableColorBy = features?.colorBy ?? true;
  const enableCellHover = features?.cellHover ?? true;
  const enableNodesTable = features?.nodesTable ?? true;

  const [mode, setMode] = useState<ViewerMode>(ViewerModeDict.Visualization);
  const [showTable, setShowTable] = useState(false);
  const [tableHeight, setTableHeight] = useState<number | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const hasDesignerImage = circuitHasDesignerImage(circuit);
  // Synaptome (beta) / some circuits have no designer image — stay in 3D and
  // hide the mode toggle so image mode cannot toast "No image found".
  const activeMode: ViewerMode = !enableVisualization
    ? ViewerModeDict.Image
    : !hasDesignerImage
      ? ViewerModeDict.Visualization
      : mode;

  const portalContainer = useFullscreenElement();

  const { config: circuitConfig } = useCircuitConfig(circuit);
  const [populationName, setPopulationName] = useState<string | undefined>();

  const population = useMemo(
    () => (circuitConfig ? resolvePopulation(circuitConfig.nodes, populationName) : undefined),
    [circuitConfig, populationName]
  );

  const handlePopulationChange = useCallback((name: string) => {
    setPopulationName(name);
  }, []);

  // Every small-circuit source filters axon sections, so the toggle is offered wherever the
  // morphology itself is drawn.
  const supportsAxons = !largeCircuit;

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
    useCircuitColorBy(enableVisualization ? circuit : undefined, {
      supportsAxons,
      supportsElectrodes: enableElectrodes && electrodesAvailable,
      // The marker slider is only meaningful while the form is editing morphology locations,
      // which is also the only time markers are on screen.
      supportsMorphologyLocations: selectedRootElement === MORPHOLOGY_LOCATIONS_CONFIG_KEY,
      defaultNeuronOpacity,
      population,
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

  const showImage = activeMode === ViewerModeDict.Image;
  const showViz = activeMode === ViewerModeDict.Visualization;
  // Keep both panes mounted once available so mode switches don't remount
  // WebGL / reload morphologies (visibility only).
  const mountImage = hasDesignerImage || !enableVisualization;
  const mountViz = enableVisualization;

  return (
    <div ref={containerRef} className="relative h-full min-h-0 overflow-hidden rounded-2xl">
      {mountImage && (
        <div
          className={classNames('absolute inset-0', !showImage && 'invisible pointer-events-none')}
          aria-hidden={!showImage}
          inert={!showImage || undefined}
        >
          <CircuitImage className={className} circuit={circuit} />
        </div>
      )}
      {mountViz && !largeCircuit && (
        <div
          className={classNames('absolute inset-0', !showViz && 'invisible pointer-events-none')}
          aria-hidden={!showViz}
          inert={!showViz || undefined}
        >
          <CircuitViz
            key={circuit.id}
            circuit={circuit}
            colorsByNode={enableColorBy ? colorsByNode : undefined}
            defaultColor={defaultColor}
            showAxons={config.showAxons}
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
            morphologyLocations={{
              config: scanConfig,
              onConfigChange: setConfig,
              selectedRootElement,
              selectedEntry,
              markerRadius: config.morphologyLocationRadius,
              showLabels: config.showMorphologyLocationLabels,
            }}
          />
        </div>
      )}
      {mountViz && largeCircuit && (
        <div
          className={classNames('absolute inset-0', !showViz && 'invisible pointer-events-none')}
          aria-hidden={!showViz}
          inert={!showViz || undefined}
        >
          <LargeCircuitPreview
            key={circuit.id}
            circuit={circuit}
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
          />
        </div>
      )}

      {enableVisualization && (
        <CircuitViewerChrome
          mode={hasDesignerImage ? activeMode : undefined}
          onModeChange={hasDesignerImage ? setMode : undefined}
          theme={theme}
          table={enableNodesTable ? { active: showTable, onToggle: handleToggleTable } : undefined}
          viz={{
            menu,
            colorBy: enableColorBy ? colorBy : undefined,
            electrodesInteractive: overlaysInteractive,
          }}
        />
      )}

      {showTable && tableHeight !== null && containerHeight > 0 && (
        <div
          className="absolute left-0 right-0 bottom-0 z-30 flex flex-col border-t border-neutral-200 bg-white"
          style={{ height: clampedHeight }}
        >
          <TableResizeHandle
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
            onPopulationChange={handlePopulationChange}
            portalContainer={portalContainer}
          />
        </div>
      )}
    </div>
  );
}

function TableResizeHandle({
  containerRef,
  minHeight,
  onResize,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  minHeight: number;
  onResize: (height: number) => void;
}) {
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const containerBottom = rect.bottom;
    const containerTop = rect.top;
    e.currentTarget.setPointerCapture(e.pointerId);

    function onPointerMove(ev: PointerEvent) {
      const raw = containerBottom - ev.clientY;
      const max = containerBottom - containerTop;
      onResize(Math.min(max, Math.max(minHeight, raw)));
    }
    function onPointerUp(ev: PointerEvent) {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      try {
        (ev.target as Element | null)?.releasePointerCapture?.(ev.pointerId);
      } catch {}
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  return (
    <div
      onPointerDown={onPointerDown}
      className="group absolute left-0 right-0 -top-2 z-10 flex h-4 cursor-ns-resize items-center justify-center"
      style={{ touchAction: 'none' }}
    >
      <div className="h-1 w-14 rounded-full bg-neutral-400 transition-all group-hover:w-16 group-hover:bg-neutral-600" />
    </div>
  );
}

export function CircuitImage({ className, circuit }: { className?: string; circuit: ICircuit }) {
  const { data, isLoading, error } = useCircuitImageURL(circuit.id);
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    if (!data) return;

    const img = new Image();
    img.src = data;
    img.onload = () => {
      setLoaded(true);
    };
  }, [data]);

  return (
    <div className={classNames('w-full h-full', className)}>
      {isLoading && (
        <Skeleton className="flex rounded-2xl items-center justify-center w-full h-full">
          <ImageIcon className="w-20 h-20 text-gray-300 rounded-2xl" />
        </Skeleton>
      )}
      {!isLoading && (error || !data) && (
        <Skeleton
          active={false}
          className="flex rounded-2xl items-center justify-center w-full h-full"
        >
          <BrokenImageIcon className="w-20 h-20 text-gray-300 rounded-2xl" />
        </Skeleton>
      )}
      {!isLoading && !error && data && !loaded && (
        <Skeleton className="flex rounded-2xl items-center justify-center w-full h-full">
          <ImageIcon className="w-20 h-20 text-gray-300 rounded-2xl" />
        </Skeleton>
      )}
      {!isLoading && !error && data && loaded && (
        <div
          id="scan-config-circuit-preview"
          className="w-full h-full min-h-0 p-2 overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)] bg-white"
        >
          <div className="w-full h-full overflow-hidden [&_.ant-image]:block! [&_.ant-image]:w-full! [&_.ant-image]:h-full! [&_.ant-image-img]:w-full! [&_.ant-image-img]:h-full! [&_.ant-image-img]:object-contain!">
            <AntdImage
              src={data}
              alt="Circuit preview"
              className="block! w-full! h-full!"
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
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
    return { ...group, color: recedeColor(legible, background) };
  });
}

/**
 * Non-selected electrodes: keep the hue, drop its intensity.
 *
 * Why not mix toward grey: at a 5-unit radius a greyed marker loses the one cue
 * that says *which* probe it is. Desaturating and easing toward the background
 * pushes it back without discarding its identity.
 */
function recedeColor(color: string, background: string): string {
  try {
    return chroma.mix(chroma(color).desaturate(1.4), background, 0.18, 'oklab').hex();
  } catch {
    return color;
  }
}

/** Strip any CSS alpha so morphoviewer palette texels stay fully opaque. */
function forceOpaqueRgb(color: string): string {
  const rgb = parseCssColor(color);
  if (!rgb) return color;
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/** Parse `#rgb` / `#rrggbb` / `rgb(...)` / `rgba(...)` into RGB channels. */
function parseCssColor(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const h = hex[1];
    if (h.length === 3) {
      return [
        Number.parseInt(h[0] + h[0], 16),
        Number.parseInt(h[1] + h[1], 16),
        Number.parseInt(h[2] + h[2], 16),
      ];
    }
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(color.trim());
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  return null;
}
