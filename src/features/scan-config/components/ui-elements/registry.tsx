import { Input } from 'antd';
import { isEqual } from 'es-toolkit';
import { get } from 'es-toolkit/compat';
import { useCallback } from 'react';

import { getExtendedTypeByTaskResultType } from '@/entity-configuration/domain/helpers';
import { AxonModifier } from '@/features/scan-config/components/ui-elements/axon-modifier';
import BooleanInput from '@/features/scan-config/components/ui-elements/boolean-input';
import { DefaultTargetLookup } from '@/features/scan-config/components/ui-elements/default-target-lookup';
import { DiscreteProbabilities } from '@/features/scan-config/components/ui-elements/discrete-probabilities';
import {
  DistanceFunctionField,
  DistanceFunctionNullableField,
} from '@/features/scan-config/components/ui-elements/distance-function/distance-function-field';
import {
  DistributionParameterList,
  distributionParameterRows,
  readParameterRows,
  type TDistributionParameter,
} from '@/features/scan-config/components/ui-elements/distance-function/distribution-parameter-list';
import { EntityPropertyDropdown } from '@/features/scan-config/components/ui-elements/entity-property-dropdown';
import { ETypeSelector } from '@/features/scan-config/components/ui-elements/etype-selector';
import { FieldControl } from '@/features/scan-config/components/ui-elements/field-control';
import { FloatInput } from '@/features/scan-config/components/ui-elements/float-input';
import { FloatOptional } from '@/features/scan-config/components/ui-elements/float-optional';
import {
  IonChannelModelProperties,
  recordingIdsOf,
  type TIonChannelModelPropertiesValue,
} from '@/features/scan-config/components/ui-elements/ion-channel-model-properties';
import { CircuitGlobal } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/global';
import { CircuitRange } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/range';
import { Global } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/me-model/global';
import { Range } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/me-model/range';
import { ModelIdentifier } from '@/features/scan-config/components/ui-elements/model-identifier';
import {
  ModelIdentifierGrouped,
  ModelIdentifierMultiple,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple';
import { EntitySelectorSingle } from '@/features/scan-config/components/ui-elements/model-selector-single';
import MorphologyLocationSelection from '@/features/scan-config/components/ui-elements/morphology-location-selection';
import { MorphologySectionTypeSelection } from '@/features/scan-config/components/ui-elements/morphology-section-type-selection';
import NeuronIds from '@/features/scan-config/components/ui-elements/neuron-ids';
import NeuronPropertyFilter, {
  type INeuronPropertyFilter,
} from '@/features/scan-config/components/ui-elements/neuron-property-filter';
import {
  NeuronSetCombination,
  type NeuronSetCombinationEntry,
} from '@/features/scan-config/components/ui-elements/neuron-set-combination';
import { ObjectField } from '@/features/scan-config/components/ui-elements/object';
import ParameterSweep from '@/features/scan-config/components/ui-elements/parameter-sweep';
import { SelectRecordableIonChannelVariable } from '@/features/scan-config/components/ui-elements/recordable-ion-channel-variable';
import { Reference } from '@/features/scan-config/components/ui-elements/reference';
import { SelectEFeaturesByProtocol } from '@/features/scan-config/components/ui-elements/select-efeatures-by-protocol';
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
  isFromIdRef,
  resolveEntityQueryFilters,
  resolveNeuronFilterProperties,
  type TEntityQuery,
} from '@/features/scan-config/helpers';
import {
  CIRCUIT_NEURONAL_MANIPULATION_SOURCE_FIELD,
  type Config,
  type ConfigSchema,
  type ConfigValue,
  isCircuitNeuronalManipulationType,
  type ParamSchema,
  ScanConfigUIElementDict,
  type TBlockState,
  type TSetFieldValue,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import {
  PropsBlockScopeProvider,
  useBlockValue,
  useConfigValue,
  useUpdateBlock,
} from '@/features/scan-config/use-config-store';

import type { ComponentType } from 'react';
import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

type TFieldKind = ParamSchema['ui_element'];

export type TControlAria = { 'aria-invalid': true; 'aria-describedby': string };

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
  /** the id a field with one control gives it, so the field's label points at it */
  controlId?: string;
  /** what marks that one control invalid and links it to the message shown at the field */
  controlAria?: TControlAria;
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

function StringInputField({ value, setValue, disabled, controlId, controlAria }: TFieldProps) {
  return (
    <Input
      id={controlId}
      {...controlAria}
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
      errorPath={errorPathPrefix}
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
      errorPath={errorPathPrefix}
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
  controlId,
  controlAria,
}: TFieldOf<typeof ScanConfigUIElementDict.FloatOptional>) {
  const bounds = numericSchemaBounds(paramSchema);
  return (
    <FloatOptional
      id={controlId}
      aria={controlAria}
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
  controlId,
  controlAria,
}: TFieldOf<typeof ScanConfigUIElementDict.FloatInput>) {
  const bounds = numericSchemaBounds(paramSchema);
  return (
    <FloatInput
      id={controlId}
      aria={controlAria}
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

function BooleanInputField({ value, setValue, disabled, controlId, controlAria }: TFieldProps) {
  return (
    <BooleanInput
      id={controlId}
      aria={controlAria}
      value={typeof value === 'boolean' ? value : null}
      disabled={disabled}
      onChange={setValue}
    />
  );
}

function StochasticityField({ value, setValue, disabled, controlId, controlAria }: TFieldProps) {
  return (
    <Stochasticity
      id={controlId}
      aria={controlAria}
      value={typeof value === 'boolean' ? value : null}
      disabled={disabled}
      onChange={setValue}
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

const selectFunctionText = (block: TBlockState) =>
  typeof block.function === 'string' ? block.function : '';

function DistributionParameterListField({
  fieldKey,
  value,
  setValue,
  disabled,
  errorPathPrefix,
  selectedEntry,
}: TFieldProps) {
  const functionText = useBlockValue(selectFunctionText);
  const stored = readParameterRows(value as ConfigValue);

  return (
    <DistributionParameterList
      key={`${selectedEntry ?? ''}/${fieldKey}`}
      rows={distributionParameterRows(functionText, stored)}
      stored={stored}
      disabled={disabled}
      errorPath={errorPathPrefix}
      onChange={(rows: TDistributionParameter[]) => setValue(rows as unknown as ConfigValue)}
    />
  );
}

function IonChannelModelPropertiesField({ value, setValue, disabled }: TFieldProps) {
  const recordingIds = useBlockValue(recordingIdsOf, isEqual);

  return (
    <IonChannelModelProperties
      value={(isPlainObject(value) ? value : {}) as TIonChannelModelPropertiesValue}
      recordingIds={recordingIds}
      disabled={disabled}
      onChange={(next) => setValue(next as unknown as ConfigValue)}
    />
  );
}

type TNeuronPropertyFilterSchema = Extract<
  ParamSchema,
  { ui_element: typeof ScanConfigUIElementDict.NeuronPropertyFilter }
>;

/** The population chosen in the filter's source field and its filterable properties. */
export function useNeuronFilterProperties(
  paramSchema: TNeuronPropertyFilterSchema,
  schemaMappingConfig: TSchemaMappingConfiguration | undefined
) {
  const select = useCallback(
    (block: TBlockState) => resolveNeuronFilterProperties(paramSchema, block, schemaMappingConfig),
    [paramSchema, schemaMappingConfig]
  );
  return useBlockValue(select, isEqual);
}

function shownNeuronFilters(
  value: ConfigValue | undefined,
  properties: Record<string, string[]>
): ConfigValue[] {
  if (Object.keys(properties).length === 0) return [];
  if (Array.isArray(value) && value.length > 0) return value;
  return isPlainObject(value) ? [value] : [{ filter_dict: [] }];
}

function storedNeuronFilters(filters: INeuronPropertyFilter[]): ConfigValue {
  const [first] = filters;
  if (!first || (filters.length === 1 && Object.keys(first.filter_dict).length === 0)) return null;
  return (filters.length === 1 ? first : filters) as unknown as ConfigValue;
}

function NeuronPropertyFilterField({
  paramSchema,
  value,
  setValue,
  schemaMappingConfig,
}: TFieldProps<TNeuronPropertyFilterSchema>) {
  const { population, properties } = useNeuronFilterProperties(paramSchema, schemaMappingConfig);

  return (
    <NeuronPropertyFilter
      properties={properties}
      population={population}
      value={shownNeuronFilters(value, properties) as unknown as INeuronPropertyFilter[]}
      onChange={(next: INeuronPropertyFilter[]) => setValue(storedNeuronFilters(next))}
    />
  );
}

const PROBABILITIES_KEY = 'probabilities';

const selectProbabilities = (block: TBlockState) => block[PROBABILITIES_KEY];

const numbersOf = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : [];

function DiscreteProbabilitiesField({ fieldKey, value, disabled }: TFieldProps) {
  const probabilities = useBlockValue(selectProbabilities);
  const update = useUpdateBlock();

  return (
    <DiscreteProbabilities
      values={numbersOf(value)}
      probabilities={numbersOf(probabilities)}
      disabled={disabled}
      onChange={(nextValues, nextProbabilities) =>
        update((previous) => ({
          ...previous,
          [fieldKey]: nextValues as unknown as ConfigValue,
          [PROBABILITIES_KEY]: nextProbabilities as unknown as ConfigValue,
        }))
      }
    />
  );
}

type TQueriedEntity = { type: TEntityTypeDict } & TEntityQuery;

/** An entity picker whose query filters come from other parts of the config (`circuit_id`, say). */
function ModelSelectorSingleField({
  paramSchema,
  value,
  setValue,
  disabled,
}: TFieldOf<typeof ScanConfigUIElementDict.ModelSelectorSingle>) {
  const query = get(paramSchema, 'entity_query') as TQueriedEntity | undefined;
  const selectFilters = useCallback(
    (config: Config) => (query ? resolveEntityQueryFilters(query, config) : undefined),
    [query]
  );
  const filters = useConfigValue(selectFilters, isEqual);

  if (!query) return null;

  return (
    <EntitySelectorSingle
      filters={filters}
      entityType={query.type}
      disabled={disabled}
      value={value as ConfigValue}
      paramSchema={paramSchema as unknown as Record<string, unknown>}
      valueType={paramSchema.properties?.type?.const}
      onChange={setValue}
    />
  );
}

function TaskResultSelectorField({
  paramSchema,
  value,
  setValue,
  disabled,
  errorPathPrefix,
}: TFieldOf<typeof ScanConfigUIElementDict.TaskResultSelector>) {
  // The field carries the concrete entitycore task_result_type (`efeature_extraction__result`,
  // say). Browse and display use the frontend view that lists it; the stored ref stays the
  // generic `TaskResultFromID` the backend expects.
  const taskResultType = get(paramSchema, 'task_result_type') as string | undefined;
  const resolvedType = taskResultType ? getExtendedTypeByTaskResultType(taskResultType) : undefined;

  if (!resolvedType) return null;

  return (
    <DefaultTargetLookup fieldPath={errorPathPrefix} hasValue={isFromIdRef(value)}>
      <EntitySelectorSingle
        entityType={resolvedType as unknown as TEntityTypeDict}
        resolveAsType={resolvedType}
        disabled={disabled}
        value={value as ConfigValue}
        paramSchema={paramSchema as unknown as Record<string, unknown>}
        valueType={paramSchema.properties?.type?.const}
        onChange={setValue}
      />
    </DefaultTargetLookup>
  );
}

function EtypeSelectorField({
  paramSchema,
  value,
  setValue,
  disabled,
}: TFieldOf<typeof ScanConfigUIElementDict.EtypeSelector>) {
  return (
    <ETypeSelector
      disabled={disabled}
      value={value as ConfigValue}
      valueType={paramSchema.properties?.type?.const}
      onChange={setValue}
    />
  );
}

function ModelIdentifierMultipleField({
  paramSchema,
  value,
  setValue,
  disabled,
  errorPathPrefix,
}: TFieldOf<typeof ScanConfigUIElementDict.ModelIdentifierMultiple>) {
  return (
    <ModelIdentifierMultiple
      value={value as ConfigValue}
      onChange={setValue}
      paramSchema={paramSchema}
      disabled={disabled}
      errorPathPrefix={errorPathPrefix}
    />
  );
}

function ModelIdentifierGroupedField({
  paramSchema,
  value,
  setValue,
  disabled,
  errorPathPrefix,
}: TFieldOf<typeof ScanConfigUIElementDict.ModelIdentifierGrouped>) {
  return (
    <ModelIdentifierGrouped
      value={value as ConfigValue}
      onChange={setValue}
      paramSchema={paramSchema}
      disabled={disabled}
      errorPathPrefix={errorPathPrefix}
    />
  );
}

function SelectEFeaturesByProtocolField({
  paramSchema,
  value,
  setValue,
  disabled,
  schema,
  entity,
  schemaMappingConfig,
  errorPathPrefix,
}: TFieldProps) {
  return (
    <SelectEFeaturesByProtocol
      value={value as ConfigValue}
      onChange={setValue}
      paramSchema={paramSchema}
      schema={schema}
      disabled={disabled}
      errorPathPrefix={errorPathPrefix}
      // the widget gets the field renderer as a prop, so it does not import this registry
      renderField={(field) => (
        <PropsBlockScopeProvider state={field.state} setState={field.setState}>
          <FieldControl
            fieldKey={field.fieldKey}
            paramSchema={field.paramSchema}
            disabled={disabled}
            schema={schema}
            entity={entity}
            schemaMappingConfig={schemaMappingConfig}
          />
        </PropsBlockScopeProvider>
      )}
    />
  );
}

type TManipulationSchema = Extract<
  ParamSchema,
  {
    ui_element:
      | typeof ScanConfigUIElementDict.IonChannelVariableModificationByNeuron
      | typeof ScanConfigUIElementDict.ionChannelVariableModificationBySectionList;
  }
>;

const selectVariantType = (block: TBlockState) =>
  typeof block.type === 'string' ? block.type : undefined;

/** What both manipulation kinds read: the circuit or ME-model variant, and the neuron-set reference. */
function useManipulationSource(paramSchema: TManipulationSchema, schema: ConfigSchema) {
  const sourceField =
    paramSchema.property_source_field ?? CIRCUIT_NEURONAL_MANIPULATION_SOURCE_FIELD;
  const selectReference = useCallback((block: TBlockState) => block[sourceField], [sourceField]);

  return {
    isCircuit: isCircuitNeuronalManipulationType(useBlockValue(selectVariantType)),
    reference: useBlockValue(selectReference),
    endpoint: paramSchema.property_group
      ? schema.property_endpoints?.[paramSchema.property_group]
      : undefined,
  };
}

function ManipulationByNeuronField({
  paramSchema,
  value,
  setValue,
  disabled,
  schema,
  entity,
  errorPathPrefix,
}: TFieldOf<typeof ScanConfigUIElementDict.IonChannelVariableModificationByNeuron>) {
  const { isCircuit, reference, endpoint } = useManipulationSource(paramSchema, schema);
  const shared = {
    endpoint,
    entityId: entity?.id,
    disabled,
    value,
    onChange: setValue,
    modificationType: get(paramSchema, 'properties.type.const', 'ByNeuronModification'),
    errorPathPrefix,
  };

  return isCircuit ? <CircuitGlobal {...shared} reference={reference} /> : <Global {...shared} />;
}

function ManipulationBySectionListField({
  paramSchema,
  value,
  setValue,
  disabled,
  schema,
  entity,
  errorPathPrefix,
}: TFieldOf<typeof ScanConfigUIElementDict.ionChannelVariableModificationBySectionList>) {
  const { isCircuit, reference, endpoint } = useManipulationSource(paramSchema, schema);
  const shared = {
    endpoint,
    entityId: entity?.id,
    disabled,
    value,
    onChange: setValue,
    modificationType: get(paramSchema, 'properties.type.const', 'BySectionListModification'),
    errorPathPrefix,
  };

  return isCircuit ? <CircuitRange {...shared} reference={reference} /> : <Range {...shared} />;
}

function ObjectFieldField({
  paramSchema,
  value,
  setValue,
  disabled,
  schema,
  entity,
  schemaMappingConfig,
  errorPathPrefix,
}: TFieldOf<typeof ScanConfigUIElementDict.Object>) {
  return (
    <ObjectField
      value={value as ConfigValue}
      paramSchema={paramSchema}
      disabled={disabled}
      schema={schema}
      entity={entity}
      schemaMappingConfig={schemaMappingConfig}
      errorPathPrefix={errorPathPrefix}
      onChange={setValue}
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
  [ScanConfigUIElementDict.DistributionParameterList]: DistributionParameterListField,
  [ScanConfigUIElementDict.IonChannelModelProperties]: IonChannelModelPropertiesField,
  [ScanConfigUIElementDict.NeuronPropertyFilter]: NeuronPropertyFilterField,
  [ScanConfigUIElementDict.DiscreteProbabilities]: DiscreteProbabilitiesField,
  [ScanConfigUIElementDict.ModelSelectorSingle]: ModelSelectorSingleField,
  [ScanConfigUIElementDict.TaskResultSelector]: TaskResultSelectorField,
  [ScanConfigUIElementDict.EtypeSelector]: EtypeSelectorField,
  [ScanConfigUIElementDict.ModelIdentifierMultiple]: ModelIdentifierMultipleField,
  [ScanConfigUIElementDict.ModelIdentifierGrouped]: ModelIdentifierGroupedField,
  [ScanConfigUIElementDict.SelectEFeaturesByProtocol]: SelectEFeaturesByProtocolField,
  [ScanConfigUIElementDict.IonChannelVariableModificationByNeuron]: ManipulationByNeuronField,
  [ScanConfigUIElementDict.ionChannelVariableModificationBySectionList]:
    ManipulationBySectionListField,
  [ScanConfigUIElementDict.Object]: ObjectFieldField,
};

/** The component of each field kind (Strategy pattern): a new kind is one component and one line here. */
export const FIELD_REGISTRY = TYPED_FIELD_REGISTRY as Partial<
  Record<TFieldKind, ComponentType<TFieldProps>>
>;
