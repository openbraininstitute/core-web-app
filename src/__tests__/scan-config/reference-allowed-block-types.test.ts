import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAllowedBlockTypesByReferenceType } from '@/features/scan-config/components/hooks/schema';

import type { ConfigSchema } from '@/features/scan-config/types';

/**
 * A reference definition is identified by its `type` discriminator, which is the class name a
 * field cites in `reference_types`. obi-one #878 gave MorphologyLocationsReference a display
 * title, and keying this registry on `title` silently emptied its entry: the stimulus Target
 * unions it with neuron-set references, whose entries kept the per-type filter switched on, so
 * every morphology-location option was filtered out of the dropdown with nothing logged.
 */
const referenceDefinition = ({
  typeConst,
  title,
  allowed,
}: {
  typeConst?: string;
  title?: string;
  allowed: string[];
}) => ({
  ...(title === undefined ? {} : { title }),
  ...(typeConst === undefined ? {} : { properties: { type: { const: typeConst } } }),
  allowed_block_types: allowed,
});

const schemaWith = (definitions: object[]) =>
  ({ properties: { stimuli: { anyOf: definitions } } }) as unknown as ConfigSchema;

describe('useAllowedBlockTypesByReferenceType', () => {
  it('keys a reference on its type discriminator, not its display title', () => {
    const schema = schemaWith([
      referenceDefinition({
        typeConst: 'MorphologyLocationsReference',
        title: 'Morphology Locations Reference',
        allowed: ['RandomMorphologyLocations', 'ClusteredMorphologyLocations'],
      }),
    ]);

    const { result } = renderHook(() => useAllowedBlockTypesByReferenceType(schema));

    expect(result.current).toHaveProperty('MorphologyLocationsReference');
    expect(result.current['MorphologyLocationsReference']).toEqual(
      new Set(['RandomMorphologyLocations', 'ClusteredMorphologyLocations'])
    );
    expect(result.current).not.toHaveProperty('Morphology Locations Reference');
  });

  it('still keys on title when a definition carries no type discriminator', () => {
    const schema = schemaWith([
      referenceDefinition({ title: 'AllDistributionsReference', allowed: ['Normal'] }),
    ]);

    const { result } = renderHook(() => useAllowedBlockTypesByReferenceType(schema));

    expect(result.current['AllDistributionsReference']).toEqual(new Set(['Normal']));
  });

  it('merges definitions that repeat across the schema', () => {
    const schema = schemaWith([
      referenceDefinition({ typeConst: 'NeuronSetReference', allowed: ['AllNeurons'] }),
      referenceDefinition({ typeConst: 'NeuronSetReference', allowed: ['ExcitatoryNeurons'] }),
    ]);

    const { result } = renderHook(() => useAllowedBlockTypesByReferenceType(schema));

    expect(result.current['NeuronSetReference']).toEqual(
      new Set(['AllNeurons', 'ExcitatoryNeurons'])
    );
  });
});
