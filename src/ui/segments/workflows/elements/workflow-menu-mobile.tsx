'use client';

import { useState } from 'react';

import { useFlags } from '@/features/feature-flags';
import { HEX_CLIP } from '@/ui/segments/project/hex-home/hex-geometry';
import styles from '@/ui/segments/project/hex-home/hex-cloud.module.css';
import {
  listActivities,
  listWorkflows,
  WorkflowListContextDict,
  WorkflowListSortDict,
} from '@/ui/segments/workflows/config';
import { cn } from '@/utils/css-class';

import { HEADING, PANEL } from './workflow-hex-menu';

import type { CSSProperties, ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

/** The gap between hexagons, along every edge (px). */
const GAP = 6;
// Pointy-top hexagons w wide, (W - 2·GAP) / 3 in a row W wide, interlock when each row starts 0.866·(w + GAP) under
// the last: a margin of -0.0962·W + 1.06·GAP, and a margin's % is of the width.
const ROW_OVERLAP = (2 / Math.sqrt(3) - Math.sqrt(3) / 2) / 3;
const ROW_GAP_PX = GAP * ((2 * ROW_OVERLAP) + Math.sqrt(3) / 2);

/** Items in rows of three and two by turns, each kept with its place in the list. */
function honeycomb<T>(items: T[]) {
  const rows: Array<Array<{ type: T; i: number }>> = [];
  for (let i = 0; i < items.length; ) {
    const n = rows.length % 2 ? 2 : 3;
    rows.push(items.slice(i, i + n).map((type, k) => ({ type, i: i + k })));
    i += n;
  }
  return rows;
}

/**
 * The Workflows page on a phone, down the page rather than beside it: "Start a new workflow" with the categories as
 * a row of hexagons to tap, the tapped one's types as a honeycomb under it, a tap on a type starting it at its entity
 * selection as a click does on a wide screen (the user asked); then "Project workflows" with the activity table
 * (`children`) at a height of its own.
 */
export function WorkflowMenuMobile({
  onSelectType,
  children,
}: {
  onSelectType: (activity: TActivityValue, type: TExtendedEntitiesTypeDict) => void | Promise<void>;
  children: ReactNode;
}) {
  const flags = useFlags();
  const activities = listActivities(flags);
  const [category, setCategory] = useState(0);
  // the type tapped, navy and pulsing while its workflow starts
  const [starting, setStarting] = useState<number | null>(null);
  const activity = activities[category];
  const types = activity
    ? listWorkflows({
        activity: activity.value as TActivityValue,
        flags,
        context: WorkflowListContextDict.Configure,
        sort: WorkflowListSortDict.Order,
      }).filter((type) => !type.disabled && !type.legacy && type.targetType)
    : [];
  const start = async (i: number) => {
    if (starting !== null || !activity) return;
    setStarting(i);
    try {
      await onSelectType(activity.value as TActivityValue, types[i].targetType!);
    } catch {
      setStarting(null);
    }
  };

  return (
    <div className="no-scrollbar flex h-full flex-col gap-3 overflow-x-hidden overflow-y-auto pb-6">
      <section className={cn(PANEL, 'p-4')}>
        <h2 className={HEADING}>Start a new workflow</h2>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2">
          {activities.map((a, i) => {
            const on = i === category;
            return (
              <button
                key={a.value}
                type="button"
                aria-pressed={on}
                onClick={() => setCategory(i)}
                className="relative w-[74px] shrink-0 drop-shadow-[0_5px_9px_rgb(28_40_72/0.16)]"
                style={{ aspectRatio: `${Math.sqrt(3)} / 2` }}
              >
                <span
                  className={cn(
                    'absolute inset-0 flex items-center justify-center px-1.5 text-center text-[10.5px] leading-[12.5px] font-bold tracking-[0.03em] uppercase transition-colors',
                    on ? 'bg-[#002766] text-white' : 'text-primary-9 bg-white'
                  )}
                  style={{ clipPath: HEX_CLIP }}
                >
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* the types as a honeycomb, rows of three and two by turns (the user asked), rising in as the home's do */}
        <div key={activity?.value} className="mx-auto mt-2 w-full max-w-[420px]">
          {honeycomb(types).map((row, r) => (
            <div
              key={r}
              className="grid grid-cols-6"
              style={{ columnGap: GAP, marginTop: r ? `calc(${-ROW_OVERLAP * 100}% + ${ROW_GAP_PX}px)` : 0 }}
            >
              {row.map(({ type, i }, j) => {
                const on = starting === i;
                return (
                  <button
                    key={type.targetType}
                    type="button"
                    aria-busy={on}
                    disabled={starting !== null && !on}
                    onClick={() => start(i)}
                    className={cn(
                      'relative drop-shadow-[0_5px_9px_rgb(28_40_72/0.16)] transition-transform active:scale-95',
                      on && 'animate-pulse'
                    )}
                    style={{ gridColumn: `${(r % 2 ? 2 : 1) + 2 * j} / span 2`, aspectRatio: `${Math.sqrt(3)} / 2` }}
                  >
                    <span
                      className={cn(styles.appear, 'absolute inset-0 block')}
                      style={{ '--appear-delay': `${40 + i * 60}ms` } as CSSProperties}
                    >
                      <span
                        lang="en"
                        className={cn(
                          'absolute inset-0 flex items-center justify-center px-[12%] text-center text-[12.5px] leading-[15px] font-extrabold hyphens-auto transition-colors duration-300',
                          on ? 'bg-[#002766] text-white' : 'text-primary-9 bg-white'
                        )}
                        style={{ clipPath: HEX_CLIP }}
                      >
                        {type.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>
      {/* the table's own toolbar and columns scroll within it */}
      <section className={cn(PANEL, 'flex h-[75vh] min-h-[420px] min-w-0 shrink-0 flex-col overflow-hidden p-3')}>
        <h2 className={cn(HEADING, 'mb-2 shrink-0')}>Project workflows</h2>
        {/* wider than a phone (its search and filters), it scrolls sideways under the heading, which stays */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-x-auto">
          <div className="h-full min-w-[560px]">{children}</div>
        </div>
      </section>
    </div>
  );
}
