/**
 * What part of a cell a morphology's section is, in the numbers OBI-One's sections carry them in, which are
 * morphoviewer's `MorphoViewerTreeItemType`'s. A plain object and a union of numbers rather than an enum, so that
 * morphoviewer's enum and this pass for one another while both are in use.
 */
export const SectionType = {
  Soma: 0,
  Dendrite: 1,
  BasalDendrite: 2,
  ApicalDendrite: 3,
  Myelin: 4,
  Axon: 5,
  Selected: 6,
  Liaison: 7,
  Unknown: 8,
} as const;

export type SectionType = (typeof SectionType)[keyof typeof SectionType];
