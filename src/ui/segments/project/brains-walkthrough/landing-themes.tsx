import { Fragment, useEffect, useRef } from 'react';

import { SERIF } from '@/features/learn/components/heuristics/shared';
import { cn } from '@/utils/css-class';

/**
 * What the platform is for, along the landing's foot and the first screens', in the order of the screens they
 * are about: the platform, AI, learning and teaching, simulating, exploring results, and so on.
 */
const THEMES = [
  'Virtual Labs',
  'Leverage AI',
  'Learn & Teach',
  'Simulate',
  'Explore',
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
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-[14px] gap-y-[4px] px-[20px] text-[clamp(14px,1.15vw,18px)] leading-[1.4] text-neutral-500 italic',
        // Upright on a phone: over the screens one line, running off the page, to swipe along; on the landing, all of it.
        links
          ? 'stacked:mx-auto stacked:w-max stacked:flex-nowrap stacked:whitespace-nowrap'
          : 'stacked:gap-x-[8px] stacked:text-[13px]'
      )}
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
                className="pointer-events-auto cursor-pointer italic hover:text-[#002766] stacked:-my-[8px] stacked:py-[8px]"
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
  const rail = useRef<HTMLDivElement>(null);
  const underlined = entered ? underlines[chapter] : undefined;
  // Where the line runs off the page, the word on in its middle.
  useEffect(() => {
    const line = rail.current;
    const word = underlined ? line?.querySelector<HTMLElement>(`[data-fly="${underlined}"]`) : null;
    if (!line || !word) return;
    const seen = word.getBoundingClientRect();
    const box = line.getBoundingClientRect();
    line.scrollTo({
      left: line.scrollLeft + seen.left + seen.width / 2 - box.left - box.width / 2,
      behavior: 'smooth',
    });
  }, [underlined]);
  return (
    <div
      ref={rail}
      aria-hidden={!entered}
      inert={!entered || undefined}
      className={cn(
        'pointer-events-none fixed z-[66] transition-opacity duration-500',
        THEMES_FOOT,
        // Upright on a phone, a band along the foot, for a screen's words to pass under, its ends fading.
        'stacked:pointer-events-auto stacked:bottom-0 stacked:block stacked:overflow-x-auto stacked:bg-white/90 stacked:pt-[8px] stacked:pb-[12px] stacked:[mask-image:linear-gradient(90deg,transparent,#000_20px,#000_calc(100%-20px),transparent)] stacked:[scrollbar-width:none] squat:bottom-0 squat:bg-white/90 squat:pt-[6px] squat:pb-[8px]'
      )}
      style={{ opacity: entered ? 1 : 0 }}
    >
      <ThemeLine underlined={underlined} links={links} goTo={goTo} />
    </div>
  );
}
