import { get } from 'es-toolkit/compat';
import { match } from 'ts-pattern';

import { CircuitGlobal } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/global';
import { CircuitRange } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/range';
import { Global } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/me-model/global';
import { Range } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/me-model/range';
import {
  ModelIdentifierGrouped,
  ModelIdentifierMultiple,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple';
import { ObjectField } from '@/features/scan-config/components/ui-elements/object';
import { FIELD_REGISTRY } from '@/features/scan-config/components/ui-elements/registry';
import { SelectEFeaturesByProtocol } from '@/features/scan-config/components/ui-elements/select-efeatures-by-protocol';
import { withField } from '@/features/scan-config/store';
import {
  CIRCUIT_NEURONAL_MANIPULATION_SOURCE_FIELD,
  type ConfigSchema,
  type ConfigValue,
  isCircuitNeuronalManipulationType,
  type ParamSchema,
  ScanConfigUIElementDict,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { PropsBlockScopeProvider } from '@/features/scan-config/use-config-store';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

export type SetAtom<Args extends unknown[], Result> = (...args: Args) => Result;

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
      <PropsBlockScopeProvider state={state} setState={setState}>
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
      </PropsBlockScopeProvider>
    );
  }

  return match({ entity, paramSchema })
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
