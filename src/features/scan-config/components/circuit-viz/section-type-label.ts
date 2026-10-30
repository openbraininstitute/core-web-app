import { SectionType } from '@/features/circuit-viewer/section-type';

/**
 * Human labels for the section types a morphology can report.
 *
 * The viewer hands over the enum rather than a string so the wording lives here, next to the
 * rest of the UI copy. `Dendrite` is what the viewer calls a basal dendrite on a cell with no
 * apical one, where the distinction would be noise.
 */
const SECTION_TYPE_LABELS: Partial<Record<SectionType, string>> = {
  [SectionType.Soma]: 'Soma',
  [SectionType.Axon]: 'Axon',
  [SectionType.Dendrite]: 'Dendrite',
  [SectionType.BasalDendrite]: 'Basal dendrite',
  [SectionType.ApicalDendrite]: 'Apical dendrite',
  [SectionType.Myelin]: 'Myelin',
};

/** Section types a morphology location may sit on today. */
const TARGETABLE_SECTION_TYPES: readonly SectionType[] = [
  SectionType.BasalDendrite,
  SectionType.ApicalDendrite,
  SectionType.Dendrite,
];

/** Whether a location may sit on this section. */
export function isTargetableSectionType(sectionType: SectionType | undefined): boolean {
  return sectionType !== undefined && TARGETABLE_SECTION_TYPES.includes(sectionType);
}

/**
 * Display name for a section type, or `undefined` when there is nothing useful to say.
 *
 * Returns `undefined` rather than "Unknown" so callers can omit the row: a label that says
 * nothing is worse than no label.
 */
export function sectionTypeLabel(type: SectionType | undefined): string | undefined {
  return type === undefined ? undefined : SECTION_TYPE_LABELS[type];
}
