import { capitalize } from 'es-toolkit';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { ConfigSchema, TBlock } from '@/features/scan-config/types';

/**
 * Name for a new block: the first free number appended to a base name.
 *
 * The base name is the chosen child block's `default_name` when it declares one, otherwise the
 * root element's `singular_name`.
 *
 * Checked against every entry in the config, not just this root element's, because a rename
 * rewrites references by name across all of them.
 */
export function nextEntryName(
  schema: ConfigSchema,
  rootElement: string,
  allEntries: Set<string>,
  block?: TBlock
): string {
  const element = schema.properties?.[rootElement];
  const singularName =
    element?.ui_element === ScanConfigUIElementDict.BlockDictionary
      ? capitalize(element.singular_name)
      : 'element';
  const baseName = block?.default_name ? capitalize(block.default_name) : singularName;

  let counter = 0;
  while (allEntries.has(`${baseName} ${counter}`)) counter += 1;
  return `${baseName} ${counter}`;
}
