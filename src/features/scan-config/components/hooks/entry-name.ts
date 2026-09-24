import { capitalize } from 'es-toolkit';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { ConfigSchema } from '@/features/scan-config/types';

/**
 * Name for a new block: the root element's singular name plus the first free number.
 *
 * Checked against every entry in the config, not just this root element's, because a rename
 * rewrites references by name across all of them.
 */
export function nextEntryName(
  schema: ConfigSchema,
  rootElement: string,
  allEntries: Set<string>
): string {
  const element = schema.properties?.[rootElement];
  const baseName =
    element?.ui_element === ScanConfigUIElementDict.BlockDictionary
      ? capitalize(element.singular_name)
      : 'element';

  let counter = 0;
  while (allEntries.has(`${baseName} ${counter}`)) counter += 1;
  return `${baseName} ${counter}`;
}
