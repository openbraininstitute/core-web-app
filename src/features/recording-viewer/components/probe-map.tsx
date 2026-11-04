import { useMemo } from 'react';

import { TRACE_COLORS } from '@/features/sonata-viewer/constants';

import { probeMapGeometry } from '../trace-layout';

import type { PickedTrace } from '@/features/sonata-viewer/types';
import type { Contact } from '../trace-layout';

const CONTACT_COLOR = '#0b3d91';
const FAINTEST_CONTACT = 0.12;
/** A map taller than this many times its width has its width stretched, to stay legible. */
const MAX_ASPECT = 8;
const CONTACT_FILL = 0.8;

function channelOf(target: EventTarget) {
  const channel = (target as Element).getAttribute?.('data-channel');
  return channel === null || channel === undefined ? null : Number(channel);
}

/**
 * The recording's contacts where they sit on the probe, each shaded by how much its signal moved
 * in the window shown. It drives the traces as the table does.
 */
export function ProbeMap({
  contacts,
  channelNames,
  peakToPeak,
  picked,
  hovered,
  onHover,
  onPick,
}: {
  contacts: Contact[];
  channelNames: string[];
  peakToPeak: Float32Array | null;
  picked: PickedTrace[];
  hovered: number | null;
  onHover: (channel: number | null) => void;
  onPick: (channel: number) => void;
}) {
  const map = useMemo(() => probeMapGeometry(contacts), [contacts]);
  const spanX = map.maxX - map.minX || map.pitchX;
  const spanY = map.maxY - map.minY || map.pitchY;
  const stretch = Math.max(1, spanY / (spanX * MAX_ASPECT));

  const shades = useMemo(() => {
    if (!peakToPeak) return null;
    const sorted = Array.from(peakToPeak).sort((a, b) => a - b);
    const low = sorted[Math.floor(sorted.length * 0.05)] ?? 0;
    const high = sorted[Math.floor(sorted.length * 0.99)] ?? 1;
    return Array.from(peakToPeak, (value) =>
      Math.min(1, Math.max(0, (value - low) / (high - low || 1)))
    );
  }, [peakToPeak]);
  const slotOf = useMemo(
    () => new Map(picked.map((pick) => [pick.traceIndex, pick.slot])),
    [picked]
  );

  const contactWidth = map.pitchX * CONTACT_FILL * stretch;
  const contactHeight = map.pitchY * CONTACT_FILL;
  const margin = Math.max(contactHeight, contactWidth);
  const viewX = map.minX * stretch - margin;
  const viewWidth = spanX * stretch + 2 * margin;
  const viewY = -margin;
  const viewHeight = spanY + 2 * margin;

  return (
    <div
      className="flex h-full w-32 shrink-0 flex-col gap-1 border-r border-neutral-100 pr-2"
      data-testid="recording-probe-map"
    >
      <div className="text-center text-[10px] text-neutral-400">{map.maxY} µm</div>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the table beside it picks the same channels by keyboard */}
      <svg
        className="min-h-0 flex-1 cursor-pointer"
        viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
        role="img"
        aria-label="The contacts on the probe"
        // The gaps between contacts keep the last one, so that crossing them doesn't flicker.
        onMouseMove={(event) => {
          const channel = channelOf(event.target);
          if (channel !== null) onHover(channel);
        }}
        onMouseLeave={() => onHover(null)}
        onClick={(event) => {
          const channel = channelOf(event.target);
          if (channel !== null) onPick(channel);
        }}
      >
        {map.points.map(({ channel, x, y }) => {
          const slot = slotOf.get(channel);
          const isHovered = hovered === channel;
          return (
            <rect
              key={channel}
              data-channel={channel}
              data-testid={`recording-contact-${channelNames[channel]}`}
              x={x * stretch - contactWidth / 2}
              y={map.maxY - y - contactHeight / 2}
              width={contactWidth}
              height={contactHeight}
              fill={slot === undefined ? CONTACT_COLOR : TRACE_COLORS[slot]}
              fillOpacity={
                slot === undefined
                  ? FAINTEST_CONTACT + (1 - FAINTEST_CONTACT) * (shades?.[channel] ?? 0)
                  : 1
              }
              stroke={isHovered ? '#000' : 'none'}
              strokeWidth={isHovered ? 1.5 : 0}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="text-center text-[10px] text-neutral-400">{map.minY} µm</div>
      {/* Of a fixed height, so that its text changing can't resize the map above it. */}
      <div className="h-7 shrink-0 overflow-hidden text-center text-[10px] leading-tight text-neutral-400">
        {hovered === null ? 'Darker: larger signal' : channelNames[hovered]}
        {stretch > 1 ? ' · width not to scale' : ''}
      </div>
    </div>
  );
}
