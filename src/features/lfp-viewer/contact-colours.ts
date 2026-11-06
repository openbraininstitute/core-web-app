import { PICK_COLORS, TRACE_COLORS } from '@/features/sonata-viewer/constants';

import type { Pick } from '@/features/sonata-viewer/trace-picks';

export const SELECTED_COLOUR = '#f5222d';

/** A line's colour in a plot of several contacts, given its contact and its place among them. */
export type LineColour = (contact: number, place: number) => string;

/** Each ticked contact's colour, as the voltage report's picked cells take theirs: by slot. */
export const pickColours = (picks: readonly Pick[]): ReadonlyMap<number, string> =>
  new Map(picks.map((p) => [p.nodeId, TRACE_COLORS[p.slot % TRACE_COLORS.length]]));

/** A ticked contact's colour, the selected one's, or else one by its place. */
export const lineColour =
  (colours: ReadonlyMap<number, string>, selected: number | null): LineColour =>
  (contact, place) =>
    colours.get(contact) ??
    (contact === selected ? SELECTED_COLOUR : PICK_COLORS[place % PICK_COLORS.length]);

export const byPlace: LineColour = (_contact, place) => PICK_COLORS[place % PICK_COLORS.length];
