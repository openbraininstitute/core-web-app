import { AgentPrompts } from './agent-prompts';
import { AiSparkles } from './agent-ready';
import { ConfigurationRecording, StartNow, VirtualLabsPoints } from './brain-views';
import { CNS_ON_FIRST_SCREEN } from './brains';
import { ChapterAction } from './chapter-action';

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
const VIRTUAL_LABS_WORDS = <VirtualLabsPoints />;

/** The walkthrough of the course's three brains, and of the models the platform holds inside each. */
export const BRAIN_CHAPTERS: IBrainChapter[] = [
  {
    id: 'start',
    theme: 'Virtual Labs',
    label: 'Start',
    scene: 'opening',
    title: 'Virtual Labs Platform',
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
    title: 'Explore data, models and results',
    hero: true,
    column: VIDEO_CHAPTER,
    body: (
      <p>
        Explore many types of experimental data, such as neuron morphologies, electrophysiology, EM
        reconstructions and ion channel recordings, across multiple species; models at every scale,
        from single neurons to circuits; and the outputs of your virtual experiments.
      </p>
    ),
    after: <ChapterAction label="Get Started" destination="data" />,
  },
  {
    id: 'build',
    theme: 'Build',
    label: 'Build',
    scene: 'models',
    title: 'Build brain models, across scales',
    hero: true,
    titleClass: SERIF_TITLE,
    column: `${VIDEO_CHAPTER} ${mosaic.chapter}`,
    body: (
      <>
        <p>
          Explore models across species: rat, mouse, human and fruit fly (FlyWire), from single
          neurons and small circuits to brain regions and whole brains.
        </p>
        <p>Customize models for hypothesis testing and disease modelling.</p>
        <p>
          Create neuronal skeletons from H01 and MICrONS electron microscopy reconstructions as a
          starting point for new models.
        </p>
      </>
    ),
    after: <ChapterAction label="Get Started" destination="workflows" />,
  },
  {
    id: 'simulate',
    theme: 'Simulate',
    label: 'Simulate',
    scene: 'configuration',
    title: 'Configure simulations & workflows',
    hero: true,
    column: VIDEO_CHAPTER,
    body: (
      <>
        <p>
          Set up a simulation campaign on any circuit in the platform: its stimuli, recordings and
          neuron sets, chosen beside the circuit in 3D and its table of neurons.
        </p>
        <p>
          Give any parameter a list of values to scan it, then generate and launch the whole
          campaign at once.
        </p>
      </>
    ),
    after: <ChapterAction label="Get Started" destination="workflows" />,
  },
  {
    id: 'notebooks',
    theme: 'Notebooks',
    label: 'Notebooks',
    scene: 'notebooks',
    title: 'Jupyter notebooks for interacting with data',
    hero: true,
    column: VIDEO_CHAPTER,
    body: (
      <>
        <p>
          Open models, data and simulation results in Jupyter notebooks in the cloud: query them
          with Python, analyse them and plot them, with nothing to install.
        </p>
        <p>Start from the platform&apos;s own notebooks, or write your own and share them.</p>
      </>
    ),
    after: <ChapterAction label="Get Started" destination="notebooks" />,
  },
  {
    id: 'agents',
    theme: 'Leverage AI',
    label: 'AI',
    scene: 'agents',
    title: (
      <>
        Neuroscience at the speed of thought
        <AiSparkles className="ml-[0.18em] inline-block size-[0.8em] -translate-y-[0.06em] align-baseline" />
      </>
    ),
    hero: true,
    titleClass: SERIF_TITLE,
    // The words on the left, as on the other screens; the prompts on the stage beside them.
    column: labs.chapter,
    body: (
      <>
        <p>AI assistant, MCP server, plugins and connectors.</p>
        {/* Upright on a phone the prompts below say it, and there is no room for both. */}
        <p className="stacked:hidden">
          Work on the platform from the AI you already use: Claude through the OBI connector,
          ChatGPT through the OBI plugin, or the OBI Assistant built into the platform.
        </p>
        <p className="stacked:hidden">
          Ask in plain words to build models, run simulation campaigns and analyse their results,
          all in your Virtual Lab.
        </p>
        {/* Upright on a phone the stage has no room for the prompts: they come after the words. */}
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
    kicker: 'For students and educators',
    title: 'Learn & teach neuroscience by doing',
    hero: true,
    column: VIDEO_CHAPTER,
    body: (
      <>
        <p>
          Start with the course Introduction to brain modeling: explore real brain models and run
          your own simulations in the browser, with nothing to install.
        </p>
        <p>
          Give your class a Virtual Lab, share models, data and notebooks with your students, teach
          from the courses, and create exercises compatible with Moodle.
        </p>
      </>
    ),
    after: <ChapterAction label="Get Started" destination="learn" />,
  },
  {
    id: 'join',
    theme: 'Get Started',
    label: 'Get Started',
    scene: 'join',
    title: 'Your next experiment starts here.',
    hero: true,
    column: getStarted.words,
    body: (
      <>
        <p>
          Explore brain data, build models and run simulations.
          <br />
          All in your browser.
        </p>
        <StartNow />
        <p className={getStarted.freeOffer}>
          Free to start. <strong>100 credits included.</strong>
        </p>
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
