import { describe, expect, it } from 'vitest';

import {
  isReferenceFieldVisible,
  resolveDefaultReferenceLabel,
} from '@/features/scan-config/components/ui-elements/reference';

const TYPE_LABELS = {
  BiophysicalNeuronSetReference: 'Default: All Biophysical Neurons',
  TimestampsReference: 'Default: Simulation Start (0 ms)',
};

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
  it('answers per tag when the field declares a reference tag', () => {
    const label = resolveDefaultReferenceLabel(
      {
        reference_types: ['BiophysicalNeuronSetReference'],
        reference_tag: 'stimulus_target',
      },
      {
        default_block_reference_labels: TYPE_LABELS,
        reference_tag_defaults: TAG_DEFAULTS,
      }
    );

    expect(label).toBe('Default: Simulation Target');
  });

  it('gives two fields of the same reference type different labels', () => {
    const schema = {
      default_block_reference_labels: TYPE_LABELS,
      reference_tag_defaults: TAG_DEFAULTS,
    };
    const stimulus = resolveDefaultReferenceLabel(
      {
        reference_types: ['BiophysicalNeuronSetReference'],
        reference_tag: 'stimulus_target',
      },
      schema
    );
    const recording = resolveDefaultReferenceLabel(
      {
        reference_types: ['BiophysicalNeuronSetReference'],
        reference_tag: 'recording_target',
      },
      schema
    );

    expect(stimulus).not.toBe(recording);
  });

  it('falls back to the type-keyed label for an untagged field', () => {
    const label = resolveDefaultReferenceLabel(
      { reference_types: ['TimestampsReference'] },
      {
        default_block_reference_labels: TYPE_LABELS,
        reference_tag_defaults: TAG_DEFAULTS,
      }
    );

    expect(label).toBe('Default: Simulation Start (0 ms)');
  });

  it('falls back to the type-keyed label when the config answers no such tag', () => {
    const label = resolveDefaultReferenceLabel(
      {
        reference_types: ['TimestampsReference'],
        reference_tag: 'a_role_nobody_declared',
      },
      {
        default_block_reference_labels: TYPE_LABELS,
        reference_tag_defaults: TAG_DEFAULTS,
      }
    );

    expect(label).toBe('Default: Simulation Start (0 ms)');
  });

  it('works against a config predating reference tags', () => {
    const label = resolveDefaultReferenceLabel(
      {
        reference_types: ['TimestampsReference'],
        reference_tag: 'stimulus_target',
      },
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
    const label = resolveDefaultReferenceLabel(
      {
        reference_types: ['BiophysicalNeuronSetReference'],
        reference_tag: 'stimulus_target',
      },
      {
        default_block_reference_labels: TYPE_LABELS,
        reference_tag_defaults: TAG_DEFAULTS,
      }
    );

    expect(typeof label).toBe('string');
    expect(label).toBe(TAG_DEFAULTS.stimulus_target.name);
  });

  it('leaves the block available beside the name', () => {
    expect(TAG_DEFAULTS.stimulus_target.block).toHaveProperty('type');
  });
});

describe('isReferenceFieldVisible', () => {
  it('shows a field whose tag the config answers, with no type-keyed map at all', () => {
    const visible = isReferenceFieldVisible(
      {
        reference_types: ['AllDistributionsReference'],
        reference_tag: 'stimulus_target',
      },
      {
        default_block_reference_labels: {},
        reference_tag_defaults: TAG_DEFAULTS,
      }
    );

    expect(visible).toBe(true);
  });

  it('still shows an untagged field whose type is labelled', () => {
    const visible = isReferenceFieldVisible(
      { reference_types: ['TimestampsReference'] },
      { default_block_reference_labels: TYPE_LABELS }
    );

    expect(visible).toBe(true);
  });

  it('hides a field the config says nothing about', () => {
    const visible = isReferenceFieldVisible(
      { reference_types: ['UnlabelledReference'] },
      { default_block_reference_labels: {} }
    );

    expect(visible).toBe(false);
  });

  it('hides a tagged field whose tag the config leaves unanswered and whose type is unlabelled', () => {
    const visible = isReferenceFieldVisible(
      {
        reference_types: ['UnlabelledReference'],
        reference_tag: 'a_role_nobody_declared',
      },
      {
        default_block_reference_labels: {},
        reference_tag_defaults: TAG_DEFAULTS,
      }
    );

    expect(visible).toBe(false);
  });
});
