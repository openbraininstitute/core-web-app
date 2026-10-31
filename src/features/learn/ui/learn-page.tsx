'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from 'nuqs';
import { type CSSProperties, Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  PaneResizeHandle,
  PaneSideResizeHandle,
  SHUT_BAR_SIZE,
  ShutPaneBar,
} from '@/features/circuit-viewer/pane-resize-handle';
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
import { glide } from '@/features/learn/ui/glide';
import { GlossaryCard, GlossaryIndex } from '@/features/learn/ui/glossary';
import { MiniCode } from '@/features/learn/ui/mini-code';
import { type Focus, MiniFigure } from '@/features/learn/ui/mini-figure';
import { PlayChip } from '@/features/learn/ui/play-chip';
import { ShareButton, ShareChip } from '@/features/learn/ui/share';
import { TeachCard, TeachIndex } from '@/features/learn/ui/teach';
import { TutorialCard, TutorialsIndex } from '@/features/learn/ui/tutorials';
import { WorkflowCard, WorkflowsIndex } from '@/features/learn/ui/workflows';
import { useStreamed } from '@/features/learn/use-streamed';
import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import { cn } from '@/utils/css-class';

import type { FeedItem } from '@/features/learn/feed-item';
import type { Workflows } from '@/features/learn/workflows';
import type { TTutorial } from '@/ui/segments/project/get-started/query';

/**
 * The page's boxes lie straight on it, as the workflows' do, with no grey window round them: the
 * section tiles and the list under them on the left, the card on the right, their edges where the
 * grey window's were. The page is exactly the workspace body's height, so the body does not scroll.
 */
const BOX = 'mx-3 flex h-full min-h-0 flex-col pt-2 pb-2 max-lg:h-auto';
/** TEMPORARY, the "Outer box" setting on: the grey window the boxes once sat in, Data's. */
const OUTER_BOX = 'bg-background border-neutral-2 rounded-2xl border px-2';
/**
 * The left column and the card, their tracks `--learn-columns`, a gutter between them with a grab
 * bar in its middle; on a narrow screen, one under the other.
 */
const GRID =
  'flex min-h-0 flex-1 flex-col gap-[18px] lg:grid lg:grid-cols-[var(--learn-columns)] lg:grid-rows-[minmax(0,1fr)] lg:gap-x-[24px]';
/** Either side of a grab bar between two boxes. */
const GUTTER = 12;
/**
 * The left column: up to 514px, but narrower as the page is, as when the AI assistant's panel is
 * open beside it, rather than pushing the card out under that panel. On the courses it drags
 * wider, never narrower, and the card gives way down to its floor; dragged on to under half of
 * that, the card shuts, and the courses fill the page in rows and columns.
 */
const LEFT = { most: 514, share: 0.42 };
const CARD_FLOOR = 480;
/** The courses' cards in the list: none narrower than this, this far apart. */
const COURSE = { least: 340, gap: 9 };
/**
 * The list's width that fits two of them to a row, with the box's padding (12px a side) and room
 * for a scrollbar.
 */
const TWO_COURSES = 2 * COURSE.least + COURSE.gap + 2 * 12 + 8;
/** How long a course picked from the overview takes to slide in beside the list, ms (learn.css). */
const SLIDE_MS = 420;
/** The section tiles' box, two rows of tiles, until it is first measured. */
const TILES_HEIGHT = 206;

/** The right-hand side: a white box, as the workflows' panes are. */
const PANEL_FRAME = 'relative flex min-h-0 min-w-0 flex-1 flex-col';
const PANEL_BOX = `${BOX_CLASS} learn-card min-h-0 w-full flex-1 overflow-y-auto`;
const PANEL = `${PANEL_BOX} secondary-scrollbar`;
/**
 * A course's card: the Data page's mini detail view's dark navy (mini-detail-view/index.tsx), with
 * its scrollbar, and its soft drop without the white top highlight, which reads as a hairline on
 * navy.
 */
const COURSE_PANEL = cn(
  PANEL_BOX,
  'primary-scrollbar bg-primary-9 text-white shadow-[0_4px_12px_-6px_rgb(0_39_102/0.08),0_1px_2px_rgb(0_39_102/0.04)]'
);

/** The Standard section, and its 0.4 MB of entity types, fetched only once the section is opened. */
const StandardIndex = dynamic(
  () => import('@/features/learn/ui/standard').then((m) => m.StandardIndex),
  {
    loading: () => (
      <p className="px-[4px] py-[20px] text-center text-[13px] text-[#8c8c8c]">Loading…</p>
    ),
  }
);
const StandardCard = dynamic(
  () => import('@/features/learn/ui/standard').then((m) => m.StandardCard),
  { loading: () => <section className={PANEL} /> }
);

/** The streamed sections until they come, or if they cannot be read. */
const NO_LECTURES = { recorded: [] as FeedItem[], upcoming: [] as FeedItem[] };
const NO_ITEMS: FeedItem[] = [];
const NO_WORKFLOWS: Workflows = { configs: [], blocks: {} };

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
  // the cell, on the left of its choices
  'mtype-game': { x: 0.27, y: 0.5, span: 0.55 },
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
  outerBox: false,
  listBox: true,
  bigCards: true,
  selected: 5,
  callout: 1,
};

/**
 * Learn: the free courses, listed on the left with how far through each the learner is, and the
 * chosen one on the right, with a way in, one of its figures to try, and what it covers. Only Free
 * courses has anything in it so far.
 */
export function LearnPage({
  courseIds,
  learnPath,
  tutorials: tutorialsAsFetched,
  lectures: lecturesSent,
  conferences: conferencesSent,
  articles: articlesSent,
  workflows: workflowsSent,
}: {
  courseIds: string[];
  learnPath: string;
  tutorials: TTutorial[];
  /** World Wide Neuro's computational neuroscience talks: recorded, and still to come. */
  lectures: Promise<{ recorded: FeedItem[]; upcoming: FeedItem[] }>;
  /** The conferences coming up, World Wide Neuro's and the field's main meetings. */
  conferences: Promise<FeedItem[]>;
  /** The Transmitter's latest articles. */
  articles: Promise<FeedItem[]>;
  /** obi-one's ScanConfigs shown in the platform's workflows, with their blocks. */
  workflows: Promise<Workflows>;
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
  // TEMPORARY, for judging: the old grey window round the boxes, or none, the default
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
  // Features, with nothing in it yet, left out unless switched on: two rows of five. ("none" in the
  // address when every tile is shown, as an empty list there would read as the default again)
  const [hiddenParam, setHidden] = useQueryState(
    'hide',
    parseAsArrayOf(parseAsString).withDefault(['features'])
  );
  const hidden = hiddenParam.filter((k) => k !== 'none');
  const showSection = (key: string, on: boolean) => {
    const next = on ? hidden.filter((k) => k !== key) : [...hidden, key];
    setHidden(next.length ? next : ['none']);
  };
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
  // the outside sections and the workflows, as the server streams them in
  const { value: lectures, pending: lecturesPending } = useStreamed(lecturesSent, NO_LECTURES);
  const { value: conferences, pending: conferencesPending } = useStreamed(
    conferencesSent,
    NO_ITEMS
  );
  const { value: articles, pending: articlesPending } = useStreamed(articlesSent, NO_ITEMS);
  const { value: workflows, pending: workflowsPending } = useStreamed(workflowsSent, NO_WORKFLOWS);
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
  // searched only while its section is open
  const literature = useLiterature(
    litTopic as LiteratureTopic,
    section === 'literature' ? litWords : '',
    litSort as LiteratureSort,
    section === 'literature'
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
  // what an outside section says with nothing in it: still on its way, or why not
  const pending = {
    lectures: lecturesPending,
    conferences: conferencesPending,
    articles: articlesPending,
    literature: false,
  };
  const feedEmpty = !feedSection
    ? ''
    : pending[feedSection]
      ? 'Loading…'
      : FEED_EMPTY[feedSection](literature.state);
  // the OBI Standard's chosen entity type
  const [stdSlug, setStdSlug] = useQueryState('entity');
  // and which half of it: the data's entity types, or the workflows' ScanConfigs
  const [stdHalf, setStdHalf] = useQueryState(
    'standard',
    parseAsStringLiteral(['data', 'workflows'] as const).withDefault('data')
  );
  const [workflowId, setWorkflowId] = useQueryState('workflow');
  const workflow = workflows.configs.find((c) => c.id === workflowId) ?? workflows.configs[0];
  const [teachId, setTeachId] = useQueryState('topic');
  const teach = teachTopic(teachId) ?? TEACH_TOPICS[0];
  const [tutorialSlug, setTutorialSlug] = useQueryState('tutorial');
  // the tutorials in the opposite order to the home page's, but with the third of them first
  const reversed = [...tutorialsAsFetched].reverse();
  const tutorials = reversed.length > 2 ? [reversed[2], ...reversed.toSpliced(2, 1)] : reversed;
  const tutorial = tutorials.find((t) => t.slug === tutorialSlug) ?? tutorials[0];
  const project = learnPath.replace(/\/learn$/, '');
  // the boxes' grab bars, as the workflows' columns and panes have them: the courses' list dragged
  // wider (null: its own width), or over the whole page, its card shut into a bar; and the
  // section tiles over the list shut into one. Neither the card nor the tiles ever grow
  const gridRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  const [wider, setWider] = useState<number | null>(null);
  const [overview, setOverview] = useState(false);
  const [tilesShut, setTilesShut] = useState(false);
  // as a drag begins: the list's width, to open the card at again if the drag shuts it, and the
  // tiles' height
  const dragFrom = useRef({ wider: null as number | null, tiles: TILES_HEIGHT });
  // only the courses' list widens, and turns into the overview
  const onCourses = section === 'free';
  const overviewOn = onCourses && overview;
  // the card, out of sight while the courses are over the whole page
  const panel = cn(PANEL, overviewOn && 'lg:hidden');
  const coursePanel = cn(COURSE_PANEL, overviewOn && 'lg:hidden');
  const own = `min(${LEFT.most}px, ${LEFT.share * 100}%)`;
  const listTrack =
    onCourses && wider !== null
      ? `max(${own}, min(${wider}px, calc(100% - ${2 * GUTTER + CARD_FLOOR}px)))`
      : own;
  const columns = overviewOn ? `minmax(0,1fr) ${SHUT_BAR_SIZE}px` : `${listTrack} minmax(0,1fr)`;
  // the bar `x` from the grid's left, in the gutter's middle: never left of where it starts; right
  // of it the list widens and the card narrows to its floor, then shuts once under half of that
  const dragList = (x: number) => {
    const total = gridRef.current?.offsetWidth ?? 0;
    const least = Math.min(LEFT.most, LEFT.share * total);
    const to = Math.max(least, x - GUTTER);
    if (total - 2 * GUTTER - to < CARD_FLOOR / 2) {
      setOverview(true);
      setWider(dragFrom.current.wider);
      return;
    }
    setOverview(false);
    setWider(to <= least ? null : Math.round(Math.min(to, total - 2 * GUTTER - CARD_FLOOR)));
  };
  // the bar `y` under the tiles' top: dragged up past half of their height, they shut
  const dragTiles = (y: number) => setTilesShut(y < dragFrom.current.tiles / 2);
  // a course picked from the overview: the list's width slides from the page's (`from`, the
  // overview's own layout) to `to`, the card in at the width it will have. The start is laid out
  // without easing and its style taken, so that the change to the end is eased from there
  const [slide, setSlide] = useState<{
    from: number;
    to: number;
    card: number;
    go: boolean;
  } | null>(null);
  useLayoutEffect(() => {
    if (!slide || slide.go) return;
    if (gridRef.current) getComputedStyle(gridRef.current).getPropertyValue('--learn-list-w');
    setSlide({ ...slide, go: true });
  }, [slide]);
  useEffect(() => {
    if (!slide?.go) return;
    const done = setTimeout(() => setSlide(null), SLIDE_MS + 60);
    return () => clearTimeout(done);
  }, [slide]);

  // Dev settings, behind a small gear in the card's corner: which courses show, Help made lean, and
  // — TEMPORARY, for judging — the page's sections and appearance; each option marked with its
  // default. (Hiding Help, the AI button, the courses' top bar and the grey pills are feature
  // flags.)
  const devSettings = (
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
  );

  return (
    <div
      className={cn(BOX, outerBox && OUTER_BOX, !listBoxOn && 'learn-no-list')}
      data-selected={SELECTED_SLUGS[sel]}
    >
      <div
        ref={gridRef}
        className={GRID}
        data-slide={slide ? (slide.go ? 'go' : 'start') : undefined}
        style={
          (slide
            ? {
                '--learn-columns': 'var(--learn-list-w) minmax(0,1fr)',
                '--learn-list-w': `${slide.go ? slide.to : slide.from}px`,
                '--learn-card-w': `${slide.card}px`,
              }
            : { '--learn-columns': columns }) as CSSProperties
        }
      >
        <aside className="relative flex min-h-0 w-full min-w-0 flex-col">
          <div ref={tilesRef} className="shrink-0">
            {tilesShut ? (
              // the whole column's width, a click opening the tiles again
              <ShutPaneBar title="Learn" onOpen={() => setTilesShut(false)} className="w-full" />
            ) : (
              // the course list's faint navy, so the two read as one column
              <div className={cn(BOX_CLASS, 'bg-primary-9/[0.04] p-[12px]')}>
                <CategoryTiles
                  design={design}
                  hidden={hidden}
                  section={section}
                  onSelect={setSection}
                  off={[...(noCourses ? (['free'] as const) : [])]}
                />
              </div>
            )}
          </div>
          {/* between the tiles and the list, a grab bar that only shuts them: dragged up past
              half of their height, into a bar; it never makes them any taller */}
          <div className="relative h-[18px] shrink-0 lg:h-[24px]">
            <div className="absolute inset-x-0 top-1/2 max-lg:hidden">
              <PaneResizeHandle
                edge="bottom"
                containerRef={tilesRef}
                minHeight={0}
                onResize={dragTiles}
                onDragChange={(dragging) => {
                  if (dragging && !tilesShut && tilesRef.current)
                    dragFrom.current.tiles = tilesRef.current.offsetHeight;
                }}
              />
            </div>
          </div>

          {feedSection ? (
            <FeedIndex
              key={feedSection}
              items={feed[feedSection].items}
              selected={feed[feedSection].selected}
              onSelect={feed[feedSection].onSelect}
              empty={feedEmpty}
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
                          {k === 'recorded' ? 'Recordings' : 'Upcoming'} ·{' '}
                          {lecturesPending ? '…' : lectures[k].length}
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
          ) : section === 'standard' ? (
            <div className="flex min-h-0 flex-1 flex-col gap-[10px]">
              {/* the standard's two halves */}
              <div className="flex shrink-0 gap-[6px] px-[4px]">
                {(['data', 'workflows'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={stdHalf === k}
                    className={lb.chip(stdHalf === k)}
                    onClick={() => setStdHalf(k)}
                  >
                    {k === 'data' ? 'Data' : 'Workflows'}
                  </button>
                ))}
              </div>
              {stdHalf === 'workflows' ? (
                <WorkflowsIndex
                  workflows={workflows}
                  pending={workflowsPending}
                  selected={workflow}
                  onSelect={setWorkflowId}
                />
              ) : (
                <StandardIndex slug={stdSlug} onSelect={setStdSlug} />
              )}
            </div>
          ) : section === 'teach' ? (
            <TeachIndex selected={teach} onSelect={setTeachId} />
          ) : section === 'tutorials' ? (
            <TutorialsIndex tutorials={tutorials} selected={tutorial} onSelect={setTutorialSlug} />
          ) : section === 'glossary' ? (
            <GlossaryIndex selected={term} onSelect={setTermId} />
          ) : (
            // the courses in a faintly navy box, as Data's entity types are (entity-link-count.tsx
            // on table_mini_atlas); the list scrolls inside it, in as many columns as fit: one
            // beside the card, more as it is dragged wider and over the whole page
            <div className={lb.box}>
              <ul
                ref={glide}
                className="secondary-scrollbar -mr-[6px] grid min-h-0 content-start overflow-y-auto pr-[6px]"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(min(${COURSE.least}px, 100%), 1fr))`,
                  gap: COURSE.gap,
                }}
              >
                {courses.map((course, i) => {
                  const isSelected = course.id === selected?.id;
                  const done = progress[course.id]?.done;
                  // each group under its heading, across every column, its courses shown while it
                  // is open
                  const group = groupOf(course);
                  const first = i === 0 || groupOf(courses[i - 1]) !== group;
                  const open = openGroups[group];
                  const hidden = !open;
                  if (hidden && !first) return null;
                  return (
                    <Fragment key={course.id}>
                      {first && (
                        <li className="col-span-full">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenGroups({ ...openGroups, [group]: !open })}
                            className={cn(
                              'flex w-full items-center gap-[8px] px-[4px] text-left',
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
                        </li>
                      )}
                      {!hidden && (
                        <li>
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            data-learn="row"
                            // picked from the overview, the course's card slides in beside the list,
                            // which narrows to two columns, or as many as leave the card its floor
                            onClick={() => {
                              setChosen(course.id);
                              if (!overviewOn) return;
                              const total = gridRef.current?.offsetWidth ?? 0;
                              const least = Math.min(LEFT.most, LEFT.share * total);
                              const to = Math.round(
                                Math.max(
                                  least,
                                  Math.min(TWO_COURSES, total - 2 * GUTTER - CARD_FLOOR)
                                )
                              );
                              setWider(to);
                              setOverview(false);
                              setSlide({
                                from: total - 2 * GUTTER - SHUT_BAR_SIZE,
                                to,
                                card: total - 2 * GUTTER - to,
                                go: false,
                              });
                            }}
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
                      )}
                    </Fragment>
                  );
                })}
              </ul>
            </div>
          )}
          {/* over the whole page, the Dev settings move to the list's corner, off the card's bar */}
          {overviewOn && <div className="max-lg:hidden">{devSettings}</div>}
        </aside>

        <div className={PANEL_FRAME}>
          {onCourses && (
            // the grab bar between the courses and the card, in the gutter's middle: dragged
            // right, the list widens and the card narrows to its floor, then shuts into a bar,
            // the courses over the whole page; it never drags the list narrower than it starts.
            // A double click puts the two back
            <div
              className="absolute inset-y-0 -left-[12px] max-lg:hidden"
              onDoubleClick={() => {
                setOverview(false);
                setWider(null);
              }}
            >
              <PaneSideResizeHandle
                containerRef={gridRef}
                minWidth={0}
                onResize={dragList}
                onDragChange={(dragging) => {
                  if (dragging) dragFrom.current.wider = wider;
                }}
              />
            </div>
          )}
          {overviewOn && (
            // the card shut on its side, as the workflows' panes are, naming the course; a click
            // opens it again
            <ShutPaneBar
              upright
              title={selected?.title ?? 'Course'}
              onOpen={() => setOverview(false)}
              className="h-full max-lg:hidden"
            />
          )}
          {feedSection ? (
            <FeedCard
              key={`${feedSection}-${feed[feedSection].selected?.id}`}
              item={feed[feedSection].selected}
              source={
                feedSection === 'literature' && literature.source === 'openalex'
                  ? OPENALEX
                  : FEED_SOURCES[feedSection]
              }
              empty={feedEmpty}
              className={panel}
            />
          ) : section === 'standard' && stdHalf === 'workflows' ? (
            <WorkflowCard
              key={workflow?.id}
              config={workflow}
              workflows={workflows}
              pending={workflowsPending}
              className={panel}
            />
          ) : section === 'standard' ? (
            <StandardCard key={stdSlug} slug={stdSlug} onSelect={setStdSlug} className={panel} />
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
              className={coursePanel}
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
          <div className={cn(overviewOn && 'lg:hidden')}>{devSettings}</div>
        </div>
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
      className={cn(className, 'flex flex-col pt-[12px] pr-[44px] pb-[40px] pl-[40px]')}
      // the figure as tall as the card leaves it, with the header and the words: no less than its
      // height in a course, no more than fits beside its words without scrolling on a tall screen
      style={{ '--learn-figure-h': 'clamp(340px, calc(100dvh - 420px), 640px)' } as CSSProperties}
    >
      <div className="flex flex-1 flex-col gap-[28px]">
        {/* As tall as the category tiles (86px), with its content centred, and as far down the
            card (12px) as they are down their box, whose top is level with the card's: the title
            sits across from the middle of the tiles' first row. Taller only if the title wraps. */}
        <header
          data-learn="head"
          className="flex min-h-[86px] items-center justify-between gap-[20px]"
        >
          <div className="flex flex-col gap-[7px]">
            {/* on the navy, as the mini detail view sets its name and its fields' labels */}
            <h1 className="text-[31px] leading-[38px] font-bold text-white">{course.title}</h1>
            <p className="text-primary-3 text-[12.5px] leading-[17px]">{meta}</p>
          </div>
          <div className="flex shrink-0 items-center gap-[8px]">
            <Link
              href={href}
              onClick={startAgain}
              data-learn="cta"
              // Learn's green, with the depth the mini detail view's buttons have on the navy
              className="flex h-[42px] shrink-0 items-center rounded-[22px] border border-white/16 bg-[#389e0d] px-[26px] text-[14px] leading-[19px] font-semibold whitespace-nowrap text-white shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F] transition-colors hover:bg-[#237804]"
            >
              {action}
            </Link>
            <ShareButton
              dark
              what={{
                title: course.title,
                text: course.description,
                path: `/app/learn/${course.id}`,
              }}
            />
          </div>
        </header>

        <CoursePreview widget={course.preview} />

        <p className="text-primary-3 max-w-[880px] text-[16px] leading-[27px]">
          {course.description}
        </p>
      </div>
    </section>
  );
}
