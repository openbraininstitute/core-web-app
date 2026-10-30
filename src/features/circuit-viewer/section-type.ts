/** What part of a cell a morphology's section is, in the numbers OBI-One's sections carry them in. */
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
