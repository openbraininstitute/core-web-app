import { describe, expect, it } from 'vitest';

import { extractNeuronBlockParameters } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/neuron-block-parameters';

describe('extractNeuronBlockParameters', () => {
  it('suffixes each range parameter name with the NMODL suffix', () => {
    const neuronBlock = {
      global: [],
      range: [{ gkv_6_2bar: 'S/cm2' }, { ik: 'mA/cm2' }],
      useion: [],
      nonspecific: [],
    };

    expect(extractNeuronBlockParameters(neuronBlock, 'kv_6_2')).toEqual([
      { name: 'gkv_6_2bar_kv_6_2', unit: 'S/cm2' },
      { name: 'ik_kv_6_2', unit: 'mA/cm2' },
    ]);
  });

  it('matches the qualified name obione-emodeloptimizationvariables-getall returns, so editstate writes land on the right checkbox', () => {
    const neuronBlock = {
      global: [],
      range: [{ gkv_6_2bar: 'S/cm2' }],
      useion: [],
      nonspecific: [],
    };

    const [param] = extractNeuronBlockParameters(neuronBlock, 'kv_6_2') ?? [];
    // obi_one/scientific/library/emodel_parameters.py: f"{var_name}_{suffix}"
    expect(param?.name).toBe('gkv_6_2bar_kv_6_2');
  });

  it('returns null for a malformed neuron_block', () => {
    expect(extractNeuronBlockParameters({ not: 'a neuron block' }, 'kv_6_2')).toBeNull();
  });
});
