import { isEqual } from 'es-toolkit';
import { get } from 'es-toolkit/compat';
import { type ComponentProps, useCallback } from 'react';
import { match } from 'ts-pattern';

import { getExtendedTypeByTaskResultType } from '@/entity-configuration/domain/helpers';
import { DefaultTargetLookup } from '@/features/scan-config/components/ui-elements/default-target-lookup';
import { DiscreteProbabilities } from '@/features/scan-config/components/ui-elements/discrete-probabilities';
import {
  DistributionParameterList,
  distributionParameterRows,
  readParameterRows,
  type TDistributionParameter,
} from '@/features/scan-config/components/ui-elements/distance-function/distribution-parameter-list';
import { ETypeSelector } from '@/features/scan-config/components/ui-elements/etype-selector';
import {
  IonChannelModelProperties,
  recordingIdsOf,
  type TIonChannelModelPropertiesValue,
} from '@/features/scan-config/components/ui-elements/ion-channel-model-properties';
import { CircuitGlobal } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/global';
import { CircuitRange } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/range';
import { Global } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/me-model/global';
import { Range } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/me-model/range';
import {
  ModelIdentifierGrouped,
  ModelIdentifierMultiple,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple';
import { EntitySelectorSingle } from '@/features/scan-config/components/ui-elements/model-selector-single';
import NeuronPropertyFilter, {
  type INeuronPropertyFilter,
} from '@/features/scan-config/components/ui-elements/neuron-property-filter';
import { ObjectField } from '@/features/scan-config/components/ui-elements/object';
import { FIELD_REGISTRY } from '@/features/scan-config/components/ui-elements/registry';
import { SelectEFeaturesByProtocol } from '@/features/scan-config/components/ui-elements/select-efeatures-by-protocol';
import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  isFromIdRef,
  resolveEntityQueryFilters,
  resolveNeuronFilterProperties,
  type TEntityQuery,
} from '@/features/scan-config/helpers';
import { withField } from '@/features/scan-config/store';
import {
  CIRCUIT_NEURONAL_MANIPULATION_SOURCE_FIELD,
  type Config,
  type ConfigSchema,
  type ConfigValue,
  isCircuitNeuronalManipulationType,
  type ParamSchema,
  ScanConfigUIElementDict,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { useConfigValue } from '@/features/scan-config/use-config-store';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

export type SetAtom<Args extends unknown[], Result> = (...args: Args) => Result;

const DISCRETE_PROBABILITIES_FIELD = 'probabilities';

/** Resolves the query's dynamic filters (e.g. `circuit_id` from `initialize.circuit`) from the config. */
function QueriedEntitySelector({
  query,
  ...props
}: { query: TEntityQuery } & Omit<ComponentProps<typeof EntitySelectorSingle>, 'filters'>) {
  const selectFilters = useCallback(
    (config: Config) => resolveEntityQueryFilters(query, config),
    [query]
  );
  const filters = useConfigValue(selectFilters, isEqual);

  return <EntitySelectorSingle {...props} filters={filters} />;
}

export function UIElementRender({
  k,
  disabled,
  paramSchema,
  state,
  schema,
  setState,
  entity,
  schemaMappingConfig,
  errorPathPrefix,
  selectedEntry,
}: {
  k: string;
  disabled: boolean;
  paramSchema: ParamSchema;
  schema: ConfigSchema;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  state: Record<string, ConfigValue>;
  setState: (newState: Record<string, ConfigValue>) => void;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  errorPathPrefix?: string;
  /** name of the dictionary entry being edited; used to exclude self-references */
  selectedEntry?: string;
}) {
  const value = state[k];
  const Field = FIELD_REGISTRY[paramSchema.ui_element];
  if (Field) {
    return (
      <Field
        fieldKey={k}
        paramSchema={paramSchema}
        value={value}
        setValue={(next) => setState(withField(state, k, next))}
        disabled={disabled}
        schema={schema}
        entity={entity}
        schemaMappingConfig={schemaMappingConfig}
        errorPathPrefix={errorPathPrefix}
        selectedEntry={selectedEntry}
      />
    );
  }

  return match({ entity, paramSchema })
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.DistributionParameterList },
      },
      () => {
        const functionText = typeof state.function === 'string' ? state.function : '';
        const stored = readParameterRows(value);
        const rows = distributionParameterRows(functionText, stored);
        return (
          <DistributionParameterList
            key={`${selectedEntry ?? ''}/${k}`}
            rows={rows}
            stored={stored}
            disabled={disabled}
            errorPath={errorPathPrefix ? `${errorPathPrefix}/${k}` : undefined}
            onChange={(rows: TDistributionParameter[]) => {
              setState({ ...state, [k]: rows as unknown as ConfigValue });
            }}
          />
        );
      }
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.ModelIdentifierMultiple },
      },
      ({ paramSchema }) => (
        <ModelIdentifierMultiple
          fieldKey={k}
          value={value}
          state={state}
          setState={setState}
          paramSchema={paramSchema}
          disabled={disabled}
          errorPathPrefix={errorPathPrefix}
        />
      )
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.ModelIdentifierGrouped },
      },
      ({ paramSchema }) => (
        <ModelIdentifierGrouped
          fieldKey={k}
          value={value}
          state={state}
          setState={setState}
          paramSchema={paramSchema}
          disabled={disabled}
          errorPathPrefix={errorPathPrefix}
        />
      )
    )
    .with(
      { paramSchema: { ui_element: ScanConfigUIElementDict.IonChannelModelProperties } },
      () => (
        <IonChannelModelProperties
          value={(isPlainObject(value) ? value : {}) as TIonChannelModelPropertiesValue}
          recordingIds={recordingIdsOf(state)}
          disabled={disabled}
          onChange={(next) => setState({ ...state, [k]: next as unknown as ConfigValue })}
        />
      )
    )
    .with(
      { paramSchema: { ui_element: ScanConfigUIElementDict.SelectEFeaturesByProtocol } },
      ({ paramSchema }) => (
        <SelectEFeaturesByProtocol
          fieldKey={k}
          value={value}
          state={state}
          setState={setState}
          paramSchema={paramSchema}
          schema={schema}
          disabled={disabled}
          errorPathPrefix={errorPathPrefix}
          // the shared renderer is defined in this module; passing it down keeps the widget
          // from importing its own barrel
          renderField={({
            fieldKey,
            paramSchema: fieldSchema,
            state: fieldState,
            setState: setFieldState,
          }) => (
            <UIElementRender
              k={fieldKey}
              disabled={disabled}
              paramSchema={fieldSchema}
              state={fieldState}
              setState={setFieldState}
              schema={schema}
              entity={entity}
              schemaMappingConfig={schemaMappingConfig}
            />
          )}
        />
      )
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.IonChannelVariableModificationByNeuron },
      },
      ({ paramSchema }) => {
        const modificationType = get(paramSchema, 'properties.type.const', 'ByNeuronModification');
        const manipulationVariantType = typeof state.type === 'string' ? state.type : undefined;

        if (isCircuitNeuronalManipulationType(manipulationVariantType)) {
          return (
            <CircuitGlobal
              state={state}
              setState={setState}
              sourceField={
                paramSchema.property_source_field ?? CIRCUIT_NEURONAL_MANIPULATION_SOURCE_FIELD
              }
              fieldKey={k}
              endpoint={
                paramSchema.property_group
                  ? schema.property_endpoints?.[paramSchema.property_group]
                  : undefined
              }
              entityId={entity?.id}
              disabled={disabled}
              modificationType={modificationType}
              errorPathPrefix={errorPathPrefix}
            />
          );
        }

        return (
          <Global
            endpoint={
              paramSchema.property_group
                ? schema.property_endpoints?.[paramSchema.property_group]
                : undefined
            }
            entityId={entity?.id}
            disabled={disabled}
            state={state}
            setState={setState}
            fieldKey={k}
            modificationType={modificationType}
            errorPathPrefix={errorPathPrefix}
          />
        );
      }
    )
    .with(
      {
        paramSchema: {
          ui_element: ScanConfigUIElementDict.ionChannelVariableModificationBySectionList,
        },
      },
      ({ paramSchema }) => {
        const modificationType = get(
          paramSchema,
          'properties.type.const',
          'BySectionListModification'
        );
        const manipulationVariantType = typeof state.type === 'string' ? state.type : undefined;

        if (isCircuitNeuronalManipulationType(manipulationVariantType)) {
          return (
            <CircuitRange
              state={state}
              setState={setState}
              sourceField={
                paramSchema.property_source_field ?? CIRCUIT_NEURONAL_MANIPULATION_SOURCE_FIELD
              }
              fieldKey={k}
              endpoint={
                paramSchema.property_group
                  ? schema.property_endpoints?.[paramSchema.property_group]
                  : undefined
              }
              entityId={entity?.id}
              disabled={disabled}
              modificationType={modificationType}
              errorPathPrefix={errorPathPrefix}
            />
          );
        }

        return (
          <Range
            endpoint={
              paramSchema.property_group
                ? schema.property_endpoints?.[paramSchema.property_group]
                : undefined
            }
            entityId={entity?.id}
            disabled={disabled}
            state={state}
            setState={setState}
            fieldKey={k}
            modificationType={modificationType}
            errorPathPrefix={errorPathPrefix}
          />
        );
      }
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.ModelSelectorSingle },
      },
      ({ paramSchema }) => {
        const q = get(paramSchema, 'entity_query') as
          | ({ type: TEntityTypeDict } & TEntityQuery)
          | undefined;
        if (q) {
          return (
            <QueriedEntitySelector
              query={q}
              entityType={q.type}
              disabled={disabled}
              value={value}
              state={state}
              fieldKey={k}
              paramSchema={paramSchema as unknown as Record<string, unknown>}
              valueType={paramSchema.properties?.type?.const}
              onChange={setState}
            />
          );
        }
      }
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.TaskResultSelector },
      },
      ({ paramSchema }) => {
        // Field carries the concrete entitycore task_result_type (e.g. `efeature_extraction__result`).
        // Resolve it to the frontend view that lists it — browse + display use that specific type,
        // while the stored ref stays the generic `TaskResultFromID` the backend expects.
        const taskResultType = get(paramSchema, 'task_result_type') as string | undefined;
        const resolvedType = taskResultType
          ? getExtendedTypeByTaskResultType(taskResultType)
          : undefined;
        if (!resolvedType) {
          return null;
        }
        return (
          <DefaultTargetLookup fieldPath={errorPathPrefix} hasValue={isFromIdRef(value)}>
            <EntitySelectorSingle
              entityType={resolvedType as unknown as TEntityTypeDict}
              resolveAsType={resolvedType}
              disabled={disabled}
              value={value}
              state={state}
              fieldKey={k}
              paramSchema={paramSchema as unknown as Record<string, unknown>}
              valueType={paramSchema.properties?.type?.const}
              onChange={setState}
            />
          </DefaultTargetLookup>
        );
      }
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.EtypeSelector },
      },
      ({ paramSchema }) => (
        <ETypeSelector
          disabled={disabled}
          value={value}
          state={state}
          fieldKey={k}
          valueType={paramSchema.properties?.type?.const}
          onChange={setState}
        />
      )
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.NeuronPropertyFilter },
      },
      ({ paramSchema }) => {
        const { population: selectedPopulation, properties } = resolveNeuronFilterProperties(
          paramSchema,
          state,
          schemaMappingConfig
        );

        const getValue = () => {
          if (Object.keys(properties).length === 0) return [];

          if (Array.isArray(value) && value.length > 0) {
            return value;
          }

          if (isPlainObject(value)) {
            return [value];
          }

          return [{ filter_dict: [] }];
        };

        return (
          <NeuronPropertyFilter
            properties={properties}
            population={selectedPopulation}
            value={getValue() as unknown as INeuronPropertyFilter[]}
            onChange={(newValue: INeuronPropertyFilter[]) => {
              const getNewValue = () => {
                if (
                  newValue.length === 0 ||
                  (newValue.length === 1 && Object.keys(newValue[0].filter_dict).length === 0)
                )
                  return null;
                if (newValue.length === 1) return newValue[0];
                return newValue;
              };

              setState({ ...state, [k]: getNewValue() as ConfigValue });
            }}
          />
        );
      }
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.DiscreteProbabilities },
      },
      () => {
        const asNumbers = (v: unknown): number[] =>
          Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : [];

        return (
          <DiscreteProbabilities
            values={asNumbers(value)}
            probabilities={asNumbers(state[DISCRETE_PROBABILITIES_FIELD])}
            disabled={disabled}
            onChange={(values, probabilities) =>
              setState({
                ...state,
                [k]: values as unknown as ConfigValue,
                [DISCRETE_PROBABILITIES_FIELD]: probabilities as unknown as ConfigValue,
              })
            }
          />
        );
      }
    )
    .with({ paramSchema: { ui_element: ScanConfigUIElementDict.Object } }, ({ paramSchema }) => (
      <ObjectField
        value={value}
        paramSchema={paramSchema}
        disabled={disabled}
        schema={schema}
        entity={entity}
        schemaMappingConfig={schemaMappingConfig}
        errorPathPrefix={errorPathPrefix ? `${errorPathPrefix}/${k}` : undefined}
        onChange={(nextObject) => setState({ ...state, [k]: nextObject })}
      />
    ))

    .otherwise(() => null);
}
