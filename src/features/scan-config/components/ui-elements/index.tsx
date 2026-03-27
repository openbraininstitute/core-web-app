import { Input } from 'antd';
import { get } from 'es-toolkit/compat';
import { match, P } from 'ts-pattern';

import ModelDetails from '@/features/scan-config/components/model-details';
import BooleanInput from '@/features/scan-config/components/ui-elements/boolean-input';
import EntityPropertyDropdown from '@/features/scan-config/components/ui-elements/entity-property-dropdown';
import { Global } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/global';
import { Range } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/range';
import {
  type MechanismVariablesRoot,
  RootSelector,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import { EntitySelectorSingle } from '@/features/scan-config/components/ui-elements/model-selector-single';
import NeuronIds from '@/features/scan-config/components/ui-elements/neuron-ids';
import ParameterSweep from '@/features/scan-config/components/ui-elements/parameter-sweep';
import { SelectRecordableIonChannelVariable } from '@/features/scan-config/components/ui-elements/recordable-ion-channel-variable';
import Reference from '@/features/scan-config/components/ui-elements/reference';
import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  type Config,
  type ConfigSchema,
  type ConfigValue,
  type ParamSchema,
  ScanConfigUIElementDict,
  type SchemaName,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { isObject } from '@/util/type-guards';

import type { SetStateAction } from 'jotai';
import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

type SetAtom<Args extends unknown[], Result> = (...args: Args) => Result;

export function UIElementRender({
  k,
  disabled,
  paramSchema,
  value,
  state,
  config,
  schema,
  setState,
  entity,
  schemaMappingConfig,
  errorPathPrefix,
}: {
  k: string;
  disabled: boolean;
  paramSchema: ParamSchema;
  value: ConfigValue;
  config: Config;
  schemaName: SchemaName;
  schema: ConfigSchema;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  state: Record<string, ConfigValue>;
  setState: SetAtom<[SetStateAction<Record<string, ConfigValue>>], void>;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  errorPathPrefix?: string;
}) {
  return match({ entity, paramSchema })
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.StringInput },
      },
      () => (
        <Input
          data-scan-config-block-element={ScanConfigUIElementDict.StringInput}
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          className="w-full"
          onChange={(e) => {
            setState({ ...state, [k]: e.currentTarget.value });
          }}
        />
      )
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.ModelIdentifier },
        entity: P.nonNullable,
      },
      ({ entity }) => <ModelDetails entity={entity} />
    )
    .with(
      {
        paramSchema: {
          ui_element: P.union(
            ScanConfigUIElementDict.FloatParameterSweep,
            ScanConfigUIElementDict.IntParameterSweep
          ),
        },
      },
      ({ paramSchema }) => (
        <ParameterSweep
          k={k}
          min={paramSchema.anyOf[0]?.minimum}
          max={paramSchema.anyOf[0]?.maximum}
          exclusiveMin={paramSchema.anyOf[0]?.exclusiveMinimum}
          exclusiveMax={paramSchema.anyOf[0]?.exclusiveMaximum}
          disabled={disabled}
          value={value as number | null | number[]}
          onChange={(value) => {
            setState({ ...state, [k]: value });
          }}
          errorPathPrefix={errorPathPrefix}
        />
      )
    )
    .with({ paramSchema: { ui_element: ScanConfigUIElementDict.Reference } }, ({ paramSchema }) => {
      const defaultV: string | null =
        isPlainObject(value) && typeof value.block_name === 'string' ? value.block_name : null;

      return (
        <Reference
          config={config}
          schema={schema}
          referenceSchema={paramSchema}
          value={defaultV}
          disabled={disabled}
          onChange={(block_name: string | null, block_dict_name: string | null) => {
            if (block_name === null) {
              setState({ ...state, [k]: null });
              return;
            }

            setState({
              ...state,
              [k]: {
                block_name,
                block_dict_name,
              },
            });
          }}
        />
      );
    })
    .with({ paramSchema: { ui_element: ScanConfigUIElementDict.NeuronIds } }, () => {
      // neuron_ids can be either a single NamedTuple or an array of NamedTuples
      // Extract all elements from all NamedTuples
      const elements: number[] = [];

      if (Array.isArray(value)) {
        // Array of NamedTuples
        value.forEach((namedTuple) => {
          if (isPlainObject(namedTuple) && Array.isArray(namedTuple.elements)) {
            elements.push(...namedTuple.elements);
          }
        });
      } else if (isPlainObject(value) && Array.isArray(value.elements)) {
        // Single NamedTuple
        elements.push(...value.elements);
      }

      return (
        <NeuronIds
          elements={elements}
          disabled={disabled}
          onDeleteElement={(i: number) => {
            // Handle both single NamedTuple and array of NamedTuples
            if (Array.isArray(state[k])) {
              // Array of NamedTuples - flatten, remove element, rebuild
              const allElements: number[] = [];
              state[k].forEach((nt: any) => {
                if (isPlainObject(nt) && Array.isArray(nt.elements)) {
                  allElements.push(...nt.elements);
                }
              });

              if (allElements.length === 1) {
                setState({ ...state, [k]: null });
                return;
              }

              allElements.splice(i, 1);

              setState({
                ...state,
                [k]: [
                  { type: 'NamedTuple', name: 'id_list', elements: allElements },
                ] as unknown as ConfigValue,
              });
            } else if (isPlainObject(state[k]) && Array.isArray(state[k].elements)) {
              // Single NamedTuple
              if (state[k].elements.length === 1) {
                setState({ ...state, [k]: null });
                return;
              }

              state[k].elements.splice(i, 1);

              setState({
                ...state,
                [k]: { ...state[k], elements: [...state[k].elements] },
              });
            }
          }}
          onAddElement={(newElement: number) => {
            if (!state[k]) {
              // Initialize as array of NamedTuples (the more common case)
              setState({
                ...state,
                [k]: [
                  { type: 'NamedTuple', name: 'id_list', elements: [newElement] },
                ] as unknown as ConfigValue,
              });
            } else if (Array.isArray(state[k])) {
              // Array of NamedTuples - add to the first one or create new
              const firstTuple = state[k][0] as any;
              if (isPlainObject(firstTuple) && Array.isArray(firstTuple.elements)) {
                setState({
                  ...state,
                  [k]: [
                    { ...firstTuple, elements: [...firstTuple.elements, newElement] },
                    ...(state[k] as any[]).slice(1),
                  ] as unknown as ConfigValue,
                });
              } else {
                setState({
                  ...state,
                  [k]: [
                    { type: 'NamedTuple', name: 'id_list', elements: [newElement] },
                  ] as unknown as ConfigValue,
                });
              }
            } else if (isPlainObject(state[k]) && Array.isArray(state[k].elements)) {
              // Single NamedTuple
              setState({
                ...state,
                [k]: { ...state[k], elements: [...state[k].elements, newElement] },
              });
            }
          }}
        />
      );
    })
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.EntityPropertyDropdown },
        entity: P.nonNullable,
      },
      ({ paramSchema }) => {
        const getValue = (): string[] => {
          if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
            return value;
          }
          if (typeof value === 'string') return [value];
          return [];
        };

        return (
          <EntityPropertyDropdown
            schemaMappingConfig={schemaMappingConfig}
            disabled={disabled}
            value={getValue()}
            onChange={(newV: string[]) => setState({ ...state, node_set: newV })}
            property={paramSchema.property}
          />
        );
      }
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.BooleanInput },
      },
      ({ paramSchema }) => {
        const currentValue = typeof state[k] === 'boolean' ? state[k] : null;
        return (
          <BooleanInput
            value={currentValue}
            disabled={disabled}
            onChange={(value: boolean) => {
              setState({ ...state, [k]: value });
            }}
            ariaLabel={paramSchema.description}
          />
        );
      }
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.IonChannelVariableModificationByNeuron },
      },
      ({ paramSchema }) => {
        const rawMechanismConfig = get(schemaMappingConfig?.properties, RootSelector, null);
        const mechanismConfig: MechanismVariablesRoot | null =
          rawMechanismConfig && isObject(rawMechanismConfig)
            ? (rawMechanismConfig as unknown as MechanismVariablesRoot)
            : null;
        const modificationType = get(paramSchema, 'properties.type.const', 'ByNeuronModification');
        return (
          <Global
            data={mechanismConfig}
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
        const rawMechanismConfig = get(schemaMappingConfig?.properties, RootSelector, null);
        const mechanismConfig: MechanismVariablesRoot | null =
          rawMechanismConfig && isObject(rawMechanismConfig)
            ? (rawMechanismConfig as unknown as MechanismVariablesRoot)
            : null;
        const modificationType = get(
          paramSchema,
          'properties.type.const',
          'BySectionListModification'
        );
        return (
          <Range
            data={mechanismConfig}
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
          | {
              type: TEntityTypeDict;
              filters: Record<string, any>;
            }
          | undefined;
        if (q) {
          return (
            <EntitySelectorSingle
              entityType={q.type}
              disabled={disabled}
              filters={q.filters}
              value={value}
              state={state}
              fieldKey={k}
              valueType={paramSchema.properties?.type?.const}
              onChange={setState}
            />
          );
        }
      }
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.SelectRecordableIonChannelVariable },
      },
      ({ paramSchema }) => {
        const currentValue =
          isPlainObject(value) && typeof value.variable_name === 'string'
            ? (value as unknown as {
                ion_channel_id: string | null;
                variable_name: string;
                type: string;
              })
            : null;

        return (
          <SelectRecordableIonChannelVariable
            value={currentValue}
            disabled={disabled}
            config={config}
            paramSchema={paramSchema}
            schema={schema}
            onChange={(v) => {
              if (v === null) {
                setState({ ...state, [k]: null });
                return;
              }
              setState({
                ...state,
                [k]: {
                  ion_channel_id: v.ion_channel_id,
                  variable_name: v.variable_name,
                  type: v.type,
                },
              });
            }}
          />
        );
      }
    )
    .otherwise(() => null);
}
