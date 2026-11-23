type LandingModel = {
  label: string;
  img: string;
  video?: string;
  heroBounds?: { x: number; y: number; width: number; height: number };
  zoom: number;
  hero: number;
  alt: string;
  feather?: boolean;
  rate?: number;
  caption?: { kicker: string; text: string };
};

export const LANDING_MODELS: readonly LandingModel[] = [
  {
    label: 'Simulate whole-brain activity',
    img: '/static/landing-v1/fly-brain.jpg',
    // a turning loop: the tile shows its frames as it plays, the picture until then
    video: '/static/landing-v1/fly-brain.mp4',
    // small enough that the whole brain and nerve cord sit inside the hexagon, seen from any side
    zoom: 0.68,
    hero: 700,
    alt: "The male fly's brain and nerve cord, lit as its model's neurons fire",
  },
  {
    label: 'Experiment with neural circuits',
    img: '/static/landing-v1/microcircuits.jpg',
    video: '/static/landing-v1/microcircuits.mp4',
    heroBounds: { x: 0.31328, y: 0.08472, width: 0.36953, height: 0.83056 },
    zoom: 1.7,
    hero: 640,
    alt: 'Simulated cortical microcircuit, its neurons firing',
  },
  {
    label: 'Explore brain structure',
    img: '/static/landing-v1/somatosensory.jpg',
    video: '/static/landing-v1/somatosensory.mp4',
    heroBounds: { x: 0.25391, y: 0.12917, width: 0.51562, height: 0.69583 },
    zoom: 1.7,
    hero: 760,
    alt: 'A somatosensory cortex model',
  },
  {
    label: 'Build detailed brain models',
    img: '/static/landing-v1/hippocampus-growth.jpg',
    video: '/static/landing-v1/hippocampus-growth.mp4',
    heroBounds: { x: 0.26953, y: 0.14583, width: 0.5, height: 0.7625 },
    zoom: 1.7,
    hero: 780,
    alt: 'A hippocampus model',
  },
  {
    label: 'Navigate across brain regions',
    img: '/static/landing-v1/full-brain.jpg',
    video: '/static/landing-v1/full-brain.mp4',
    heroBounds: { x: 0.27734, y: 0.17222, width: 0.45156, height: 0.59306 },
    zoom: 1.7,
    hero: 760,
    alt: 'Brain atlas',
  },
  {
    label: 'Inspect neuronal connectivity',
    img: '/static/landing-v1/thalamus-growth.jpg',
    video: '/static/landing-v1/thalamus-growth.mp4',
    heroBounds: { x: 0.3, y: 0.275, width: 0.42656, height: 0.55 },
    zoom: 1.7,
    hero: 700,
    alt: 'A thalamus model showing neuronal connectivity',
  },
  {
    label: 'Extract skeletons and spines',
    img: '/static/landing-v1/dendrite-ride.jpg?v=3',
    // the learn branch's fly-through down the cell's spiniest dendrite, its mesh opaque in the fly model's blue, its
    // sections' spines each a colour of their own, there and back (a loop with no jump), stepped at half the ride's pace
    video: '/static/landing-v1/dendrite-ride.mp4?v=3',
    // it fills its frame to the edges: a white fade round them
    feather: true,
    zoom: 1.15,
    hero: 760,
    alt: 'Riding down a dendrite past its spines, coloured by their distance from the soma',
  },
  {
    label: 'Visualize cortical architecture',
    img: '/static/landing-v1/neocortex-growth.jpg',
    video: '/static/landing-v1/neocortex-growth.mp4',
    heroBounds: { x: 0.26641, y: 0.2125, width: 0.46641, height: 0.58333 },
    zoom: 1.7,
    hero: 700,
    alt: 'A neocortex growing',
  },
];
