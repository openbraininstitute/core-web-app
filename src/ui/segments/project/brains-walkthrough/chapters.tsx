import {
  Actions,
  CircuitFacts,
  CourseLink,
  Row,
  SectionLink,
  WhereReadable,
} from '@/ui/segments/project/walkthrough/bits';

import { AgentPrompts } from './agent-prompts';
import { AiSparkles } from './agent-ready';
import { ConfigurationRecording, StartNow } from './brain-views';
import grid from './opening-grid.module.css';

import type { IWalkthroughChapter } from '@/ui/segments/project/walkthrough/walkthrough';

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

/** The walkthrough of the course's three brains, and of the models the platform holds inside each. */
export const BRAIN_CHAPTERS: IBrainChapter[] = [
  {
    id: 'start',
    label: 'Start',
    scene: 'opening',
    title: 'Virtual Labs Platform',
    hero: true,
    titleClass: SERIF_TITLE,
    // The left column of the screen's layout: a word on the platform and the recording.
    column: `${grid.grid} lg:w-[calc(var(--grid-x0)+var(--grid-col))] lg:max-w-none lg:pt-(--grid-y0)`,
    top: true,
    body: (
      <>
        <p className="max-w-[42em] text-[clamp(15px,1.15vw,17px)] leading-[1.6] text-neutral-600">
          An open virtual laboratory for neuroscience, in your browser. Explore data across species,
          build and simulate brain models from single neurons to whole brains, and share the results
          with your team.
        </p>
        <ConfigurationRecording className="mt-[6px] w-full max-w-[calc(50vh*1512/948)]" />
      </>
    ),
  },
  {
    id: 'simulate',
    label: 'Simulate',
    scene: 'configuration',
    title: 'Configure simulations & neuroscience workflows',
    hero: true,
    body: (
      <>
        <p>
          Set up a simulation campaign on any circuit in the platform: its stimuli, recordings and
          neuron sets, chosen beside the circuit in 3D and its table of neurons.
        </p>
        <p>
          Give any parameter a list of values to scan it, then generate and launch the whole campaign
          at once.
        </p>
      </>
    ),
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
    column: 'lg:w-[52%] lg:max-w-[720px]',
    body: (
      <>
        <p className="-mt-[4px] text-[15px] leading-[1.4] text-neutral-500">
          AI assistant, MCP server, Plugins + Connectors
        </p>
        <AgentPrompts />
      </>
    ),
  },
  {
    id: 'analysis',
    label: 'Analysis',
    scene: 'analysis',
    title: 'Interactive tools for analysis',
    hero: true,
    body: (
      <>
        <p>
          Explore a simulation&apos;s results as soon as they are in: voltage traces, spike rasters,
          PSTHs and spike statistics, beside the circuit in 3D.
        </p>
        <p>
          Filter the neurons in the table and every plot follows, ordered and grouped by cell type or
          by any property of the circuit.
        </p>
      </>
    ),
  },
  {
    id: 'teach',
    label: 'Teach',
    scene: 'teaching',
    kicker: 'For educators',
    title: 'Teach neuroscience by doing',
    hero: true,
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
  },
  {
    id: 'notebooks',
    label: 'Notebooks',
    scene: 'notebooks',
    title: 'Jupyter notebooks for interacting with data',
    hero: true,
    body: (
      <>
        <p>
          Open models, data and simulation results in Jupyter notebooks in the cloud: query them
          with Python, analyse them and plot them, with nothing to install.
        </p>
        <p>Start from the platform&apos;s own notebooks, or write your own and share them.</p>
      </>
    ),
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
    body: (
      <>
        <p>
          Closer in, a piece of cortex as a model: every neuron reconstructed, each in its place, and
          wired to the others by synapses, ready to simulate in your browser.
        </p>
        <p className="text-[12px] text-neutral-500">
          On screen: layer 6 of a column of rat somatosensory cortex, neuron by neuron.
        </p>
      </>
    ),
  },
  {
    id: 'fly',
    label: 'Fruit fly',
    scene: 'fly',
    colorBy: true,
    kicker: 'A fruit fly’s brain',
    title: 'A whole brain, neuron by neuron',
    body: (
      <>
        <p>
          FlyWire traced every neuron in an adult fruit fly&apos;s brain from electron microscopy:
          about 140,000 of them, and the 50 million or so synapses between them.
        </p>
        <p>
          <WhereReadable
            scene="fly"
            otherwise="Inside the brain here are those neurons, drawn where they run within 20 µm of its surface, each in its place."
          >
            Inside the brain here is a 1% sample of those neurons, each in its place, built from its
            reconstruction into a model that can be simulated, and wired by the synapses between them.
            Colour them by their class, and click any one to find out more.
          </WhereReadable>
        </p>
      </>
    ),
    after: <CircuitFacts scene="fly" design="brains" />,
  },
  {
    id: 'mouse',
    label: 'Mouse',
    scene: 'mouse',
    colorBy: true,
    kicker: 'A mouse’s brain',
    title: 'A piece of cortex, cell by cell',
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
          <WhereReadable scene="l6">
            {' '}
            Colour its neurons by their type, and click any one to find out more.
          </WhereReadable>
        </p>
      </>
    ),
    after: <CircuitFacts scene="l6" design="brains" />,
  },
  {
    id: 'microns',
    label: 'MICrONS',
    scene: 'microns',
    colorBy: true,
    kicker: 'A mouse’s visual cortex',
    title: 'A cubic millimetre, synapse by synapse',
    body: (
      <>
        <p>
          MICrONS imaged a cubic millimetre of a mouse&apos;s visual cortex by electron microscopy and
          traced it cell by cell: more than 200,000 cells, and the 500 million synapses between them.
        </p>
        <p>
          On the platform it is a circuit of 50,948 of those neurons, through the whole depth of the
          cortex, wired by the synapses traced between them. Its 877 proofread neurons are drawn whole
          from their reconstructions. Colour them by layer or type, and click any one to find out more.
        </p>
      </>
    ),
    // Anatomy alone: there are no electrical models to simulate it with.
    after: <CircuitFacts scene="microns" design="brains" simulate={false} />,
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
          simulated. Click it for its details.
        </p>
      </>
    ),
    after: <Actions model="human" />,
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
      <Row>
        <CourseLink design="brains" />
        <SectionLink section="data" />
        <SectionLink section="workflows" />
      </Row>
    ),
  },
];
