import { config } from '@/config';

/** An example, as the landing shows them: a picture, and a turning loop where there is one. */
export interface IExample {
  key: string;
  label: string;
  /** A line under it once it is the one on show. */
  blurb: string;
  img: string;
  video?: string;
  /** Picture width over the tile's: the subjects sit in white margins. */
  zoom: number;
  /** Zoom in the large hexagon, when it differs. */
  bigZoom?: number;
  /** A white fade round its edges, for a picture that fills its frame. */
  feather?: boolean;
  /** Its width on show beside the field, in the landing's 1920 px, and its picture's width over its height. */
  hero: number;
  aspect: number;
  /** The landing's bubble under the one on show: a kicker over the words, or just the label. */
  caption?: { kicker: string; text: string };
}

const FLY = {
  img: '/static/landing-v1/fly-brain.jpg',
  video: '/static/landing-v1/fly-brain.mp4',
  zoom: 0.68,
  bigZoom: 0.8,
  hero: 700,
  aspect: 720 / 920,
};

/**
 * The landing's examples (`landing-tile-renderer.js` FEATURES). Each plays its own loop where it has one; the three
 * with only a picture play the fly brain's, as every example but the dendrite ride does on the landing for now.
 */
export const EXAMPLES: IExample[] = [
  {
    key: 'fly-brain',
    label: 'Simulate whole brains',
    blurb: 'The male fly’s brain and nerve cord, lit as its model’s neurons fire.',
    caption: { kicker: 'Simulate', text: 'Whole brain model of the Fly Central Nervous System' },
    ...FLY,
  },
  {
    key: 'microcircuit',
    label: 'Simulate activity',
    blurb: 'A cortical microcircuit, its neurons firing.',
    img: '/static/landing-v1/microcircuit.jpg',
    video: '/static/landing-v1/microcircuit.mp4',
    zoom: 0.7,
    bigZoom: 0.78,
    hero: 640,
    aspect: 600 / 886,
  },
  {
    key: 'spiny-neuron',
    label: 'Skeletonize meshes',
    blurb: 'A neuron’s EM mesh, its spines coloured by their distance from the soma.',
    img: '/static/landing-v1/spiny-neuron.jpg',
    video: '/static/landing-v1/spiny-neuron.mp4',
    zoom: 1.5,
    hero: 700,
    aspect: 600 / 1064,
  },
  {
    key: 'explore',
    label: 'Explore data',
    blurb: 'Reconstructed neurons from across species, ready to use.',
    ...FLY,
  },
  {
    key: 'build',
    label: 'Build models',
    blurb: 'From single neurons to whole-brain models.',
    ...FLY,
  },
  {
    key: 'dendrite-ride',
    label: 'Extract spines',
    blurb: 'Riding down a dendrite past its spines.',
    img: '/static/landing-v1/dendrite-ride.jpg?v=3',
    video: '/static/landing-v1/dendrite-ride.mp4?v=3',
    zoom: 1.15,
    feather: true,
    hero: 760,
    aspect: 1,
  },
  {
    key: 'virtual-labs',
    label: 'Virtual labs',
    blurb: 'Your lab’s data, models and results in one place.',
    ...FLY,
  },
  // more below the landing's (the user asked): the platform's other models, from its pictures of them; the scales'
  // are full-frame, so they fill their tiles and fade out at their edges on show
  {
    key: 'male-cns',
    label: 'Simulate the male CNS',
    blurb: 'The male fly’s whole central nervous system, every neuron of it, as a model to run.',
    img: '/images/start/walkthrough/landing-male-cns-large.webp',
    zoom: 0.62,
    bigZoom: 0.72,
    hero: 640,
    aspect: 1148 / 1590,
  },
  {
    key: 'single-neuron',
    label: 'Model single neurons',
    blurb: 'A neuron’s morphology and its electrical model, ready to simulate.',
    img: '/images/scales/singleNeuron.jpg',
    zoom: 1.2,
    feather: true,
    hero: 560,
    aspect: 1,
  },
  {
    key: 'paired-neurons',
    label: 'Pair neurons',
    blurb: 'Two connected neurons and the synapses between them.',
    img: '/images/scales/pairedNeuron.jpg',
    zoom: 1.2,
    feather: true,
    hero: 560,
    aspect: 1,
  },
  {
    key: 'synaptome',
    label: 'Build synaptomes',
    blurb: 'A neuron with every synapse onto it placed on its morphology.',
    img: '/images/scales/synaptome.jpg',
    zoom: 1.2,
    feather: true,
    hero: 560,
    aspect: 1,
  },
  {
    key: 'brain-region',
    label: 'Model brain regions',
    blurb: 'A region’s circuit at full density, built from its atlas.',
    img: '/images/scales/brainRegion.jpg',
    zoom: 1.2,
    feather: true,
    hero: 560,
    aspect: 1,
  },
  {
    key: 'whole-brain',
    label: 'Whole-brain models',
    blurb: 'Whole brains, from the mouse’s to the fly’s, to explore and simulate.',
    img: '/images/scales/wholeBrain.jpg',
    zoom: 1.2,
    feather: true,
    hero: 560,
    aspect: 1,
  },
];

export interface IJourneyCard {
  label: string;
  icon: string;
  /** A line on what it is, under its name. */
  blurb: string;
  /** Absolute, or within the project when it has no leading slash. No page yet: none. */
  href?: string;
  /** A picture of that part of the platform, filling its hexagon instead of the icon. */
  img?: string;
  /** Where the picture's subject sits (CSS object-position): a wide screenshot shows only a strip of its width. */
  imgAt?: string;
  /** What it does on the page instead of going anywhere: `ai` opens the AI assistant. */
  action?: 'ai';
}

export interface IJourneyGroup {
  title: string;
  cards: IJourneyCard[];
}

/** Figma AI-Trial 306:1752, "Where would you like to start?": the platform's places by what they are for. */
export function journeyGroups({ learn }: { learn: boolean }): IJourneyGroup[] {
  return [
    {
      title: 'Do science',
      // the whole platform, each with a picture of it
      cards: [
        {
          label: 'Data',
          icon: 'data',
          href: 'data',
          blurb: 'Experimental data and models to browse',
          img: '/images/start/walkthrough/explore-data-models.jpg',
        },
        {
          label: 'Workflows',
          icon: 'workflows',
          href: 'workflows',
          blurb: 'Build, simulate and analyse',
          img: '/images/workflow-previews/configure.jpg',
          imgAt: '68% center',
        },
        {
          label: 'Notebooks',
          icon: 'notebooks',
          href: 'notebooks',
          blurb: 'Python analyses in the browser',
          img: '/images/start/walkthrough/notebooks.jpg',
          imgAt: '56% center',
        },
        {
          label: 'Virtual labs',
          icon: 'labs',
          href: config.ROOT_ROUTE,
          blurb: 'Your labs, projects and team',
          img: '/images/start/walkthrough/virtual-labs.jpg',
          imgAt: '76% center',
        },
        {
          label: 'Reports',
          icon: 'reports',
          href: 'reports',
          blurb: 'Your findings, written up and shared',
          img: '/images/workflow-previews/analysis.jpg',
          imgAt: '78% center',
        },
        // the user asked for a sixth; there is no page for it yet, so it opens the assistant, and the MCP server is
        // https://cell-a.openbraininstitute.org/api/agent-ts/mcp (as the platform course has it)
        {
          label: 'AI, Plugins, MCP Server',
          icon: 'ai',
          blurb: 'The platform from Claude, ChatGPT and other agents',
          action: 'ai',
        },
      ],
    },
    {
      title: 'Learn & teach',
      cards: [
        { label: 'Tutorials', icon: 'tutorials', href: 'tutorials', blurb: 'Step-by-step guides' },
        {
          label: 'Free courses',
          icon: 'learning',
          href: learn ? 'learn' : undefined,
          blurb: 'Learn to model the brain',
        },
        { label: 'Teach', icon: 'teaching', blurb: 'Run a course on the platform' },
        {
          label: 'Glossary',
          icon: 'glossary',
          href: '/app/documentation/glossary',
          blurb: 'The terms, explained',
        },
      ],
    },
    {
      title: 'The institute',
      cards: [
        { label: 'About', icon: 'about', href: '/about', blurb: 'Who we are and what we do' },
        { label: 'News', icon: 'news', href: '/news', blurb: 'What is new at the institute' },
        { label: 'Publications', icon: 'publications', href: '/resources', blurb: 'Papers built on the platform' },
        { label: 'Pricing', icon: 'pricing', href: '/pricing', blurb: 'Plans and credits' },
      ],
    },
  ];
}

export function journeyHref(href: string, base: string): string {
  return href.startsWith('/') ? href : `${base}/${href}`;
}

export interface IExampleVideo {
  key: string;
  title: string;
  /** What it is, above the title. */
  kind: string;
  poster: string;
  /** Played in place on hover, and large on a click. */
  video?: string;
  /** A tutorial's own page instead, within the project. */
  href?: string;
  /** A tutorial's own video, a YouTube link or a file: played here as the platform's player plays it. */
  url?: string;
}

/** The platform's own screen recordings and animations, as the walkthroughs use them. */
export const LOCAL_VIDEOS: IExampleVideo[] = [
  {
    key: 'simulation-configuration',
    kind: 'Workflow',
    title: 'Configure a simulation in a few clicks',
    poster: '/images/start/walkthrough/simulation-configuration.jpg',
    video: '/images/start/walkthrough/simulation-configuration.mp4',
  },
  {
    key: 'virtual-labs',
    kind: 'Tour',
    title: 'Your virtual lab',
    poster: '/images/start/walkthrough/virtual-labs.jpg',
    video: '/images/start/walkthrough/virtual-labs.mp4',
  },
  {
    key: 'explore-data-models',
    kind: 'Data',
    title: 'Explore data and models',
    poster: '/images/start/walkthrough/explore-data-models.jpg',
    video: '/images/start/walkthrough/explore-data-models.mp4',
  },
  {
    key: 'notebooks',
    kind: 'Notebooks',
    title: 'Jupyter notebooks on your data',
    poster: '/images/start/walkthrough/notebooks.jpg',
    video: '/images/start/walkthrough/notebooks.mp4',
  },
  {
    key: 'models-mosaic',
    kind: 'Models',
    title: 'Models across species and scales',
    poster: '/images/start/walkthrough/models-mosaic.jpg',
    video: '/images/start/walkthrough/models-mosaic.mp4',
  },
  {
    key: 'education',
    kind: 'Teaching',
    title: 'Teach neuroscience by doing',
    poster: '/images/start/walkthrough/education-poster.jpg',
    video: '/images/start/walkthrough/education.mp4',
  },
  {
    key: 'get-started',
    kind: 'Get started',
    title: 'Get started in minutes',
    poster: '/images/start/walkthrough/get-started-mosaic.jpg',
    video: '/images/start/walkthrough/get-started-mosaic.mp4',
  },
];
