import { useEffect, useMemo, useRef, useState } from 'react';

import { TRACE_COLORS } from '@/features/sonata-viewer/constants';

import type { PickedTrace } from '@/features/sonata-viewer/types';
import type { TraceLane, TraceLayout } from '../trace-layout';
import type { TraceEnvelopes } from '../worker/envelopes';

const LANE_COLOR = '#334155';
const LABEL_COLOR = '#94a3b8';
const GUTTER_PX = 56;
const MIN_LABEL_SPACING_PX = 12;
const MAX_CANVAS_PX = 16_000;

function drawTraces(
  canvas: HTMLCanvasElement,
  {
    layout,
    envelopes,
    colors,
    labelOf,
    width,
    height,
    laneHeight,
    gain,
  }: {
    layout: TraceLayout;
    envelopes: TraceEnvelopes;
    colors: Map<number, string>;
    labelOf: (lane: TraceLane) => string;
    width: number;
    height: number;
    laneHeight: number;
    gain: number;
  }
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.clearRect(0, 0, canvas.width, canvas.height);

  const { lows, highs, noise } = envelopes;
  const lane = laneHeight * ratio;
  const gutter = GUTTER_PX * ratio;
  const columnWidth = (canvas.width - gutter) / layout.numColumns;
  const toPixels = (lane * gain) / (2 * layout.noiseRange * (noise || 1));
  const step = (columnWidth - layout.columnGapPx * ratio) / envelopes.width;
  const reach = layout.laneReach * lane;

  // Picks go last, so that nothing is drawn over them.
  const ordered = [...layout.lanes].sort(
    (a, b) => Number(colors.has(a.channel)) - Number(colors.has(b.channel))
  );
  for (const { channel, column, row } of ordered) {
    context.fillStyle = colors.get(channel) ?? LANE_COLOR;
    const left = gutter + column * columnWidth;
    const centre = (row + 0.5) * lane;
    let previousTop = centre;
    let previousBottom = centre;
    for (let pixel = 0; pixel < envelopes.width; pixel += 1) {
      const at = channel * envelopes.width + pixel;
      const top = Math.max(centre - reach, centre - highs[at] * toPixels);
      const bottom = Math.min(centre + reach, centre - lows[at] * toPixels);
      // Each bar reaches the last, so that a steep stretch stays one line.
      const from = pixel > 0 ? Math.min(top, previousBottom) : top;
      const to = pixel > 0 ? Math.max(bottom, previousTop) : bottom;
      context.fillRect(
        left + pixel * step,
        from,
        Math.max(step, 1),
        Math.max(to - from, ratio / 2)
      );
      previousTop = top;
      previousBottom = bottom;
    }
  }

  context.fillStyle = LABEL_COLOR;
  context.font = `${10 * ratio}px sans-serif`;
  context.textBaseline = 'middle';
  const every = Math.max(1, Math.ceil(MIN_LABEL_SPACING_PX / laneHeight));
  const labelled = new Set<number>();
  for (const entry of layout.lanes) {
    if (entry.row % every === 0 && !labelled.has(entry.row)) {
      labelled.add(entry.row);
      context.fillText(labelOf(entry), 2 * ratio, (entry.row + 0.5) * lane, gutter - 4 * ratio);
    }
  }
}

/** Every channel's trace at once, each small, in the lanes a layout gives them. */
export function StackedTraces({
  layout,
  envelopes,
  channelNames,
  picked,
  hovered,
  focus,
  laneHeight,
  gain,
  onHover,
  onPick,
  onColumnPixels,
}: {
  layout: TraceLayout;
  envelopes: TraceEnvelopes | null;
  channelNames: string[];
  picked: PickedTrace[];
  hovered: number | null;
  /** A channel to bring into view, chosen elsewhere. */
  focus: number | null;
  laneHeight: number;
  gain: number;
  onHover: (channel: number | null) => void;
  onPick: (channel: number) => void;
  /** Told how many device pixels wide a column is, which an envelope should then be. */
  onColumnPixels: (pixels: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (width > GUTTER_PX) {
      onColumnPixels(
        Math.round(
          ((width - GUTTER_PX) / layout.numColumns - layout.columnGapPx) *
            (window.devicePixelRatio || 1)
        )
      );
    }
  }, [width, layout.numColumns, layout.columnGapPx, onColumnPixels]);

  const ratio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const height = Math.min(layout.numRows * laneHeight, MAX_CANVAS_PX / ratio);
  const fittedLane = height / layout.numRows;

  const laneByPlace = useMemo(
    () => new Map(layout.lanes.map((lane) => [`${lane.column}:${lane.row}`, lane])),
    [layout]
  );
  const laneOfChannel = useMemo(
    () => new Map(layout.lanes.map((lane) => [lane.channel, lane])),
    [layout]
  );

  useEffect(() => {
    if (!canvas.current || !envelopes || width === 0) return;
    drawTraces(canvas.current, {
      layout,
      envelopes,
      colors: new Map(picked.map((pick) => [pick.traceIndex, TRACE_COLORS[pick.slot]])),
      labelOf: (lane) => layout.rowLabels?.[lane.row] ?? channelNames[lane.channel],
      width,
      height,
      laneHeight: fittedLane,
      gain,
    });
  }, [layout, envelopes, picked, channelNames, width, height, fittedLane, gain]);

  useEffect(() => {
    const lane = focus === null ? undefined : laneOfChannel.get(focus);
    const element = scroller.current;
    if (!lane || !element) return;
    const top = lane.row * fittedLane;
    if (top < element.scrollTop || top + fittedLane > element.scrollTop + element.clientHeight) {
      element.scrollTop = top - element.clientHeight / 2;
    }
  }, [focus, laneOfChannel, fittedLane]);

  const columnWidth = (width - GUTTER_PX) / layout.numColumns;
  const laneAt = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = event.nativeEvent;
    const column = Math.floor((offsetX - GUTTER_PX) / columnWidth);
    return laneByPlace.get(`${column}:${Math.floor(offsetY / fittedLane)}`);
  };
  const shown = hovered === null ? undefined : laneOfChannel.get(hovered);

  return (
    <div
      ref={scroller}
      className="secondary-scrollbar relative min-h-0 flex-1 overflow-auto"
      data-testid="recording-stacked-traces"
      onMouseLeave={() => onHover(null)}
    >
      <div className="relative" style={{ height }}>
        <canvas
          ref={canvas}
          className="block cursor-pointer"
          style={{ width, height }}
          onMouseMove={(event) => onHover(laneAt(event)?.channel ?? null)}
          onClick={(event) => {
            const lane = laneAt(event);
            if (lane) onPick(lane.channel);
          }}
        />
        {shown && (
          <div
            className="bg-primary-5/15 pointer-events-none absolute flex items-center justify-end"
            data-testid="recording-hovered-lane"
            style={{
              top: shown.row * fittedLane,
              left: GUTTER_PX + shown.column * columnWidth,
              width: columnWidth,
              height: fittedLane,
            }}
          >
            <span className="z-1 rounded bg-white/90 px-1 text-[10px] whitespace-nowrap text-neutral-700 shadow-sm">
              {channelNames[shown.channel]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
