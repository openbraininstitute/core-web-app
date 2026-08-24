import { atom } from 'jotai';
import { z } from 'zod';

import { isObject } from '@/util/type-guards';

import type { Config } from '@/features/scan-config/types';

/** Block-dictionary key holding morphology-location blocks in a scan config. */
export const MORPHOLOGY_LOCATIONS_CONFIG_KEY = 'morphology_locations';

/** Only this block type stores locations outright; the others describe how to sample them. */
export const EXPLICIT_BLOCK_TYPE = 'ExplicitMorphologyLocations';

/** One stored location: a SONATA section id and a normalized offset along that section. */
const StoredLocationSchema = z.object({
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

/** A stored location, plus which block it came from and where it sits in that block. */
export type ITaggedLocation = IStoredLocation & {
  entry: string;
  /** Row number inside its own block, which is what an edit addresses. */
  index: number;
};

/** Every explicit block's rows in a dictionary, each tagged with its block. */
export function collectLocations(dictionary: Record<string, unknown> | null): ITaggedLocation[] {
  return blocksOf(dictionary).flatMap(([entry, block]) =>
    readLocations(block).map((location, index) => ({ ...location, entry, index }))
  );
}

/** The morphology-locations dictionary, or null. Its identity survives edits elsewhere. */
export function readLocationsDictionary(config: Config | null | undefined) {
  const dictionary = config?.[MORPHOLOGY_LOCATIONS_CONFIG_KEY];
  return isObject(dictionary) ? dictionary : null;
}

/** Whether any block holds at least one location. */
export function hasAnyLocation(config: Config | null | undefined): boolean {
  return blocksOf(readLocationsDictionary(config)).some(
    ([, block]) => readLocations(block).length > 0
  );
}

function blocksOf(
  dictionary: Record<string, unknown> | null
): Array<[string, Record<string, unknown>]> {
  if (!dictionary) return [];

  const entries: Array<[string, Record<string, unknown>]> = [];
  for (const [entry, block] of Object.entries(dictionary)) {
    if (isObject(block)) entries.push([entry, block]);
  }
  return entries;
}

/** What the form gives the 3D viewer so a pick can write back to the config. */
export interface IFormBindingOptions {
  config?: Config | null;
  onConfigChange?: (updater: (previous: Config) => Config) => void;
  /** Which block dictionary the form is editing. */
  selectedRootElement?: string;
  /** The dictionary entry being edited; a pick is appended to this one. */
  selectedEntry?: string;
  /** Add a block and open it. Without it, a pick with no block open does nothing. */
  onCreateEntry?: (rootElement: string, block: Record<string, unknown>) => void;
  /** Whether the model takes explicit locations. Off unless the host says otherwise. */
  supportsExplicitLocations?: boolean;
}

/** Whether the form selection is one a 3D click can add a location to. */
export function supportsMorphologyLocationPicking({
  config,
  selectedRootElement,
  selectedEntry,
}: IFormBindingOptions): boolean {
  if (selectedRootElement !== MORPHOLOGY_LOCATIONS_CONFIG_KEY) return false;
  return readEntry(config, selectedEntry)?.type === EXPLICIT_BLOCK_TYPE;
}

/** What a 3D click does here: extend the open block, or start a new one. */
export const MorphologyLocationPickModeDict = {
  Edit: 'edit',
  Create: 'create',
} as const;

/** `null` when a click does nothing. */
export type TMorphologyLocationPickModeDict =
  | (typeof MorphologyLocationPickModeDict)[keyof typeof MorphologyLocationPickModeDict]
  | null;

/** One rule for whether picking is on, used by both the viewer host and the pick handler. */
export function morphologyLocationPickMode({
  config,
  selectedRootElement,
  selectedEntry,
  onConfigChange,
  onCreateEntry,
  supportsExplicitLocations,
}: IFormBindingOptions): TMorphologyLocationPickModeDict {
  if (!supportsExplicitLocations) return null;

  if (supportsMorphologyLocationPicking({ config, selectedRootElement, selectedEntry })) {
    return onConfigChange ? MorphologyLocationPickModeDict.Edit : null;
  }
  return onCreateEntry && readLocationsDictionary(config) !== null
    ? MorphologyLocationPickModeDict.Create
    : null;
}

/** Set while the pointer is on the "add locations from the 3D viewer" hint. */
export const morphologyLocationsHintHoveredAtom = atom(false);
