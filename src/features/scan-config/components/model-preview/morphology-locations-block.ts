import { atom } from 'jotai';
import { z } from 'zod';

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

/**
 * Every explicit block's rows, in dictionary order.
 *
 * For showing what already exists while the form is on some other block: the locations stay
 * on screen instead of vanishing the moment the user looks away from them.
 */
export function readAllLocations(config: Config | null | undefined): IStoredLocation[] {
  const dictionary = config?.[MORPHOLOGY_LOCATIONS_CONFIG_KEY];
  if (!isObject(dictionary)) return [];

  return Object.values(dictionary).flatMap((block) =>
    isObject(block) ? readLocations(block) : []
  );
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
