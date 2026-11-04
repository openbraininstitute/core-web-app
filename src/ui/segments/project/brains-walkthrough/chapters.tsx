import { Actions, Row, SectionLink } from '@/ui/segments/project/walkthrough/bits';

import { AgentPrompts } from './agent-prompts';
import { AiSparkles } from './agent-ready';
import { ConfigurationRecording, StartNow, VirtualLabsPoints } from './brain-views';
import { CNS_ON_FIRST_SCREEN } from './brains';
import { ChapterAction } from './chapter-action';

import type { IWalkthroughChapter } from '@/ui/segments/project/walkthrough/walkthrough';

import grid from './opening-grid.module.css';
import labs from './virtual-labs.module.css';

/** What the stage shows beside a chapter: the three brains, or one with what the platform holds of it inside. */
export type TBrainScene =
  | 'opening'
  | 'multiplying'
  | 'l6'
  | 'trio'
  | 'fly'
  | 'mouse'
  | 'microns'
  | 'human'
  | 'analysis'
  | 'configuration'
  | 'notebooks'
  | 'join'
  | 'teaching';

export interface IBrainChapter extends IWalkthroughChapter {
  scene: TBrainScene;
}

/** The first screens' titles, in the logo's serif, which has one weight. */
export const SERIF_TITLE = 'font-[family-name:var(--font-DMSerifText)] font-normal';

/** What the walkthrough opens on, under the logo, before its first screen's own title takes its place. */
export const BRAIN_INTRO = 'The Era of brain simulation has arrived...';

/** A word on the platform, on its first screen. */
const VIRTUAL_LABS_WORDS = <VirtualLabsPoints />;

/** The walkthrough of the course's three brains, and of the models the platform holds inside each. */
export const BRAIN_CHAPTERS: IBrainChapter[] = [
  {
    id: 'start',
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
          // Its letters' tops, a quarter of an em down its line, level with the video's.
          titleClass: `${SERIF_TITLE} ${labs.title}`,
          top: true,
          column: labs.words,
          body: VIRTUAL_LABS_WORDS,
        }),
  },
  {
    id: 'simulate',
    label: 'Simulate',
    scene: 'configuration',
    title: 'Configure simulations & neuroscience workflows',
    hero: true,
    column: labs.chapter,
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
    after: <ChapterAction label="Configure a simulation" destination="workflows" />,
  },
  {
    id: 'agents',
    label: 'AI',
    scene: 'multiplying',
    title: (
      <>
        Perform Neuroscience at the speed of thought
        <AiSparkles className="ml-[0.18em] inline-block size-[0.8em] -translate-y-[0.06em] align-baseline" />
      </>
    ),
    hero: true,
    titleClass: SERIF_TITLE,
    // Wide enough for its title in two lines, its prompts ending above the bar of words at the foot.
    column: `${labs.chapter} beside:w-[52%] beside:max-w-[720px]`,
    body: (
      <>
        <p className="-mt-[4px] text-[15px] leading-[1.4] text-neutral-500">
          AI assistant, MCP server, Plugins + Connectors
        </p>
        <AgentPrompts />
      </>
    ),
    after: <ChapterAction label="Try the platform with AI" destination="platform" />,
  },
  {
    id: 'analysis',
    label: 'Analysis',
    scene: 'analysis',
    title: 'Interactive tools for analysis',
    hero: true,
    column: labs.chapter,
    body: (
      <>
        <p>
          Explore a simulation&apos;s results as soon as they are in: voltage traces, spike rasters,
          PSTHs and spike statistics, beside the circuit in 3D.
        </p>
        <p>
          Filter the neurons in the table and every plot follows, ordered and grouped by cell type
          or by any property of the circuit.
        </p>
      </>
    ),
    after: <ChapterAction label="Explore simulation results" destination="data" />,
  },
  {
    id: 'teach',
    label: 'Teach',
    scene: 'teaching',
    kicker: 'For educators',
    title: 'Teach neuroscience by doing',
    hero: true,
    column: labs.chapter,
    body: (
      <>
        <p>
          Bring the platform into the classroom: students explore real brain models and run their
          own simulations in the browser, with nothing to install.
        </p>
        <p>
          Give your class a Virtual Lab, share models, data and notebooks with your students, and
          teach from the courses.
        </p>
      </>
    ),
    after: <ChapterAction label="Start teaching" destination="learn" />,
  },
  {
    id: 'notebooks',
    label: 'Notebooks',
    scene: 'notebooks',
    title: 'Jupyter notebooks for interacting with data',
    hero: true,
    column: labs.chapter,
    body: (
      <>
        <p>
          Open models, data and simulation results in Jupyter notebooks in the cloud: query them
          with Python, analyse them and plot them, with nothing to install.
        </p>
        <p>Start from the platform&apos;s own notebooks, or write your own and share them.</p>
      </>
    ),
    after: <ChapterAction label="Browse notebooks" destination="notebooks" />,
  },
  {
    id: 'join',
    label: 'Get started',
    scene: 'join',
    title: 'Get started',
    hero: true,
    body: (
      <>
        <p>Free to start, with 100 credits for your first simulations.</p>
        <StartNow />
      </>
    ),
  },
  {
    id: 'microcircuit',
    label: 'Microcircuit',
    scene: 'l6',
    title: 'A cortical microcircuit, neuron by neuron',
    hero: true,
    column: labs.chapter,
    body: (
      <>
        <p>
          Closer in, a piece of cortex as a model: every neuron reconstructed, each in its place,
          and wired to the others by synapses, ready to simulate in your browser.
        </p>
        <p className="text-[12px] text-neutral-500">
          On screen: layer 6 of a column of rat somatosensory cortex, neuron by neuron.
        </p>
      </>
    ),
    after: <ChapterAction label="Explore brain circuits" destination="data" />,
  },
  {
    id: 'fly',
    label: 'Fruit fly',
    scene: 'fly',
    kicker: 'A fruit fly’s brain',
    title: 'A whole brain, neuron by neuron',
    column: labs.chapter,
    body: (
      <>
        <p>
          FlyWire traced every neuron in an adult fruit fly&apos;s brain from electron microscopy:
          about 140,000 of them, and the 50 million or so synapses between them.
        </p>
        <p>
          Inside the brain here are those neurons, drawn where they run within 20 µm of its surface,
          each in its place.
        </p>
      </>
    ),
    after: <ChapterAction label="Explore fly brain data" destination="data" />,
  },
  {
    id: 'mouse',
    label: 'Mouse',
    scene: 'mouse',
    kicker: 'A mouse’s brain',
    title: 'A piece of cortex, cell by cell',
    column: labs.chapter,
    body: (
      <>
        <p>
          A mouse&apos;s brain has some 70 million neurons. Under the surface of its somatosensory
          cortex, where touch from the hind limb arrives, sits a model of the deepest layer of the
          cortex: layer 6 of a column, every one of its neurons reconstructed and wired by synapses.
        </p>
        <p>
          The model was built from a rat&apos;s cortex, shown here in a mouse&apos;s brain for
          scale.
        </p>
      </>
    ),
    after: <ChapterAction label="Explore cortical models" destination="data" />,
  },
  {
    id: 'microns',
    label: 'MICrONS',
    scene: 'microns',
    kicker: 'A mouse’s visual cortex',
    title: 'A cubic millimetre, synapse by synapse',
    column: labs.chapter,
    body: (
      <>
        <p>
          MICrONS imaged a cubic millimetre of a mouse&apos;s visual cortex by electron microscopy
          and traced it cell by cell: more than 200,000 cells, and the 500 million synapses between
          them.
        </p>
        <p>
          On the platform it is a circuit of 50,948 of those neurons, through the whole depth of the
          cortex, wired by the synapses traced between them. Its 877 proofread neurons are drawn
          whole from their reconstructions.
        </p>
      </>
    ),
    after: <ChapterAction label="Explore MICrONS data" destination="data" />,
  },
  {
    id: 'human',
    label: 'Human',
    scene: 'human',
    kicker: 'A human’s brain',
    title: 'A human neuron, traced from electron microscopy',
    body: (
      <>
        <p>
          A human brain has some 86 billion neurons. This pyramidal cell comes from H01: a cubic
          millimetre of human temporal cortex, cut into thousands of slices, imaged at nanometre
          resolution and traced cell by cell.
        </p>
        <p>
          Its surface can be skeletonized into a morphology, the first step to a model that can be
          simulated.
        </p>
      </>
    ),
    column: labs.chapter,
    after: (
      <>
        <ChapterAction label="Explore human neurons" destination="data" />
        <Actions model="human" />
      </>
    ),
  },
  {
    id: 'next',
    label: 'Learn',
    scene: 'trio',
    wide: true,
    kicker: 'Your turn',
    title: 'Learn, then simulate',
    body: (
      <>
        <p>
          The course Introduction to brain modeling starts from these three brains. The data and
          models are in Data, and Workflows builds and simulates more.
        </p>
        <p className="text-[12px] text-neutral-500">Scroll on, or press →, for your home page.</p>
      </>
    ),
    after: (
      <>
        <ChapterAction label="Start learning" destination="learn" />
        <Row>
          <SectionLink section="data" />
          <SectionLink section="workflows" />
        </Row>
      </>
    ),
  },
];
