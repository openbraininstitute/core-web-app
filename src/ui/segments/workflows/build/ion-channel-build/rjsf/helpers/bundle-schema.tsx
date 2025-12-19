import type { RJSFSchema } from '@rjsf/utils';
import type { ReactNode } from 'react';

import { renderMathInText } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers/render-mathematic-symbol';

/**
 * represents metadata about a property extracted from the schema
 */
export type BlockPropertyMetadata = {
  name: string;
  label: ReactNode;
  description: ReactNode;
  group: string;
  groupOrder: number;
};

/**
 * represents block group properties organized by their group/section
 */
export type BlockGroupProperties = Record<string, BlockPropertyMetadata[]>;

/**
 * bundles schema properties into groups based on their metadata.
 *
 * this function takes a JSON Schema and organizes its properties into logical groups
 * based on the 'group' field in each property's metadata. Properties are sorted within
 * their groups according to their 'group_order' value.
 *
 * Key features:
 * - Only processes properties listed in schema.required array
 * - Groups properties based on their 'group' metadata field
 * - Sorts properties within groups by 'group_order' (defaults to 999)
 * - Supports custom group ordering via schema.block_block_group_order
 * - Converts LaTeX notation in property titles to rendered math
 * - Skips properties without a group field
 *
 * @param schema - The JSON Schema to process
 * @returns An object where keys are group names and values are arrays of property metadata
 *
 * @example
 * const schema = {
 *   required: ['prop1', 'prop2'],
 *   properties: {
 *     prop1: {
 *       group: 'Group1',
 *       group_order: 1,
 *       title: 'Property 1'
 *     },
 *     prop2: {
 *       group: 'Group1',
 *       group_order: 2,
 *       title: 'Property 2'
 *     }
 *   },
 *   block_block_group_order: ['Group1']
 * };
 *
 * const result = bundleSchemaFields(schema);
 * // Returns:
 * // {
 * //   'Group1': [
 * //     { name: 'prop1', label: 'Property 1', group: 'Group1', groupOrder: 1 },
 * //     { name: 'prop2', label: 'Property 2', group: 'Group1', groupOrder: 2 }
 * //   ]
 * // }
 */
export function bundleSchemaFields(schema: RJSFSchema): BlockGroupProperties {
  const grouped: BlockGroupProperties = {};

  if (!schema || typeof schema !== 'object' || !schema.properties) {
    return grouped;
  }

  const requiredProps = Array.isArray(schema.required) ? schema.required : [];

  if (requiredProps.length === 0) {
    return grouped;
  }

  const groupOrder = Array.isArray(schema.block_block_group_order)
    ? schema.block_block_group_order
    : [];

  const { properties } = schema;
  for (const [propName, propSchema] of Object.entries(properties)) {
    if (!requiredProps.includes(propName)) {
      continue;
    }

    if (!propSchema || typeof propSchema !== 'object') continue;

    const { group } = propSchema as any;
    const groupOrderValue = (propSchema as any).group_order ?? 999;
    const rawLabel = (propSchema as any).title || propName;
    const rawDescription = (propSchema as any).description || propName;
    const label = renderMathInText(rawLabel);

    if (!group) {
      continue;
    }

    const metadata: BlockPropertyMetadata = {
      name: propName,
      description: rawDescription,
      label,
      group,
      groupOrder: groupOrderValue,
    };

    if (!grouped[group]) {
      grouped[group] = [];
    }

    grouped[group].push(metadata);
  }

  for (const group of Object.keys(grouped)) {
    grouped[group].sort((a, b) => a.groupOrder - b.groupOrder);
  }

  // if block_block_group_order is provided, ensure groups are in that order
  // by creating a new object with groups in the specified order
  if (groupOrder.length > 0) {
    const orderedGrouped: BlockGroupProperties = {};
    for (const group of groupOrder) {
      if (grouped[group]) {
        orderedGrouped[group] = grouped[group];
      }
    }
    for (const group of Object.keys(grouped)) {
      if (!orderedGrouped[group]) {
        orderedGrouped[group] = grouped[group];
      }
    }
    return orderedGrouped;
  }

  return grouped;
}
