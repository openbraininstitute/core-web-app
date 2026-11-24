/** Where to click in a step's screenshot, in the screenshot's own px, and what the click does. */
export interface IWalkthroughClick {
  text: string;
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
  steps: IWalkthroughStep[];
  /** Where to go and do it, under the project. */
  tryIt: { label: string; path: string };
}

/** The size every screenshot was taken at. */
export const WALKTHROUGH_SHOT = { w: 1456, h: 819 };

const shot = (name: string) => `/images/walkthroughs/start-a-workflow/${name}.jpg`;

export const WALKTHROUGHS: IWalkthrough[] = [
  {
    id: 'start-a-workflow',
    title: 'Start a workflow',
    short:
      'Simulate a single neuron: choose the workflow, pick a neuron, add a stimulus and a recording, and generate.',
    steps: [
      {
        title: 'Open Workflows',
        image: shot('workflows'),
        clicks: [
          { text: 'Click Workflows in the bar at the top.', box: { x: 660, y: 8, w: 88, h: 42 } },
          { text: 'Click Simulate.', box: { x: 62, y: 260, w: 132, h: 138 } },
        ],
      },
      {
        title: 'Select the workflow type',
        image: shot('types'),
        clicks: [{ text: 'Click Single neuron.', box: { x: 199, y: 250, w: 146, h: 158 } }],
      },
      {
        title: 'Pick a neuron',
        image: shot('neuron'),
        clicks: [
          {
            text: 'Click a neuron in the list to see its details.',
            box: { x: 12, y: 164, w: 846, h: 114 },
            radius: 12,
          },
        ],
      },
      {
        title: 'Press Use model',
        image: shot('neuron'),
        clicks: [{ text: 'Click Use model.', box: { x: 1293, y: 744, w: 136, h: 51 } }],
      },
      {
        title: 'Add a stimulus',
        image: shot('configure'),
        clicks: [
          { text: 'Click the + beside Stimuli.', box: { x: 314, y: 376, w: 40, h: 40 } },
          {
            text: 'Choose Constant current clamp (relative).',
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
            box: { x: 376, y: 328, w: 345, h: 42 },
            radius: 10,
          },
          {
            text: 'Set how strong it is, as a percentage of the threshold current.',
            box: { x: 376, y: 564, w: 345, h: 42 },
            radius: 10,
          },
        ],
      },
      {
        title: 'Add a recording',
        image: shot('stimulus'),
        clicks: [
          { text: 'Click the + beside Recordings.', box: { x: 314, y: 492, w: 40, h: 40 } },
          {
            text: 'Choose Soma voltage recording (full experiment).',
            image: shot('recording-types'),
            box: { x: 378, y: 147, w: 342, h: 118 },
            radius: 18,
          },
        ],
      },
      {
        title: 'Generate',
        image: shot('ready'),
        clicks: [{ text: 'Click Generate simulation(s).', box: { x: 14, y: 726, w: 353, h: 52 } }],
      },
      {
        title: 'Name your campaign',
        image: shot('name'),
        clicks: [
          { text: 'Give it a name.', box: { x: 516, y: 342, w: 424, h: 42 }, radius: 14 },
          { text: 'Describe it.', box: { x: 516, y: 404, w: 424, h: 93 }, radius: 14 },
          { text: 'Click Generate simulation(s).', box: { x: 779, y: 503, w: 161, h: 39 } },
        ],
      },
    ],
    tryIt: { label: 'Open Workflows', path: '/workflows' },
  },
];

export function walkthroughOf(id: string | null): IWalkthrough {
  return WALKTHROUGHS.find((w) => w.id === id) ?? WALKTHROUGHS[0];
}
