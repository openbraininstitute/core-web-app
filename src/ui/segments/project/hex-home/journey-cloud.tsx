'use client';

import { useMemo } from 'react';

import { config } from '@/config';
import { learnFlag, useFlag } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { journeyGroups, journeyHref } from '@/ui/segments/project/hex-home/content';
import { axial, cloudFillers } from '@/ui/segments/project/hex-home/hex-geometry';
import { burstMs, HexTile } from '@/ui/segments/project/hex-home/hex-tile';
import { cn } from '@/utils/css-class';

import type { IHexBox, IPoint } from '@/ui/segments/project/hex-home/hex-geometry';

const WIDTH = 1000;
const HEIGHT = 640;
/** The flower's grid, and its tiles a little inside it. */
const R = 116;
const CENTRE = { x: WIDTH / 2, y: HEIGHT / 2 };
/** The layout px the cloud is drawn in, for the page to place and scale it. */
export const GROUP_FRAME = { width: WIDTH, height: HEIGHT };

type TCell = [number, number];
const L: TCell = [-1, 0];
const UL: TCell = [0, -1];
const UR: TCell = [1, -1];
const RT: TCell = [1, 0];
const LR: TCell = [0, 1];
const LL: TCell = [-1, 1];
/** Where a group's places go round its name, in reading order, by how many it has; the rest of the ring is plain. */
const RINGS: Record<number, TCell[]> = {
  1: [RT],
  2: [UR, LR],
  3: [UR, RT, LR],
  4: [UL, UR, LL, LR],
  5: [UL, UR, RT, LL, LR],
  6: [UL, UR, L, RT, LL, LR],
};
const ALL: TCell[] = [L, UL, UR, RT, LR, LL];

const at = ([q, r]: TCell, k = 0.95): IHexBox => {
  const p = axial(q, r, R);
  return { x: CENTRE.x + p.x, y: CENTRE.y + p.y, r: R * k };
};

/**
 * One group of the Figma's places (AI-Trial 306:1752) as a flower in the landing's white honeycomb: its name in
 * the middle on the floor, its places raised round it, the rest of the ring plain; all of it coming out of `from`.
 */
export function GroupCloud({ group: index, from }: { group: number; from: IPoint }) {
  const { virtualLabId, projectId } = useWorkspace();
  const learn = useFlag(learnFlag.key) === true;
  const base = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;
  const group = journeyGroups({ learn })[index];

  const ring = RINGS[Math.min(6, group.cards.length)];
  const cards = group.cards.slice(0, 6).map((card, i) => ({ card, box: at(ring[i]) }));
  const plain = ALL.filter((c) => !ring.includes(c)).map((c) => at(c));
  const middle = at([0, 0]);

  const fillers = useMemo(
    () =>
      cloudFillers({
        seed: 11 + index,
        width: WIDTH,
        height: HEIGHT,
        R: 40,
        centre: CENTRE,
        reach: { x: 520, y: 330 },
        avoid: [middle, ...plain, ...cards.map((c) => c.box)],
        gap: 6,
        density: 0.75,
        strays: 12,
      }),
    // the layout depends only on which group and how many places it has
    [index, group.cards.length]
  );

  return (
    <>
      {fillers.map((f) => (
        <HexTile
          key={f.key}
          box={f}
          lift={f.lift}
          drift={f.drift}
          tone={f.lift < 0.2 ? 'floor' : 'white'}
          from={from}
          appearMs={burstMs(f, from)}
        />
      ))}
      {plain.map((box) => (
        <HexTile key={`${box.x}-${box.y}`} box={box} lift={0.3} from={from} appearMs={burstMs(box, from, 120)} />
      ))}
      <HexTile box={middle} lift={0.08} drift={false} tone="tint" from={from} appearMs={burstMs(middle, from, 80)}>
        <div className="flex h-full w-full items-center justify-center px-[28px] text-center">
          <span className="text-primary-8 text-[15px] leading-[19px] font-semibold tracking-[1.4px] uppercase">
            {group.title}
          </span>
        </div>
      </HexTile>
      {cards.map(({ card, box }) => (
        <HexTile
          key={card.label}
          box={box}
          lift={0.6}
          href={card.href ? journeyHref(card.href, base) : undefined}
          title={card.href ? card.label : 'Coming soon'}
          from={from}
          appearMs={burstMs(box, from, 180)}
        >
          <div
            className={cn(
              'flex h-full w-full flex-col items-center justify-center gap-[8px] px-[30px] text-center',
              !card.href && 'opacity-45'
            )}
          >
            <img src={`/images/vlab-home/icons/${card.icon}.svg`} alt="" width={34} height={34} />
            <span className="text-primary-9 text-[19px] leading-[22px] font-semibold">{card.label}</span>
            <span className="text-[12.5px] leading-[16px] text-neutral-500">{card.blurb}</span>
            {!card.href && (
              <span className="mt-[2px] text-[10px] font-semibold tracking-[1px] text-neutral-400 uppercase">
                Coming soon
              </span>
            )}
          </div>
        </HexTile>
      ))}
    </>
  );
}
