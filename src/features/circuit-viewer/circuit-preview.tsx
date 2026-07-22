'use client';

import { RiCloseLine } from '@remixicon/react';
import { Image as AntdImage } from 'antd';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { BrokenImageIcon, ImageIcon } from '@/components/icons/image-states';
import { CircuitNodesTable } from '@/features/circuit-nodes';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { resolvePopulation } from '@/features/circuit-nodes/population-utils';
import { CircuitViewerChrome } from '@/features/circuit-viewer/color-by/circuit-viewer-chrome';
import { type ViewerMode, ViewerModeDict } from '@/features/circuit-viewer/color-by/mode-toggle';
import { useCircuitColorBy } from '@/features/circuit-viewer/color-by/use-circuit-color-by';
import { useCircuitImageURL } from '@/features/circuit-viewer/hooks/use-circuit-image-url';
import { Skeleton } from '@/ui/molecules/skeleton';
import { classNames } from '@/util/utils';

import CircuitViz from './circuit-viz';
import { LargeCircuitPreview } from './large-circuit-preview';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

const MIN_TABLE_HEIGHT = 280;
const DEFAULT_TABLE_HEIGHT_RATIO = 0.4;

interface CircuitPreviewProps {
  className?: string;
  circuit: ICircuit;
  enableVisualization?: boolean;
  largeCircuit?: boolean;
}

/**
 * Hosts the circuit preview and owns all viewer chrome (mode toggle, settings,
 * color-by dropdown/key, nodes table). The color-by state lives here so the mode
 * toggle can also be shown over the image, and the actual viewers stay pure
 * renderers of `colorsByNode` + config.
 */
export function CircuitPreview({
  className,
  circuit,
  enableVisualization = false,
  largeCircuit = false,
}: CircuitPreviewProps) {
  const [mode, setMode] = useState<ViewerMode>(ViewerModeDict.Visualization);
  const [showTable, setShowTable] = useState(false);
  const [tableHeight, setTableHeight] = useState<number | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const activeMode: ViewerMode = enableVisualization ? mode : 'image';

  const { config: circuitConfig } = useCircuitConfig(circuit);
  const [populationName, setPopulationName] = useState<string | undefined>();

  const population = useMemo(
    () => (circuitConfig ? resolvePopulation(circuitConfig.nodes, populationName) : undefined),
    [circuitConfig, populationName]
  );

  const handlePopulationChange = useCallback((name: string) => {
    setPopulationName(name);
  }, []);

  const { containerRef, config, colorsByNode, defaultColor, theme, signals, colorBy, menu } =
    useCircuitColorBy(enableVisualization ? circuit : undefined, {
      supportsAxons: !largeCircuit,
      population,
    });

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
        />
      )}

      {enableVisualization && (
        <CircuitViewerChrome
          mode={activeMode}
          onModeChange={setMode}
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
