import type { HexagonArtwork } from './hexagon-hero';

const artwork = (name: string): HexagonArtwork => ({
  mosaic: `/static/information-heroes/${name}-mosaic.webp`,
  solid: `/static/information-heroes/${name}-solid.webp`,
});

// Pages sharing the same CMS hero also share their corresponding generated artwork.
export const HEXAGON_ARTWORKS: Readonly<Record<string, HexagonArtwork>> = {
  about: artwork('about'),
  mission: artwork('mission'),
  news: artwork('news'),
  team: artwork('team'),
  contact: artwork('contact'),
  resources: artwork('notebooks'),
  notebooks: artwork('notebooks'),
  privacy: artwork('privacy'),
  terms: artwork('privacy'),
  financing: artwork('financing'),
  pricing: artwork('financing'),
  features: artwork('showcases'),
  showcases: artwork('showcases'),
  'the-real-digital-brain-story': artwork('the-real-digital-brain-story'),
  'releasing-soon': artwork('releasing-soon'),
};
