import type { ConfigValue, TBlock } from '@/features/scan-config/types';

/**
 * Default value object for one block-dictionary variant: every declared property at its schema
 * default, `null` when it has none. Shared by the variant picker and by config seeding so a
 * seeded block is identical to a hand-created one.
 */
export function buildBlockDefaults(block: TBlock | undefined): Record<string, ConfigValue> {
  const defaults: Record<string, ConfigValue> = {};
  if (!block?.properties) return defaults;

  Object.entries(block.properties).forEach(([key, property]) => {
    defaults[key] = property.default ?? null;
  });

  return defaults;
}
