import { isPlainObject, numericSchemaBounds } from '@/features/scan-config/components/utils';

import type { ConfigSchema, ConfigValue, ParamSchema } from '@/features/scan-config/types';
import type {
  TExtractionAmplitude,
  TFeatureCategory,
  TFeatureDef,
  TFeatureValue,
  TProtocolDef,
  TProtocolValue,
  TSelectEFeaturesValue,
} from './types';

/** Fields that describe the object rather than being user-editable knobs. */
const DISCRIMINATOR_FIELD = 'type';
const FEATURES_FIELD = 'features';
const EXTRA_FEATURES_FIELD = 'extra_features_by_protocol';
const AMPLITUDES_FIELD = 'extraction_amplitudes';

/** Protocol fields that are eFEL detection knobs rather than stimulus timing. */
const PROTOCOL_OVERRIDE_FIELDS = new Set([
  'spike_detection_threshold',
  'trace_resampling_timestep',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return isPlainObject(value) ? (value as unknown as Record<string, unknown>) : null;
}

/**
 * Variants of a discriminated union.
 *
 * obi-one emits `oneOf`; the schema is dereferenced before it reaches us, so the variants are
 * inline object schemas. `anyOf` is accepted too so a schema tweak upstream does not blank the
 * whole widget.
 */
function unionVariants(schema: unknown): Array<Record<string, unknown>> {
  const record = asRecord(schema);
  if (!record) return [];

  const variants = record.oneOf ?? record.anyOf;
  if (!Array.isArray(variants)) return [];

  return variants.filter((variant): variant is Record<string, unknown> => !!asRecord(variant));
}

/** The discriminator constant a variant pins, i.e. the class name. */
function variantTypeName(variant: Record<string, unknown>): string | null {
  const properties = asRecord(variant.properties);
  const typeProp = asRecord(properties?.[DISCRIMINATOR_FIELD]);
  return typeof typeProp?.const === 'string' ? typeProp.const : null;
}

function objectProperties(schema: Record<string, unknown>): Array<[string, ParamSchema]> {
  const properties = asRecord(schema.properties);
  if (!properties) return [];
  return Object.entries(properties) as Array<[string, ParamSchema]>;
}

/**
 * "VoltageBaseFeature" -> "Voltage base", "AP1AmpFeature" -> "AP 1 amp".
 *
 * Class names are the only human-facing text the schema gives us for a feature, so they are
 * split on case boundaries while keeping acronym runs (AP, ISI) intact. Digit runs split off as
 * their own word. Protocols are *not* humanized — see {@link ecodeNameFromTypeName}.
 */
export function humanizeTypeName(typeName: string, suffix: 'Feature'): string {
  const base = typeName.endsWith(suffix) ? typeName.slice(0, -suffix.length) : typeName;
  const words = base.match(/[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[0-9]+/g);
  if (!words || words.length === 0) return base;

  const [first, ...rest] = words;
  return [
    first,
    ...rest.map((word) => (/^[A-Z]{2,}$/.test(word) ? word : word.toLowerCase())),
  ].join(' ');
}

/**
 * The eFEL key for a feature.
 *
 * obi-one keeps `efel_name` as a ClassVar, so it is absent from the JSON schema. Keys like
 * `ISI_CV`, `AP1_amp` and `ohmic_input_resistance_vb_ssse` cannot be recovered from the class
 * name, so the generated description ("eFEL ``voltage_base``.") is used instead. An explicit
 * `efel_name` extra is preferred the moment obi-one starts emitting one; when neither is
 * available this returns null and the caller simply omits the documentation link.
 */
export function efelNameFromDef(variant: Record<string, unknown>): string | null {
  if (typeof variant.efel_name === 'string' && variant.efel_name) return variant.efel_name;

  const description = typeof variant.description === 'string' ? variant.description : '';
  const match = description.match(/eFEL\s+``([^`]+)``/);
  return match?.[1] ?? null;
}

/** Deep-link into the eFEL feature documentation, when the root schema declares the base. */
export function efelDocUrl(schema: ConfigSchema, feature: TFeatureDef): string | null {
  const base = (schema as unknown as Record<string, unknown>).efel_doc_base_url;
  if (typeof base !== 'string' || !base) return null;
  const fragment = feature.docAnchor ?? feature.efelName;
  if (!fragment) return null;
  return `${base}#${fragment}`;
}

/**
 * Illustration for one feature, addressed by its eFEL key.
 */
export function efelFigureUrl(
  schema: ConfigSchema,
  variant: Record<string, unknown>
): string | null {
  const base = (schema as unknown as Record<string, unknown>).efel_figures_base_url;
  if (typeof base !== 'string' || !base) return null;

  const image =
    typeof variant.efel_feature_image === 'string' && variant.efel_feature_image
      ? variant.efel_feature_image
      : `${efelNameFromDef(variant)}.png`;

  if (image.startsWith('null')) return null;
  return `${base.replace(/\/$/, '')}/${image}`;
}

/** The `extra` bag obi-one attaches to a schema through `json_schema_extra`. */
function schemaExtras(variant: Record<string, unknown>): Record<string, unknown> {
  return asRecord(variant.extra) ?? {};
}

const FEATURE_CATEGORIES = new Set<TFeatureCategory>([
  'spike_event',
  'spike_shape',
  'subthreshold',
]);

/** eFEL's grouping for a feature. Falls back to `other` so an unknown value still renders. */
function featureCategory(variant: Record<string, unknown>): TFeatureCategory {
  const value = schemaExtras(variant).efel_feature_category;
  return typeof value === 'string' && FEATURE_CATEGORIES.has(value as TFeatureCategory)
    ? (value as TFeatureCategory)
    : 'other';
}

export function buildFeatureDef(variant: Record<string, unknown>): TFeatureDef | null {
  const typeName = variantTypeName(variant);
  if (!typeName) return null;

  const docAnchor = schemaExtras(variant).efel_doc_anchor;

  return {
    typeName,
    label: humanizeTypeName(typeName, 'Feature'),
    efelName: efelNameFromDef(variant),
    category: featureCategory(variant),
    docAnchor: typeof docAnchor === 'string' && docAnchor ? docAnchor : null,
    description: typeof variant.description === 'string' ? variant.description : null,
    overrideFields: objectProperties(variant).filter(([key]) => key !== DISCRIMINATOR_FIELD),
    schema: variant,
  };
}

export function buildProtocolDef(variant: Record<string, unknown>): TProtocolDef | null {
  const typeName = variantTypeName(variant);
  if (!typeName) return null;

  const properties = objectProperties(variant);
  const featuresSchema = asRecord(asRecord(variant.properties)?.[FEATURES_FIELD]);

  return {
    typeName,
    // The eCode name, unreformatted: a protocol is named by the recording it reads (`IDRest`,
    // `APWaveform`), so splitting it into words would stop it matching the traces and the config.
    label: ecodeNameFromTypeName(typeName),
    description: typeof variant.description === 'string' ? variant.description : null,
    timingFields: properties.filter(
      ([key]) =>
        key !== DISCRIMINATOR_FIELD &&
        key !== FEATURES_FIELD &&
        key !== AMPLITUDES_FIELD &&
        !PROTOCOL_OVERRIDE_FIELDS.has(key)
    ),
    overrideFields: properties.filter(([key]) => PROTOCOL_OVERRIDE_FIELDS.has(key)),
    featureDefs: unionVariants(asRecord(featuresSchema?.items))
      .map(buildFeatureDef)
      .filter((def): def is TFeatureDef => def !== null),
    schema: variant,
  };
}

/**
 * The eCode name a protocol class stands for, e.g. `APWaveformProtocol` -> `APWaveform`.
 *
 * obi-one keeps the real name in a `protocol_name` ClassVar that never reaches the schema, so it
 * is recovered from the class name. Consumers match it case-insensitively, since the NWB decides
 * the casing (`IDrest` vs `IDRest`).
 */
export function ecodeNameFromTypeName(typeName: string): string {
  return typeName.replace(/Protocol$/, '');
}

/** Every protocol the widget can offer, read off the `protocols` union. */
export function listProtocolDefs(paramSchema: ParamSchema): TProtocolDef[] {
  const properties = asRecord((paramSchema as unknown as Record<string, unknown>).properties);
  const protocolsSchema = asRecord(properties?.protocols);

  return unionVariants(asRecord(protocolsSchema?.items))
    .map(buildProtocolDef)
    .filter((def): def is TProtocolDef => def !== null);
}

/**
 * The full eFEL catalogue — every feature that can be added to any protocol.
 */
export function listCatalogueDefs(paramSchema: ParamSchema): TFeatureDef[] {
  const properties = asRecord((paramSchema as unknown as Record<string, unknown>).properties);
  const byProtocol = asRecord(properties?.[EXTRA_FEATURES_FIELD]);
  const perProtocol = asRecord(byProtocol?.additionalProperties);

  return unionVariants(asRecord(perProtocol?.items))
    .map(buildFeatureDef)
    .filter((def): def is TFeatureDef => def !== null);
}

/** Build an instance from the schema defaults, so a newly added entry matches obi-one's shape. */
export function instanceFromDefaults(
  variant: Record<string, unknown>,
  typeName: string
): Record<string, ConfigValue> {
  const instance: Record<string, ConfigValue> = { [DISCRIMINATOR_FIELD]: typeName };

  for (const [key, propertySchema] of objectProperties(variant)) {
    if (key === DISCRIMINATOR_FIELD) continue;
    const fallback = (propertySchema as unknown as Record<string, unknown>).default;
    instance[key] = (fallback ?? null) as ConfigValue;
  }

  return instance;
}

export function makeFeatureValue(def: TFeatureDef): TFeatureValue {
  return instanceFromDefaults(def.schema, def.typeName) as TFeatureValue;
}

export function makeProtocolValue(def: TProtocolDef): TProtocolValue {
  return {
    ...instanceFromDefaults(def.schema, def.typeName),
    type: def.typeName,
    // the schema defaults these to empty, but they are re-stated so the returned value is
    // structurally a TProtocolValue rather than something the caller has to re-check
    extraction_amplitudes: [],
    features: [],
  };
}

/**
 * A protocol carrying every feature it can extract, plus every amplitude the recordings report.
 */
export function makeFilledProtocolValue(
  def: TProtocolDef,
  discoveredAmplitudes: number[] | undefined
): TProtocolValue {
  return {
    ...makeProtocolValue(def),
    extraction_amplitudes: (discoveredAmplitudes ?? []).map(
      (amplitude): TExtractionAmplitude => [amplitude, false]
    ),
    features: def.featureDefs.map(makeFeatureValue),
  };
}

/** The value a field falls back to when the user removes it: null when nullable, else its default. */
export function fieldUnsetValue(paramSchema: ParamSchema): ConfigValue {
  const schema = paramSchema as unknown as Record<string, unknown>;
  const nullable =
    Array.isArray(schema.anyOf) &&
    (schema.anyOf as Array<Record<string, unknown>>).some((branch) => branch?.type === 'null');

  if (nullable) return null;
  return (schema.default ?? null) as ConfigValue;
}

/**
 * Whether the user has actually set this field.
 */
export function isFieldSet(paramSchema: ParamSchema, value: ConfigValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  return value !== fieldUnsetValue(paramSchema);
}

function parseAmplitudes(value: unknown): TExtractionAmplitude[] {
  if (!Array.isArray(value)) return [];

  const amplitudes: TExtractionAmplitude[] = [];
  for (const entry of value) {
    if (Array.isArray(entry) && typeof entry[0] === 'number') {
      amplitudes.push([entry[0], entry[1] === true]);
    }
  }
  return amplitudes;
}

function parseFeatures(value: unknown): TFeatureValue[] {
  if (!Array.isArray(value)) return [];

  const features: TFeatureValue[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (record && typeof record.type === 'string') {
      features.push(record as TFeatureValue);
    }
  }
  return features;
}

/**
 * Normalise the stored value.
 *
 * The widget always works with fully-formed protocol entries so the rest of the component can
 * read `extraction_amplitudes` and `features` without re-checking their shape on every render.
 *
 * obi-one splits a protocol's features across two fields, its own narrow `features` tuple and
 * the shared `extra_features_by_protocol` mapping — so they are merged into one `features` list
 * here and split again in {@link serializeSelectionValue}. The rest of the widget therefore never
 * has to care which of the two a feature came from; {@link isExtraFeature} answers that from the
 * protocol's schema when the UI wants to label it.
 */
export function parseSelectionValue(value: ConfigValue | undefined): TSelectEFeaturesValue {
  const record = asRecord(value);
  if (!record) return { protocols: [] };

  const extrasByProtocol = asRecord(record[EXTRA_FEATURES_FIELD]) ?? {};

  const protocols: TProtocolValue[] = [];
  if (Array.isArray(record.protocols)) {
    for (const entry of record.protocols) {
      const protocol = asRecord(entry);
      if (!protocol || typeof protocol.type !== 'string') continue;

      const own = parseFeatures(protocol[FEATURES_FIELD]);
      const extras = parseFeatures(extrasByProtocol[protocol.type]);
      const ownTypes = new Set(own.map((feature) => feature.type));

      protocols.push({
        ...protocol,
        type: protocol.type,
        extraction_amplitudes: parseAmplitudes(protocol[AMPLITUDES_FIELD]),
        // a stored extra that duplicates a default keeps the default, mirroring obi-one's
        // `SelectEFeaturesByProtocol.features_for`
        features: [...own, ...extras.filter((feature) => !ownTypes.has(feature.type))],
      } as TProtocolValue);
    }
  }

  return {
    type: typeof record.type === 'string' ? record.type : undefined,
    protocols,
  };
}

/** Whether this feature sits outside the protocol's own narrow union, i.e. came from the catalogue. */
export function isExtraFeature(def: TProtocolDef | undefined, featureType: string): boolean {
  if (!def) return false;
  return !def.featureDefs.some((feature) => feature.typeName === featureType);
}

/**
 * Turn the merged in-memory selection back into the two fields obi-one declares.
 *
 * The inverse of {@link parseSelectionValue}: a feature belonging to the protocol's own narrow
 * union goes back into `features`, and everything else into `extra_features_by_protocol` under
 * that protocol's type name. Writing an extra into `features` would fail schema validation,
 * because that union only lists the protocol's own features.
 */
export function serializeSelectionValue(
  selection: TSelectEFeaturesValue,
  protocols: TProtocolValue[],
  defsByType: ReadonlyMap<string, TProtocolDef>
): Record<string, ConfigValue> {
  const extrasByProtocol: Record<string, TFeatureValue[]> = {};

  const stored = protocols.map((protocol) => {
    const def = defsByType.get(protocol.type);
    const own: TFeatureValue[] = [];
    const extras: TFeatureValue[] = [];

    for (const feature of protocol.features) {
      (isExtraFeature(def, feature.type) ? extras : own).push(feature);
    }
    if (extras.length > 0) extrasByProtocol[protocol.type] = extras;

    return { ...protocol, [FEATURES_FIELD]: own };
  });

  return {
    // preserve the discriminator obi-one round-trips on this object
    type: selection.type ?? 'SelectEFeaturesByProtocol',
    protocols: stored,
    [EXTRA_FEATURES_FIELD]: extrasByProtocol,
  } as unknown as Record<string, ConfigValue>;
}

/**
 * Amplitudes offered for a protocol, merging what the recordings expose with what is already
 * selected. A stored amplitude the current recordings no longer report still has to be
 * visible — otherwise reopening a config would silently drop it.
 */
export function mergeAmplitudeOptions(
  discovered: number[] | undefined,
  selected: TExtractionAmplitude[]
): number[] {
  const values = new Set<number>(discovered ?? []);
  for (const [amplitude] of selected) values.add(amplitude);
  return [...values].sort((a, b) => a - b);
}

/** A validation problem in the selection, keyed by a path suffix under the widget's field. */
export type TSelectionError = {
  key: string;
  message: string;
};

/** Range check for one numeric settings field, mirroring what the inputs show inline. */
function boundsError(paramSchema: ParamSchema, value: ConfigValue | undefined): string | undefined {
  if (typeof value !== 'number') return undefined;

  const { min, max, exclusiveMin, exclusiveMax } = numericSchemaBounds(paramSchema);
  if (min !== undefined && value < min) return `Must be greater than or equal to ${min}.`;
  if (max !== undefined && value > max) return `Must be less than or equal to ${max}.`;
  if (exclusiveMin !== undefined && value <= exclusiveMin)
    return `Must be greater than ${exclusiveMin}.`;
  if (exclusiveMax !== undefined && value >= exclusiveMax)
    return `Must be less than ${exclusiveMax}.`;
  return undefined;
}

/**
 * Everything wrong with the current selection.
 *
 * The JSON schema alone cannot express these: `protocols` has no `minItems`, and neither does a
 * protocol's `features`, so an empty extraction validates perfectly well while producing nothing.
 * These are reported through the shared field-errors atom so the left menu reflects them.
 */
export function collectSelectionErrors(
  selection: TSelectEFeaturesValue,
  defsByType: ReadonlyMap<string, TProtocolDef>,
  catalogueByType: ReadonlyMap<string, TFeatureDef>
): TSelectionError[] {
  const errors: TSelectionError[] = [];

  if (selection.protocols.length === 0) {
    errors.push({
      key: 'protocols',
      message: 'Select at least one protocol to extract features from.',
    });
  }

  for (const protocol of selection.protocols) {
    const def = defsByType.get(protocol.type);
    const label = def?.label ?? protocol.type;

    if (protocol.features.length === 0) {
      errors.push({
        key: `${protocol.type}/features`,
        message: `${label} has no features selected.`,
      });
    }

    for (const [fieldKey, fieldSchema] of [
      ...(def?.timingFields ?? []),
      ...(def?.overrideFields ?? []),
    ]) {
      const message = boundsError(fieldSchema, protocol[fieldKey]);
      if (message)
        errors.push({ key: `${protocol.type}/${fieldKey}`, message: `${label}: ${message}` });
    }

    for (const feature of protocol.features) {
      // a feature added from the catalogue is not in the protocol's own union, so the catalogue
      // is the authority on its fields
      const featureDef =
        def?.featureDefs.find((entry) => entry.typeName === feature.type) ??
        catalogueByType.get(feature.type);
      const featureName = featureDef ? (featureDef.efelName ?? featureDef.label) : feature.type;

      for (const [fieldKey, fieldSchema] of featureDef?.overrideFields ?? []) {
        const message = boundsError(fieldSchema, feature[fieldKey]);
        if (message) {
          errors.push({
            key: `${protocol.type}/${feature.type}/${fieldKey}`,
            message: `${featureName}: ${message}`,
          });
        }
      }
    }
  }

  return errors;
}
