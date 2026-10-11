'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsBoolean, parseAsInteger, parseAsStringLiteral, useQueryState } from 'nuqs';
import { type CSSProperties, useTransition } from 'react';

import {
  type FeatureFlags,
  learnAppearanceFlag,
  setFlag,
  useFlag,
  useFlags,
} from '@/features/feature-flags';
import { LEARN_COURSES, type LearnCourse, learnCoursePath } from '@/features/learn/catalogue';
import { GLOSSARY, glossaryTerm } from '@/features/learn/glossary';
import { type CourseProgress, resetCourse, useLearnProgress } from '@/features/learn/progress';
import { TEACH_TOPICS, teachTopic } from '@/features/learn/teach';
import {
  CategoryTiles,
  DesignSwitcher,
  LEARN_SECTIONS,
  listBox,
  OptionMenu,
  OptionMenus,
  SELECTED_SLUGS,
  SELECTED_STYLES,
  SettingToggle,
  TILE_DESIGNS,
} from '@/features/learn/ui/category-tiles';
import { CoursePreview } from '@/features/learn/ui/course-preview';
import { GlossaryCard, GlossaryIndex } from '@/features/learn/ui/glossary';
import { MiniCode } from '@/features/learn/ui/mini-code';
import { type Focus, MiniFigure } from '@/features/learn/ui/mini-figure';
import { ShareButton, ShareChip } from '@/features/learn/ui/share';
import { TeachCard, TeachIndex } from '@/features/learn/ui/teach';
import { TutorialCard, TutorialsIndex } from '@/features/learn/ui/tutorials';
import { cn } from '@/utils/css-class';

import type { TTutorial } from '@/ui/segments/project/get-started/query';

/**
 * Everything on the page sits in the grey box Data, Notebooks and the workflow pages put their
 * content in: the same fill, border, corners and margins (see explore-inner-layout.tsx). The
 * height leaves room for the bottom margin, so the workspace body does not scroll by 8px.
 */
const BOX =
  'bg-background border-neutral-2 mx-2 mb-2 ml-3 flex h-[calc(100%-0.5rem)] min-h-0 w-[calc(100%-10px)] gap-2 overflow-hidden rounded-2xl border p-2 max-lg:h-auto max-lg:flex-col max-lg:overflow-visible';

/**
 * The right-hand side, inside the grey box: a white box with rounded corners and a thin grey
 * border. The left column is padded by 8px, so the same 8px above and below lines its top up with
 * the category tiles and its bottom with the courses' box, and 8px on the right leaves it as far
 * from the grey box's edge (16px) as the tiles are on the left.
 */
const PANEL_FRAME = 'relative flex min-h-0 min-w-0 flex-1 flex-col lg:my-[8px] lg:mr-[8px]';
const PANEL =
  'learn-card secondary-scrollbar min-h-0 w-full flex-1 overflow-y-auto rounded-[12px] border border-[#d9d9d9] bg-white';

/**
 * The courses whose small picture on the left is their own figure, live, and which part of it:
 * brain modeling's mouse brain, the middle of the three (see trioSlot in Wet3D: at the 600px it is
 * laid out at, the row is 209px tall and the brains' middle 69px down); the electrical physics
 * course's membrane, a stretch of it from the middle. The rest keep their picture.
 */
const MINI_FOCUS: Record<string, Focus> = {
  // 120px of the 600 across, centred 67px down: down to 127px, short of the labels under it at ~130
  'brain-modeling': { x: 0.5, y: 0.32, span: 0.2 },
  'electrical-physics': { x: 0.5, y: 0.5, span: 0.32 },
};
/** The rest: the middle half of their figure. */
const MINI_FOCUS_DEFAULT: Focus = { x: 0.5, y: 0.5, span: 0.5 };

/** How far through a course the learner has got, 0 to 1. */
function share(course: LearnCourse, progress?: CourseProgress) {
  if (!progress) return 0;
  return progress.done ? 1 : Math.min(1, (progress.furthest + 1) / course.slides.length);
}

/**
 * Learn: the free courses, listed on the left with how far through each the learner is, and the
 * chosen one on the right, with a way in, one of its figures to try, and what it covers. Only Free
 * courses has anything in it so far.
 */
export function LearnPage({
  courseIds,
  learnPath,
  tutorials,
}: {
  courseIds: string[];
  learnPath: string;
  tutorials: TTutorial[];
}) {
  // the rough ones last, so they sit together under their heading
  const courses = LEARN_COURSES.filter((course) => courseIds.includes(course.id)).sort(
    (a, b) => Number(!!a.rough) - Number(!!b.rough)
  );
  const progress = useLearnProgress();
  const [chosen, setChosen] = useQueryState('course');
  const selected = courses.find((course) => course.id === chosen) ?? courses[0];
  // TEMPORARY, for judging the tile designs: in the URL, so a reload keeps the one being looked at
  const [tiles, setTiles] = useQueryState('tiles', parseAsInteger.withDefault(0));
  const design = Math.min(Math.max(tiles, 0), TILE_DESIGNS.length - 1);
  const lb = listBox();
  // TEMPORARY, for judging: the outer grey box, or none (its fill and border; the spacing stays)
  const appearance = useFlag(learnAppearanceFlag.key);
  // which courses show: their feature flags, switched from the appearance options too
  const router = useRouter();
  const flags = useFlags();
  const [, startFlagChange] = useTransition();
  const showCourse = (flag: LearnCourse['flag'], on: boolean) =>
    startFlagChange(async () => {
      await setFlag(flag as keyof FeatureFlags, on as never);
      router.refresh();
    });
  const [outerBox, setOuterBox] = useQueryState('box', parseAsBoolean.withDefault(true));
  // and the box round the list of courses, terms or tutorials, or none: the cards on the page itself
  const [listBoxOn, setListBoxOn] = useQueryState('list', parseAsBoolean.withDefault(true));
  // and the courses' cards on the left, small or big: a bigger picture, and what the course covers
  // and whether Tutorials is there yet, or greyed out like the sections still to come
  const [tutorialsOn, setTutorialsOn] = useQueryState(
    'tutorials',
    parseAsBoolean.withDefault(true)
  );
  // and the Teach section, or greyed out like the sections still to come
  const [teachOn, setTeachOn] = useQueryState('teach', parseAsBoolean.withDefault(true));
  const [bigCards, setBigCards] = useQueryState('big', parseAsBoolean.withDefault(true));
  // and how the selected card on the left is drawn
  const [selParam, setSel] = useQueryState('selected', parseAsInteger.withDefault(1));
  const sel = Math.min(Math.max(selParam, 0), SELECTED_STYLES.length - 1);
  const panel = PANEL;
  // with every course's flag off, Courses is greyed out and the page opens on the glossary
  const noCourses = courses.length === 0;
  const [sectionParam, setSection] = useQueryState(
    'section',
    parseAsStringLiteral(LEARN_SECTIONS).withDefault(noCourses ? 'glossary' : 'free')
  );
  // a greyed-out section cannot be the one showing: the glossary instead
  const section =
    (noCourses && sectionParam === 'free') ||
    (!tutorialsOn && sectionParam === 'tutorials') ||
    (!teachOn && sectionParam === 'teach')
      ? 'glossary'
      : sectionParam;
  const [termId, setTermId] = useQueryState('term');
  const term = glossaryTerm(termId) ?? GLOSSARY[0];
  const [teachId, setTeachId] = useQueryState('topic');
  const teach = teachTopic(teachId) ?? TEACH_TOPICS[0];
  const [tutorialSlug, setTutorialSlug] = useQueryState('tutorial');
  const tutorial = tutorials.find((t) => t.slug === tutorialSlug) ?? tutorials[0];
  const project = learnPath.replace(/\/learn$/, '');

  return (
    <div
      className={cn(BOX, !outerBox && 'learn-no-box', !listBoxOn && 'learn-no-list')}
      data-selected={SELECTED_SLUGS[sel]}
    >
      {/* 498px of content, as before: the tiles and the list are drawn to that width */}
      <aside className="flex min-h-0 w-full shrink-0 flex-col gap-[18px] p-[8px] lg:w-[514px]">
        <CategoryTiles
          design={design}
          section={section}
          onSelect={setSection}
          off={[
            ...(noCourses ? (['free'] as const) : []),
            ...(tutorialsOn ? [] : (['tutorials'] as const)),
            ...(teachOn ? [] : (['teach'] as const)),
          ]}
        />

        {section === 'teach' ? (
          <TeachIndex selected={teach} onSelect={setTeachId} />
        ) : section === 'tutorials' ? (
          <TutorialsIndex tutorials={tutorials} selected={tutorial} onSelect={setTutorialSlug} />
        ) : section === 'glossary' ? (
          <GlossaryIndex selected={term} onSelect={setTermId} />
        ) : (
          // the courses in a faintly navy box, as Data's entity types are (entity-link-count.tsx
          // on table_mini_atlas); the list scrolls inside it
          <div className={lb.box}>
            <ul className="secondary-scrollbar -mr-[6px] flex min-h-0 flex-col gap-[9px] overflow-y-auto pr-[6px]">
              {courses.map((course, i) => {
                const isSelected = course.id === selected?.id;
                const done = progress[course.id]?.done;
                // the rough courses after the rest, under a heading of their own
                const firstRough = course.rough && !courses[i - 1]?.rough;
                return (
                  <li key={course.id}>
                    {firstRough && (
                      <h3 className="px-[4px] pt-[10px] pb-[8px] text-[11px] leading-[15px] font-bold tracking-[0.8px] text-[#8c8c8c] uppercase">
                        Rough / Misc
                      </h3>
                    )}
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      data-learn="row"
                      onClick={() => setChosen(course.id)}
                      className={cn(
                        'group relative flex w-full items-center rounded-[12px] text-left transition-shadow',
                        bigCards ? 'gap-[16px] p-[14px]' : 'gap-[12px] p-[10px]',
                        isSelected
                          ? 'bg-[#bae7ff] shadow-[inset_0_0_0_1.5px_#003a8c]'
                          : 'bg-white shadow-[inset_0_0_0_1px_#f0f0f0] hover:shadow-[inset_0_0_0_1px_#d9d9d9]'
                      )}
                    >
                      {course.id === 'python' ? (
                        // a tiny editor typing out its first line of Python, and running it
                        <MiniCode
                          size={bigCards ? 120 : 58}
                          className={bigCards ? 'rounded-[12px]' : 'rounded-[8px]'}
                        />
                      ) : (
                        // its picture, live: a piece of the figure the card on the right plays
                        <MiniFigure
                          widget={course.preview}
                          focus={MINI_FOCUS[course.id] ?? MINI_FOCUS_DEFAULT}
                          // the brain turns when dragged, as the big one does; a click still picks the course
                          interactive={course.id === 'brain-modeling'}
                          size={bigCards ? 120 : 58}
                          className={cn(
                            'shadow-[inset_0_0_0_1px_#f0f0f0]',
                            bigCards ? 'rounded-[12px]' : 'rounded-[8px]'
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          'flex min-w-0 flex-1 flex-col',
                          bigCards ? 'gap-[8px]' : 'gap-[5px]'
                        )}
                      >
                        <span
                          className={cn(
                            'font-semibold text-[#002766]',
                            bigCards
                              ? 'line-clamp-2 text-[17px] leading-[23px]'
                              : 'truncate text-[14px] leading-[19px]'
                          )}
                        >
                          {course.title}
                        </span>
                        {bigCards && (
                          <span className="line-clamp-2 text-[12.5px] leading-[18px] text-[#595959]">
                            {course.description}
                          </span>
                        )}
                        <span className="flex items-center gap-[8px]">
                          <span className="rounded-[4px] bg-[#fafafa] px-[7px] py-[2px] text-[10px] leading-[14px] font-semibold tracking-[0.3px] text-[#595959] shadow-[inset_0_0_0_1px_#f0f0f0]">
                            {course.level}
                          </span>
                          <span className="text-[11px] leading-[15px] text-[#8c8c8c]">
                            {course.slides.length} slides
                          </span>
                        </span>
                        <span className="block h-[4px] w-full rounded-[2px] bg-[#f0f0f0]">
                          <span
                            className={cn(
                              'block h-full rounded-[2px]',
                              done ? 'bg-[#389e0d]' : 'bg-[#1890ff]'
                            )}
                            style={{
                              width: `max(2px, ${share(course, progress[course.id]) * 100}%)`,
                            }}
                          />
                        </span>
                      </span>
                      {/* into the course, top right, just right of sharing: green, as the card's
                          Start button; shown on the selected card, and on the one pointed at */}
                      <PlayChip
                        title={course.title}
                        href={courseHref(course, progress[course.id], learnPath)}
                        className={cn(
                          'absolute top-[8px] right-[8px] transition-opacity',
                          isSelected
                            ? 'opacity-100'
                            : 'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100'
                        )}
                      />
                      {/* sharing the course, top right; out of the way until the card is pointed at, but for touch */}
                      <ShareChip
                        what={{
                          title: course.title,
                          text: course.description,
                          path: `/app/learn/${course.id}`,
                        }}
                        className="absolute top-[8px] right-[42px] opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </aside>

      <div className={PANEL_FRAME}>
        {section === 'teach' ? (
          <TeachCard key={teach.id} topic={teach} onSelect={setTeachId} className={panel} />
        ) : section === 'tutorials' ? (
          <TutorialCard
            tutorial={tutorial}
            tutorials={tutorials}
            onSelect={setTutorialSlug}
            project={project}
            className={panel}
          />
        ) : section === 'glossary' ? (
          <GlossaryCard
            key={term.id}
            term={term}
            onSelect={setTermId}
            project={project}
            className={panel}
          />
        ) : selected ? (
          <CourseDetail
            className={panel}
            key={selected.id}
            course={selected}
            progress={progress[selected.id]}
            learnPath={learnPath}
          />
        ) : (
          <section
            className={cn(
              PANEL,
              'flex items-center justify-center p-10 text-[15px] text-[#8c8c8c]'
            )}
          >
            No courses to show yet.
          </section>
        )}
        {/* TEMPORARY, for judging: the page's appearance options, behind a small gear in the card's
            corner, itself behind a flag */}
        {appearance && (
          <OptionMenus>
            <OptionMenu title="Courses">
              {LEARN_COURSES.map((c) => (
                <SettingToggle
                  key={c.id}
                  label={c.title}
                  on={Boolean(flags[c.flag as keyof FeatureFlags])}
                  onChange={(on) => showCourse(c.flag, on)}
                />
              ))}
            </OptionMenu>
            <OptionMenu title="Appearance">
              <SettingToggle label="Teach section" on={teachOn} onChange={setTeachOn} />
              <SettingToggle label="Tutorials button" on={tutorialsOn} onChange={setTutorialsOn} />
              <SettingToggle label="Outer box" on={outerBox} onChange={setOuterBox} />
              <SettingToggle label="List box" on={listBoxOn} onChange={setListBoxOn} />
              <SettingToggle label="Big courses" on={bigCards} onChange={setBigCards} />
              <DesignSwitcher
                what="Selected"
                options={SELECTED_STYLES}
                value={sel}
                onChange={setSel}
              />
              <DesignSwitcher
                what="Tiles"
                options={TILE_DESIGNS}
                value={design}
                onChange={setTiles}
              />
            </OptionMenu>
          </OptionMenus>
        )}
      </div>
    </div>
  );
}

/** Where a course's play button and Start button go: on where the learner left off, if they did. */
function courseHref(course: LearnCourse, progress: CourseProgress | undefined, learnPath: string) {
  const resume = progress && !progress.done ? progress.slide + 1 : undefined;
  return learnCoursePath(course.id, `${learnPath}?course=${course.id}`, resume);
}

/** A green round play button, inside the card's own button: so a span, not a link or a button. */
function PlayChip({ title, href, className }: { title: string; href: string; className?: string }) {
  const router = useRouter();
  const go = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    router.push(href);
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: a link cannot sit inside the card's own button
    <span
      role="link"
      tabIndex={0}
      aria-label={`Open ${title}`}
      title="Open the course"
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') go(e);
        else e.stopPropagation();
      }}
      className={cn(
        'flex size-[28px] items-center justify-center rounded-full bg-[#389e0d] text-white shadow-[0_2px_6px_rgba(56,158,13,0.35)] transition-colors hover:bg-[#237804]',
        className
      )}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="ml-[2px] size-[12px]">
        <path
          fill="currentColor"
          d="M4 2.5v11a.6.6 0 0 0 .9.5l9-5.5a.6.6 0 0 0 0-1l-9-5.5a.6.6 0 0 0-.9.5Z"
        />
      </svg>
    </span>
  );
}

function CourseDetail({
  course,
  progress,
  learnPath,
  className,
}: {
  course: LearnCourse;
  progress?: CourseProgress;
  learnPath: string;
  className?: string;
}) {
  const total = course.slides.length;
  const done = Boolean(progress?.done);
  const seen = progress ? Math.min(total, progress.furthest + 1) : 0;
  // back to this page with this course chosen, once the course is left
  const from = `${learnPath}?course=${course.id}`;
  const resume = progress && !done ? progress.slide + 1 : undefined;
  const href = learnCoursePath(course.id, from, resume);
  const action = !progress ? 'Start course' : done ? 'Start again' : 'Continue course';
  const startAgain = done ? () => resetCourse(course.id) : undefined;
  const meta = [
    'Free course',
    `${total} slides`,
    course.level,
    progress && (done ? 'completed' : `${seen} of ${total} seen`),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section
      className={cn(className, 'flex flex-col pt-0 pr-[44px] pb-[40px] pl-[40px]')}
      // the figure as tall as the card leaves it, with the header and the words: no less than its
      // height in a course, no more than fits beside its words without scrolling on a tall screen
      style={{ '--learn-figure-h': 'clamp(340px, calc(100dvh - 420px), 640px)' } as CSSProperties}
    >
      <div className="flex flex-1 flex-col gap-[28px]">
        {/* As tall as the category tiles (86px, less this box's 1px border), with its content
            centred, since the card's top is level with theirs: the title sits across from the
            middle of the tiles. Taller only if the title wraps. */}
        <header
          data-learn="head"
          className="flex min-h-[84px] items-center justify-between gap-[20px]"
        >
          <div className="flex flex-col gap-[7px]">
            <h1 className="text-[31px] leading-[38px] font-bold text-[#002766]">{course.title}</h1>
            <p className="text-[12.5px] leading-[17px] text-[#8c8c8c]">{meta}</p>
          </div>
          <div className="flex shrink-0 items-center gap-[8px]">
            <Link
              href={href}
              onClick={startAgain}
              data-learn="cta"
              className="flex h-[42px] shrink-0 items-center rounded-[22px] bg-[#389e0d] px-[26px] text-[14px] leading-[19px] font-semibold whitespace-nowrap text-white transition-colors hover:bg-[#237804]"
            >
              {action}
            </Link>
            <ShareButton
              what={{
                title: course.title,
                text: course.description,
                path: `/app/learn/${course.id}`,
              }}
            />
          </div>
        </header>

        <CoursePreview widget={course.preview} />

        <p className="max-w-[880px] text-[16px] leading-[27px] text-[#595959]">
          {course.description}
        </p>
      </div>
    </section>
  );
}
