/** The original information-page artwork, rotated through the shared hexagonal tile animation. */
export const INFO_PICTURES: ReadonlyArray<{ src: string; w?: number; full?: boolean }> = [
  { src: '/static/hexa-tiles/flywire.png', w: 1000 },
  { src: '/static/hexa-tiles/full-brain.png', w: 1300 },
  { src: '/static/hexa-tiles/microcircuit.png', w: 1300 },
];

/** Open on a different original image from the previous page. */
export function pagePicture(_slug: string, placeholder: number): number {
  return placeholder;
}
