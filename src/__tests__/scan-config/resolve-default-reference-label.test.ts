import { describe, expect, it } from 'vitest';

import { resolveDefaultReferenceLabel } from '@/features/scan-config/components/ui-elements/resolve-default-reference-label';

/** the Brian2 case the by-type labels cannot express: two roles, one reference type */
const BRIAN2_SCHEMA = {
  reference_tag_defaults: {
    stimulus_target: 'Default: Sugar gustatory receptor neurons',
    simulation_target: 'Default: All Point Neurons',
  },
  default_block_reference_labels: {
    PointNeuronSetReference: 'Default: Sugar gustatory receptor neurons',
  },
};

describe('resolveDefaultReferenceLabel', () => {
  it('prefers the label for the field’s role', () => {
    expect(
      resolveDefaultReferenceLabel(
        { reference_tag: 'simulation_target', reference_types: ['PointNeuronSetReference'] },
        BRIAN2_SCHEMA
      )
    ).toBe('Default: All Point Neurons');
  });

  it('distinguishes two fields that share a reference type', () => {
    const stimulus = resolveDefaultReferenceLabel(
      { reference_tag: 'stimulus_target', reference_types: ['PointNeuronSetReference'] },
      BRIAN2_SCHEMA
    );
    const simulation = resolveDefaultReferenceLabel(
      { reference_tag: 'simulation_target', reference_types: ['PointNeuronSetReference'] },
      BRIAN2_SCHEMA
    );

    expect(stimulus).not.toBe(simulation);
  });

  it('falls back to the reference type when the schema has no tag defaults', () => {
    expect(
      resolveDefaultReferenceLabel(
        { reference_tag: 'simulation_target', reference_types: ['PointNeuronSetReference'] },
        { default_block_reference_labels: BRIAN2_SCHEMA.default_block_reference_labels }
      )
    ).toBe('Default: Sugar gustatory receptor neurons');
  });

  it('falls back when the field carries no tag at all', () => {
    expect(
      resolveDefaultReferenceLabel({ reference_types: ['PointNeuronSetReference'] }, BRIAN2_SCHEMA)
    ).toBe('Default: Sugar gustatory receptor neurons');
  });

  it('falls back when the tag is one the schema does not name', () => {
    expect(
      resolveDefaultReferenceLabel(
        { reference_tag: 'a_role_added_later', reference_types: ['PointNeuronSetReference'] },
        BRIAN2_SCHEMA
      )
    ).toBe('Default: Sugar gustatory receptor neurons');
  });

  it('takes the first accepted reference type that carries a label', () => {
    expect(
      resolveDefaultReferenceLabel(
        { reference_types: ['UnlabelledReference', 'BiophysicalNeuronSetReference'] },
        { default_block_reference_labels: { BiophysicalNeuronSetReference: 'Default: All Bio' } }
      )
    ).toBe('Default: All Bio');
  });

  it('falls back to a generic label when nothing names a default', () => {
    expect(resolveDefaultReferenceLabel({ reference_types: ['PointNeuronSetReference'] }, {})).toBe(
      'Default'
    );
  });

  it('ignores an empty label rather than showing a blank option', () => {
    expect(
      resolveDefaultReferenceLabel(
        { reference_tag: 'simulation_target', reference_types: ['PointNeuronSetReference'] },
        {
          reference_tag_defaults: { simulation_target: '' },
          default_block_reference_labels: { PointNeuronSetReference: 'Default: All Point Neurons' },
        }
      )
    ).toBe('Default: All Point Neurons');
  });
});
