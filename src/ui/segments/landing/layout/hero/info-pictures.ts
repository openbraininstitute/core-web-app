/**
 * The information pages' pictures, all turned through on every page (as on the supplied infoPage.html). The first
 * three are placeholders, for the pages without a picture of their own yet; the others are each a page's own, a
 * 1920 x 1080 composition, drawn over the whole stage.
 */
export const INFO_PICTURES: ReadonlyArray<{ src: string; w?: number; full?: boolean }> = [
  { src: '/static/hexa-tiles/flywire.png', w: 1000 },
  { src: '/static/hexa-tiles/full-brain.png', w: 1300 },
  { src: '/static/hexa-tiles/microcircuit.png', w: 1300 },
  ...['about', 'contact', 'features', 'mission', 'news', 'pricing', 'privacy'].map((page) => ({
    src: `/static/hexa-tiles/info/${page}.webp`,
    full: true,
  })),
];

/** The pages with a picture of their own, by slug: its index in INFO_PICTURES. */
const PAGE_PICTURES: Readonly<Record<string, number>> = {
  about: 3,
  contact: 4,
  features: 5,
  mission: 6,
  news: 7,
  pricing: 8,
  privacy: 9,
};

/** The picture a page opens on: its own, or one of the placeholders other than the one the page before opened on. */
export function pagePicture(slug: string, placeholder: number): number {
  return PAGE_PICTURES[slug] ?? placeholder;
}
