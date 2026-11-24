/** Where to click in a step's screenshot, in the screenshot's own px, and what the click does. */
export interface IWalkthroughClick {
  text: string;
  /** What is said over it in the video. */
  said: string;
  box: { x: number; y: number; w: number; h: number };
  /** The screenshot it is on, where that is not its step's. */
  image?: string;
  /** The box's corner radius (px of the screenshot); as round as it can be when left out. */
  radius?: number;
}

export interface IWalkthroughStep {
  title: string;
  image: string;
  clicks: IWalkthroughClick[];
}

export interface IWalkthrough {
  id: string;
  title: string;
  short: string;
  /** The size its screenshots were taken at. */
  shot: { w: number; h: number };
  steps: IWalkthroughStep[];
  /** The walkthrough as a narrated video, made from its steps, and what is said before and after them. */
  video?: { src?: string; intro: string; outro: string };
  /** Where to go and do it, under the project. */
  tryIt: { label: string; path: string };
}

const shotsOf = (id: string) => (name: string) => `/images/walkthroughs/${id}/${name}.jpg`;
const shot = shotsOf('start-a-workflow');
const dataShot = shotsOf('browse-data');

export const WALKTHROUGHS: IWalkthrough[] = [
  {
    id: 'start-a-workflow',
    title: 'Start a workflow',
    short:
      'Simulate a single neuron: choose the workflow, pick a neuron, add a stimulus and a recording, and generate.',
    shot: { w: 1456, h: 819 },
    steps: [
      {
        title: 'Open Workflows',
        image: shot('workflows'),
        clicks: [
          {
            text: 'Click Workflows in the bar at the top.',
            said: 'First, click Workflows, in the bar at the top.',
            box: { x: 660, y: 8, w: 88, h: 42 },
          },
          {
            text: 'Click Simulate.',
            said: 'Under, Start a new workflow, click Simulate.',
            box: { x: 62, y: 260, w: 132, h: 138 },
          },
        ],
      },
      {
        title: 'Select the workflow type',
        image: shot('types'),
        clicks: [
          {
            text: 'Click Single neuron.',
            said: "Now select the workflow type. Here, we'll choose Single neuron.",
            box: { x: 199, y: 250, w: 146, h: 158 },
          },
        ],
      },
      {
        title: 'Pick a neuron',
        image: shot('neuron'),
        clicks: [
          {
            text: 'Click a neuron in the list to see its details.',
            said: 'Pick a neuron from the list. Its details open on the right.',
            box: { x: 12, y: 164, w: 846, h: 114 },
            radius: 12,
          },
        ],
      },
      {
        title: 'Press Use model',
        image: shot('neuron'),
        clicks: [
          {
            text: 'Click Use model.',
            said: "When you're happy with it, press Use model.",
            box: { x: 1293, y: 744, w: 136, h: 51 },
          },
        ],
      },
      {
        title: 'Add a stimulus',
        image: shot('configure'),
        clicks: [
          {
            text: 'Click the + beside Stimuli.',
            said: 'The configuration opens. To add a stimulus, click the plus beside Stimuli.',
            box: { x: 314, y: 376, w: 40, h: 40 },
          },
          {
            text: 'Choose Constant current clamp (relative).',
            said: 'Choose Constant current clamp, relative.',
            image: shot('stimulus-types'),
            box: { x: 378, y: 314, w: 342, h: 118 },
            radius: 18,
          },
        ],
      },
      {
        title: 'Set the stimulus',
        image: shot('stimulus'),
        clicks: [
          {
            text: 'Set how long it lasts.',
            said: 'Set how long the current lasts, in milliseconds.',
            box: { x: 376, y: 328, w: 345, h: 42 },
            radius: 10,
          },
          {
            text: 'Set how strong it is, as a percentage of the threshold current.',
            said: "Then set how strong it is, as a percentage of the neuron's threshold current.",
            box: { x: 376, y: 564, w: 345, h: 42 },
            radius: 10,
          },
        ],
      },
      {
        title: 'Add a recording',
        image: shot('stimulus'),
        clicks: [
          {
            text: 'Click the + beside Recordings.',
            said: 'Next, add a recording. Click the plus beside Recordings.',
            box: { x: 314, y: 492, w: 40, h: 40 },
          },
          {
            text: 'Choose Soma voltage recording (full experiment).',
            said: 'Choose Soma voltage recording, full experiment.',
            image: shot('recording-types'),
            box: { x: 378, y: 147, w: 342, h: 118 },
            radius: 18,
          },
        ],
      },
      {
        title: 'Generate',
        image: shot('ready'),
        clicks: [
          {
            text: 'Click Generate simulation(s).',
            said: 'When everything is ready, click Generate simulations.',
            box: { x: 14, y: 726, w: 353, h: 52 },
          },
        ],
      },
      {
        title: 'Name your campaign',
        image: shot('name'),
        clicks: [
          {
            text: 'Give it a name.',
            said: 'Give your campaign a name,',
            box: { x: 516, y: 342, w: 424, h: 42 },
            radius: 14,
          },
          {
            text: 'Describe it.',
            said: 'and a short description.',
            box: { x: 516, y: 404, w: 424, h: 93 },
            radius: 14,
          },
          {
            text: 'Click Generate simulation(s).',
            said: 'Finally, click Generate simulations. The Simulations tab opens, ready for you to launch them.',
            box: { x: 779, y: 503, w: 161, h: 39 },
          },
        ],
      },
    ],
    video: {
      src: '/videos/walkthroughs/start-a-workflow.mp4',
      intro: "Start a workflow. In this walkthrough, we'll simulate a single neuron.",
      outro: "That's it. You've started your first workflow.",
    },
    tryIt: { label: 'Open Workflows', path: '/workflows' },
  },
  {
    id: 'browse-data',
    title: 'Browse data',
    short:
      'Find a neuron morphology: choose a species, a region and a type of data, filter the list, and open one.',
    shot: { w: 1463, h: 791 },
    steps: [
      {
        title: 'Open Data',
        image: dataShot('species'),
        clicks: [
          {
            text: 'Click Data in the bar at the top.',
            said: 'First, click Data, in the bar at the top.',
            box: { x: 602, y: 8, w: 64, h: 42 },
          },
        ],
      },
      {
        title: 'Choose a species',
        image: dataShot('species'),
        clicks: [
          {
            text: 'Click Mouse.',
            said: "Choose a species. We'll click Mouse.",
            box: { x: 720, y: 69, w: 352, h: 328 },
            radius: 18,
          },
        ],
      },
      {
        title: 'Choose a region',
        image: dataShot('regions'),
        clicks: [
          {
            text: 'Click a region in the 3D atlas, such as the striatum.',
            said: 'The brain atlas opens. Click a region in it, such as the striatum.',
            box: { x: 590, y: 296, w: 262, h: 210 },
            radius: 60,
          },
        ],
      },
      {
        title: 'Choose a type of data',
        image: dataShot('regions'),
        clicks: [
          {
            text: 'Choose Experimental, Model or Simulations.',
            said: 'On the left, choose between experimental data, models and simulations.',
            box: { x: 19, y: 129, w: 314, h: 46 },
          },
          {
            text: 'Click Morphology.',
            said: 'Then pick the type of data. Click Morphology.',
            box: { x: 18, y: 183, w: 314, h: 43 },
          },
        ],
      },
      {
        title: 'Search and filter',
        image: dataShot('list'),
        clicks: [
          {
            text: 'Search by name.',
            said: 'The morphologies of that region are listed. You can search them by name,',
            box: { x: 1092, y: 71, w: 264, h: 42 },
          },
          {
            text: 'Click the filters.',
            said: 'or click the filters',
            box: { x: 1358, y: 71, w: 42, h: 42 },
          },
          {
            text: 'Choose what to filter by.',
            image: dataShot('filters'),
            said: 'and choose what to filter by.',
            box: { x: 820, y: 126, w: 284, h: 278 },
            radius: 12,
          },
        ],
      },
      {
        title: 'Look at one',
        image: dataShot('list'),
        clicks: [
          {
            text: 'Click a row to see it in more detail.',
            said: 'Click a row to see it in more detail.',
            box: { x: 362, y: 524, w: 1080, h: 116 },
            radius: 10,
          },
        ],
      },
      {
        title: 'Press View details',
        image: dataShot('details'),
        clicks: [
          {
            text: 'Click View details.',
            said: 'For everything about it, press View details.',
            box: { x: 1285, y: 717, w: 141, h: 48 },
          },
        ],
      },
      {
        title: 'Download it',
        image: dataShot('page'),
        clicks: [
          {
            text: 'Click Download.',
            said: 'Its own page opens, with the neuron in 3D. To keep a copy, click Download.',
            box: { x: 46, y: 216, w: 244, h: 47 },
          },
        ],
      },
    ],
    video: {
      src: '/videos/walkthroughs/browse-data.mp4',
      intro: "Browse data. In this walkthrough, we'll find a neuron's morphology.",
      outro: "That's it. You've found your first morphology.",
    },
    tryIt: { label: 'Open Data', path: '/data' },
  },
];

export function walkthroughOf(id: string | null): IWalkthrough {
  return WALKTHROUGHS.find((w) => w.id === id) ?? WALKTHROUGHS[0];
}
