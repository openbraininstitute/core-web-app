import { AgentPrompts } from './agent-prompts';
import { AiSparkles } from './agent-ready';
import { ChapterAction } from './chapter-action';
import { ConfigurationRecording, StartNow } from './recorded-views';
import { CNS_ON_FIRST_SCREEN } from './tour-settings';

import type { IWalkthroughChapter } from '@/ui/segments/project/walkthrough/walkthrough';

import getStarted from './get-started.module.css';
import mosaic from './model-mosaic.module.css';
import grid from './opening-grid.module.css';
import labs from './virtual-labs.module.css';

/** What the stage shows beside a chapter: the three brains, or one with what the platform holds of it inside. */
export type TBrainScene =
  | 'opening'
  | 'agents'
  | 'models'
  | 'analysis'
  | 'configuration'
  | 'notebooks'
  | 'join'
  | 'teaching';

export interface IBrainChapter extends IWalkthroughChapter {
  scene: TBrainScene;
  /** Bottom navigation group; consecutive model chapters share Build. */
  theme: string;
}

/** The first screens' titles, in the logo's serif, which has one weight. */
export const SERIF_TITLE = 'font-[family-name:var(--font-DMSerifText)] font-normal';

/** What the walkthrough opens on, under the logo, before its first screen's own title takes its place. */
export const BRAIN_INTRO = 'The Era of brain simulation has arrived...';

/** Upright on a phone, a screen's words straight under its stage's video, rather than at the foot of the page. */
const UNDER_VIDEO =
  'stacked:self-start stacked:bg-transparent stacked:pt-[calc(var(--stage-video-top)+var(--stage-video-h)+22px)]';
const VIDEO_CHAPTER = `${labs.chapter} ${UNDER_VIDEO}`;

/** A word on the platform, on its first screen. */
const VIRTUAL_LABS_WORDS = (
  <>
    <p>Organize data, models and experiments in one workspace. Invite collaborators to join you.</p>
    <ChapterAction label="Get Started" destination="platform" />
  </>
);

/** The walkthrough of the course's three brains, and of the models the platform holds inside each. */
export const BRAIN_CHAPTERS: IBrainChapter[] = [
  {
    id: 'start',
    theme: 'Virtual Labs',
    label: 'Start',
    scene: 'opening',
    title: 'Bring your research together',
    hero: true,
    titleClass: SERIF_TITLE,
    ...(CNS_ON_FIRST_SCREEN
      ? {
          // The left column of the screen's layout: a word on the platform and the recording.
          column: `${grid.grid} beside:w-[calc(var(--grid-x0)+var(--grid-col))] beside:max-w-none beside:pt-(--grid-y0)`,
          top: true,
          body: (
            <>
              {VIRTUAL_LABS_WORDS}
              <ConfigurationRecording className="mt-[6px] w-full max-w-[calc(50vh*1512/948)]" />
            </>
          ),
        }
      : {
          titleClass: `${SERIF_TITLE} ${labs.title}`,
          top: true,
          column: labs.words,
          body: VIRTUAL_LABS_WORDS,
        }),
  },
  {
    id: 'analysis',
    theme: 'Explore',
    label: 'Analysis',
    scene: 'analysis',
    title: 'Find data for your next discovery',
    hero: true,
    column: VIDEO_CHAPTER,
    body: (
      <p>
        Explore morphologies, electrophysiological recordings and brain models across species and
        scales.
      </p>
    ),
    after: <ChapterAction label="Get Started" destination="data" />,
  },
  {
    id: 'build',
    theme: 'Build',
    label: 'Build',
    scene: 'models',
    title: 'Turn data into brain models',
    hero: true,
    titleClass: SERIF_TITLE,
    column: `${VIDEO_CHAPTER} ${mosaic.chapter}`,
    body: (
      <p>
        Build neurons and circuits, or skeletonize EM meshes from MICrONS, H01 and your own data.
      </p>
    ),
    after: <ChapterAction label="Get Started" destination="workflows" />,
  },
  {
    id: 'simulate',
    theme: 'Simulate',
    label: 'Simulate',
    scene: 'configuration',
    title: 'Put your hypotheses to the test',
    hero: true,
    column: VIDEO_CHAPTER,
    body: <p>Configure stimuli and recordings, vary parameters and run simulation campaigns.</p>,
    after: <ChapterAction label="Get Started" destination="workflows" />,
  },
  {
    id: 'notebooks',
    theme: 'Notebooks',
    label: 'Notebooks',
    scene: 'notebooks',
    title: 'Turn results into insights',
    hero: true,
    column: VIDEO_CHAPTER,
    body: <p>Analyse and visualize your data in cloud notebooks. Run ours or upload your own.</p>,
    after: <ChapterAction label="Get Started" destination="notebooks" />,
  },
  {
    id: 'agents',
    externalProgress: true,
    theme: 'Leverage AI',
    label: 'AI',
    scene: 'agents',
    title: (
      <>
        From prompts to experiments
        <AiSparkles className="ml-[0.18em] inline-block size-[0.8em] -translate-y-[0.06em] align-baseline" />
      </>
    ),
    hero: true,
    titleClass: SERIF_TITLE,
    // The words on the left, as on the other screens; the prompts on the stage beside them.
    column: labs.chapter,
    body: (
      <>
        <p>
          Build models, run simulations and analyse results with your AI agent or the OBI Assistant.
        </p>
        <AgentPrompts className="beside:hidden" />
      </>
    ),
    after: <ChapterAction label="Get Started" destination="platform" />,
  },
  {
    id: 'teach',
    theme: 'Learn & Teach',
    label: 'Learn & Teach',
    scene: 'teaching',
    title: 'Learn by doing. Teach with ease.',
    hero: true,
    column: VIDEO_CHAPTER,
    body: <p>Teach through courses connected to Moodle and learn by joining OBI Summer Camps.</p>,
    after: <ChapterAction label="Get Started" destination="learn" />,
  },
  {
    id: 'join',
    theme: 'Get Started',
    label: 'Get Started',
    scene: 'join',
    title: 'Start your next discovery',
    hero: true,
    column: getStarted.words,
    body: (
      <>
        <p>
          Start free with 100 credits included.
          <br />
          Explore, build and simulate.
          <br />
          All in your browser.
        </p>
        <StartNow />
      </>
    ),
  },
];

/** Navigation order and active groups follow the chapters. */
export const BRAIN_THEMES = [...new Set(BRAIN_CHAPTERS.map((chapter) => chapter.theme))];
export const BRAIN_THEME_LINKS: Record<string, string> = Object.fromEntries(
  BRAIN_CHAPTERS.toReversed().map((chapter) => [chapter.theme, chapter.id])
);
export const BRAIN_THEME_UNDERLINES: Record<number, string> = Object.fromEntries(
  BRAIN_CHAPTERS.map((chapter, index) => [index, chapter.theme])
);
