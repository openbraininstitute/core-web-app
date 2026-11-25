import { describe, expect, it } from 'vitest';

import { createEntry, deleteEntry, entryNames, renameEntry } from '@/features/scan-config/commands';
import {
  NeuronalManipulationTypeDict,
  ScanConfigUIElementDict,
} from '@/features/scan-config/types';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const dictionary = { ui_element: ScanConfigUIElementDict.BlockDictionary };

const schema = {
  properties: {
    initialize: { ui_element: ScanConfigUIElementDict.BlockSingle, properties: {} },
    neuron_sets: dictionary,
    timestamps: dictionary,
    stimuli: dictionary,
  },
} as unknown as ConfigSchema;

const ref = (block_name: string, block_dict_name = 'neuron_sets') => ({
  block_dict_name,
  block_name,
});

function config(): Config {
  return {
    initialize: { neuron_set: ref('BioAll'), nested: { inner: ref('BioAll') } },
    neuron_sets: {
      First: { type: 'IDNeuronSet' },
      BioAll: { type: 'PredefinedNeuronSet' },
      Combined: { combined_with: [[ref('BioAll'), 'union']] },
    },
    timestamps: { T0: { type: 'SingleTimestamp' } },
    stimuli: { Clamp: { neuron_set: ref('BioAll'), timestamps: ref('T0', 'timestamps') } },
  };
}

describe('renameEntry', () => {
  it('renames the entry in place and every reference to it', () => {
    const before = config();

    const next = renameEntry(before, schema, {
      dictionary: 'neuron_sets',
      from: 'BioAll',
      to: 'AllBio',
    });

    expect(next).toEqual({
      initialize: { neuron_set: ref('AllBio'), nested: { inner: ref('AllBio') } },
      neuron_sets: {
        First: { type: 'IDNeuronSet' },
        AllBio: { type: 'PredefinedNeuronSet' },
        Combined: { combined_with: [[ref('AllBio'), 'union']] },
      },
      timestamps: { T0: { type: 'SingleTimestamp' } },
      stimuli: { Clamp: { neuron_set: ref('AllBio'), timestamps: ref('T0', 'timestamps') } },
    });
    expect(Object.keys(next.neuron_sets as object)).toEqual(['First', 'AllBio', 'Combined']);
    expect(before).toEqual(config());
  });

  it('returns the same config when the new name is empty, unchanged or already used', () => {
    const before = config();
    const rename = (to: string) =>
      renameEntry(before, schema, { dictionary: 'neuron_sets', from: 'BioAll', to });

    expect(rename('')).toBe(before);
    expect(rename('BioAll')).toBe(before);
    expect(rename('First')).toBe(before);
    expect(rename('T0')).toBe(before);
  });

  it('returns the same config when the entry does not exist', () => {
    const before = config();

    expect(renameEntry(before, schema, { dictionary: 'neuron_sets', from: 'Gone', to: 'X' })).toBe(
      before
    );
    expect(renameEntry(before, schema, { dictionary: 'missing', from: 'BioAll', to: 'X' })).toBe(
      before
    );
  });
});

describe('deleteEntry', () => {
  it('removes the entry and clears the references to it; under `initialize` only its own reference, to null', () => {
    const before = config();

    const next = deleteEntry(before, schema, { dictionary: 'neuron_sets', name: 'BioAll' });

    expect(next).toEqual({
      initialize: { neuron_set: null, nested: { inner: ref('BioAll') } },
      neuron_sets: {
        First: { type: 'IDNeuronSet' },
        Combined: { combined_with: [[null, 'union']] },
      },
      timestamps: { T0: { type: 'SingleTimestamp' } },
      stimuli: { Clamp: { timestamps: ref('T0', 'timestamps') } },
    });
    expect(before).toEqual(config());
  });

  it('keeps an entry that only looks like a reference to the deleted one', () => {
    const next = deleteEntry(
      { neuron_sets: { BioAll: {} }, stimuli: { Lookalike: { block_name: 'BioAll' } } },
      schema,
      { dictionary: 'neuron_sets', name: 'BioAll' }
    );

    expect(next.stimuli).toEqual({ Lookalike: { block_name: 'BioAll' } });
  });

  it('clears a circuit modification that relies on the default neuron-set source field', () => {
    const type = NeuronalManipulationTypeDict.CircuitByNeuron;
    const manipulationSchema = {
      properties: {
        neuron_sets: dictionary,
        neuronal_manipulations: {
          ...dictionary,
          additionalProperties: {
            oneOf: [
              {
                properties: {
                  type: { const: type },
                  modification: {
                    ui_element: ScanConfigUIElementDict.IonChannelVariableModificationByNeuron,
                  },
                },
              },
            ],
          },
        },
      },
    } as unknown as ConfigSchema;

    const next = deleteEntry(
      {
        neuron_sets: { BioAll: { type: 'PredefinedNeuronSet' } },
        neuronal_manipulations: {
          M0: { type, neuron_set: ref('BioAll'), modification: { variable_name: 'gbar' } },
        },
      },
      manipulationSchema,
      { dictionary: 'neuron_sets', name: 'BioAll' }
    );

    expect(next.neuronal_manipulations).toEqual({ M0: { type, modification: null } });
  });

  it('returns the same config when the entry does not exist', () => {
    const before = config();

    expect(deleteEntry(before, schema, { dictionary: 'neuron_sets', name: 'Gone' })).toBe(before);
    expect(deleteEntry(before, schema, { dictionary: 'missing', name: 'BioAll' })).toBe(before);
  });
});

describe('entryNames', () => {
  it('lists the entries of every dictionary and skips single blocks', () => {
    expect(entryNames(config(), schema)).toEqual(
      new Set(['First', 'BioAll', 'Combined', 'T0', 'Clamp'])
    );
  });

  it('follows the config it is given', () => {
    const renamed = renameEntry(config(), schema, {
      dictionary: 'neuron_sets',
      from: 'BioAll',
      to: 'AllBio',
    });
    const names = entryNames(
      deleteEntry(renamed, schema, { dictionary: 'timestamps', name: 'T0' }),
      schema
    );

    expect(names).toEqual(new Set(['First', 'AllBio', 'Combined', 'Clamp']));
  });
});

describe('createEntry', () => {
  const recordingsSchema = {
    properties: {
      recordings: {
        ui_element: ScanConfigUIElementDict.BlockDictionary,
        singular_name: 'recording',
      },
    },
  } as unknown as ConfigSchema;

  it('adds the entry under the next free name and leaves its input as it was', () => {
    const before: Config = { recordings: { 'Recording 0': {} } };

    const created = createEntry(before, recordingsSchema, {
      dictionary: 'recordings',
      block: { type: 'SomaVoltageRecording' },
    });

    expect(created.name).toBe('Recording 1');
    expect(created.config).toEqual({
      recordings: { 'Recording 0': {}, 'Recording 1': { type: 'SomaVoltageRecording' } },
    });
    expect(before).toEqual({ recordings: { 'Recording 0': {} } });
  });

  it('gives two entries created in a row different names', () => {
    const first = createEntry({ recordings: {} }, recordingsSchema, {
      dictionary: 'recordings',
      block: {},
    });
    const second = createEntry(first.config, recordingsSchema, {
      dictionary: 'recordings',
      block: {},
    });

    expect(Object.keys(second.config.recordings as object)).toEqual(['Recording 0', 'Recording 1']);
  });

  it('gives a name again once its entry was removed', () => {
    const created = createEntry({ recordings: { 'Recording 1': {} } }, recordingsSchema, {
      dictionary: 'recordings',
      block: {},
    });

    expect(created.name).toBe('Recording 0');
  });

  it('starts the section when it does not exist yet', () => {
    const created = createEntry({}, recordingsSchema, { dictionary: 'recordings', block: {} });

    expect(created.config).toEqual({ recordings: { 'Recording 0': {} } });
  });
});
