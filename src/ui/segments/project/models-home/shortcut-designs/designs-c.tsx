'use client';

import { useState } from 'react';

import { cn } from '@/utils/css-class';

import styles from './designs.module.css';
import {
  GROUP_COLORS,
  GROUP_TITLE,
  Place,
  PlaceIcon,
  useBoxSize,
  useShortcutGroups,
} from './shared';

/** Each place's symbol, as an element's. */
const SYMBOL: Record<string, string> = {
  About: 'Ab',
  News: 'Nw',
  Publications: 'Pb',
  Pricing: 'Pr',
  Tutorials: 'Tu',
  'Free Courses': 'Fc',
  Teach: 'Te',
  Examples: 'Ex',
  Glossary: 'Gl',
  Data: 'Da',
  Workflows: 'Wf',
  Notebooks: 'Nb',
  'Virtual labs': 'Vl',
};

/** Where each group's row of elements starts, of five columns: a periodic table's stair. */
const ELEMENT_START = [1, 1, 2];

/**
 * Elements: the places as a periodic table's tiles, a row a group stepping as the table does, each
 * numbered and with its symbol; one pointed at fills with its group's colour.
 */
export function ElementShortcuts() {
  const { groups, base } = useShortcutGroups();
  let n = 0;
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-[16px]">
      <div className="grid grid-cols-5 gap-[8px]">
        {groups.flatMap((group, g) =>
          group.shortcuts.map((shortcut, i) => {
            n += 1;
            const color = GROUP_COLORS[g];
            return (
              <Place
                key={shortcut.label}
                shortcut={shortcut}
                base={base}
                className="group relative flex aspect-square flex-col justify-between rounded-[8px] border-2 p-[7px] transition-colors duration-200"
                style={{
                  gridRow: g + 1,
                  gridColumn: ELEMENT_START[g] + i,
                  borderColor: color,
                  color,
                  background: `color-mix(in srgb, ${color} 5%, white)`,
                }}
              >
                <span className="absolute inset-0 rounded-[6px] opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ background: color }} />
                <span className="relative flex items-start justify-between text-[10px] leading-[12px] font-semibold group-hover:text-white">
                  {n}
                  <PlaceIcon icon={shortcut.icon} size={12} />
                </span>
                <span className="relative text-[clamp(20px,2.2vw,30px)] leading-none font-bold tracking-[-0.02em] group-hover:text-white">
                  {SYMBOL[shortcut.label] ?? shortcut.label.slice(0, 2)}
                </span>
                <span className="text-primary-9 relative truncate text-[10.5px] leading-[13px] font-semibold group-hover:text-white">
                  {shortcut.label}
                </span>
              </Place>
            );
          })
        )}
      </div>
      <div className="flex flex-wrap gap-x-[18px] gap-y-[4px]">
        {groups.map((group, g) => (
          <span key={group.title} className={cn(GROUP_TITLE, 'flex items-center gap-[6px] text-[10px]')}>
            <span className="size-[10px] rounded-[2px] border-2" style={{ borderColor: GROUP_COLORS[g] }} />
            <span style={{ color: GROUP_COLORS[g] }}>{group.title}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A metro map: a line a group, each leaving the home interchange and running across with its places
 * as stations, named above and below in turn; a station pointed at fills.
 */
export function MetroShortcuts() {
  const { groups, base } = useShortcutGroups();
  const [ref, { width, height }] = useBoxSize<HTMLDivElement>();
  const [lit, setLit] = useState<string | null>(null);
  const home = { x: 26, y: height / 2 };
  const lines = groups.map((group, g) => {
    const y = height * [0.2, 0.5, 0.8][g];
    const turn = width * 0.17;
    const stations = group.shortcuts.map((shortcut, i) => ({
      shortcut,
      id: `${g}/${shortcut.label}`,
      x: width * 0.27 + (i * (width * 0.6)) / Math.max(1, group.shortcuts.length - 1),
      y,
      // the first named below, clear of the line's own name above it
      above: i % 2 === 1,
    }));
    const end = stations[stations.length - 1].x + 14;
    const d = `M ${home.x} ${home.y} C ${turn * 0.7} ${home.y}, ${turn * 0.6} ${y}, ${turn} ${y} L ${end} ${y}`;
    return { group, g, y, turn, stations, d };
  });

  return (
    <div ref={ref} className="absolute inset-0">
      {width > 0 && (
        <>
          <svg className="absolute inset-0" width={width} height={height} aria-hidden>
            {lines.map(({ g, d }) => (
              <path key={g} d={d} fill="none" stroke={GROUP_COLORS[g]} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {lines.flatMap(({ g, stations }) =>
              stations.map((station) => (
                <circle
                  key={station.id}
                  cx={station.x}
                  cy={station.y}
                  r={lit === station.id ? 9 : 7}
                  fill={lit === station.id ? GROUP_COLORS[g] : '#fff'}
                  stroke={GROUP_COLORS[g]}
                  strokeWidth={3}
                  className="transition-all duration-200"
                />
              ))
            )}
            <circle cx={home.x} cy={home.y} r={14} fill="#fff" stroke="#002766" strokeWidth={4} />
            <circle cx={home.x} cy={home.y} r={5} fill="#002766" />
          </svg>
          <span className={cn(GROUP_TITLE, 'absolute text-[10px] text-[#002766]')} style={{ left: 8, top: home.y + 20 }}>
            Home
          </span>
          {lines.map(({ group, g, y, turn }) => (
            <span
              key={group.title}
              className={cn(GROUP_TITLE, 'absolute -translate-y-full pb-[8px] text-[10px]')}
              style={{ left: turn, top: y, color: GROUP_COLORS[g] }}
            >
              {group.title}
            </span>
          ))}
          {lines.flatMap(({ g, stations }) =>
            stations.map((station) => (
              <Place
                key={station.id}
                shortcut={station.shortcut}
                base={base}
                className={cn(
                  'absolute flex -translate-x-1/2 items-center gap-[5px] rounded-full px-[4px] py-[2px] whitespace-nowrap transition-colors hover:bg-[#f4f7fb]',
                  station.above ? '-translate-y-[calc(100%+14px)]' : 'translate-y-[14px]'
                )}
                style={{ left: station.x, top: station.y, color: GROUP_COLORS[g] }}
                onPoint={() => setLit(station.id)}
                onLeave={() => setLit((now) => (now === station.id ? null : now))}
              >
                <PlaceIcon icon={station.shortcut.icon} size={12} />
                <span className="text-primary-9 text-[12px] leading-[15px] font-semibold">{station.shortcut.label}</span>
              </Place>
            ))
          )}
        </>
      )}
    </div>
  );
}

/** An action potential's shape at `x` on a trace at `base`, `height` high: a rise, the spike, the undershoot, back. */
function spike(x: number, base: number, height: number): string {
  return [
    `L ${x - 18} ${base}`,
    `Q ${x - 9} ${base - height * 0.08} ${x - 5} ${base - height * 0.12}`,
    `L ${x - 1} ${base - height}`,
    `L ${x + 4} ${base + height * 0.22}`,
    `Q ${x + 12} ${base + height * 0.3} ${x + 24} ${base}`,
  ].join(' ');
}

/**
 * Voltage traces: a recording a group, its places the action potentials along it, each named over
 * its peak, and a cursor sweeping across as a recording runs; a spike pointed at is drawn again.
 */
export function TraceShortcuts() {
  const { groups, base } = useShortcutGroups();
  const [ref, { width, height }] = useBoxSize<HTMLDivElement>();
  const [lit, setLit] = useState<string | null>(null);
  const band = height / groups.length;
  const peak = Math.min(64, band * 0.42);
  const traces = groups.map((group, g) => {
    const y = band * g + band * 0.78;
    const spikes = group.shortcuts.map((shortcut, i) => ({
      shortcut,
      id: `${g}/${shortcut.label}`,
      x: width * 0.12 + ((i + 0.5) * width * 0.86) / group.shortcuts.length,
    }));
    const d = `M 0 ${y} ${spikes.map((s) => spike(s.x, y, peak)).join(' ')} L ${width} ${y}`;
    return { group, g, y, spikes, d };
  });

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {width > 0 && (
        <>
          <svg className="absolute inset-0" width={width} height={height} aria-hidden>
            {traces.map(({ g, d, y, spikes }) => (
              <g key={g}>
                <line x1={0} x2={width} y1={y} y2={y} stroke="#e6ecf4" strokeDasharray="3 4" />
                <path d={d} fill="none" stroke={GROUP_COLORS[g]} strokeOpacity={0.5} strokeWidth={1.6} strokeLinejoin="round" />
                {spikes
                  .filter((s) => s.id === lit)
                  .map((s) => (
                    <path
                      key={s.id}
                      d={`M ${s.x - 18} ${y} ${spike(s.x, y, peak)}`}
                      fill="none"
                      stroke={GROUP_COLORS[g]}
                      strokeWidth={2.6}
                      strokeLinejoin="round"
                      className={styles.redraw}
                    />
                  ))}
              </g>
            ))}
          </svg>
          <span className={styles.sweep} />
          {traces.map(({ group, g, y }) => (
            <span
              key={group.title}
              className={cn(GROUP_TITLE, 'absolute text-[10px]')}
              style={{ left: 0, top: y - peak - 44, color: GROUP_COLORS[g] }}
            >
              {group.title}
            </span>
          ))}
          {traces.flatMap(({ g, y, spikes }) =>
            spikes.map((s) => (
              <Place
                key={s.id}
                shortcut={s.shortcut}
                base={base}
                className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-[3px] pb-[6px]"
                style={{ left: s.x, top: y - peak, color: GROUP_COLORS[g] }}
                onPoint={() => setLit(s.id)}
                onLeave={() => setLit((now) => (now === s.id ? null : now))}
              >
                <PlaceIcon icon={s.shortcut.icon} size={13} />
                <span className="text-primary-9 text-[11.5px] leading-[14px] font-semibold whitespace-nowrap">
                  {s.shortcut.label}
                </span>
              </Place>
            ))
          )}
        </>
      )}
    </div>
  );
}
