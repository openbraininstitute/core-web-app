import { PICK_COLORS, slotColour } from '@/features/sonata-viewer/constants';

import type { Pick } from '@/features/sonata-viewer/trace-picks';

export const SELECTED_COLOUR = '#f5222d';

/** A line's colour in a plot of several contacts, given its contact and its place among them. */
export type LineColour = (contact: number, place: number) => string;

/** Each ticked contact's colour, as the voltage report's picked cells take theirs: by slot. */
export const pickColours = (picks: readonly Pick[]): ReadonlyMap<number, string> =>
  new Map(picks.map((p) => [p.nodeId, slotColour(p.slot)]));

/** A ticked contact's colour, or the selected one's; none for the rest. */
export const contactColour = (
  colours: ReadonlyMap<number, string>,
  selected: number | null,
  contact: number
): string | undefined =>
  colours.get(contact) ?? (contact === selected ? SELECTED_COLOUR : undefined);

/** A ticked contact's colour, the selected one's, or else one by its place. */
export const lineColour =
  (colours: ReadonlyMap<number, string>, selected: number | null): LineColour =>
  (contact, place) =>
    contactColour(colours, selected, contact) ?? PICK_COLORS[place % PICK_COLORS.length];

export const byPlace: LineColour = (_contact, place) => PICK_COLORS[place % PICK_COLORS.length];
