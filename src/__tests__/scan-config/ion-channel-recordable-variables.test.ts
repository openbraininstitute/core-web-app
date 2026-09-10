import { describe, expect, it } from 'vitest';

import {
  IonChannelSimulationSeed,
  listRecordableVariableNames,
} from '@/features/scan-config/workflow/definitions/simulate-ion-channel';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';

function model(
  neuronBlock: Partial<IonChannelModel['neuron_block']>,
  overrides: Partial<IonChannelModel> = {}
) {
  return {
    id: 'ion-channel-id',
    nmodl_suffix: 'HCN3_0063',
    conductance_name: null,
    max_permeability_name: null,
    neuron_block: { global: [], range: [], useion: [], nonspecific: [], ...neuronBlock },
    ...overrides,
  } as IonChannelModel;
}

describe('listRecordableVariableNames', () => {
  it('suffixes written currents with the NMODL suffix', () => {
    expect(
      listRecordableVariableNames(
        model({ useion: [{ ion_name: 'k', read: ['ek'], write: ['ik'] }] }, {
          nmodl_suffix: 'StochKv3',
        } as Partial<IonChannelModel>)
      )
    ).toEqual(['ik_StochKv3']);
  });

  it('suffixes non-specific currents and keeps concentrations raw', () => {
    expect(
      listRecordableVariableNames(
        model({
          useion: [{ ion_name: 'ca', read: ['eca'], write: ['ica', 'cai'] }],
          nonspecific: [{ ihcn: 'mA/cm2' }],
        })
      )
      // ObiOne's order: currents, then non-specific currents, then concentrations
    ).toEqual(['ica_HCN3_0063', 'ihcn_HCN3_0063', 'cai']);
  });

  it('covers every ion the model writes', () => {
    expect(
      listRecordableVariableNames(
        model({
          useion: [
            { ion_name: 'na', read: ['ena'], write: ['ina'] },
            { ion_name: 'k', read: ['ek'], write: ['ik'] },
          ],
        })
      )
    ).toEqual(['ina_HCN3_0063', 'ik_HCN3_0063']);
  });

  it('returns nothing for a model that records no variable', () => {
    expect(
      listRecordableVariableNames(model({ useion: [{ ion_name: 'k', read: ['ek'], write: [] }] }))
    ).toEqual([]);
  });
});

describe('IonChannelSimulationSeed.build', () => {
  const seed = new IonChannelSimulationSeed();

  it('carries the parameter names the schema filters on, plus a value per variable', () => {
    expect(
      seed.build(
        model({ nonspecific: [{ ihcn: 'mA/cm2' }] }, {
          conductance_name: 'gIhbar',
        } as Partial<IonChannelModel>)
      )
    ).toEqual({
      attributes: { conductance_name: 'gIhbar', max_permeability_name: null },
      properties: [
        {
          property: 'RecordableVariables',
          values: [{ ion_channel_id: 'ion-channel-id', variable_name: 'ihcn_HCN3_0063' }],
        },
      ],
    });
  });

  it('still carries the attributes when the model records nothing', () => {
    const built = seed.build(model({}));

    expect(built.attributes).toEqual({ conductance_name: null, max_permeability_name: null });
    expect(built.properties?.[0].values).toEqual([]);
  });
});
