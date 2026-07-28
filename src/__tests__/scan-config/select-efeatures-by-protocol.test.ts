import { describe, expect, it } from 'vitest';

import {
  efelDocUrl,
  efelNameFromDef,
  humanizeTypeName,
  listProtocolDefs,
  makeProtocolValue,
  mergeAmplitudeOptions,
  parseSelectionValue,
} from '@/features/scan-config/components/ui-elements/select-efeatures-by-protocol/helpers';

import type { ConfigSchema, ParamSchema } from '@/features/scan-config/types';

/** Trimmed copy of the dereferenced obi-one schema for `SelectEFeaturesByProtocol`. */
const selectionSchema = {
  type: 'object',
  ui_element: 'select_efeatures_by_protocol',
  properties: {
    type: { const: 'SelectEFeaturesByProtocol', type: 'string' },
    protocols: {
      type: 'array',
      items: {
        oneOf: [
          {
            type: 'object',
            description: 'IDrest — long depolarising step.',
            properties: {
              type: { const: 'IDRestProtocol', default: 'IDRestProtocol', type: 'string' },
              extraction_amplitudes: { type: 'array', default: [] },
              spike_detection_threshold: {
                anyOf: [{ type: 'number' }, { type: 'null' }],
                default: null,
                ui_element: 'float_optional',
              },
              stim_start: { type: 'number', default: 0.0, ui_element: 'float_parameter_sweep' },
              stim_end: { type: 'number', default: 0.0, ui_element: 'float_parameter_sweep' },
              features: {
                type: 'array',
                items: {
                  oneOf: [
                    {
                      type: 'object',
                      description: 'eFEL ``voltage_base``.',
                      properties: {
                        type: { const: 'VoltageBaseFeature', default: 'VoltageBaseFeature' },
                        stim_start: { type: 'number', default: 0.0 },
                      },
                    },
                    {
                      type: 'object',
                      description: 'eFEL ``ISI_CV``.',
                      properties: {
                        type: { const: 'ISICVFeature', default: 'ISICVFeature' },
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            type: 'object',
            description: 'sAHP — two-step stimulus.',
            properties: {
              type: { const: 'SAHPProtocol', default: 'SAHPProtocol', type: 'string' },
              extraction_amplitudes: { type: 'array', default: [] },
              stim_start: { type: 'number', default: 0.0 },
              stim_mid: { type: 'number', default: 0.0 },
              stim_mid_2: { type: 'number', default: 0.0 },
              stim_end: { type: 'number', default: 0.0 },
              features: { type: 'array', items: { oneOf: [] } },
            },
          },
        ],
      },
    },
  },
} as unknown as ParamSchema;

describe('humanizeTypeName', () => {
  it('splits class names and keeps acronym runs intact', () => {
    expect(humanizeTypeName('VoltageBaseFeature', 'Feature')).toBe('Voltage base');
    expect(humanizeTypeName('APWaveformProtocol', 'Protocol')).toBe('AP waveform');
    expect(humanizeTypeName('ISICVFeature', 'Feature')).toBe('ISICV');
    expect(humanizeTypeName('IDRestProtocol', 'Protocol')).toBe('ID rest');
  });
});

describe('efelNameFromDef', () => {
  it('prefers an explicit efel_name when the schema carries one', () => {
    expect(efelNameFromDef({ efel_name: 'voltage_base', description: 'eFEL ``other``.' })).toBe(
      'voltage_base'
    );
  });

  it('recovers keys that the class name cannot produce', () => {
    expect(efelNameFromDef({ description: 'eFEL ``ISI_CV``.' })).toBe('ISI_CV');
    expect(efelNameFromDef({ description: 'eFEL ``AP1_amp``.' })).toBe('AP1_amp');
    expect(efelNameFromDef({ description: 'eFEL ``ohmic_input_resistance_vb_ssse``.' })).toBe(
      'ohmic_input_resistance_vb_ssse'
    );
  });

  it('returns null when neither source is available', () => {
    expect(efelNameFromDef({ description: 'Some prose without a key.' })).toBeNull();
    expect(efelNameFromDef({})).toBeNull();
  });
});

describe('efelDocUrl', () => {
  const schema = {
    efel_doc_base_url: 'https://efel.example/eFeatures.html',
  } as unknown as ConfigSchema;

  it('deep-links the feature anchor', () => {
    expect(efelDocUrl(schema, 'ISI_CV')).toBe('https://efel.example/eFeatures.html#ISI_CV');
  });

  it('produces no link without a resolved efel name', () => {
    expect(efelDocUrl(schema, null)).toBeNull();
    expect(efelDocUrl({} as ConfigSchema, 'ISI_CV')).toBeNull();
  });
});

describe('listProtocolDefs', () => {
  const defs = listProtocolDefs(selectionSchema);

  it('reads every protocol variant off the union', () => {
    expect(defs.map((def) => def.typeName)).toEqual(['IDRestProtocol', 'SAHPProtocol']);
  });

  it('takes the timing fields from each protocol rather than assuming a shape', () => {
    const idRest = defs.find((def) => def.typeName === 'IDRestProtocol');
    const sahp = defs.find((def) => def.typeName === 'SAHPProtocol');

    expect(idRest?.timingFields.map(([key]) => key)).toEqual(['stim_start', 'stim_end']);
    expect(sahp?.timingFields.map(([key]) => key)).toEqual([
      'stim_start',
      'stim_mid',
      'stim_mid_2',
      'stim_end',
    ]);
  });

  it('separates eFEL override knobs from stimulus timing', () => {
    const idRest = defs.find((def) => def.typeName === 'IDRestProtocol');
    expect(idRest?.overrideFields.map(([key]) => key)).toEqual(['spike_detection_threshold']);
  });

  it('exposes the features each protocol can extract', () => {
    const idRest = defs.find((def) => def.typeName === 'IDRestProtocol');
    expect(idRest?.featureDefs.map((def) => def.typeName)).toEqual([
      'VoltageBaseFeature',
      'ISICVFeature',
    ]);
    expect(idRest?.featureDefs.map((def) => def.efelName)).toEqual(['voltage_base', 'ISI_CV']);
  });
});

describe('makeProtocolValue', () => {
  it('builds an entry from the schema defaults with empty amplitudes and features', () => {
    const [idRest] = listProtocolDefs(selectionSchema);
    const value = makeProtocolValue(idRest);

    expect(value.type).toBe('IDRestProtocol');
    expect(value.extraction_amplitudes).toEqual([]);
    expect(value.features).toEqual([]);
    expect(value.stim_start).toBe(0);
    expect(value.spike_detection_threshold).toBeNull();
  });
});

describe('parseSelectionValue', () => {
  it('normalises stored protocols so amplitudes and features are always arrays', () => {
    const parsed = parseSelectionValue({
      type: 'SelectEFeaturesByProtocol',
      protocols: [{ type: 'IDRestProtocol' }],
    } as never);

    expect(parsed.protocols).toHaveLength(1);
    expect(parsed.protocols[0]?.extraction_amplitudes).toEqual([]);
    expect(parsed.protocols[0]?.features).toEqual([]);
  });

  it('keeps well-formed amplitude pairs and drops malformed ones', () => {
    const parsed = parseSelectionValue({
      protocols: [
        {
          type: 'IDRestProtocol',
          extraction_amplitudes: [[0.1, true], [0.2], ['bad', false]],
          features: [{ type: 'VoltageBaseFeature' }, { notAFeature: true }],
        },
      ],
    } as never);

    expect(parsed.protocols[0]?.extraction_amplitudes).toEqual([
      [0.1, true],
      [0.2, false],
    ]);
    expect(parsed.protocols[0]?.features).toEqual([{ type: 'VoltageBaseFeature' }]);
  });

  it('returns an empty selection for anything that is not an object', () => {
    expect(parseSelectionValue(undefined).protocols).toEqual([]);
    expect(parseSelectionValue(null).protocols).toEqual([]);
  });
});

describe('mergeAmplitudeOptions', () => {
  it('keeps a stored amplitude the current recordings no longer report', () => {
    expect(mergeAmplitudeOptions([0.1, 0.2], [[0.5, false]])).toEqual([0.1, 0.2, 0.5]);
  });

  it('does not duplicate an amplitude that is both discovered and selected', () => {
    expect(mergeAmplitudeOptions([0.1, 0.2], [[0.2, true]])).toEqual([0.1, 0.2]);
  });

  it('falls back to the selection when nothing was discovered', () => {
    expect(mergeAmplitudeOptions(undefined, [[0.3, false]])).toEqual([0.3]);
  });
});
