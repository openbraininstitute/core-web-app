import { Input } from 'antd';
import { get } from 'es-toolkit/compat';
import { match, P } from 'ts-pattern';

import BooleanInput from '@/features/scan-config/components/ui-elements/boolean-input';
import EntityPropertyDropdown from '@/features/scan-config/components/ui-elements/entity-property-dropdown';
import { Global } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/global';
import { Range } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/range';
import {
  type MechanismVariablesRoot,
  RootSelector,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import { ModelIdentifier } from '@/features/scan-config/components/ui-elements/model-identifier';
import { ModelIdentifierMultiple } from '@/features/scan-config/components/ui-elements/model-identifier-multiple';
import { EntitySelectorSingle } from '@/features/scan-config/components/ui-elements/model-selector-single';
import NeuronIds from '@/features/scan-config/components/ui-elements/neuron-ids';
import NeuronPropertyFilter, {
  type INeuronPropertyFilter,
} from '@/features/scan-config/components/ui-elements/neuron-property-filter';
import {
  NeuronSetCombination,
  type NeuronSetCombinationEntry,
} from '@/features/scan-config/components/ui-elements/neuron-set-combination';
import ParameterSweep from '@/features/scan-config/components/ui-elements/parameter-sweep';
import { SelectRecordableIonChannelVariable } from '@/features/scan-config/components/ui-elements/recordable-ion-channel-variable';
import Reference from '@/features/scan-config/components/ui-elements/reference';
import { StringSelectionEnhanced } from '@/features/scan-config/components/ui-elements/string-selection-enhanced';
import {
  VoltageDuration,
  type VoltageDurationState,
} from '@/features/scan-config/components/ui-elements/voltage-duration';
import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  type Config,
  type ConfigSchema,
  type ConfigValue,
  type ParamSchema,
  ScanConfigUIElementDict,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { isObject } from '@/util/type-guards';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';
export type SetAtom<Args extends unknown[], Result> = (...args: Args) => Result;

export function UIElementRender({
  k,
  disabled,
  paramSchema,
  state,
  config,
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
  config: Config;
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
            setState({ ...state, [k]: e.currentTarget.value || null });
          }}
        />
      )
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.ModelIdentifier },
        entity: P.nonNullable,
      },
      ({ entity }) => <ModelIdentifier entity={entity} value={value} />
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
          // a block can't reference itself; exclude the current entry. This only affects
          // references that resolve to the entry's own dictionary (a no-op otherwise).
          omit={selectedEntry ? [selectedEntry] : []}
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
      return (
        <NeuronIds
          value={value}
          disabled={disabled}
          onAddIds={(newElement: number[] | null) => {
            if (newElement === null || newElement.length === 0) {
              setState({
                ...state,
                [k]: null,
              });
              return;
            }

            if (!state[k]) {
              const newState = {
                ...state,
                [k]: { elements: newElement },
              };
              setState(newState);
              return;
            }

            setState({
              ...state,
              [k]: { elements: newElement },
            });
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
        // detect if the field supports multiple values by checking for anyOf with an array type
        const isMultiple = 'anyOf' in paramSchema;

        if (isMultiple) {
          const getValue = (): Array<string> => {
            if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
              return value as string[];
            }
            if (typeof value === 'string') return [value];
            return [];
          };

          return (
            <EntityPropertyDropdown
              multiple
              disabled={disabled}
              schemaMappingConfig={schemaMappingConfig}
              value={getValue()}
              onChange={(newV: string | Array<string>) => setState({ ...state, [k]: newV })}
              property={paramSchema.property}
            />
          );
        }

        // single-value mode (e.g. population field with type: "string")
        const singleValue = typeof value === 'string' ? value : undefined;

        return (
          <EntityPropertyDropdown
            multiple={false}
            disabled={disabled}
            schemaMappingConfig={schemaMappingConfig}
            value={singleValue ?? ''}
            onChange={(newV: string | string[]) =>
              setState({
                ...state,
                // NOTE: this is requested by James for IT'IS collaboration
                [k]: Array.isArray(newV) && newV.length === 1 ? newV[0] : newV,
              })
            }
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
              filters: Record<string, unknown>;
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
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.StringSelectionEnhanced },
      },
      ({ paramSchema }) => (
        <StringSelectionEnhanced
          value={typeof value === 'string' ? value : null}
          disabled={disabled}
          paramSchema={paramSchema}
          onChange={(newValue: string) => setState({ ...state, [k]: newValue })}
        />
      )
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.VoltageDuration },
      },
      ({ paramSchema }) => {
        const v = (state[k] ?? []) as unknown as VoltageDurationState[];
        return (
          <VoltageDuration
            paramSchema={paramSchema}
            state={v}
            onChange={(newValue: VoltageDurationState[]) =>
              setState({ ...state, [k]: newValue as unknown as ConfigValue })
            }
            disabled={disabled}
          />
        );
      }
    )
    .with(
      {
        paramSchema: { ui_element: ScanConfigUIElementDict.NeuronPropertyFilter },
      },
      ({ paramSchema }) => {
        const getDropdownValue = (): string => {
          const dropdownValueKey = paramSchema.population_source_dropdown_key;
          const selectedPopulation = state[dropdownValueKey];

          if (Array.isArray(selectedPopulation) && typeof selectedPopulation[0] === 'string') {
            return selectedPopulation[0] ?? '';
          }
          if (typeof selectedPopulation === 'string') return selectedPopulation;
          return '';
        };

        const selectedPopulation = getDropdownValue();

        const properties =
          schemaMappingConfig?.properties?.NodePropertyUniqueValuesByPopulation[
            selectedPopulation
          ] ?? {};

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
        paramSchema: { ui_element: ScanConfigUIElementDict.NeuronSetCombination },
      },
      ({ paramSchema }) => {
        const v = (Array.isArray(state[k])
          ? state[k]
          : []) as unknown as NeuronSetCombinationEntry[];
        return (
          <NeuronSetCombination
            paramSchema={paramSchema}
            value={v}
            config={config}
            schema={schema}
            disabled={disabled}
            selfName={selectedEntry}
            onChange={(newValue: NeuronSetCombinationEntry[]) =>
              setState({ ...state, [k]: newValue as unknown as ConfigValue })
            }
          />
        );
      }
    )
    .otherwise(() => null);
}
