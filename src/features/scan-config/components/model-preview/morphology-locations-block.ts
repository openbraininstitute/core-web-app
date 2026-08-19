import { atom } from 'jotai';
import { z } from 'zod';

import { morphologyLocationsColor } from '@/features/scan-config/components/color-by/palette';
import { isObject } from '@/util/type-guards';

import { MORPHOLOGY_LOCATIONS_CONFIG_KEY } from './morphology-locations-key';

import type { Config } from '@/features/scan-config/types';

/** Only this block type stores locations outright; the others describe how to sample them. */
export const EXPLICIT_BLOCK_TYPE = 'ExplicitMorphologyLocations';

/** One stored location: a SONATA section id and a normalized offset along that section. */
export const StoredLocationSchema = z.object({
  section_id: z.number(),
  offset: z.number(),
});

export type IStoredLocation = z.infer<typeof StoredLocationSchema>;

/** The selected block, or null when the form is not on a morphology-locations entry. */
export function readEntry(config: Config | null | undefined, entry: string | undefined) {
  if (!config || !entry) return null;
  const dictionary = (config as Record<string, unknown>)[MORPHOLOGY_LOCATIONS_CONFIG_KEY];
  const block = isObject(dictionary) ? dictionary[entry] : null;
  return isObject(block) ? block : null;
}

/** The rows that are complete locations; anything else is dropped rather than rendered. */
export function readLocationRows(value: unknown): IStoredLocation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const parsed = StoredLocationSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

/** An explicit block's stored rows. */
export function readLocations(block: Record<string, unknown> | null): IStoredLocation[] {
  if (block?.type !== EXPLICIT_BLOCK_TYPE) return [];
  return readLocationRows(block.locations);
}

/** A stored location, plus the colour of the block it belongs to. */
export type IColoredLocation = IStoredLocation & { color: string };

/** One block's rows, tagged with the block's colour. */
export function readColoredLocations(
  block: Record<string, unknown> | null,
  entry: string
): IColoredLocation[] {
  const color = morphologyLocationsColor(entry);
  return readLocations(block).map((location) => ({ ...location, color }));
}

/** Every explicit block's rows, each tagged with its block's colour. */
export function readAllLocations(config: Config | null | undefined): IColoredLocation[] {
  return readDictionary(config).flatMap(([entry, block]) => readColoredLocations(block, entry));
}

/** The morphology-locations dictionary, or null. Its identity survives edits elsewhere. */
export function readLocationsDictionary(config: Config | null | undefined) {
  const dictionary = config?.[MORPHOLOGY_LOCATIONS_CONFIG_KEY];
  return isObject(dictionary) ? dictionary : null;
}

/** Whether any block holds at least one location. */
export function hasAnyLocation(config: Config | null | undefined): boolean {
  return readDictionary(config).some(([, block]) => readLocations(block).length > 0);
}

function readDictionary(
  config: Config | null | undefined
): Array<[string, Record<string, unknown>]> {
  const dictionary = readLocationsDictionary(config);
  if (!dictionary) return [];

  const entries: Array<[string, Record<string, unknown>]> = [];
  for (const [entry, block] of Object.entries(dictionary)) {
    if (isObject(block)) entries.push([entry, block]);
  }
  return entries;
}

/** Whether the form selection is one a 3D click can add a location to. */
export function supportsMorphologyLocationPicking({
  config,
  selectedRootElement,
  selectedEntry,
}: {
  config?: Config | null;
  selectedRootElement?: string;
  selectedEntry?: string;
}): boolean {
  if (selectedRootElement !== MORPHOLOGY_LOCATIONS_CONFIG_KEY) return false;
  return readEntry(config, selectedEntry)?.type === EXPLICIT_BLOCK_TYPE;
}

/**
 * Set while the pointer is on the "add locations from the 3D viewer" hint.
 *
 * Why jotai: the hint is a form widget and the viewer is a sibling pane, so they share no
 * parent worth threading a prop through.
 */
export const morphologyLocationsHintHoveredAtom = atom(false);
