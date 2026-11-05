import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { SERIF } from '@/features/learn/components/heuristics/shared';
import { cn } from '@/utils/css-class';

import { BRAIN_THEMES } from './chapters';

import type { RefObject } from 'react';
import type { ChapterPlayback } from '@/ui/segments/project/walkthrough/use-chapter-playback';

import progressStyles from '@/ui/segments/project/walkthrough/public-tour.module.css';

/** Where the line of the platform's uses runs along the foot of the page: the landing's, and the screens' after. */
export const THEMES_FOOT = 'inset-x-0 bottom-[clamp(20px,4.5vh,44px)] flex justify-center';
export const THEME_NAV_RAIL = cn(
  'pointer-events-none fixed z-[66] transition-opacity duration-500',
  THEMES_FOOT,
  'stacked:pointer-events-auto stacked:bottom-0 stacked:block stacked:overflow-x-auto stacked:bg-white/90 stacked:pt-[8px] stacked:pb-[12px] stacked:[mask-image:linear-gradient(90deg,transparent,#000_20px,#000_calc(100%-20px),transparent)] stacked:[scrollbar-width:none] squat:bottom-0 squat:bg-white/90 squat:pt-[6px] squat:pb-[8px]'
);

/**
 * The platform's uses in a line, in grey italics, set apart by dots, in the course's serif: on the landing as
 * they are, and on the screens after it, at the same place, with the one the screen on is about underlined
 * (`underlined`) and those with a screen of their own (`links`, by chapter id) taking the page there (`goTo`).
 * Each word is marked to be flown from the landing's line to the screens', which, laid out alike, it does
 * without moving while the landing scrolls away.
 */
export function ThemeLine({
  underlined,
  links,
  goTo,
  playback,
  publicAppearance = false,
}: {
  underlined?: string;
  links?: Record<string, string>;
  goTo?: (id: string) => void;
  playback?: ChapterPlayback;
  publicAppearance?: boolean;
}) {
  const timeline = useRef<HTMLDivElement>(null);
  if (publicAppearance) {
    return (
      <div className={progressStyles.chapterTimeline}>
        <div ref={timeline} className={progressStyles.timelineChapters}>
          {BRAIN_THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              className={progressStyles.timelineChapter}
              aria-current={theme === underlined ? 'location' : undefined}
              onClick={() => {
                const to = links?.[theme];
                if (to) goTo?.(to);
              }}
            >
              <span data-fly={theme}>{theme}</span>
              <span className={progressStyles.timelineTrack} aria-hidden="true">
                <span className={progressStyles.timelineDot} />
              </span>
            </button>
          ))}
          {playback && (
            <TimelineProgress rail={timeline} chapter={underlined} progress={playback.progress} />
          )}
        </div>
        {playback ? (
          <button
            type="button"
            className={progressStyles.navPause}
            onClick={playback.toggle}
            aria-label={playback.playing ? 'Pause chapter playback' : 'Play chapter playback'}
            title={playback.playing ? 'Pause' : 'Play'}
            aria-pressed={playback.playing}
          >
            <span aria-hidden="true">{playback.playing ? 'Ⅱ' : '▷'}</span>
          </button>
        ) : (
          <span className={progressStyles.navPauseSpace} aria-hidden="true" />
        )}
      </div>
    );
  }
  return (
    <p
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-[14px] gap-y-[4px] px-[20px] text-[clamp(14px,1.15vw,18px)] leading-[1.4] text-neutral-500 italic',
        // Upright on a phone: over the screens one line, running off the page, to swipe along; on the landing, all of it.
        links
          ? 'stacked:mx-auto stacked:w-max stacked:flex-nowrap stacked:whitespace-nowrap'
          : 'stacked:gap-x-[8px] stacked:text-[13px]'
      )}
      style={
        publicAppearance
          ? { fontFamily: 'var(--font-gabarito), sans-serif', fontStyle: 'normal' }
          : { fontFamily: SERIF }
      }
    >
      {BRAIN_THEMES.map((theme, i) => {
        const word = (
          <span
            data-fly={theme}
            className={cn(
              links &&
                !playback &&
                'underline decoration-[1.5px] underline-offset-[0.2em] transition-[text-decoration-color,color] duration-500',
              (playback || publicAppearance) && progressStyles.navWord
            )}
            style={
              links && !playback
                ? { textDecorationColor: theme === underlined ? 'currentColor' : 'transparent' }
                : undefined
            }
          >
            {theme}
            {playback && theme === underlined && (
              <span className={progressStyles.navProgress} aria-hidden="true">
                <span style={{ transform: `scaleX(${playback.progress})` }} />
              </span>
            )}
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
                aria-current={theme === underlined ? 'location' : undefined}
                className={cn(
                  'pointer-events-auto cursor-pointer hover:text-[#002766] stacked:-my-[8px] stacked:py-[8px]',
                  !publicAppearance && 'italic'
                )}
              >
                {word}
              </button>
            ) : (
              word
            )}
          </Fragment>
        );
      })}
      {playback && (
        <button
          type="button"
          className={progressStyles.navPause}
          onClick={playback.toggle}
          aria-label={playback.playing ? 'Pause chapter playback' : 'Play chapter playback'}
          title={playback.playing ? 'Pause' : 'Play'}
          aria-pressed={playback.playing}
        >
          <span aria-hidden="true">{playback.playing ? 'Ⅱ' : '▷'}</span>
        </button>
      )}
      {publicAppearance && !playback && (
        <span className={progressStyles.navPauseSpace} aria-hidden="true" />
      )}
    </p>
  );
}

/** Measure dot centres so the playback line stays accurate with unequal chapter-label widths. */
function TimelineProgress({
  rail,
  chapter,
  progress,
}: {
  rail: RefObject<HTMLDivElement | null>;
  chapter?: string;
  progress: number;
}) {
  const [segment, setSegment] = useState({ chapter, left: 0, width: 0 });
  useLayoutEffect(() => {
    const row = rail.current;
    if (!row) return;
    const measure = () => {
      const buttons = Array.from(row.querySelectorAll<HTMLButtonElement>('button'));
      const index = buttons.findIndex(
        (button) => button.getAttribute('aria-current') === 'location'
      );
      const start = buttons[index]?.getBoundingClientRect();
      const end = buttons[index + 1]?.getBoundingClientRect();
      if (!start || !end || index < 0) {
        setSegment({ chapter, left: 0, width: 0 });
        return;
      }
      const centre = start.left + start.width / 2;
      setSegment({
        chapter,
        left: centre - row.getBoundingClientRect().left,
        width: end.left + end.width / 2 - centre,
      });
    };
    const resized = new ResizeObserver(measure);
    resized.observe(row);
    for (const button of row.querySelectorAll('button')) resized.observe(button);
    measure();
    return () => resized.disconnect();
  }, [chapter, rail]);

  if (segment.chapter !== chapter || !segment.width) return null;
  return (
    <span
      key={chapter}
      className={progressStyles.timelinePlayback}
      style={{ left: segment.left, width: segment.width }}
      aria-hidden="true"
    >
      <span style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress))})` }} />
    </span>
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
  playback,
}: {
  entered: boolean;
  chapter: number;
  underlines: Record<number, string>;
  links: Record<string, string>;
  goTo: (id: string) => void;
  playback?: ChapterPlayback;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const underlined = entered ? underlines[chapter] : undefined;
  // Where the line runs off the page, the word on in its middle.
  useEffect(() => {
    const line = rail.current;
    const word = underlined ? line?.querySelector<HTMLElement>(`[data-fly="${underlined}"]`) : null;
    if (!line || !word) return;
    const centerActive = () => {
      const seen = word.getBoundingClientRect();
      const box = line.getBoundingClientRect();
      line.scrollTo({
        left: line.scrollLeft + seen.left + seen.width / 2 - box.left - box.width / 2,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    };
    const resized = new ResizeObserver(centerActive);
    resized.observe(line);
    resized.observe(word);
    centerActive();
    return () => resized.disconnect();
  }, [underlined]);
  return (
    <div
      ref={rail}
      aria-hidden={!entered}
      inert={!entered || undefined}
      className={THEME_NAV_RAIL}
      style={{ opacity: entered ? 1 : 0 }}
    >
      <ThemeLine
        underlined={underlined}
        links={links}
        goTo={goTo}
        playback={playback}
        publicAppearance={!!playback}
      />
    </div>
  );
}
