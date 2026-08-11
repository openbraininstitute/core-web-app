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
  isExtraFeature,
  isFieldSet,
  listCatalogueDefs,
  listProtocolDefs,
  makeFilledProtocolValue,
  makeProtocolValue,
  mergeAmplitudeOptions,
  parseSelectionValue,
  serializeSelectionValue,
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
    // the full catalogue, declared once for every protocol — see listCatalogueDefs
    extra_features_by_protocol: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: {
          oneOf: [
            {
              type: 'object',
              description: 'eFEL ``voltage_base``.',
              extra: { efel_feature_category: 'subthreshold', efel_doc_anchor: 'voltage-base' },
              properties: {
                type: { const: 'VoltageBaseFeature', default: 'VoltageBaseFeature' },
                stim_start: { type: 'number', default: 0.0 },
              },
            },
            {
              type: 'object',
              description: 'eFEL ``ISI_CV``.',
              extra: { efel_feature_category: 'spike_event', efel_doc_anchor: 'isi-cv' },
              properties: { type: { const: 'ISICVFeature', default: 'ISICVFeature' } },
            },
            {
              type: 'object',
              description: 'eFEL ``sag_amplitude``.',
              extra: { efel_feature_category: 'subthreshold', efel_doc_anchor: 'sag-amplitude' },
              properties: {
                type: { const: 'SagAmplitudeFeature', default: 'SagAmplitudeFeature' },
                stim_start: { type: 'number', default: 0.0 },
              },
            },
          ],
        },
      },
    },
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
    expect(humanizeTypeName('ISICVFeature', 'Feature')).toBe('ISICV');
    // digits become their own word — see the note on humanizeTypeName
    expect(humanizeTypeName('AP1AmpFeature', 'Feature')).toBe('AP 1 amp');
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

  // built from the real catalogue rather than a cast, so the fixture cannot drift from the type
  const [, isiCv] = listCatalogueDefs(selectionSchema);
  const feature = (overrides: Partial<typeof isiCv>) => ({
    ...isiCv,
    docAnchor: null,
    ...overrides,
  });

  it('prefers the schema anchor, which is the page fragment that actually exists', () => {
    expect(efelDocUrl(schema, feature({ docAnchor: 'isi-cv' }))).toBe(
      'https://efel.example/eFeatures.html#isi-cv'
    );
  });

  it('falls back to the eFEL key when no anchor is published', () => {
    expect(efelDocUrl(schema, feature({}))).toBe('https://efel.example/eFeatures.html#ISI_CV');
  });

  it('produces no link without a fragment or a base', () => {
    expect(efelDocUrl(schema, feature({ efelName: null }))).toBeNull();
    expect(efelDocUrl({} as ConfigSchema, feature({ docAnchor: 'isi-cv' }))).toBeNull();
  });
});

describe('listProtocolDefs', () => {
  const defs = listProtocolDefs(selectionSchema);

  it('reads every protocol variant off the union', () => {
    expect(defs.map((def) => def.typeName)).toEqual(['IDRestProtocol', 'SAHPProtocol']);
  });

  it('labels a protocol with its eCode name, not a reformatted one', () => {
    expect(defs.map((def) => def.label)).toEqual(['IDRest', 'SAHP']);
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

describe('listCatalogueDefs', () => {
  const catalogue = listCatalogueDefs(selectionSchema);

  it('reads the whole eFEL catalogue from the single place obi-one declares it', () => {
    // not from a protocol's own union: that one is narrowed to the protocol's defaults
    expect(catalogue.map((def) => def.typeName)).toEqual([
      'VoltageBaseFeature',
      'ISICVFeature',
      'SagAmplitudeFeature',
    ]);
  });

  it('carries the eFEL category so the catalogue can be sectioned', () => {
    expect(catalogue.map((def) => def.category)).toEqual([
      'subthreshold',
      'spike_event',
      'subthreshold',
    ]);
  });

  it('carries the documentation anchor', () => {
    expect(catalogue.map((def) => def.docAnchor)).toEqual([
      'voltage-base',
      'isi-cv',
      'sag-amplitude',
    ]);
  });

  it('falls back to `other` when a feature declares no category', () => {
    const withoutExtras = listCatalogueDefs({
      properties: {
        extra_features_by_protocol: {
          additionalProperties: {
            items: { oneOf: [{ properties: { type: { const: 'MysteryFeature' } } }] },
          },
        },
      },
    } as unknown as ParamSchema);

    expect(withoutExtras[0]?.category).toBe('other');
    expect(withoutExtras[0]?.docAnchor).toBeNull();
  });

  it('returns nothing when the field is absent, rather than throwing', () => {
    expect(listCatalogueDefs({} as ParamSchema)).toEqual([]);
  });
});

describe('extra features', () => {
  const defs = listProtocolDefs(selectionSchema);
  const defsByType = new Map(defs.map((def) => [def.typeName, def]));
  const [idRest] = defs;

  it('recognises a feature outside the protocol as an extra', () => {
    // IDrest's own union lists VoltageBase and ISI_CV; sag amplitude only exists in the catalogue
    expect(isExtraFeature(idRest, 'SagAmplitudeFeature')).toBe(true);
    expect(isExtraFeature(idRest, 'VoltageBaseFeature')).toBe(false);
    expect(isExtraFeature(undefined, 'SagAmplitudeFeature')).toBe(false);
  });

  it('merges the two stored fields into one feature list on read', () => {
    const parsed = parseSelectionValue({
      protocols: [{ type: 'IDRestProtocol', features: [{ type: 'ISICVFeature' }] }],
      extra_features_by_protocol: { IDRestProtocol: [{ type: 'SagAmplitudeFeature' }] },
    } as never);

    expect(parsed.protocols[0]?.features.map((feature) => feature.type)).toEqual([
      'ISICVFeature',
      'SagAmplitudeFeature',
    ]);
  });

  it('keeps the default when an extra duplicates it, like obi-one features_for', () => {
    const parsed = parseSelectionValue({
      protocols: [
        { type: 'IDRestProtocol', features: [{ type: 'ISICVFeature', stim_start: 100 }] },
      ],
      extra_features_by_protocol: { IDRestProtocol: [{ type: 'ISICVFeature', stim_start: 0 }] },
    } as never);

    expect(parsed.protocols[0]?.features).toEqual([{ type: 'ISICVFeature', stim_start: 100 }]);
  });

  it('ignores extras keyed to a protocol that is not selected', () => {
    const parsed = parseSelectionValue({
      protocols: [{ type: 'IDRestProtocol', features: [] }],
      extra_features_by_protocol: { SAHPProtocol: [{ type: 'SagAmplitudeFeature' }] },
    } as never);

    expect(parsed.protocols[0]?.features).toEqual([]);
  });

  it('splits the list back apart on write, so each feature validates', () => {
    const selection = parseSelectionValue({
      protocols: [{ type: 'IDRestProtocol', features: [{ type: 'ISICVFeature' }] }],
      extra_features_by_protocol: { IDRestProtocol: [{ type: 'SagAmplitudeFeature' }] },
    } as never);

    const stored = serializeSelectionValue(selection, selection.protocols, defsByType) as never as {
      type: string;
      protocols: Array<{ type: string; features: Array<{ type: string }> }>;
      extra_features_by_protocol: Record<string, Array<{ type: string }>>;
    };

    expect(stored.type).toBe('SelectEFeaturesByProtocol');
    expect(stored.protocols[0]?.features.map((feature) => feature.type)).toEqual(['ISICVFeature']);
    expect(stored.extra_features_by_protocol.IDRestProtocol?.map((f) => f.type)).toEqual([
      'SagAmplitudeFeature',
    ]);
  });

  it('writes no entry for a protocol that only carries its own features', () => {
    const selection = { protocols: [makeFilledProtocolValue(idRest, [0.1])] };
    const stored = serializeSelectionValue(selection, selection.protocols, defsByType) as never as {
      extra_features_by_protocol: Record<string, unknown>;
    };

    expect(stored.extra_features_by_protocol).toEqual({});
  });

  it('round-trips a merged selection unchanged', () => {
    const original = {
      protocols: [{ type: 'IDRestProtocol', extraction_amplitudes: [], features: [] }],
      extra_features_by_protocol: { IDRestProtocol: [{ type: 'SagAmplitudeFeature' }] },
    };
    const parsed = parseSelectionValue(original as never);
    const stored = serializeSelectionValue(parsed, parsed.protocols, defsByType);

    expect(parseSelectionValue(stored as never).protocols[0]?.features).toEqual(
      parsed.protocols[0]?.features
    );
  });

  it('validates an extra feature field, whose schema only exists in the catalogue', () => {
    const catalogueByType = new Map(
      listCatalogueDefs(selectionSchema).map((def) => [def.typeName, def])
    );
    const protocol = {
      ...makeFilledProtocolValue(idRest, [0.1]),
      features: [{ type: 'SagAmplitudeFeature', stim_start: -5 }],
    };
    const sagAmplitude = catalogueByType.get('SagAmplitudeFeature');
    if (!sagAmplitude) throw new Error('fixture is missing SagAmplitudeFeature');

    const bounded = new Map(catalogueByType);
    bounded.set('SagAmplitudeFeature', {
      ...sagAmplitude,
      overrideFields: [['stim_start', { type: 'number', minimum: 0 }]] as never,
    });

    const errors = collectSelectionErrors({ protocols: [protocol] }, defsByType, bounded);

    expect(errors.map((error) => error.key)).toEqual([
      'IDRestProtocol/SagAmplitudeFeature/stim_start',
    ]);
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
  const catalogueByType = new Map(
    listCatalogueDefs(selectionSchema).map((def) => [def.typeName, def])
  );
  const [idRest] = defs;

  it('flags an empty selection, which the JSON schema happily accepts', () => {
    // `protocols` has no minItems, so ajv sees nothing wrong with extracting from no protocols
    const errors = collectSelectionErrors({ protocols: [] }, defsByType, catalogueByType);

    expect(errors.map((error) => error.key)).toEqual(['protocols']);
  });

  it('clears once a protocol with features is selected', () => {
    const errors = collectSelectionErrors(
      { protocols: [makeFilledProtocolValue(idRest, [0.1])] },
      defsByType,
      catalogueByType
    );

    expect(errors).toEqual([]);
  });

  it('flags a selected protocol that has no features', () => {
    const errors = collectSelectionErrors(
      { protocols: [makeProtocolValue(idRest)] },
      defsByType,
      catalogueByType
    );

    expect(errors.map((error) => error.key)).toEqual(['IDRestProtocol/features']);
  });

  it('reports again after the last protocol is unchecked', () => {
    const selected = { protocols: [makeFilledProtocolValue(idRest, [0.1])] };
    expect(collectSelectionErrors(selected, defsByType, catalogueByType)).toEqual([]);

    expect(
      collectSelectionErrors({ protocols: [] }, defsByType, catalogueByType).map((e) => e.key)
    ).toEqual(['protocols']);
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

    const errors = collectSelectionErrors({ protocols: [protocol] }, withBound, catalogueByType);

    expect(errors.map((error) => error.key)).toEqual(['IDRestProtocol/trace_resampling_timestep']);
    expect(errors[0]?.message).toContain('greater than 0');
  });
});
