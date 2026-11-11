import { describe, expect, it } from 'vitest';

import {
  colorForElectrodeBlock,
  colorForElectrodeOrigin,
  electrodeSummaryToOverlays,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import {
  referencedArrayOverlays,
  selectReferencedArrayRefs,
} from '@/features/scan-config/components/model-preview/referenced-arrays';

import type { TElectrodeLocationsDictionarySummary } from '@/api/one/generated/extracellular-locations-block-dictionary-summary';
import type { Config } from '@/features/scan-config/types';

const ARRAY_ID = '2f1a9c1e-6e1d-4a4a-9b6f-0f4c1d2e3a4b';
const OTHER_ARRAY_ID = '7c5b8d2a-3f4e-4c1b-8a9d-1e2f3a4b5c6d';

function arrayRef(id: string) {
  return { type: 'SimulatableExtracellularRecordingArrayFromID', id_str: id };
}

const summary = {
  'Electrode locations 0': {
    locations: [
      [0, 0, 0],
      [0, 20, 0],
    ],
    origin_x: 0,
    origin_y: 0,
    origin_z: 0,
  },
  'Electrode locations 1': {
    locations: [[10, 0, 0]],
  },
} as unknown as TElectrodeLocationsDictionarySummary;

describe('selectReferencedArrayRefs', () => {
  it('returns one ref per recording block that references an array', () => {
    const config = {
      recordings: {
        'Extracellular Electrode Array Recording 0': {
          type: 'ExtracellularElectrodeArrayRecording',
          extracellular_recording_array: arrayRef(ARRAY_ID),
          dt: 0.1,
        },
        'Extracellular Electrode Array Recording 1': {
          type: 'ExtracellularElectrodeArrayRecording',
          extracellular_recording_array: arrayRef(OTHER_ARRAY_ID),
        },
      },
    } as unknown as Config;

    expect(selectReferencedArrayRefs(config)).toEqual([
      {
        root: 'recordings',
        block: 'Extracellular Electrode Array Recording 0',
        entityId: ARRAY_ID,
      },
      {
        root: 'recordings',
        block: 'Extracellular Electrode Array Recording 1',
        entityId: OTHER_ARRAY_ID,
      },
    ]);
  });

  it('ignores recording blocks of every other kind', () => {
    const config = {
      recordings: {
        Soma: {
          type: 'SomaVoltageRecording',
          neuron_set: {
            block_name: 'All',
            block_dict_name: 'neuron_sets',
            type: 'BiophysicalNeuronSetReference',
          },
          dt: 0.1,
        },
        LFP: {
          type: 'ExtracellularElectrodeArrayRecording',
          extracellular_recording_array: arrayRef(ARRAY_ID),
        },
      },
      stimuli: {
        Clamp: { type: 'ConstantCurrentClampSomaticStimulus', amplitude: 0.2 },
      },
      initialize: {
        type: 'CircuitSimulationScanConfig.Initialize',
        circuit: { type: 'CircuitFromID', id_str: OTHER_ARRAY_ID },
      },
    } as unknown as Config;

    expect(selectReferencedArrayRefs(config)).toEqual([
      { root: 'recordings', block: 'LFP', entityId: ARRAY_ID },
    ]);
  });

  it('keeps one entry per block when two blocks share an array, sorted by name', () => {
    const config = {
      recordings: {
        'LFP 1': { extracellular_recording_array: arrayRef(ARRAY_ID) },
        'LFP 0': { extracellular_recording_array: arrayRef(ARRAY_ID) },
      },
    } as unknown as Config;

    expect(selectReferencedArrayRefs(config).map((ref) => ref.block)).toEqual(['LFP 0', 'LFP 1']);
  });

  it('finds a reference nested deeper inside a block', () => {
    const config = {
      recordings: { LFP: { source: { array: arrayRef(ARRAY_ID) } } },
    } as unknown as Config;

    expect(selectReferencedArrayRefs(config)).toEqual([
      { root: 'recordings', block: 'LFP', entityId: ARRAY_ID },
    ]);
  });

  it('returns nothing for a config with no references, or none at all', () => {
    expect(selectReferencedArrayRefs(null)).toEqual([]);
    expect(selectReferencedArrayRefs(undefined)).toEqual([]);
    expect(
      selectReferencedArrayRefs({
        recordings: { Soma: { type: 'SomaVoltageRecording' } },
        timestamps: { T0: { type: 'SingleTimestamp', start_time: 0 } },
      } as unknown as Config)
    ).toEqual([]);
  });

  it('ignores malformed references', () => {
    const config = {
      recordings: {
        'Missing id': { array: { type: 'SimulatableExtracellularRecordingArrayFromID' } },
        'Not a uuid': {
          array: { type: 'SimulatableExtracellularRecordingArrayFromID', id_str: 'nope' },
        },
      },
    } as unknown as Config;

    expect(selectReferencedArrayRefs(config)).toEqual([]);
  });
});

describe('referencedArrayOverlays', () => {
  it('keeps the array’s own colours, so it looks the same as in its detail view', () => {
    const groups = referencedArrayOverlays('Extracellular Electrode Array Recording 1', summary);

    expect(groups.map((group) => group.color)).toEqual(
      electrodeSummaryToOverlays(summary).map((group) => group.color)
    );
    expect(groups.find((group) => group.kind === 'electrodes')?.color).toBe(
      colorForElectrodeBlock('Electrode locations 0')
    );
    expect(groups.find((group) => group.kind === 'origin')?.color).toBe(
      colorForElectrodeOrigin('Electrode locations 0')
    );
  });

  it('keys every group on the recording block that referenced the array', () => {
    const groups = referencedArrayOverlays('Extracellular Electrode Array Recording 1', summary);

    expect(new Set(groups.map((group) => group.id))).toEqual(
      new Set(['Extracellular Electrode Array Recording 1'])
    );
    expect(groups[0].name).toBe(
      'Extracellular Electrode Array Recording 1 — Electrode locations 0'
    );
    expect([...groups[0].coordinates]).toEqual([0, 0, 0, 0, 20, 0]);
  });

  it('draws nothing for an array with no stored locations', () => {
    expect(referencedArrayOverlays('LFP 0', {})).toEqual([]);
    expect(referencedArrayOverlays('LFP 0', null)).toEqual([]);
  });
});
