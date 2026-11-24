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
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

type TSchema = Pick<ConfigSchema, 'properties'>;

function isSingleBlock(schema: TSchema, section: string) {
  return schema.properties?.[section]?.ui_element === ScanConfigUIElementDict.BlockSingle;
}

export function entryNames(config: Config, schema: TSchema): Set<string> {
  const names = new Set<string>();

  for (const [section, entries] of Object.entries(config)) {
    if (isSingleBlock(schema, section) || !isPlainObject(entries)) continue;
    for (const name of Object.keys(entries)) names.add(name);
  }

  return names;
}

/** Renames an entry and every reference to it; returns `config` itself when the rename is not allowed. */
export function renameEntry(
  config: Config,
  schema: TSchema,
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
  schema: TSchema,
  { dictionary, name }: { dictionary: string; name: string }
): Config {
  const section = config[dictionary];
  if (!isPlainObject(section) || !(name in section)) return config;

  const { [name]: _removed, ...remaining } = section;
  const next = clearDeletedBlockReferences(
    { ...config, [dictionary]: remaining },
    schema,
    dictionary,
    name
  );

  for (const section of Object.values(next)) {
    if (!isPlainObject(section)) continue;
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
