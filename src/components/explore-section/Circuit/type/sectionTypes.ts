export const SECTION_VISUALIZATION = 'visualization';
export const SECTION_OVERVIEW = 'overview';
export const SECTION_PROVENANCE = 'provenance';
export const SECTION_RELATED_PUBLICATIONS = 'related-publications';
export const SECTION_RELATED_CIRCUITS = 'related-circuits';

const _ACTIVE_SECTIONS = [
  SECTION_OVERVIEW,
  SECTION_PROVENANCE,
  SECTION_RELATED_PUBLICATIONS,
  SECTION_RELATED_CIRCUITS,
  SECTION_VISUALIZATION,
] as const;

export type ActiveSection = (typeof _ACTIVE_SECTIONS)[number];
