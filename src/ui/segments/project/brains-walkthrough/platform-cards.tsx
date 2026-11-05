'use client';

import {
  RiBookOpenLine,
  RiCodeBoxLine,
  RiDatabase2Line,
  RiFlaskLine,
  RiGraduationCapLine,
  RiLineChartLine,
  RiNodeTree,
  RiRobot2Line,
  RiShareLine,
  RiTeamLine,
} from '@remixicon/react';

import { useWalkthroughEntered } from '@/ui/segments/project/walkthrough/walkthrough';
import { cn } from '@/utils/css-class';

import type { RemixiconComponentType } from '@remixicon/react';
import type { CSSProperties } from 'react';

/** What the platform is for, a card each, two to a row: what is done on it, where, with whom, and learning. */
const CARDS: Array<{ title: string; line: string; Icon: RemixiconComponentType }> = [
  { title: 'Build', line: 'Neurons to whole brains', Icon: RiNodeTree },
  { title: 'Simulate', line: 'Campaigns at any scale', Icon: RiFlaskLine },
  { title: 'Analyse', line: 'Interactive analysis tools', Icon: RiLineChartLine },
  { title: 'Notebooks', line: 'Jupyter in the browser', Icon: RiCodeBoxLine },
  { title: 'Cloud database', line: 'Data across all species', Icon: RiDatabase2Line },
  { title: 'Share', line: 'Publish models and results', Icon: RiShareLine },
  { title: 'Collaborate', line: 'Virtual labs for teams', Icon: RiTeamLine },
  { title: 'Leverage AI', line: 'Agents, plugins and MCP', Icon: RiRobot2Line },
  { title: 'Learn', line: 'Courses for every level', Icon: RiBookOpenLine },
  { title: 'Teach', line: 'Real models in class', Icon: RiGraduationCapLine },
];

const cardTransition = (delay: number) =>
  `opacity 700ms ease-out ${delay}ms, translate 700ms ease-out ${delay}ms, background-color 200ms`;

/**
 * The first screen's cards under its title, two columns of five, as the platform's own design has its cards
 * (OBI - UI/UX 2025, "OBI - Data - AI open"): 195 by 100 px, white, a light grey edge, 8px corners and a soft
 * shadow, a grey label over a bold title at the top and an icon in the bottom right corner, all of it smaller
 * together on a shorter screen; coming in one after another once the intro is over.
 */
export function PlatformCards() {
  const entered = useWalkthroughEntered();
  return (
    <ul
      className="grid grid-cols-[repeat(2,calc(var(--card-h)*1.95))] gap-[8px] pt-[6px] font-[family-name:var(--font-titillium-web)]"
      style={{ '--card-h': 'clamp(76px, 11.5vh, 100px)' } as CSSProperties}
    >
      {CARDS.map(({ title, line, Icon }, i) => (
        <li
          key={title}
          className={cn(
            'flex h-(--card-h) flex-col items-end justify-between rounded-[8px] border border-[#d9d9d9] bg-white p-[calc(var(--card-h)*0.16)]',
            'shadow-[-12px_-8px_32px_0px_rgba(255,255,255,0.07),16px_16px_30px_0px_rgba(0,0,0,0.08)] hover:bg-[#f5f5f5]',
            entered ? 'translate-y-0 opacity-100' : 'translate-y-[12px] opacity-0'
          )}
          // In one after another; pointed at, at once.
          style={{ transition: cardTransition(entered ? 150 + i * 70 : 0) }}
        >
          <span className="flex w-full flex-col items-start gap-[calc(var(--card-h)*0.08)] leading-[1.3] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            <span className="text-[calc(var(--card-h)*0.16)] text-[#8c8c8c] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
              {title}
            </span>
            <span className="text-[calc(var(--card-h)*0.2)] font-bold text-[#002766] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
              {line}
            </span>
          </span>
          <Icon aria-hidden className="size-[calc(var(--card-h)*0.15)] shrink-0 text-[#a5a5a5]" />
        </li>
      ))}
    </ul>
  );
}
