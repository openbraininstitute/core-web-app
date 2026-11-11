'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { TIME_CURSOR_COLOR } from '@/features/sonata-viewer/time-cursor';
import { TimelineCard } from '@/features/spike-viewer/components/timeline-card';
import {
  drawEventMarks,
  EVENT_BOTTOM_ZONE_PX,
  EVENT_HIT_PX,
  EVENT_TOP_ZONE_PX,
  TIMELINE_COLORS,
} from '@/features/spike-viewer/renderer/axis-overlay';

import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';
import type { TimelineEvent } from '@/features/spike-viewer/config-timeline';
import type { MarkerGroup } from '@/features/spike-viewer/renderer/axis-overlay';
import type { EventsHover } from '@/features/spike-viewer/renderer/raster-renderer';

/** What a Plotly graph knows of its own layout once it has drawn. */
type DrawnGraph = HTMLElement & {
  _fullLayout?: {
    _size: { l: number; t: number; w: number; h: number };
    xaxis?: { range: [number, number]; l2p: (value: number) => number };
  };
  on?: (event: string, handler: () => void) => void;
  removeListener?: (event: string, handler: () => void) => void;
};

const NO_EVENTS: readonly TimelineEvent[] = [];

/**
 * Over a Plotly plot of time, such as a PSTH: the config's timings as the
 * raster marks them - a marker at each onset and offset, their names where
 * they fit, a dashed rule from each synaptic change, and the windows of those
 * under the pointer, with their card - and the player's time, a red rule with
 * the time at its foot. Both are placed by the plot's own axis after each
 * draw, so they follow a zoom and a resize.
 */
export function PlotTimeline({
  graph,
  events,
  timeCursor,
  onHoverChange,
}: {
  /** The Plotly graph once it has drawn; nothing is shown before. */
  graph: HTMLElement | null;
  events: readonly TimelineEvent[];
  timeCursor?: TimeCursor;
  /** Told whether a marker is under the pointer, so the plot's own card can give way. */
  onHoverChange?: (hovering: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorLabelRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<number | null>(null);
  const groupsRef = useRef<MarkerGroup[]>([]);
  const [hover, setHover] = useState<EventsHover | null>(null);
  const hovered = hover?.group.events ?? NO_EVENTS;

  const placeCursor = useCallback(() => {
    const cursor = cursorRef.current;
    const layout = (graph as DrawnGraph | null)?._fullLayout;
    const time = timeRef.current;
    if (!cursor) return;
    if (!layout?.xaxis || time === null) {
      cursor.style.display = 'none';
      return;
    }
    const [from, to] = layout.xaxis.range;
    if (time < Math.min(from, to) || time > Math.max(from, to)) {
      cursor.style.display = 'none';
      return;
    }
    const { l, t, w, h } = layout._size;
    const x = layout.xaxis.l2p(time);
    cursor.style.display = 'block';
    cursor.style.left = `${l + x - 0.75}px`;
    cursor.style.top = `${t}px`;
    cursor.style.height = `${h}px`;
    const label = cursorLabelRef.current;
    if (label) {
      label.textContent = `${time.toFixed(1)} ms`;
      // Beside the rule, on whichever side has room for it, as the raster's playhead label.
      const flip = x > w - 64;
      label.style.left = flip ? 'auto' : '';
      label.style.right = flip ? '4px' : '';
    }
  }, [graph]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const layout = (graph as DrawnGraph | null)?._fullLayout;
    if (!canvas) return;
    if (!layout?.xaxis || events.length === 0) {
      canvas.style.display = 'none';
      groupsRef.current = [];
      return;
    }
    const { l, t, w, h } = layout._size;
    const [xMin, xMax] = layout.xaxis.range;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.display = 'block';
    canvas.style.left = `${l}px`;
    canvas.style.top = `${t}px`;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // A dashed rule from each synaptic change's onset, as behind the raster's spikes.
    ctx.save();
    ctx.strokeStyle = TIMELINE_COLORS.manipulation;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (const e of events) {
      if (e.kind !== 'manipulation') continue;
      const x = Math.round(((e.start - xMin) / (xMax - xMin)) * w) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    ctx.stroke();
    ctx.restore();
    groupsRef.current = drawEventMarks(
      ctx,
      { xMin, xMax, yMin: 0, yMax: 1 },
      w,
      h,
      events,
      hovered
    );
  }, [graph, events, hovered]);

  // After every draw of the plot - a zoom, a resize, new lines - both are placed anew.
  useEffect(() => {
    const drawn = graph as DrawnGraph | null;
    if (!drawn?.on) return;
    const redraw = () => {
      draw();
      placeCursor();
    };
    redraw();
    drawn.on('plotly_afterplot', redraw);
    return () => drawn.removeListener?.('plotly_afterplot', redraw);
  }, [graph, draw, placeCursor]);

  useEffect(() => {
    if (!timeCursor) return;
    return timeCursor.subscribe((time) => {
      timeRef.current = time;
      placeCursor();
    });
  }, [timeCursor, placeCursor]);

  // The markers under the pointer, by marker or name along the top or bottom,
  // or anywhere along a synaptic change's rule, as on the raster.
  useEffect(() => {
    if (!graph || events.length === 0) return;
    const groupAt = (clientX: number, clientY: number): MarkerGroup | undefined => {
      const layout = (graph as DrawnGraph)._fullLayout;
      if (!layout) return undefined;
      const box = graph.getBoundingClientRect();
      const x = clientX - box.left - layout._size.l;
      const y = clientY - box.top - layout._size.t;
      if (x < 0 || x > layout._size.w || y < 0 || y > layout._size.h) return undefined;
      const inTop = y <= EVENT_TOP_ZONE_PX;
      const inBottom = y >= layout._size.h - EVENT_BOTTOM_ZONE_PX;
      const groups = groupsRef.current;
      return (
        groups.find((g) => {
          if (g.top ? !inTop : !inBottom) return false;
          const named = g.label !== undefined && x >= g.label.x && x <= g.label.x + g.label.width;
          return named || Math.abs(x - g.x) <= EVENT_HIT_PX;
        }) ??
        groups.find(
          (g) =>
            g.edge === 'start' &&
            Math.abs(x - g.x) <= 4 &&
            g.events.some((e) => e.kind === 'manipulation')
        )
      );
    };
    const onMove = (e: PointerEvent) => {
      const group = groupAt(e.clientX, e.clientY);
      setHover((previous) => {
        if (!group) return previous === null ? previous : null;
        // The same markers keep their group, so the bands are not drawn again as the pointer moves.
        const same =
          previous !== null &&
          previous.group.events.length === group.events.length &&
          previous.group.events.every((event, i) => event === group.events[i]);
        return { group: same ? previous.group : group, clientX: e.clientX, clientY: e.clientY };
      });
    };
    const onLeave = () => setHover(null);
    graph.addEventListener('pointermove', onMove);
    graph.addEventListener('pointerleave', onLeave);
    return () => {
      graph.removeEventListener('pointermove', onMove);
      graph.removeEventListener('pointerleave', onLeave);
    };
  }, [graph, events]);

  const hovering = hover !== null;
  useEffect(() => {
    onHoverChange?.(hovering);
  }, [hovering, onHoverChange]);

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none absolute hidden" />
      <div
        ref={cursorRef}
        className="pointer-events-none absolute z-10 hidden w-[1.5px]"
        style={{ background: TIME_CURSOR_COLOR }}
      >
        <span
          ref={cursorLabelRef}
          className="absolute bottom-1 left-1 whitespace-nowrap rounded bg-white/85 px-1 text-[10px] font-semibold tabular-nums"
          style={{ color: TIME_CURSOR_COLOR }}
        />
      </div>
      {hover && <TimelineCard hover={hover} />}
    </>
  );
}
