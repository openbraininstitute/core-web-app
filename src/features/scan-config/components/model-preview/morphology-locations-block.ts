import { atom } from 'jotai';
import { z } from 'zod';

import { isObject } from '@/util/type-guards';

import type { Config } from '@/features/scan-config/types';

/** Block-dictionary key holding morphology-location blocks in a scan config. */
export const MORPHOLOGY_LOCATIONS_CONFIG_KEY = 'morphology_locations';

/** Stores locations outright, as section and offset on the single neuron being configured. */
export const EXPLICIT_BLOCK_TYPE = 'ExplicitMorphologyLocations';

/** Stores locations outright, each on the neuron its row names. */
export const PER_NEURON_EXPLICIT_BLOCK_TYPE = 'PerNeuronExplicitMorphologyLocations';

/** The block types that store locations rather than describe how to sample them. */
export type TExplicitLocationsBlockType =
  | typeof EXPLICIT_BLOCK_TYPE
  | typeof PER_NEURON_EXPLICIT_BLOCK_TYPE;

export function isExplicitLocationsBlockType(type: unknown): type is TExplicitLocationsBlockType {
  return type === EXPLICIT_BLOCK_TYPE || type === PER_NEURON_EXPLICIT_BLOCK_TYPE;
}

/** One stored location: a SONATA section id and a normalized offset along that section. */
const StoredLocationSchema = z.object({
  section_id: z.number(),
  offset: z.number(),
});

/** A per-neuron row also names the SONATA node id of the neuron it sits on. */
const StoredNeuronLocationSchema = StoredLocationSchema.extend({
  node_id: z.number(),
});

/** `node_id` is set exactly when the row comes from a per-neuron block. */
export type IStoredLocation = z.infer<typeof StoredLocationSchema> & {
  node_id?: number;
};

/** The selected block, or null when the form is not on a morphology-locations entry. */
export function readEntry(config: Config | null | undefined, entry: string | undefined) {
  if (!config || !entry) return null;
  const dictionary = (config as Record<string, unknown>)[MORPHOLOGY_LOCATIONS_CONFIG_KEY];
  const block = isObject(dictionary) ? dictionary[entry] : null;
  return isObject(block) ? block : null;
}

/**
 * The rows that are complete locations; anything else is dropped rather than rendered.
 *
 * With `perNeuron`, a row without a `node_id` is incomplete too: the backend rejects it, and
 * there is no neuron to draw it on.
 */
export function readLocationRows(value: unknown, perNeuron = false): IStoredLocation[] {
  if (!Array.isArray(value)) return [];
  const schema = perNeuron ? StoredNeuronLocationSchema : StoredLocationSchema;
  return value.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

/** An explicit or per-neuron block's stored rows. */
export function readLocations(block: Record<string, unknown> | null): IStoredLocation[] {
  if (!isExplicitLocationsBlockType(block?.type)) return [];
  return readLocationRows(block.locations, block.type === PER_NEURON_EXPLICIT_BLOCK_TYPE);
}

/** A stored location, plus which block it came from and where it sits in that block. */
export type ITaggedLocation = IStoredLocation & {
  entry: string;
  /** Row number inside its own block, which is what an edit addresses. */
  index: number;
  /** Previewed from a block's parameters rather than stored, so it cannot be edited alone. */
  generated?: boolean;
};

/** Every explicit block's rows in a dictionary, each tagged with its block. */
export function collectLocations(dictionary: Record<string, unknown> | null): ITaggedLocation[] {
  return blocksOf(dictionary).flatMap(([entry, block]) =>
    readLocations(block).map((location, index) => ({ ...location, entry, index }))
  );
}

/** Every block that samples its locations from parameters, which only the backend can resolve. */
export function readGeneratedBlocks(
  dictionary: Record<string, unknown> | null
): Array<[string, Record<string, unknown>]> {
  return blocksOf(dictionary).filter(
    ([, block]) => typeof block.type === 'string' && !isExplicitLocationsBlockType(block.type)
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

/** Whether any block samples its locations from parameters, so the viewer previews them. */
export function hasGeneratedBlock(config: Config | null | undefined): boolean {
  return readGeneratedBlocks(readLocationsDictionary(config)).length > 0;
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
  /** The block types the form's morphology-locations dictionary accepts, from its schema. */
  locationBlockTypes?: readonly string[];
  /**
   * The blocks a 3D pick may fill on this model, the one a new block takes first: explicit on
   * one neuron, per-neuron on several. None unless the host says otherwise.
   */
  explicitLocationsBlockTypes?: readonly TExplicitLocationsBlockType[];
  /**
   * The model is one morphology: the generated-locations preview takes it, and a pick from
   * anywhere in the form may start a block, cell clicks having little else to do there.
   */
  singleMorphology?: boolean;
  /** What the form's property neuron sets can show, by population, with each property's values. */
  neuronSetProperties?: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
}

/** Whether the form has a block of stored locations open. */
export function isStoredLocationsBlockOpen({
  config,
  selectedRootElement,
  selectedEntry,
}: IFormBindingOptions): boolean {
  if (selectedRootElement !== MORPHOLOGY_LOCATIONS_CONFIG_KEY) return false;
  return isExplicitLocationsBlockType(readEntry(config, selectedEntry)?.type);
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

/**
 * The block type a pick writes: the open block's, where this model can fill it, so a block of
 * either kind is extended in place; else the one a new block takes. Null when picks fill none.
 */
export function locationPickBlockType({
  config,
  selectedRootElement,
  selectedEntry,
  explicitLocationsBlockTypes = [],
}: IFormBindingOptions): TExplicitLocationsBlockType | null {
  const open =
    selectedRootElement === MORPHOLOGY_LOCATIONS_CONFIG_KEY
      ? readEntry(config, selectedEntry)?.type
      : undefined;
  const fillable = explicitLocationsBlockTypes.find((type) => type === open);
  return fillable ?? explicitLocationsBlockTypes[0] ?? null;
}

/** One rule for whether picking is on, used by both the viewer host and the pick handler. */
export function morphologyLocationPickMode(
  options: IFormBindingOptions
): TMorphologyLocationPickModeDict {
  const { config, selectedRootElement, selectedEntry, onConfigChange, onCreateEntry } = options;
  const type = locationPickBlockType(options);
  if (!type) return null;

  const onLocations = selectedRootElement === MORPHOLOGY_LOCATIONS_CONFIG_KEY;
  // Only a block this model's picks are shaped for: a per-neuron row cannot go into an explicit
  // block, nor the reverse.
  if (onLocations && readEntry(config, selectedEntry)?.type === type) {
    return onConfigChange ? MorphologyLocationPickModeDict.Edit : null;
  }
  // Among several neurons a cell click holds a cell or switches population, so a pick starts a
  // block only while the form is on morphology locations.
  if (!onLocations && !options.singleMorphology) return null;
  return onCreateEntry && readLocationsDictionary(config) !== null
    ? MorphologyLocationPickModeDict.Create
    : null;
}

/** Node ids of the population locations are placed on that carry no marker, published for the form. */
export const hiddenLocationNodesAtom = atom<ReadonlySet<number>>(new Set<number>());

/** Set while the pointer is on the "add locations from the 3D viewer" hint. */
export const morphologyLocationsHintHoveredAtom = atom(false);
