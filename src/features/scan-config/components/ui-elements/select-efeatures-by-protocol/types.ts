import type { ConfigValue, ParamSchema } from '@/features/scan-config/types';

/** An `(amplitude_nA, is_validation)` pair as obi-one stores it. */
export type TExtractionAmplitude = [number, boolean];

/** One selected eFEL feature: its discriminator plus whatever overrides the user set. */
export type TFeatureValue = {
  type: string;
} & Record<string, ConfigValue>;

/** One selected protocol inside `SelectEFeaturesByProtocol.protocols`. */
export type TProtocolValue = {
  type: string;
  extraction_amplitudes: TExtractionAmplitude[];
  features: TFeatureValue[];
} & Record<string, ConfigValue>;

/** The whole widget value — the object behind `select_efeatures_by_protocol`. */
export type TSelectEFeaturesValue = {
  type?: string;
  protocols: TProtocolValue[];
};

/** A concrete eFEL feature class, as described by the dereferenced schema. */
export type TFeatureDef = {
  /** discriminator value, e.g. `VoltageBaseFeature` */
  typeName: string;
  /** human label derived from the class name, e.g. "Voltage base" */
  label: string;
  /** the eFEL key (e.g. `ISI_CV`), when the schema lets us determine it */
  efelName: string | null;
  description: string | null;
  /** editable override fields (everything but the `type` discriminator) */
  overrideFields: Array<[string, ParamSchema]>;
  schema: Record<string, unknown>;
};

/** A concrete protocol class, as described by the dereferenced schema. */
export type TProtocolDef = {
  /** discriminator value, e.g. `IDRestProtocol` */
  typeName: string;
  label: string;
  description: string | null;
  /**
   * stimulus-timing fields this protocol's eCode shape declares. Varies per shape — a plain
   * step has start/end, sAHP adds the two mid transitions — so it is read off the schema
   * rather than assumed.
   */
  timingFields: Array<[string, ParamSchema]>;
  /** eFEL detection knobs the protocol may override for all of its features */
  overrideFields: Array<[string, ParamSchema]>;
  featureDefs: TFeatureDef[];
  schema: Record<string, unknown>;
};
