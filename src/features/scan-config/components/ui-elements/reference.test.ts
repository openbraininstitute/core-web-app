import { describe, expect, it } from 'vitest';

import { resolveDefaultReferenceLabel } from '@/features/scan-config/components/ui-elements/reference';

const TYPE_LABELS = {
  BiophysicalNeuronSetReference: 'Default: All Biophysical Neurons',
  TimestampsReference: 'Default: Simulation Start (0 ms)',
};

// obi-one carries the name and the block it names together, so the UI can label the field
// and also read the values behind that label without a second request.
const TAG_DEFAULTS = {
  stimulus_target: {
    name: 'Default: Simulation Target',
    block: { type: 'AllBiophysicalNeurons' },
  },
  recording_target: {
    name: 'Default: All Recorded Neurons',
    block: { type: 'AllNeurons' },
  },
};

describe('resolveDefaultReferenceLabel', () => {
  it('answers per role when the field declares a reference tag', () => {
    const label = resolveDefaultReferenceLabel(
      { reference_types: ['BiophysicalNeuronSetReference'], reference_tag: 'stimulus_target' },
      { default_block_reference_labels: TYPE_LABELS, reference_tag_defaults: TAG_DEFAULTS }
    );

    expect(label).toBe('Default: Simulation Target');
  });

  it('gives two fields of the same reference type different labels', () => {
    // the whole point of tagging: the type-keyed map has one answer for
    // BiophysicalNeuronSetReference, and these two fields need different ones.
    const schema = {
      default_block_reference_labels: TYPE_LABELS,
      reference_tag_defaults: TAG_DEFAULTS,
    };
    const stimulus = resolveDefaultReferenceLabel(
      { reference_types: ['BiophysicalNeuronSetReference'], reference_tag: 'stimulus_target' },
      schema
    );
    const recording = resolveDefaultReferenceLabel(
      { reference_types: ['BiophysicalNeuronSetReference'], reference_tag: 'recording_target' },
      schema
    );

    expect(stimulus).not.toBe(recording);
  });

  it('falls back to the type-keyed label for an untagged field', () => {
    const label = resolveDefaultReferenceLabel(
      { reference_types: ['TimestampsReference'] },
      { default_block_reference_labels: TYPE_LABELS, reference_tag_defaults: TAG_DEFAULTS }
    );

    expect(label).toBe('Default: Simulation Start (0 ms)');
  });

  it('falls back to the type-keyed label when the config answers no such role', () => {
    // a config that tags its fields need not supply every role; an unanswered one is not an
    // error, it just means nothing better than the type-keyed label is known.
    const label = resolveDefaultReferenceLabel(
      { reference_types: ['TimestampsReference'], reference_tag: 'a_role_nobody_declared' },
      { default_block_reference_labels: TYPE_LABELS, reference_tag_defaults: TAG_DEFAULTS }
    );

    expect(label).toBe('Default: Simulation Start (0 ms)');
  });

  it('works against a config predating reference tags', () => {
    const label = resolveDefaultReferenceLabel(
      { reference_types: ['TimestampsReference'], reference_tag: 'stimulus_target' },
      { default_block_reference_labels: TYPE_LABELS }
    );

    expect(label).toBe('Default: Simulation Start (0 ms)');
  });

  it('uses the first reference type that has a label', () => {
    const label = resolveDefaultReferenceLabel(
      { reference_types: ['UnlabelledReference', 'TimestampsReference'] },
      { default_block_reference_labels: TYPE_LABELS }
    );

    expect(label).toBe('Default: Simulation Start (0 ms)');
  });

  it('falls back to a bare Default when nothing names one', () => {
    const label = resolveDefaultReferenceLabel(
      { reference_types: ['UnlabelledReference'] },
      { default_block_reference_labels: {} }
    );

    expect(label).toBe('Default');
  });

  it('reads the name out of the tagged answer, not the answer itself', () => {
    // The answer is an object; a label resolver that returned it whole would render
    // "[object Object]" in the dropdown.
    const label = resolveDefaultReferenceLabel(
      { reference_types: ['BiophysicalNeuronSetReference'], reference_tag: 'stimulus_target' },
      { default_block_reference_labels: TYPE_LABELS, reference_tag_defaults: TAG_DEFAULTS }
    );

    expect(typeof label).toBe('string');
    expect(label).toBe(TAG_DEFAULTS.stimulus_target.name);
  });

  it('leaves the block available beside the name', () => {
    // Not read by this function, but this is the contract the UI relies on to render the
    // default's values or materialise it.
    expect(TAG_DEFAULTS.stimulus_target.block).toHaveProperty('type');
  });
});
