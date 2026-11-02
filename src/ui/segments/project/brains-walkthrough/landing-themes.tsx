import { Fragment } from 'react';

import { SERIF } from '@/features/learn/components/heuristics/shared';
import { cn } from '@/utils/css-class';

/**
 * What the platform is for, along the landing's foot and the first screens', in the order of the screens they
 * are about: the platform, simulating, AI, exploring results, teaching, and so on.
 */
const THEMES = [
  'Virtual Labs',
  'Simulate',
  'Leverage AI',
  'Explore',
  'Teach',
  'Learn',
  'Build',
  'Collaborate',
  'Share',
];

/** Where the line of the platform's uses runs along the foot of the page: the landing's, and the screens' after. */
export const THEMES_FOOT = 'inset-x-0 bottom-[clamp(20px,4.5vh,44px)] flex justify-center';

/**
 * The platform's uses in a line, in grey italics, set apart by dots, in the course's serif: on the landing as
 * they are, and on the screens after it, at the same place, with the one the screen on is about underlined
 * (`underlined`) and those with a screen of their own (`links`, by chapter id) taking the page there (`goTo`).
 * Each word is marked to be flown from the landing's line to the screens', which, laid out alike, it does
 * without moving while the landing scrolls away.
 */
function ThemeLine({
  underlined,
  links,
  goTo,
}: {
  underlined?: string;
  links?: Record<string, string>;
  goTo?: (id: string) => void;
}) {
  return (
    <p
      className="flex flex-wrap items-center justify-center gap-x-[14px] gap-y-[4px] px-[20px] text-[clamp(14px,1.15vw,18px)] leading-[1.4] text-neutral-500 italic"
      style={{ fontFamily: SERIF }}
    >
      {THEMES.map((theme, i) => {
        const word = (
          <span
            data-fly={theme}
            className={cn(
              links && 'underline decoration-[1.5px] underline-offset-[0.2em] transition-[text-decoration-color,color] duration-500'
            )}
            style={links ? { textDecorationColor: theme === underlined ? 'currentColor' : 'transparent' } : undefined}
          >
            {theme}
          </span>
        );
        const to = links?.[theme];
        return (
          <Fragment key={theme}>
            {i > 0 && (
              <span aria-hidden className="text-neutral-300 not-italic">
                ·
              </span>
            )}
            {to && goTo ? (
              <button
                type="button"
                onClick={() => goTo(to)}
                className="pointer-events-auto cursor-pointer italic hover:text-[#002766]"
              >
                {word}
              </button>
            ) : (
              word
            )}
          </Fragment>
        );
      })}
    </p>
  );
}

/** The platform's uses along the landing's foot. */
export function LandingThemes() {
  return <ThemeLine />;
}

/**
 * The platform's uses along the foot of every screen after the landing, where the landing has them, so that they
 * stay put as it scrolls away: the word the screen on is about underlined (`underlines`, by screen index), and
 * those with a screen of their own (`links`, by chapter id) taking the page there.
 */
export function ThemeNav({
  entered,
  chapter,
  underlines,
  links,
  goTo,
}: {
  entered: boolean;
  chapter: number;
  underlines: Record<number, string>;
  links: Record<string, string>;
  goTo: (id: string) => void;
}) {
  return (
    <div
      aria-hidden={!entered}
      inert={!entered || undefined}
      className={cn('pointer-events-none fixed z-[66] transition-opacity duration-500', THEMES_FOOT)}
      style={{ opacity: entered ? 1 : 0 }}
    >
      <ThemeLine underlined={entered ? underlines[chapter] : undefined} links={links} goTo={goTo} />
    </div>
  );
}
