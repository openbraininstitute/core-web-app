import { Input } from 'antd';

import { AxonModifier } from '@/features/scan-config/components/ui-elements/axon-modifier';
import BooleanInput from '@/features/scan-config/components/ui-elements/boolean-input';
import {
  DistanceFunctionField,
  DistanceFunctionNullableField,
} from '@/features/scan-config/components/ui-elements/distance-function/distance-function-field';
import { EntityPropertyDropdown } from '@/features/scan-config/components/ui-elements/entity-property-dropdown';
import { FloatInput } from '@/features/scan-config/components/ui-elements/float-input';
import { FloatOptional } from '@/features/scan-config/components/ui-elements/float-optional';
import { ModelIdentifier } from '@/features/scan-config/components/ui-elements/model-identifier';
import MorphologyLocationSelection from '@/features/scan-config/components/ui-elements/morphology-location-selection';
import { MorphologySectionTypeSelection } from '@/features/scan-config/components/ui-elements/morphology-section-type-selection';
import NeuronIds from '@/features/scan-config/components/ui-elements/neuron-ids';
import {
  NeuronSetCombination,
  type NeuronSetCombinationEntry,
} from '@/features/scan-config/components/ui-elements/neuron-set-combination';
import ParameterSweep from '@/features/scan-config/components/ui-elements/parameter-sweep';
import { SelectRecordableIonChannelVariable } from '@/features/scan-config/components/ui-elements/recordable-ion-channel-variable';
import { Reference } from '@/features/scan-config/components/ui-elements/reference';
import { Stochasticity } from '@/features/scan-config/components/ui-elements/stochasticity';
import { StringListInput } from '@/features/scan-config/components/ui-elements/string-list-input';
import { StringListOptional } from '@/features/scan-config/components/ui-elements/string-list-optional';
import { StringSelection } from '@/features/scan-config/components/ui-elements/string-selection';
import { StringSelectionEnhanced } from '@/features/scan-config/components/ui-elements/string-selection-enhanced';
import {
  VoltageDuration,
  type VoltageDurationState,
} from '@/features/scan-config/components/ui-elements/voltage-duration';
import { isPlainObject, numericSchemaBounds } from '@/features/scan-config/components/utils';
import {
  type ConfigSchema,
  type ConfigValue,
  type ParamSchema,
  ScanConfigUIElementDict,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';

import type { ComponentType } from 'react';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { TSetFieldValue } from '@/features/scan-config/use-config-store';
import type { Nullish } from '@/utils/type';

type TFieldKind = ParamSchema['ui_element'];

/** What every field component of the form receives. Setting `undefined` removes the key. */
export type TFieldProps<TSchema extends ParamSchema = ParamSchema> = {
  fieldKey: string;
  paramSchema: TSchema;
  value: ConfigValue | undefined;
  setValue: TSetFieldValue;
  disabled: boolean;
  schema: ConfigSchema;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  errorPathPrefix?: string;
  /** name of the dictionary entry being edited; used to exclude self-references */
  selectedEntry?: string;
};

type TFieldOf<TKind extends TFieldKind> = TFieldProps<Extract<ParamSchema, { ui_element: TKind }>>;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

function toStringList(value: unknown): string[] {
  if (isStringArray(value)) return value;
  return typeof value === 'string' ? [value] : [];
}

function StringInputField({ value, setValue, disabled }: TFieldProps) {
  return (
    <Input
      data-testid="scan-config-control"
      data-scan-config-block-element={ScanConfigUIElementDict.StringInput}
      disabled={disabled}
      value={typeof value === 'string' ? value : ''}
      className="w-full"
      onChange={(e) => setValue(e.currentTarget.value || null)}
    />
  );
}

function DistanceFunctionInputField({
  fieldKey,
  paramSchema,
  value,
  setValue,
  disabled,
  errorPathPrefix,
  selectedEntry,
}: TFieldOf<typeof ScanConfigUIElementDict.DistanceFunctionInput>) {
  return (
    <DistanceFunctionField
      key={`${selectedEntry ?? ''}/${fieldKey}`}
      paramSchema={paramSchema}
      value={typeof value === 'string' ? value : ''}
      disabled={disabled}
      errorPath={errorPathPrefix ? `${errorPathPrefix}/${fieldKey}` : undefined}
      // Non-nullable `str`: clearing omits the key so the schema default applies; `null`
      // is rejected by both Ajv ("must be string") and the backend (422).
      onChange={(next) => setValue(next || undefined)}
    />
  );
}

function DistanceFunctionInputNullableField({
  fieldKey,
  paramSchema,
  value,
  setValue,
  disabled,
  errorPathPrefix,
  selectedEntry,
}: TFieldOf<typeof ScanConfigUIElementDict.DistanceFunctionInputNullable>) {
  return (
    <DistanceFunctionNullableField
      key={`${selectedEntry ?? ''}/${fieldKey}`}
      paramSchema={paramSchema}
      value={typeof value === 'string' ? value : ''}
      disabled={disabled}
      errorPath={errorPathPrefix ? `${errorPathPrefix}/${fieldKey}` : undefined}
      onChange={(next) => setValue(next || null)}
    />
  );
}

function ModelIdentifierField({ entity, value }: TFieldProps) {
  if (!entity) return null;
  return <ModelIdentifier entity={entity} value={value} />;
}

function ParameterSweepField({
  fieldKey,
  paramSchema,
  value,
  setValue,
  disabled,
}:
  | TFieldOf<typeof ScanConfigUIElementDict.FloatParameterSweep>
  | TFieldOf<typeof ScanConfigUIElementDict.IntParameterSweep>) {
  const bounds = numericSchemaBounds(paramSchema);
  return (
    <ParameterSweep
      k={fieldKey}
      min={bounds.min}
      max={bounds.max}
      exclusiveMin={bounds.exclusiveMin}
      exclusiveMax={bounds.exclusiveMax}
      // a plain `float` field has no array branch; offering a sweep would build a list the
      // schema rejects
      allowMultiple={bounds.allowMultiple}
      disabled={disabled}
      value={value as number | null | number[]}
      onChange={setValue}
    />
  );
}

function FloatOptionalField({
  paramSchema,
  value,
  setValue,
  disabled,
}: TFieldOf<typeof ScanConfigUIElementDict.FloatOptional>) {
  const bounds = numericSchemaBounds(paramSchema);
  return (
    <FloatOptional
      min={bounds.min}
      max={bounds.max}
      exclusiveMin={bounds.exclusiveMin}
      exclusiveMax={bounds.exclusiveMax}
      disabled={disabled}
      value={typeof value === 'number' ? value : null}
      onChange={setValue}
    />
  );
}

function FloatInputField({
  paramSchema,
  value,
  setValue,
  disabled,
}: TFieldOf<typeof ScanConfigUIElementDict.FloatInput>) {
  const bounds = numericSchemaBounds(paramSchema);
  return (
    <FloatInput
      min={bounds.min}
      max={bounds.max}
      exclusiveMin={bounds.exclusiveMin}
      exclusiveMax={bounds.exclusiveMax}
      disabled={disabled}
      value={typeof value === 'number' ? value : null}
      // Clearing omits the key so the schema default applies; `null` is rejected by both Ajv
      // and the backend.
      onChange={(next) => setValue(next ?? undefined)}
    />
  );
}

function ReferenceField({
  paramSchema,
  value,
  setValue,
  disabled,
  schema,
  selectedEntry,
}: TFieldOf<typeof ScanConfigUIElementDict.Reference>) {
  return (
    <Reference
      schema={schema}
      referenceSchema={paramSchema}
      value={isPlainObject(value) && typeof value.block_name === 'string' ? value.block_name : null}
      disabled={disabled}
      // a block can't reference itself; exclude the current entry. This only affects
      // references that resolve to the entry's own dictionary (a no-op otherwise).
      omit={selectedEntry ? [selectedEntry] : []}
      onChange={(block_name: string | null, block_dict_name: string | null) =>
        setValue(block_name === null ? null : { block_name, block_dict_name })
      }
    />
  );
}

function NeuronIdsField({ value, setValue, disabled }: TFieldProps) {
  return (
    <NeuronIds
      value={value as ConfigValue}
      disabled={disabled}
      onAddIds={(elements: number[] | null) =>
        setValue(elements === null || elements.length === 0 ? null : { elements })
      }
    />
  );
}

function EntityPropertyDropdownField({
  paramSchema,
  value,
  setValue,
  disabled,
  entity,
  schemaMappingConfig,
}: TFieldOf<typeof ScanConfigUIElementDict.EntityPropertyDropdown>) {
  if (!entity) return null;

  // a field supports several values when its schema has an `anyOf` with an array type
  if ('anyOf' in paramSchema) {
    return (
      <EntityPropertyDropdown
        multiple
        disabled={disabled}
        schemaMappingConfig={schemaMappingConfig}
        value={toStringList(value)}
        onChange={setValue}
        property={paramSchema.property}
      />
    );
  }

  return (
    <EntityPropertyDropdown
      multiple={false}
      disabled={disabled}
      schemaMappingConfig={schemaMappingConfig}
      value={typeof value === 'string' ? value : ''}
      onChange={(next: string | string[]) =>
        // NOTE: this is requested by James for IT'IS collaboration
        setValue(Array.isArray(next) && next.length === 1 ? next[0] : next)
      }
      property={paramSchema.property}
    />
  );
}

function BooleanInputField({ fieldKey, paramSchema, value, setValue, disabled }: TFieldProps) {
  return (
    <BooleanInput
      fieldKey={fieldKey}
      value={typeof value === 'boolean' ? value : null}
      disabled={disabled}
      onChange={setValue}
      ariaLabel={paramSchema.description}
    />
  );
}

function StochasticityField({ fieldKey, paramSchema, value, setValue, disabled }: TFieldProps) {
  return (
    <Stochasticity
      fieldKey={fieldKey}
      value={typeof value === 'boolean' ? value : null}
      disabled={disabled}
      onChange={setValue}
      ariaLabel={paramSchema.description}
    />
  );
}

type TRecordableVariable = { ion_channel_id: string | null; variable_name: string; type: string };

function SelectRecordableIonChannelVariableField({
  paramSchema,
  value,
  setValue,
  disabled,
  schema,
}: TFieldOf<typeof ScanConfigUIElementDict.SelectRecordableIonChannelVariable>) {
  return (
    <SelectRecordableIonChannelVariable
      value={
        isPlainObject(value) && typeof value.variable_name === 'string'
          ? (value as unknown as TRecordableVariable)
          : null
      }
      disabled={disabled}
      paramSchema={paramSchema}
      schema={schema}
      onChange={(next) =>
        setValue(
          next === null
            ? null
            : {
                ion_channel_id: next.ion_channel_id,
                variable_name: next.variable_name,
                type: next.type,
              }
        )
      }
    />
  );
}

function StringSelectionField({
  paramSchema,
  value,
  setValue,
  disabled,
}: TFieldOf<typeof ScanConfigUIElementDict.StringSelection>) {
  return (
    <StringSelection
      value={typeof value === 'string' ? value : null}
      disabled={disabled}
      paramSchema={paramSchema}
      onChange={setValue}
    />
  );
}

function StringSelectionEnhancedField({
  paramSchema,
  value,
  setValue,
  disabled,
}: TFieldOf<typeof ScanConfigUIElementDict.StringSelectionEnhanced>) {
  return (
    <StringSelectionEnhanced
      value={typeof value === 'string' ? value : null}
      disabled={disabled}
      paramSchema={paramSchema}
      onChange={setValue}
    />
  );
}

function StringListInputField({ value, setValue, disabled }: TFieldProps) {
  return (
    <StringListInput
      value={isStringArray(value) ? value : []}
      disabled={disabled}
      onChange={setValue}
    />
  );
}

function StringListOptionalField({ value, setValue, disabled }: TFieldProps) {
  return (
    <StringListOptional
      value={isStringArray(value) ? value : null}
      disabled={disabled}
      onChange={setValue}
    />
  );
}

function AxonModifierField({
  paramSchema,
  value,
  setValue,
  disabled,
}: TFieldOf<typeof ScanConfigUIElementDict.AxonModifier>) {
  return (
    <AxonModifier
      value={typeof value === 'string' ? value : null}
      disabled={disabled}
      paramSchema={paramSchema}
      onChange={setValue}
    />
  );
}

function MorphologySectionTypeSelectionField({
  paramSchema,
  value,
  setValue,
  disabled,
  schema,
  entity,
}: TFieldOf<typeof ScanConfigUIElementDict.MorphologySectionTypeSelection>) {
  return (
    <MorphologySectionTypeSelection
      schema={schema}
      entityId={entity?.id}
      property={paramSchema.property}
      propertyGroup={paramSchema.property_group}
      value={value as ConfigValue}
      disabled={disabled}
      onChange={setValue}
    />
  );
}

function MorphologyLocationSelectionField({
  paramSchema,
  value,
  setValue,
  disabled,
}:
  | TFieldOf<typeof ScanConfigUIElementDict.MorphologyLocationSelection>
  | TFieldOf<typeof ScanConfigUIElementDict.PerNeuronMorphologyLocationSelection>) {
  return (
    <MorphologyLocationSelection
      value={value}
      paramSchema={paramSchema}
      disabled={disabled}
      onChange={(next) => setValue(next as unknown as ConfigValue)}
    />
  );
}

function VoltageDurationField({
  paramSchema,
  value,
  setValue,
  disabled,
}: TFieldOf<typeof ScanConfigUIElementDict.VoltageDuration>) {
  return (
    <VoltageDuration
      paramSchema={paramSchema}
      state={(value ?? []) as unknown as VoltageDurationState[]}
      onChange={(next: VoltageDurationState[]) => setValue(next as unknown as ConfigValue)}
      disabled={disabled}
    />
  );
}

function NeuronSetCombinationField({
  paramSchema,
  value,
  setValue,
  disabled,
  schema,
  selectedEntry,
}: TFieldOf<typeof ScanConfigUIElementDict.NeuronSetCombination>) {
  return (
    <NeuronSetCombination
      paramSchema={paramSchema}
      value={(Array.isArray(value) ? value : []) as unknown as NeuronSetCombinationEntry[]}
      schema={schema}
      disabled={disabled}
      selfName={selectedEntry}
      onChange={(next: NeuronSetCombinationEntry[]) => setValue(next as unknown as ConfigValue)}
    />
  );
}

type TTypedFieldRegistry = { [TKind in TFieldKind]?: ComponentType<TFieldOf<TKind>> };

const TYPED_FIELD_REGISTRY: TTypedFieldRegistry = {
  [ScanConfigUIElementDict.StringInput]: StringInputField,
  [ScanConfigUIElementDict.DistanceFunctionInput]: DistanceFunctionInputField,
  [ScanConfigUIElementDict.DistanceFunctionInputNullable]: DistanceFunctionInputNullableField,
  [ScanConfigUIElementDict.ModelIdentifier]: ModelIdentifierField,
  [ScanConfigUIElementDict.FloatParameterSweep]: ParameterSweepField,
  [ScanConfigUIElementDict.IntParameterSweep]: ParameterSweepField,
  [ScanConfigUIElementDict.FloatOptional]: FloatOptionalField,
  [ScanConfigUIElementDict.FloatInput]: FloatInputField,
  [ScanConfigUIElementDict.Reference]: ReferenceField,
  [ScanConfigUIElementDict.NeuronIds]: NeuronIdsField,
  [ScanConfigUIElementDict.EntityPropertyDropdown]: EntityPropertyDropdownField,
  [ScanConfigUIElementDict.BooleanInput]: BooleanInputField,
  [ScanConfigUIElementDict.Stochasticity]: StochasticityField,
  [ScanConfigUIElementDict.SelectRecordableIonChannelVariable]:
    SelectRecordableIonChannelVariableField,
  [ScanConfigUIElementDict.StringSelection]: StringSelectionField,
  [ScanConfigUIElementDict.StringSelectionEnhanced]: StringSelectionEnhancedField,
  [ScanConfigUIElementDict.StringListInput]: StringListInputField,
  [ScanConfigUIElementDict.StringListOptional]: StringListOptionalField,
  [ScanConfigUIElementDict.AxonModifier]: AxonModifierField,
  [ScanConfigUIElementDict.MorphologySectionTypeSelection]: MorphologySectionTypeSelectionField,
  [ScanConfigUIElementDict.MorphologyLocationSelection]: MorphologyLocationSelectionField,
  [ScanConfigUIElementDict.PerNeuronMorphologyLocationSelection]: MorphologyLocationSelectionField,
  [ScanConfigUIElementDict.VoltageDuration]: VoltageDurationField,
  [ScanConfigUIElementDict.NeuronSetCombination]: NeuronSetCombinationField,
};

/** The component of each field kind; a kind that is not here has not moved to the registry. */
export const FIELD_REGISTRY = TYPED_FIELD_REGISTRY as Partial<
  Record<TFieldKind, ComponentType<TFieldProps>>
>;
