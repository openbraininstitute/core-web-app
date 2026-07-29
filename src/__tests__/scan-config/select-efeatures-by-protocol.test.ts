import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  RightPreviewModeDict,
  resolveRightPreviewMode,
} from '@/features/scan-config/components/model-preview/helpers';
import {
  collectSelectionErrors,
  ecodeNameFromTypeName,
  efelDocUrl,
  efelNameFromDef,
  fieldUnsetValue,
  humanizeTypeName,
  isFieldSet,
  listProtocolDefs,
  makeFilledProtocolValue,
  makeProtocolValue,
  mergeAmplitudeOptions,
  parseSelectionValue,
} from '@/features/scan-config/components/ui-elements/select-efeatures-by-protocol/helpers';
import { numericSchemaBounds } from '@/features/scan-config/components/utils';
import { ScanConfigActivity } from '@/features/scan-config/types';

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

describe('makeFilledProtocolValue', () => {
  it('takes every feature the protocol can extract and every discovered amplitude', () => {
    const [idRest] = listProtocolDefs(selectionSchema);
    const value = makeFilledProtocolValue(idRest, [0.2, 0.1]);

    expect(value.features.map((feature) => feature.type)).toEqual([
      'VoltageBaseFeature',
      'ISICVFeature',
    ]);
    expect(value.extraction_amplitudes).toEqual([
      [0.2, false],
      [0.1, false],
    ]);
  });

  it('fills features even when the recordings reported no amplitudes', () => {
    const [idRest] = listProtocolDefs(selectionSchema);
    const value = makeFilledProtocolValue(idRest, undefined);

    expect(value.extraction_amplitudes).toEqual([]);
    expect(value.features).toHaveLength(2);
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

describe('resolveRightPreviewMode', () => {
  const base = {
    entityPreviewActive: false,
    activity: ScanConfigActivity.Extract,
    entityType: ExtendedEntitiesTypeDict.ElectricalCellRecording,
    hasEntity: true,
  };

  it('gives an open settings form the right column', () => {
    expect(resolveRightPreviewMode({ ...base, settingsPanelActive: true })).toBe(
      RightPreviewModeDict.Settings
    );
  });

  it('outranks the entity preview, which the user did not just ask for', () => {
    expect(
      resolveRightPreviewMode({ ...base, settingsPanelActive: true, entityPreviewActive: true })
    ).toBe(RightPreviewModeDict.Settings);
  });

  it('leaves the previous behaviour alone when no panel is open', () => {
    expect(resolveRightPreviewMode({ ...base, entityPreviewActive: true })).toBe(
      RightPreviewModeDict.EntityPreview
    );
  });
});

describe('numericSchemaBounds', () => {
  it('reads bounds from the numeric branch of a sweepable union', () => {
    const bounds = numericSchemaBounds({
      anyOf: [
        { type: 'number', minimum: 1, maximum: 9 },
        { type: 'array', items: { type: 'number' } },
      ],
    });

    expect(bounds).toEqual({
      min: 1,
      max: 9,
      exclusiveMin: undefined,
      exclusiveMax: undefined,
      allowMultiple: true,
    });
  });

  it('handles a plain number field that has no anyOf at all', () => {
    // obi-one declares the stimulus timings as `float`, not `float | list[float]`, so these
    // arrive with no union; reading anyOf[0] here used to throw and blank the whole editor
    const bounds = numericSchemaBounds({
      type: 'number',
      default: 0.0,
      exclusiveMinimum: 0,
      ui_element: 'float_parameter_sweep',
    });

    expect(bounds.exclusiveMin).toBe(0);
    expect(bounds.allowMultiple).toBe(false);
  });

  it('survives a schema that is not an object', () => {
    expect(numericSchemaBounds(undefined).allowMultiple).toBe(false);
    expect(numericSchemaBounds(null).min).toBeUndefined();
  });
});

describe('field set / unset semantics', () => {
  const nullable = { anyOf: [{ type: 'number' }, { type: 'null' }], default: null } as never;
  const timing = { type: 'number', default: 0.0 } as never;

  it('treats a nullable field as unset when null', () => {
    expect(fieldUnsetValue(nullable)).toBeNull();
    expect(isFieldSet(nullable, null)).toBe(false);
    expect(isFieldSet(nullable, -20)).toBe(true);
  });

  it('treats a timing left at its auto-detect default as unset', () => {
    expect(fieldUnsetValue(timing)).toBe(0);
    expect(isFieldSet(timing, 0)).toBe(false);
    expect(isFieldSet(timing, 2500)).toBe(true);
  });

  it('treats a missing value as unset', () => {
    expect(isFieldSet(timing, undefined)).toBe(false);
  });
});

describe('ecodeNameFromTypeName', () => {
  it('drops the class suffix to recover the eCode the NWB uses', () => {
    expect(ecodeNameFromTypeName('APWaveformProtocol')).toBe('APWaveform');
    expect(ecodeNameFromTypeName('IDRestProtocol')).toBe('IDRest');
    expect(ecodeNameFromTypeName('IVProtocol')).toBe('IV');
  });

  it('leaves a name that does not carry the suffix alone', () => {
    expect(ecodeNameFromTypeName('SpikeRec')).toBe('SpikeRec');
  });
});

describe('collectSelectionErrors', () => {
  const defs = listProtocolDefs(selectionSchema);
  const defsByType = new Map(defs.map((def) => [def.typeName, def]));
  const [idRest] = defs;

  it('flags an empty selection, which the JSON schema happily accepts', () => {
    // `protocols` has no minItems, so ajv sees nothing wrong with extracting from no protocols
    const errors = collectSelectionErrors({ protocols: [] }, defsByType);

    expect(errors.map((error) => error.key)).toEqual(['protocols']);
  });

  it('clears once a protocol with features is selected', () => {
    const errors = collectSelectionErrors(
      { protocols: [makeFilledProtocolValue(idRest, [0.1])] },
      defsByType
    );

    expect(errors).toEqual([]);
  });

  it('flags a selected protocol that has no features', () => {
    const errors = collectSelectionErrors({ protocols: [makeProtocolValue(idRest)] }, defsByType);

    expect(errors.map((error) => error.key)).toEqual(['IDRestProtocol/features']);
  });

  it('reports again after the last protocol is unchecked', () => {
    const selected = { protocols: [makeFilledProtocolValue(idRest, [0.1])] };
    expect(collectSelectionErrors(selected, defsByType)).toEqual([]);

    expect(collectSelectionErrors({ protocols: [] }, defsByType).map((e) => e.key)).toEqual([
      'protocols',
    ]);
  });

  it('flags an out-of-range settings value so the left menu reacts to settings edits', () => {
    const protocol = {
      ...makeFilledProtocolValue(idRest, [0.1]),
      // the schema declares this exclusiveMinimum: 0
      trace_resampling_timestep: -1,
    };
    const withBound = new Map(defsByType);
    withBound.set('IDRestProtocol', {
      ...idRest,
      overrideFields: [
        [
          'trace_resampling_timestep',
          { anyOf: [{ type: 'number', exclusiveMinimum: 0 }, { type: 'null' }] },
        ],
      ] as never,
    });

    const errors = collectSelectionErrors({ protocols: [protocol] }, withBound);

    expect(errors.map((error) => error.key)).toEqual(['IDRestProtocol/trace_resampling_timestep']);
    expect(errors[0]?.message).toContain('greater than 0');
  });
});
