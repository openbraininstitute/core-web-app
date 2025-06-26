export const SECTION_VISUALIZATION = 'visualization';
export const SECTION_OVERVIEW = 'overview';
export const SECTION_PROVENANCE = 'provenance';
export const SECTION_RELATED_PUBLICATIONS = 'related-publications';
export const SECTION_RELATED_CIRCUITS = 'related-circuits';

export const ACTIVE_SECTIONS = [
  SECTION_OVERVIEW,
  SECTION_PROVENANCE,
  SECTION_RELATED_PUBLICATIONS,
  SECTION_RELATED_CIRCUITS,
  SECTION_VISUALIZATION,
] as const;

export type ActiveSection = (typeof ACTIVE_SECTIONS)[number];
