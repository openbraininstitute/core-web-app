import { RiTableLine } from '@remixicon/react';
import { Image as AntdImage, Segmented } from 'antd';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { BrokenImageIcon, ImageIcon } from '@/components/icons/image-states';
import { CircuitNodesTable } from '@/features/circuit-nodes';
import { useCircuitImageURL } from '@/features/scan-config/components/hooks/circuit';
import { Skeleton } from '@/ui/molecules/skeleton';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import CircuitViz from '../circuit-viz';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

const MIN_TABLE_HEIGHT = 280;
const DEFAULT_TABLE_HEIGHT_RATIO = 0.4;

interface CircuitPreviewProps {
  className?: string;
  circuit: ICircuit;
}

export function CircuitPreview({ className, circuit }: CircuitPreviewProps) {
  const [mode, setMode] = useState<'image' | 'viz'>('image');
  const [showTable, setShowTable] = useState(false);
  const [tableHeight, setTableHeight] = useState<number | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    <div className="h-full flex flex-col">
      <div className="flex justify-end items-center gap-2 mb-3">
        <TableToggleButton pressed={showTable} onClick={handleToggleTable} />
        <Segmented
          options={[
            { label: 'Image View', value: 'image' },
            { label: 'Visualization', value: 'viz' },
          ]}
          onChange={(v) => setMode(v as 'image' | 'viz')}
        />
      </div>
      <div ref={containerRef} className="flex-1 relative min-h-0">
        {mode === 'image' && <CircuitImage className={className} circuit={circuit} />}
        {mode === 'viz' && <CircuitViz key={circuit.id} id={circuit.id} />}
        {showTable && tableHeight !== null && containerHeight > 0 && (
          <div
            className="absolute left-0 right-0 bottom-0 z-20 flex flex-col border-t border-neutral-200 bg-white"
            style={{ height: clampedHeight }}
          >
            <TableResizeHandle
              containerRef={containerRef}
              minHeight={MIN_TABLE_HEIGHT}
              onResize={setTableHeight}
            />
            <CircuitNodesTable circuit={circuit} />
          </div>
        )}
      </div>
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

function TableToggleButton({ pressed, onClick }: { pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        'inline-flex items-center gap-2 h-auto rounded-full bg-white px-5 py-1',
        'text-primary-9 text-sm font-bold',
        'focus-visible:outline-none',
        pressed
          ? 'shadow-[inset_4px_4px_10px_0_#00000014,inset_-4px_-4px_10px_0_#ffffffd1]'
          : 'shadow-[6px_6px_14px_0_#0000000f,-8px_-8px_20px_0_#ffffffd1]'
      )}
    >
      <RiTableLine className="size-4" />
      Table
    </button>
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
        <div id="scan-config-circuit-preview" className="w-full h-full min-h-0 p-2">
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
