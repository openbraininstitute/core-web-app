import { optimizedMedia } from './optimized-media';

type LandingModel = {
  label: string;
  img: string;
  video?: string;
  originalVideo?: boolean;
  preview?: string;
  heroBounds?: { x: number; y: number; width: number; height: number };
  zoom: number;
  hero: number;
  alt: string;
  feather?: boolean;
  rate?: number;
  caption?: { kicker: string; text: string };
};

/** The landing's three films (this version: shown one at a time beside the white tile field). */
const MODELS: readonly LandingModel[] = [
  {
    label: 'Experiment with neural circuits',
    img: '/static/landing-v1/microcircuits.jpg',
    video: '/static/landing-v1/microcircuits.mp4',
    originalVideo: true,
    heroBounds: { x: 0.31328, y: 0.08472, width: 0.36953, height: 0.83056 },
    zoom: 1.7,
    hero: 640,
    alt: 'Simulated cortical microcircuit, its neurons firing',
  },
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
];

// Keep the column at original quality; the other models use their optimized media variants.
export const LANDING_MODELS: readonly LandingModel[] = MODELS.map((model) => ({
  ...model,
  img: optimizedMedia(model.img, 'poster'),
  video: model.video
    ? model.originalVideo
      ? model.video
      : optimizedMedia(model.video, 'full')
    : undefined,
  preview: model.video
    ? model.originalVideo
      ? model.video
      : optimizedMedia(model.video, 'preview')
    : undefined,
}));
