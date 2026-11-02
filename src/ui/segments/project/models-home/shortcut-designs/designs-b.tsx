'use client';

import { useState } from 'react';

import { cn } from '@/utils/css-class';

import styles from './designs.module.css';
import { GROUP_COLORS, GROUP_TITLE, Place, PlaceIcon, spread, useShortcutGroups } from './shared';

import type { CSSProperties } from 'react';

/** Where each place sits in the bento: its columns and rows, and a line for the large ones. */
const BENTO: Record<string, { col?: number; row?: number; note?: string }> = {
  Data: { col: 2, row: 2, note: 'Morphologies, models and circuits, from labs and from the platform' },
  Workflows: { col: 2, note: 'Build, simulate and analyse' },
  Notebooks: {},
  'Virtual labs': {},
  Tutorials: { col: 2, note: 'Videos, step by step' },
  'Free Courses': {},
  Examples: {},
  Glossary: {},
  Teach: {},
  About: {},
  News: {},
  Publications: { col: 2 },
  Pricing: { col: 2 },
};

/** A bento: the places as tiles of a grid, the most used the largest, each tinted by its group. */
export function BentoShortcuts() {
  const { groups, base } = useShortcutGroups();
  const tiles = Object.keys(BENTO).flatMap((label) => {
    const g = groups.findIndex((group) => group.shortcuts.some((s) => s.label === label));
    const shortcut = groups[g]?.shortcuts.find((s) => s.label === label);
    return shortcut ? [{ shortcut, g, ...BENTO[label] }] : [];
  });
  return (
    <div className="absolute inset-0 grid grid-cols-4 grid-rows-5 gap-[10px]">
      {tiles.map(({ shortcut, g, col, row, note }) => {
        const color = GROUP_COLORS[g];
        const large = (row ?? 1) > 1;
        return (
          <Place
            key={shortcut.label}
            shortcut={shortcut}
            base={base}
            className="group relative flex min-h-0 min-w-0 flex-col justify-between overflow-hidden rounded-[14px] border p-[12px] transition-[transform,box-shadow] duration-200 hover:-translate-y-[2px] hover:shadow-[0_10px_24px_rgba(0,39,102,0.1)]"
            style={{
              gridColumn: col ? `span ${col}` : undefined,
              gridRow: row ? `span ${row}` : undefined,
              background: `color-mix(in srgb, ${color} 6%, white)`,
              borderColor: `color-mix(in srgb, ${color} 16%, white)`,
            }}
          >
            <span
              className="flex size-[30px] items-center justify-center rounded-[9px] bg-white"
              style={{ color }}
            >
              <PlaceIcon icon={shortcut.icon} size={large ? 17 : 15} />
            </span>
            <span className="flex flex-col gap-[2px]">
              <span
                className={cn(
                  'text-primary-9 leading-tight font-semibold',
                  large ? 'text-[22px]' : 'text-[14px]'
                )}
              >
                {shortcut.label}
              </span>
              {note && (
                <span className="line-clamp-2 text-[11px] leading-[14px] text-neutral-500">{note}</span>
              )}
            </span>
            <span
              className="absolute top-[12px] right-[12px] text-[14px] opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color }}
            >
              ↗
            </span>
          </Place>
        );
      })}
    </div>
  );
}

/** How many spikes run along each place's row, unbidden, and more while it is pointed at. */
const TICKS = 5;
const BURST = 9;

/**
 * A spike raster: a row a place, its spikes drifting along it as a recording scrolls, under its
 * group; a place pointed at bursts.
 */
export function RasterShortcuts() {
  const { groups, base } = useShortcutGroups();
  const [lit, setLit] = useState<string | null>(null);
  let row = 0;
  return (
    <div className="absolute inset-0 flex flex-col justify-between">
      {groups.map((group, g) => (
        <section key={group.title} className="flex flex-col gap-[2px]">
          <span className={cn(GROUP_TITLE, 'mb-[2px] text-[10px]')} style={{ color: GROUP_COLORS[g] }}>
            {group.title}
          </span>
          {group.shortcuts.map((shortcut) => {
            const id = `${g}/${shortcut.label}`;
            const r = row++;
            const on = lit === id;
            const period = 4 + spread(r, 1) * 5;
            return (
              <Place
                key={id}
                shortcut={shortcut}
                base={base}
                className="group flex h-[26px] items-center gap-[12px] rounded-[6px] px-[6px] transition-colors hover:bg-[#f4f7fb]"
                onPoint={() => setLit(id)}
                onLeave={() => setLit((now) => (now === id ? null : now))}
              >
                <span className="flex w-[118px] shrink-0 items-center gap-[8px]" style={{ color: GROUP_COLORS[g] }}>
                  <PlaceIcon icon={shortcut.icon} size={14} />
                  <span className="text-primary-9 text-[12.5px] leading-[16px] font-semibold whitespace-nowrap">
                    {shortcut.label}
                  </span>
                </span>
                <span className="relative h-[18px] min-w-0 flex-1 overflow-hidden border-l border-[#e6ecf4]">
                  {Array.from({ length: on ? BURST : TICKS }, (_, k) => {
                    const duration = on ? 1.6 + spread(r, k + 3) * 0.6 : period;
                    return (
                      <span
                        key={`${on}-${k}`}
                        className={styles.tick}
                        style={
                          {
                            background: on ? '#1677ff' : GROUP_COLORS[g],
                            opacity: on ? 1 : 0.55,
                            animationDuration: `${duration}s`,
                            animationDelay: `${-(k / (on ? BURST : TICKS) + spread(r, k) * 0.15) * duration}s`,
                          } as CSSProperties
                        }
                      />
                    );
                  })}
                </span>
              </Place>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/**
 * An index: the places as a contents page, a column a group, each numbered and set in the serif of
 * the heading, with a rule under it; one pointed at steps forward with an arrow.
 */
export function IndexShortcuts() {
  const { groups, base } = useShortcutGroups();
  let n = 0;
  return (
    <div className="absolute inset-0 grid grid-cols-3 gap-[22px]">
      {groups.map((group, g) => (
        <section key={group.title} className="flex min-w-0 flex-col">
          <span
            className={cn(GROUP_TITLE, 'border-b-2 pb-[8px] text-[10px]')}
            style={{ color: GROUP_COLORS[g], borderColor: GROUP_COLORS[g] }}
          >
            {group.title}
          </span>
          {group.shortcuts.map((shortcut) => {
            n += 1;
            return (
              <Place
                key={shortcut.label}
                shortcut={shortcut}
                base={base}
                className="group flex items-baseline gap-[8px] border-b border-[#e6ecf4] py-[13px]"
              >
                <span className="font-mono text-[10px] text-neutral-400">{String(n).padStart(2, '0')}</span>
                <span className="text-primary-9 min-w-0 font-serif text-[21px] leading-[24px] transition-transform duration-200 group-hover:translate-x-[4px]">
                  {shortcut.label}
                </span>
                <span
                  className="ml-auto text-[14px] opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: GROUP_COLORS[g] }}
                >
                  →
                </span>
              </Place>
            );
          })}
        </section>
      ))}
    </div>
  );
}
