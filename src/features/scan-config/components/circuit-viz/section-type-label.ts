import { MorphoViewerTreeItemType } from '@/morpho-viewer';

/**
 * Human labels for the section types a morphology can report.
 *
 * The viewer hands over the enum rather than a string so the wording lives here, next to the
 * rest of the UI copy. `Dendrite` is what the viewer calls a basal dendrite on a cell with no
 * apical one, where the distinction would be noise.
 */
const SECTION_TYPE_LABELS: Partial<Record<MorphoViewerTreeItemType, string>> = {
  [MorphoViewerTreeItemType.Soma]: 'Soma',
  [MorphoViewerTreeItemType.Axon]: 'Axon',
  [MorphoViewerTreeItemType.Dendrite]: 'Dendrite',
  [MorphoViewerTreeItemType.BasalDendrite]: 'Basal dendrite',
  [MorphoViewerTreeItemType.ApicalDendrite]: 'Apical dendrite',
  [MorphoViewerTreeItemType.Myelin]: 'Myelin',
};

/** Section types a morphology location may sit on today. */
export const TARGETABLE_SECTION_TYPES: readonly MorphoViewerTreeItemType[] = [
  MorphoViewerTreeItemType.BasalDendrite,
  MorphoViewerTreeItemType.ApicalDendrite,
  MorphoViewerTreeItemType.Dendrite,
];

/**
 * Whether a location may sit on this section.
 *
 * Takes `number` because the enum is declared in both the viewer package and this feature,
 * and TypeScript treats those as different types even though the values match.
 */
export function isTargetableSectionType(sectionType: number | undefined): boolean {
  return sectionType !== undefined && TARGETABLE_SECTION_TYPES.includes(sectionType);
}

/**
 * Display name for a section type, or `undefined` when there is nothing useful to say.
 *
 * Returns `undefined` rather than "Unknown" so callers can omit the row: a label that says
 * nothing is worse than no label.
 */
export function sectionTypeLabel(type: MorphoViewerTreeItemType | undefined): string | undefined {
  return type === undefined ? undefined : SECTION_TYPE_LABELS[type];
}
