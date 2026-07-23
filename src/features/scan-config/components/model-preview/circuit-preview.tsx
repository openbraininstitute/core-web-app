import { RiCloseLine } from '@remixicon/react';
import { Image as AntdImage } from 'antd';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { getAsset } from '@/api/entitycore/selectors/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { BrokenImageIcon, ImageIcon } from '@/components/icons/image-states';
import { CircuitNodesTable } from '@/features/circuit-nodes';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { resolvePopulation } from '@/features/circuit-nodes/population-utils';
import CircuitViz, {
  loaderSupportsAxonToggle,
  resolveSmallCircuitLoaderKind,
} from '@/features/scan-config/components/circuit-viz/circuit-viz';
import { CircuitViewerChrome } from '@/features/scan-config/components/color-by/circuit-viewer-chrome';
import {
  type ViewerMode,
  ViewerModeDict,
} from '@/features/scan-config/components/color-by/mode-toggle';
import { useCircuitColorBy } from '@/features/scan-config/components/color-by/use-circuit-color-by';
import { useCircuitImageURL } from '@/features/scan-config/components/hooks/circuit';
import { applyElectrodeOverlayTransform } from '@/features/scan-config/components/model-preview/apply-electrode-overlay-transform';
import {
  type CircuitOverlayGroup,
  ELECTRODE_LOCATIONS_CONFIG_KEY,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import { useElectrodeLocationsOverlay } from '@/features/scan-config/components/model-preview/use-electrode-locations-overlay';
import { Skeleton } from '@/ui/molecules/skeleton';
import { classNames } from '@/util/utils';

import { LargeCircuitPreview } from './large-circuit-preview';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
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
   * When false, skip electrode overlay chrome/sync (e.g. single-scale until
   * that path is validated). Default true — still gated by overlay availability.
   */
  enableElectrodes?: boolean;
  /**
   * Initial neuron opacity (0–1). Host-owned so the viewer stays reusable
   * (scan-config, data details, …). Omit for full opacity; pass
   * {@link ELECTRODE_FOCUSED_NEURON_OPACITY} when electrodes should dominate.
   */
  defaultNeuronOpacity?: number;
  /** Live scan-config; when it contains `electrode_locations`, overlays are fetched. */
  config?: Config;
  /** When set, electrode drag/rotate in 3D writes origin/rotation back into the form. */
  setConfig?: (newConfig: Config | ((prev: Config) => Config)) => void;
  /** Schema root currently selected in the form (e.g. `electrode_locations`). */
  selectedRootElement?: string;
  /** Dictionary entry name currently selected (matches overlay `id`). */
  selectedEntry?: string;
}

/**
 * Hosts the circuit preview and owns all viewer chrome (mode toggle, settings,
 * color-by dropdown/key, nodes table).
 *
 * How electrode sync works here:
 * - {@link useElectrodeLocationsOverlay} → coloured overlays
 * - form selection → `highlightedOverlayId` + selection styling
 * - morphoviewer `onOverlayTransform` (phase `end`) →
 *   {@link applyElectrodeOverlayTransform} → `setConfig`
 *
 * Why: keep 3D↔form bidirectional without pushing config on every pointer move.
 */
export function CircuitPreview({
  className,
  circuit,
  enableVisualization = false,
  largeCircuit = false,
  enableElectrodes = true,
  defaultNeuronOpacity,
  config: scanConfig,
  setConfig,
  selectedRootElement,
  selectedEntry,
}: CircuitPreviewProps) {
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

  const { config: circuitConfig } = useCircuitConfig(circuit);
  const [populationName, setPopulationName] = useState<string | undefined>();

  const population = useMemo(
    () => (circuitConfig ? resolvePopulation(circuitConfig.nodes, populationName) : undefined),
    [circuitConfig, populationName]
  );

  const handlePopulationChange = useCallback((name: string) => {
    setPopulationName(name);
  }, []);

  const supportsAxons =
    !largeCircuit && loaderSupportsAxonToggle(resolveSmallCircuitLoaderKind(circuit.scale));

  const { overlays, available: electrodesAvailable } = useElectrodeLocationsOverlay({
    config: enableElectrodes ? scanConfig : undefined,
  });

  const handleOverlayTransform = useCallback(
    (event: MorphoViewerOverlayTransformEvent) => {
      if (!setConfig || !enableElectrodes) return;
      // 3D already updates optimistically during the gesture; write the form
      // only on drop so React/config churn does not lag the drag.
      if (event.phase !== 'end') return;
      setConfig((prev) => applyElectrodeOverlayTransform(prev, event));
    },
    [setConfig, enableElectrodes]
  );

  const { containerRef, config, colorsByNode, defaultColor, theme, signals, colorBy, menu } =
    useCircuitColorBy(enableVisualization ? circuit : undefined, {
      supportsAxons,
      supportsElectrodes: enableElectrodes && electrodesAvailable,
      defaultNeuronOpacity,
      population,
    });

  const visibleOverlays = enableElectrodes && config.showElectrodes ? overlays : undefined;
  const highlightedOverlayId =
    enableElectrodes && selectedRootElement === ELECTRODE_LOCATIONS_CONFIG_KEY && selectedEntry
      ? selectedEntry
      : null;
  const styledOverlays = useMemo(
    () => styleOverlaysForSelection(visibleOverlays, highlightedOverlayId),
    [visibleOverlays, highlightedOverlayId]
  );
  const overlaysInteractive = Boolean(
    enableElectrodes && setConfig && styledOverlays && styledOverlays.length > 0
  );

  // Selecting an electrode in the form turns overlays on so it can be seen.
  useEffect(() => {
    if (!highlightedOverlayId || config.showElectrodes || !menu.onToggleElectrodes) return;
    menu.onToggleElectrodes(true);
  }, [highlightedOverlayId, config.showElectrodes, menu.onToggleElectrodes]);

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

  return (
    <div ref={containerRef} className="relative h-full min-h-0 overflow-hidden rounded-2xl">
      {activeMode === ViewerModeDict.Image && (
        <CircuitImage className={className} circuit={circuit} />
      )}
      {activeMode === ViewerModeDict.Visualization && !largeCircuit && (
        <CircuitViz
          key={circuit.id}
          circuit={circuit}
          colorsByNode={colorsByNode}
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
        />
      )}
      {activeMode === ViewerModeDict.Visualization && largeCircuit && (
        <LargeCircuitPreview
          key={circuit.id}
          circuit={circuit}
          colorsByNode={colorsByNode}
          backgroundColor={config.backgroundColor}
          scalebarColor={theme?.foreground}
          signals={signals}
          overlays={styledOverlays}
          overlaysInteractive={overlaysInteractive}
          onOverlayTransform={handleOverlayTransform}
          highlightedOverlayId={highlightedOverlayId}
          neuronOpacity={config.neuronOpacity}
          electrodeRadius={config.electrodeRadius}
        />
      )}

      {enableVisualization && (
        <CircuitViewerChrome
          mode={hasDesignerImage ? activeMode : undefined}
          onModeChange={hasDesignerImage ? setMode : undefined}
          theme={theme}
          table={{ active: showTable, onToggle: handleToggleTable }}
          viz={activeMode === ViewerModeDict.Visualization ? { menu, colorBy } : undefined}
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

export function CircuitImage({ className, circuit }: CircuitPreviewProps) {
  const { data, isLoading, error } = useCircuitImageURL(circuit?.id);
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
 * Emphasize the form-selected electrode; darken the others (fully opaque).
 *
 * Why opaque darkening (not alpha): electrodes must stay 100% opaque even when
 * neuron opacity is low — translucent rgba made the circuit show through markers.
 */
function styleOverlaysForSelection(
  overlays: CircuitOverlayGroup[] | undefined,
  selectedId: string | null
): CircuitOverlayGroup[] | undefined {
  if (!overlays?.length || !selectedId) return overlays;
  return overlays.map((group) => {
    if (group.id === selectedId) {
      return { ...group, color: emphasizeColor(group.color) };
    }
    return { ...group, color: softenColor(group.color) };
  });
}

/** Selected electrode: keep full opaque RGB (no wash toward white). */
function emphasizeColor(color: string): string {
  return forceOpaqueRgb(color);
}

/** Non-selected electrodes: darken without introducing alpha. */
function softenColor(color: string): string {
  return mixTowardBlack(forceOpaqueRgb(color), 0.35);
}

/** Strip any CSS alpha so morphoviewer palette texels stay fully opaque. */
function forceOpaqueRgb(color: string): string {
  const rgb = parseCssColor(color);
  if (!rgb) return color;
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function mixTowardBlack(color: string, amount: number): string {
  const rgb = parseCssColor(color);
  if (!rgb) return color;
  const t = Math.min(1, Math.max(0, amount));
  const r = Math.round(rgb[0] * (1 - t));
  const g = Math.round(rgb[1] * (1 - t));
  const b = Math.round(rgb[2] * (1 - t));
  return `rgb(${r}, ${g}, ${b})`;
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
