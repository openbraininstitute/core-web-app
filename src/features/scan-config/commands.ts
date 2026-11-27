import { nextEntryName } from '@/features/scan-config/components/hooks/entry-name';
import {
  RewriteBlockReferencesModeDict,
  rewriteBlockReferences,
} from '@/features/scan-config/components/rewrite-block-references';
import {
  DISTANCE_DISTRIBUTIONS_KEY,
  remapParameterDistributions,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { clearDeletedBlockReferences } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/state';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { isRootBlock } from '@/features/scan-config/types';

import type {
  Config,
  ConfigSchema,
  ConfigValue,
  TBlock,
  TConfigSchemaProperties,
} from '@/features/scan-config/types';

/** Its references are cleared to `null` by the schema-aware pass, and never by the generic walk. */
const INITIALIZE_SECTION = 'initialize';

export function entryNames(config: Config, schema: TConfigSchemaProperties): Set<string> {
  const names = new Set<string>();

  for (const [section, entries] of Object.entries(config)) {
    if (isRootBlock(schema, section) || !isPlainObject(entries)) continue;
    for (const name of Object.keys(entries)) names.add(name);
  }

  return names;
}

/** Renames an entry and every reference to it; returns `config` itself when the rename is not allowed. */
export function renameEntry(
  config: Config,
  schema: TConfigSchemaProperties,
  { dictionary, from, to }: { dictionary: string; from: string; to: string }
): Config {
  const section = config[dictionary];
  if (!isPlainObject(section) || !(from in section)) return config;
  if (to === '' || entryNames(config, schema).has(to)) return config;

  const next = structuredClone({
    ...config,
    [dictionary]: Object.fromEntries(
      Object.entries(section).map(([name, entry]) => [name === from ? to : name, entry])
    ),
  });

  rewriteBlockReferences(
    next,
    { dictionary, name: from },
    { type: RewriteBlockReferencesModeDict.Rename, to }
  );

  return dictionary === DISTANCE_DISTRIBUTIONS_KEY
    ? remapParameterDistributions(next, schema, from, to)
    : next;
}

/** Removes an entry and clears every reference to it; returns `config` itself when it does not exist. */
export function deleteEntry(
  config: Config,
  schema: TConfigSchemaProperties,
  { dictionary, name }: { dictionary: string; name: string }
): Config {
  const section = config[dictionary];
  if (!isPlainObject(section) || !(name in section)) return config;

  const { [name]: _removed, ...remaining } = section;
  const next = clearDeletedBlockReferences(
    structuredClone({ ...config, [dictionary]: remaining }),
    schema,
    dictionary,
    name
  );

  for (const [key, section] of Object.entries(next)) {
    if (key === INITIALIZE_SECTION || !isPlainObject(section)) continue;
    for (const field of Object.values(section)) {
      rewriteBlockReferences(
        field,
        { dictionary, name },
        { type: RewriteBlockReferencesModeDict.Clear }
      );
    }
  }

  return dictionary === DISTANCE_DISTRIBUTIONS_KEY
    ? remapParameterDistributions(next, schema, name, null)
    : next;
}

/**
 * Adds an entry to a dictionary under the next free name. `variant` is the block type picked for
 * it, when its schema gives the name to start from.
 */
export function createEntry(
  config: Config,
  schema: ConfigSchema,
  { dictionary, block, variant }: { dictionary: string; block: ConfigValue; variant?: TBlock }
): { config: Config; name: string } {
  const name = nextEntryName(schema, dictionary, entryNames(config, schema), variant);
  const section = config[dictionary];

  return {
    name,
    config: {
      ...config,
      [dictionary]: { ...(isPlainObject(section) ? section : {}), [name]: block },
    },
  };
}
