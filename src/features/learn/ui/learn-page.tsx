'use client';

import Link from 'next/link';
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from 'nuqs';
import { type CSSProperties, useState } from 'react';

import { LEARN_COURSES, type LearnCourse, learnCoursePath } from '@/features/learn/catalogue';
import { GLOSSARY, glossaryTerm } from '@/features/learn/glossary';
import { DEFAULT_LEARN_SETTINGS } from '@/features/learn/learn-settings';
import { useLearnSettings, useSetLearnSetting } from '@/features/learn/learn-settings-provider';
import { LECTURE_TOPICS, type LectureTopic } from '@/features/learn/lecture-topics';
import {
  LITERATURE_SORTS,
  LITERATURE_TOPICS,
  type LiteratureSort,
  type LiteratureTopic,
  useLiterature,
} from '@/features/learn/literature';
import { type CourseProgress, resetCourse, useLearnProgress } from '@/features/learn/progress';
import { TEACH_TOPICS, teachTopic } from '@/features/learn/teach';
import { useTransmitter } from '@/features/learn/transmitter';
import { CALLOUT_STYLES } from '@/features/learn/ui/callout';
import {
  CATEGORIES,
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
import { FeedCard, FeedIndex, type FeedSource } from '@/features/learn/ui/feeds';
import { GlossaryCard, GlossaryIndex } from '@/features/learn/ui/glossary';
import { MiniCode } from '@/features/learn/ui/mini-code';
import { type Focus, MiniFigure } from '@/features/learn/ui/mini-figure';
import { PlayChip } from '@/features/learn/ui/play-chip';
import { ShareButton, ShareChip } from '@/features/learn/ui/share';
import { TeachCard, TeachIndex } from '@/features/learn/ui/teach';
import { TutorialCard, TutorialsIndex } from '@/features/learn/ui/tutorials';
import { cn } from '@/utils/css-class';

import type { FeedItem } from '@/features/learn/feed-item';
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

/** The Dev settings held in the URL: what each is with nothing there — so what the menu marks as its default. */
const DEV_DEFAULTS = {
  tiles: 0,
  outerBox: true,
  listBox: true,
  bigCards: true,
  selected: 5,
  callout: 0,
};

/**
 * Learn: the free courses, listed on the left with how far through each the learner is, and the
 * chosen one on the right, with a way in, one of its figures to try, and what it covers. Only Free
 * courses has anything in it so far.
 */
export function LearnPage({
  courseIds,
  learnPath,
  tutorials,
  lectures = { recorded: [], upcoming: [] },
  conferences = [],
  articles = [],
}: {
  courseIds: string[];
  learnPath: string;
  tutorials: TTutorial[];
  /** World Wide Neuro's computational neuroscience talks: recorded, and still to come. */
  lectures?: { recorded: FeedItem[]; upcoming: FeedItem[] };
  /** The conferences coming up, World Wide Neuro's and the field's main meetings. */
  conferences?: FeedItem[];
  /** The Transmitter's latest articles. */
  articles?: FeedItem[];
}) {
  // Learn's settings, behind the Dev settings: which courses show, and Help's — changed at once
  const settings = useLearnSettings();
  const setSetting = useSetLearnSetting();
  // the rough ones last, so they sit together under their heading
  const courses = LEARN_COURSES.filter(
    (course) => courseIds.includes(course.id) && !settings.hiddenCourses.includes(course.id)
  ).sort((a, b) => Number(!!a.rough) - Number(!!b.rough));
  const progress = useLearnProgress();
  const [chosen, setChosen] = useQueryState('course');
  const selected = courses.find((course) => course.id === chosen) ?? courses[0];
  // TEMPORARY, for judging the tile designs: in the URL, so a reload keeps the one being looked at
  const [tiles, setTiles] = useQueryState('tiles', parseAsInteger.withDefault(DEV_DEFAULTS.tiles));
  const design = Math.min(Math.max(tiles, 0), TILE_DESIGNS.length - 1);
  const lb = listBox();
  const showCourse = (id: string, on: boolean) =>
    setSetting(
      'hiddenCourses',
      on
        ? settings.hiddenCourses.filter((hidden) => hidden !== id)
        : [...settings.hiddenCourses, id]
    );
  // TEMPORARY, for judging: the outer grey box, or none (its fill and border; the spacing stays)
  const [outerBox, setOuterBox] = useQueryState(
    'box',
    parseAsBoolean.withDefault(DEV_DEFAULTS.outerBox)
  );
  // and the box round the list of courses, terms or tutorials, or none: the cards on the page itself
  const [listBoxOn, setListBoxOn] = useQueryState(
    'list',
    parseAsBoolean.withDefault(DEV_DEFAULTS.listBox)
  );
  // and the courses' cards on the left, small or big: a bigger picture, and what the course covers
  // and which sections' tiles are there at all (the Sections options): those left out, by key
  const [hidden, setHidden] = useQueryState('hide', parseAsArrayOf(parseAsString).withDefault([]));
  const showSection = (key: string, on: boolean) =>
    setHidden(on ? hidden.filter((k) => k !== key) : [...hidden, key]);
  const [bigCards, setBigCards] = useQueryState(
    'big',
    parseAsBoolean.withDefault(DEV_DEFAULTS.bigCards)
  );
  // and how the selected card on the left is drawn
  const [selParam, setSel] = useQueryState(
    'selected',
    parseAsInteger.withDefault(DEV_DEFAULTS.selected)
  );
  const sel = Math.min(Math.max(selParam, 0), SELECTED_STYLES.length - 1);
  // and how a glossary term's or a teaching topic's one line is set
  const [calloutParam, setCallout] = useQueryState(
    'callout',
    parseAsInteger.withDefault(DEV_DEFAULTS.callout)
  );
  const callout = Math.min(Math.max(calloutParam, 0), CALLOUT_STYLES.length - 1);
  const panel = PANEL;
  // the rough courses' heading: folded by default, showing how many; open if the page opens on one of them
  // the courses in two groups, each under a heading that folds it: In development, open, and
  // Rough / Misc, folded unless the page opens on one of its courses
  const groupOf = (c: LearnCourse) => (c.rough ? 'rough' : 'dev');
  const [openGroups, setOpenGroups] = useState(() => ({
    dev: true,
    rough: Boolean(selected?.rough && chosen),
  }));
  const groupCount = (g: 'dev' | 'rough') => courses.filter((c) => groupOf(c) === g).length;
  // with every course's flag off, Courses is greyed out and the page opens on the glossary
  const noCourses = courses.length === 0;
  const [sectionParam, setSection] = useQueryState(
    'section',
    parseAsStringLiteral(LEARN_SECTIONS).withDefault(noCourses ? 'glossary' : 'free')
  );
  // a greyed-out section cannot be the one showing: the glossary instead
  const section =
    (noCourses && sectionParam === 'free') || hidden.includes(sectionParam)
      ? (LEARN_SECTIONS.find((k) => !hidden.includes(k)) ?? 'glossary')
      : sectionParam;
  const [termId, setTermId] = useQueryState('term');
  const term = glossaryTerm(termId) ?? GLOSSARY[0];
  // the outside sections: each its chosen entry, and the literature's filters
  const [lectureId, setLectureId] = useQueryState('lecture');
  const [talks, setTalks] = useQueryState(
    'talks',
    parseAsStringLiteral(['recorded', 'upcoming'] as const).withDefault('recorded')
  );
  // and narrowed by words typed, and a topic
  const [talkWords, setTalkWords] = useState('');
  const [talkTopic, setTalkTopic] = useQueryState(
    'talk-topic',
    parseAsStringLiteral(LECTURE_TOPICS.map((t) => t.id))
  );
  const talkList = lectures[talks].filter((t) => {
    const text = `${t.title} ${t.byline ?? ''} ${t.body ?? ''} ${t.tags?.join(' ') ?? ''}`;
    const topic = LECTURE_TOPICS.find((x) => x.id === talkTopic);
    return (
      (!topic || topic.match.test(`${t.title} ${t.body ?? ''}`)) &&
      talkWords
        .toLowerCase()
        .split(/\s+/)
        .every((w) => text.toLowerCase().includes(w))
    );
  });
  const [conferenceId, setConferenceId] = useQueryState('conference');
  const [articleId, setArticleId] = useQueryState('article');
  const [articleWords, setArticleWords] = useState('');
  const [paperId, setPaperId] = useQueryState('paper');
  const [litTopic, setLitTopic] = useQueryState(
    'lit',
    parseAsStringLiteral(LITERATURE_TOPICS.map((t) => t.id)).withDefault('all')
  );
  const [litSort, setLitSort] = useQueryState(
    'sort',
    parseAsStringLiteral(LITERATURE_SORTS.map((t) => t.id)).withDefault('cited')
  );
  const [litWords, setLitWords] = useState('');
  const transmitter = useTransmitter(articles, section === 'articles' ? articleWords : '');
  const literature = useLiterature(
    litTopic as LiteratureTopic,
    section === 'literature' ? litWords : '',
    litSort as LiteratureSort
  );
  const pick = (items: FeedItem[], id: string | null) => items.find((x) => x.id === id) ?? items[0];
  const feed = {
    lectures: { items: talkList, selected: pick(talkList, lectureId), onSelect: setLectureId },
    conferences: {
      items: conferences,
      selected: pick(conferences, conferenceId),
      onSelect: setConferenceId,
    },
    articles: {
      items: transmitter.items,
      selected: pick(transmitter.items, articleId),
      onSelect: setArticleId,
    },
    literature: {
      items: literature.items,
      selected: pick(literature.items, paperId),
      onSelect: setPaperId,
    },
  } as const;
  const feedSection = section in feed ? (section as keyof typeof feed) : null;
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
      {/* up to 514px, but narrower as the page is, as when the AI assistant's panel is open beside
          it, rather than pushing the card on the right out under that panel */}
      <aside className="flex min-h-0 w-full min-w-0 shrink-0 flex-col gap-[18px] p-[8px] lg:w-[min(514px,42%)]">
        <CategoryTiles
          design={design}
          hidden={hidden}
          section={section}
          onSelect={setSection}
          off={[...(noCourses ? (['free'] as const) : [])]}
        />

        {feedSection ? (
          <FeedIndex
            key={feedSection}
            items={feed[feedSection].items}
            selected={feed[feedSection].selected}
            onSelect={feed[feedSection].onSelect}
            empty={FEED_EMPTY[feedSection](literature.state)}
            filters={
              feedSection === 'articles' ? (
                <div className="flex flex-col gap-[6px]">
                  <input
                    type="search"
                    value={articleWords}
                    onChange={(e) => {
                      setArticleWords(e.target.value);
                      setArticleId(null);
                    }}
                    placeholder="Search all of The Transmitter"
                    aria-label="Search The Transmitter's articles"
                    className="h-[40px] rounded-full border border-[#e8e8e8] bg-white px-[16px] text-[13px] text-[#002766] outline-none placeholder:text-[#bfbfbf] focus:border-[#003a8c]"
                  />
                  <span className="px-[4px] text-[11px] text-[#8c8c8c]">
                    {transmitter.state === 'loading'
                      ? 'Searching…'
                      : transmitter.state === 'failed'
                        ? 'The search could not reach The Transmitter.'
                        : articleWords.trim()
                          ? `${transmitter.items.length} articles found`
                          : `The latest ${transmitter.items.length} articles`}
                  </span>
                </div>
              ) : feedSection === 'lectures' ? (
                <div className="flex flex-col gap-[10px]">
                  <input
                    type="search"
                    value={talkWords}
                    onChange={(e) => setTalkWords(e.target.value)}
                    placeholder="Search talks, speakers, institutions"
                    aria-label="Search the lectures"
                    className="h-[40px] rounded-full border border-[#e8e8e8] bg-white px-[16px] text-[13px] text-[#002766] outline-none placeholder:text-[#bfbfbf] focus:border-[#003a8c]"
                  />
                  <div className="flex flex-wrap gap-[6px]">
                    {LECTURE_TOPICS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={talkTopic === t.id}
                        className={lb.chip(talkTopic === t.id)}
                        onClick={() => {
                          setTalkTopic(talkTopic === t.id ? null : (t.id as LectureTopic));
                          setLectureId(null);
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-[6px] text-[11px] text-[#8c8c8c]">
                    {(['recorded', 'upcoming'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={talks === k}
                        className={lb.chip(talks === k)}
                        onClick={() => {
                          setTalks(k);
                          setLectureId(null);
                        }}
                      >
                        {k === 'recorded' ? 'Recordings' : 'Upcoming'} · {lectures[k].length}
                      </button>
                    ))}
                    <span className="ml-auto">
                      {talks === 'recorded' ? 'newest first' : 'soonest first'}
                    </span>
                  </div>
                </div>
              ) : feedSection === 'literature' ? (
                <LiteratureFilters
                  topic={litTopic as LiteratureTopic}
                  onTopic={setLitTopic}
                  sort={litSort as LiteratureSort}
                  onSort={setLitSort}
                  words={litWords}
                  onWords={setLitWords}
                  chip={lb.chip}
                />
              ) : undefined
            }
          />
        ) : section === 'teach' ? (
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
                // each group under its heading, its courses shown while it is open
                const group = groupOf(course);
                const first = i === 0 || groupOf(courses[i - 1]) !== group;
                const open = openGroups[group];
                const hidden = !open;
                if (hidden && !first) return null;
                return (
                  <li key={course.id}>
                    {first && (
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenGroups({ ...openGroups, [group]: !open })}
                        className={cn(
                          'flex w-full items-center gap-[8px] px-[4px] pb-[8px] text-left',
                          i > 0 && 'pt-[10px]',
                          'text-[11px] leading-[15px] font-bold tracking-[0.8px] text-[#8c8c8c] uppercase hover:text-[#002766]'
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn('transition-transform', open && 'rotate-90')}
                        >
                          ›
                        </span>
                        {group === 'dev' ? 'In development' : 'Rough / Misc'}
                        <span className="rounded-full bg-white px-[7px] py-px text-[10px] tracking-normal text-[#595959] shadow-[inset_0_0_0_1px_#f0f0f0]">
                          {groupCount(group)}
                        </span>
                      </button>
                    )}
                    {!hidden && (
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
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </aside>

      <div className={PANEL_FRAME}>
        {feedSection ? (
          <FeedCard
            key={`${feedSection}-${feed[feedSection].selected?.id}`}
            item={feed[feedSection].selected}
            source={
              feedSection === 'literature' && literature.source === 'openalex'
                ? OPENALEX
                : FEED_SOURCES[feedSection]
            }
            empty={FEED_EMPTY[feedSection](literature.state)}
            className={panel}
          />
        ) : section === 'teach' ? (
          <TeachCard
            key={teach.id}
            topic={teach}
            onSelect={setTeachId}
            className={panel}
            callout={callout}
          />
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
            callout={callout}
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
        {/* Dev settings, behind a small gear in the card's corner: which courses show, Help made lean or
            hidden, and — TEMPORARY, for judging — the page's sections and appearance; each option marked
            with its default. (The AI button and the courses' top bar are feature flags.) */}
        <OptionMenus>
          <OptionMenu title="Courses">
            {LEARN_COURSES.map((c) => (
              <SettingToggle
                key={c.id}
                label={c.title}
                on={!settings.hiddenCourses.includes(c.id)}
                defaultOn
                onChange={(on) => showCourse(c.id, on)}
              />
            ))}
          </OptionMenu>
          <OptionMenu title="Help">
            <SettingToggle
              label="Remove unneeded features"
              on={settings.leanHelp}
              defaultOn={DEFAULT_LEARN_SETTINGS.leanHelp}
              onChange={(on) => setSetting('leanHelp', on)}
            />
            <SettingToggle
              label="Hide Help altogether"
              on={settings.hideHelp}
              defaultOn={DEFAULT_LEARN_SETTINGS.hideHelp}
              onChange={(on) => setSetting('hideHelp', on)}
            />
          </OptionMenu>
          <OptionMenu title="Sections">
            {CATEGORIES.map((c) => (
              <SettingToggle
                key={c.key}
                label={c.label}
                on={!hidden.includes(c.key)}
                defaultOn
                onChange={(on) => showSection(c.key, on)}
              />
            ))}
          </OptionMenu>
          <OptionMenu title="Appearance">
            <SettingToggle
              label="Outer box"
              on={outerBox}
              defaultOn={DEV_DEFAULTS.outerBox}
              onChange={setOuterBox}
            />
            <SettingToggle
              label="List box"
              on={listBoxOn}
              defaultOn={DEV_DEFAULTS.listBox}
              onChange={setListBoxOn}
            />
            <SettingToggle
              label="Big courses"
              on={bigCards}
              defaultOn={DEV_DEFAULTS.bigCards}
              onChange={setBigCards}
            />
            <DesignSwitcher
              what="Selected"
              options={SELECTED_STYLES}
              value={sel}
              defaultValue={DEV_DEFAULTS.selected}
              onChange={setSel}
            />
            <DesignSwitcher
              what="Tiles"
              options={TILE_DESIGNS}
              value={design}
              defaultValue={DEV_DEFAULTS.tiles}
              onChange={setTiles}
            />
            <DesignSwitcher
              what="Callout"
              options={CALLOUT_STYLES}
              value={callout}
              defaultValue={DEV_DEFAULTS.callout}
              onChange={setCallout}
            />
          </OptionMenu>
        </OptionMenus>
      </div>
    </div>
  );
}

/** Each outside section's source, credited on its cards. */
const FEED_SOURCES: Record<'lectures' | 'conferences' | 'articles' | 'literature', FeedSource> = {
  lectures: {
    name: 'World Wide Neuro',
    href: 'https://www.world-wide.org/comp-neuro/seminars?timing=past&hasVideo=true',
    note: 'Recorded computational neuroscience talks, listed and hosted by World Wide Neuro, the open seminar series for neuroscience. All credit to the speakers and the organisers of each series.',
  },
  conferences: {
    name: 'World Wide Neuro',
    href: 'https://www.world-wide.org/comp-neuro/conferences',
    note: 'Upcoming meetings, from World Wide Neuro’s computational neuroscience calendar and the organisers’ own announcements. Check dates with the organisers before booking.',
  },
  articles: {
    name: 'The Transmitter',
    href: 'https://www.thetransmitter.org/',
    note: 'The latest from The Transmitter, the neuroscience news and analysis site, from its public feed. All credit to its writers and editors.',
  },
  literature: {
    name: 'Europe PMC',
    href: 'https://europepmc.org/',
    note: 'Papers from Europe PMC, the open archive of life-sciences literature, searched as you type: a topic searches titles and abstracts; words typed also find authors.',
  },
};

/** The literature's source when Europe PMC cannot be reached. */
const OPENALEX: FeedSource = {
  name: 'OpenAlex',
  href: 'https://openalex.org/',
  note: 'Papers from OpenAlex, the free and open index of the world’s research, searched as you type (Europe PMC, the usual source, could not be reached).',
};

/** What an outside section says with nothing in it. */
const FEED_EMPTY: Record<
  keyof typeof FEED_SOURCES,
  (paper: 'loading' | 'done' | 'failed') => string
> = {
  lectures: () => 'No talks match.',
  conferences: () => 'No upcoming conferences or workshops could be loaded.',
  articles: () => 'No articles to show.',
  literature: (state) =>
    state === 'loading'
      ? 'Searching…'
      : state === 'failed'
        ? 'Neither Europe PMC nor OpenAlex could be reached.'
        : 'No papers match.',
};

/** The literature's filters: words to search for, a topic, and the order. */
function LiteratureFilters({
  topic,
  onTopic,
  sort,
  onSort,
  words,
  onWords,
  chip,
}: {
  topic: LiteratureTopic;
  onTopic: (t: LiteratureTopic) => void;
  sort: LiteratureSort;
  onSort: (s: LiteratureSort) => void;
  words: string;
  onWords: (w: string) => void;
  chip: (on: boolean) => string;
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      <input
        type="search"
        value={words}
        onChange={(e) => onWords(e.target.value)}
        placeholder="Search titles, abstracts and authors"
        aria-label="Search the literature"
        className="h-[40px] rounded-full border border-[#e8e8e8] bg-white px-[16px] text-[13px] text-[#002766] outline-none placeholder:text-[#bfbfbf] focus:border-[#003a8c]"
      />
      <div className="flex flex-wrap gap-[6px]">
        {LITERATURE_TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={topic === t.id}
            className={chip(topic === t.id)}
            onClick={() => onTopic(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-[6px] text-[11px] text-[#8c8c8c]">
        Order:
        {LITERATURE_SORTS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={sort === o.id}
            className={chip(sort === o.id)}
            onClick={() => onSort(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Where a course's play button and Start button go: on where the learner left off, if they did. */
function courseHref(course: LearnCourse, progress: CourseProgress | undefined, learnPath: string) {
  const resume = progress && !progress.done ? progress.slide + 1 : undefined;
  return learnCoursePath(course.id, `${learnPath}?course=${course.id}`, resume);
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
