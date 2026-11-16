import {
  Actions,
  CircuitFacts,
  CourseLink,
  Row,
  Scales,
  ScrollHint,
  SectionKey,
  SectionLink,
  Stat,
  Stats,
} from './bits';

import type { TWalkthroughScene } from './scenes';
import type { IWalkthroughChapter } from './walkthrough';

export interface IChapter extends IWalkthroughChapter {
  /** What the stage shows beside it. */
  scene: TWalkthroughScene;
  /** The cell laid flat, as its dendrogram. */
  flat?: boolean;
}

/**
 * The walkthrough, a screen at a time. The words are the platform's own where it has them: the
 * introduction to brain modeling course's, and its platform course's.
 */
export const CHAPTERS: IChapter[] = [
  {
    id: 'start',
    label: 'Start',
    scene: 'l6',
    kicker: 'A story about modeling the brain',
    title: 'From one neuron to a whole brain',
    hero: true,
    body: (
      <>
        <p>
          The Open Brain Platform puts brain data and models in one place: data from labs, the
          models built from it, and the tools to build and simulate more, all in your browser.
        </p>
        <p className="text-[12px] text-neutral-500">
          On screen: layer 6 of a column of rat somatosensory cortex, neuron by neuron.
        </p>
      </>
    ),
    after: <ScrollHint />,
  },
  {
    id: 'circuit',
    label: 'The circuit',
    scene: 'l6',
    colorBy: true,
    kicker: 'What you are looking at',
    title: 'A column of cortex, rebuilt cell by cell',
    body: (
      <>
        <p>
          Each of these neurons is a reconstructed shape, placed where its type is found in the
          cortex and wired to the others by synapses. Together they are a model that can be
          simulated.
        </p>
        <p>Colour them by what they are, and click any one to find out more.</p>
      </>
    ),
    after: <CircuitFacts scene="l6" />,
  },
  {
    id: 'neuron',
    label: 'One neuron',
    scene: 'cell',
    kicker: 'One neuron',
    title: 'Three parts, three jobs',
    body: (
      <>
        <p>
          The dendrites are where a neuron receives signals from other neurons. The soma weighs them
          up and decides whether to send a signal on, and the axon carries it to the next neurons.
        </p>
        <p>
          This one is a layer 5 tufted pyramidal cell from a rat&apos;s somatosensory cortex: a
          reconstructed morphology with an electrical model fitted to recordings, ready to simulate.
          Click it for its details.
        </p>
      </>
    ),
    after: (
      <>
        <SectionKey />
        <Actions model="cell" />
      </>
    ),
  },
  {
    id: 'flat',
    label: 'In 2D',
    scene: 'cell',
    flat: true,
    kicker: 'The same cell, laid flat',
    title: 'Following a signal through the tree',
    body: (
      <p>
        As a dendrogram, every branch keeps its length and its place in the tree, so a signal can be
        followed from the tip of a dendrite to the soma, and out along the axon.
      </p>
    ),
    after: <SectionKey />,
  },
  {
    id: 'talk',
    label: 'Signals',
    scene: 'course',
    kicker: 'From the course Introduction to brain modeling',
    title: 'How neurons talk',
    body: (
      <>
        <p>
          At rest there is slightly more negative charge inside a neuron than outside, and that
          difference is a voltage across its membrane. When a synapse opens, it lets current in and
          the voltage rises. The charge then spreads along the dendrite, and the voltage with it.
        </p>
        <p>
          Neurons process these inputs and pass signals on in turn. That communication underlies
          everything the brain does.
        </p>
      </>
    ),
    after: <CourseLink />,
  },
  {
    id: 'human',
    label: 'Human',
    scene: 'human',
    kicker: 'Where the data comes from',
    title: 'A human neuron, traced from electron microscopy',
    body: (
      <>
        <p>
          This pyramidal cell comes from H01: a cubic millimetre of human temporal cortex, cut into
          thousands of slices, imaged at nanometre resolution and traced cell by cell.
        </p>
        <p>
          On the platform a mesh like this can be skeletonized into a morphology, the first step
          towards a model of it. Click the cell for its details.
        </p>
      </>
    ),
    after: (
      <>
        <Stats>
          <Stat value="57,000" label="cells in H01" />
          <Stat value="150 million" label="synapses" />
        </Stats>
        <Actions model="human" />
      </>
    ),
  },
  {
    id: 'mouse',
    label: 'Mouse',
    scene: 'mouse',
    kicker: 'And in the mouse',
    title: 'A cubic millimetre of visual cortex',
    body: (
      <p>
        MICrONS mapped a cubic millimetre of mouse visual cortex, after recording what tens of
        thousands of its neurons did while the mouse watched films. This pyramidal cell is one of
        its reconstructions.
      </p>
    ),
    after: (
      <>
        <Stats>
          <Stat value="200,000" label="cells" />
          <Stat value="500 million" label="synapses" />
        </Stats>
        <Actions model="mouse" />
      </>
    ),
  },
  {
    id: 'fly',
    label: 'Fly brain',
    scene: 'fly',
    colorBy: true,
    kicker: 'Whole brains',
    title: "A fly's brain, ready to simulate",
    body: (
      <>
        <p>
          FlyWire mapped every neuron in an adult fruit fly&apos;s brain, about 140,000 of them, and
          the connections between them. On the platform it is a circuit to simulate in Brian2:
          excite the neurons that taste sugar, and watch the motor neurons of feeding answer.
        </p>
        <p>
          Shown here: one in a hundred of its neurons, with their shapes. Click one to see what it
          is.
        </p>
      </>
    ),
    after: <CircuitFacts scene="fly" />,
  },
  {
    id: 'cns',
    label: 'Nervous system',
    scene: 'cns',
    colorBy: true,
    kicker: 'Brain and nerve cord',
    title: 'A whole nervous system in one model',
    body: (
      <p>
        The male fly&apos;s central nervous system, from its brain down the nerve cord that runs
        through its body. Each neuron is simulated as a leaky integrate-and-fire unit in Brian2,
        with its connection strengths matched to FlyWire&apos;s.
      </p>
    ),
    after: <CircuitFacts scene="cns" />,
  },
  {
    id: 'workflows',
    label: 'Workflows',
    scene: 'workflows',
    kicker: 'Build, simulate, analyse',
    title: 'Standard recipes for modeling',
    body: (
      <>
        <p>
          Workflows build models, simulate them and analyse data: build an ion channel model or a
          neuron, simulate a neuron, a synaptome or a circuit, extract features from recordings, or
          optimise an e-model.
        </p>
        <p>
          Fill in a form, with a list of values wherever you want to scan. Generate makes the
          campaign, one simulation per combination; Launch runs it.
        </p>
      </>
    ),
    after: (
      <Row>
        <SectionLink section="workflows" primary />
      </Row>
    ),
  },
  {
    id: 'notebooks',
    label: 'Notebooks',
    scene: 'notebooks',
    kicker: 'Analyse in Python',
    title: 'Notebooks, and an assistant to help',
    body: (
      <p>
        Ready-made analysis notebooks run on the platform&apos;s JupyterHub, beside your own. The
        OBI Assistant searches the data and the literature, plots cells and traces, runs Python and
        fills in workflows&apos; forms for you.
      </p>
    ),
    after: (
      <Row>
        <SectionLink section="notebooks" primary />
      </Row>
    ),
  },
  {
    id: 'examples',
    label: 'Examples',
    scene: 'examples',
    wide: true,
    title: 'Models across species and scales',
    hero: true,
    body: null,
  },
  {
    id: 'next',
    label: 'Where next',
    scene: 'l6',
    kicker: 'Where next',
    title: 'Start anywhere on the scale',
    body: (
      <p>
        Everything you scrolled past is in Data, to explore, simulate and build on: from one neuron
        to a whole brain, and the model you make next.
      </p>
    ),
    after: (
      <>
        <Scales />
        <Row>
          <SectionLink section="data" />
          <SectionLink section="workflows" />
          <SectionLink section="notebooks" />
        </Row>
        <p className="text-[12px] text-neutral-500">Scroll on, or press →, for your home page.</p>
      </>
    ),
  },
];
