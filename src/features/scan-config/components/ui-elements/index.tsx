import { Input } from 'antd';
import { get } from 'es-toolkit/compat';
import { match, P } from 'ts-pattern';

import ModelDetails from '@/features/scan-config/components/model-details';
import BooleanInput from '@/features/scan-config/components/ui-elements/boolean-input';
import EntityPropertyDropdown from '@/features/scan-config/components/ui-elements/entity-property-dropdown';
import { Global } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/global';
import { Range } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/range';
import { RootSelector } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import NeuronIds from '@/features/scan-config/components/ui-elements/neuron-ids';
import ParameterSweep from '@/features/scan-config/components/ui-elements/parameter-sweep';
import Reference from '@/features/scan-config/components/ui-elements/reference';
import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  type Config,
  type ConfigValue,
  type ParamSchema,
  ScanConfigUIElementDict,
  type SchemaName,
} from '@/features/scan-config/types';

import type { SetStateAction } from 'jotai';
import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';

type SetAtom<Args extends unknown[], Result> = (...args: Args) => Result;

export function UIElementRender({
  k,
  disabled,
  paramSchema,
  value,
  state,
  config,
  schemaName,
  setState,
  entity,
  schemaMappingConfig,
}: {
  k: string;
  disabled: boolean;
  paramSchema: ParamSchema;
  value: ConfigValue;
  config: Config;
  schemaName: SchemaName;
  entity: ICircuit | IMEModel | null | undefined;
  state: Record<string, ConfigValue>;
  setState: SetAtom<[SetStateAction<Record<string, ConfigValue>>], void>;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
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
        />
      )
    )
    .with({ paramSchema: { ui_element: ScanConfigUIElementDict.Reference } }, ({ paramSchema }) => {
      const defaultV: string | null =
        isPlainObject(value) && typeof value.block_name === 'string' ? value.block_name : null;

      return (
        <Reference
          config={config}
          schemaName={schemaName}
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
      const elements: number[] =
        isPlainObject(value) && Array.isArray(value.elements) ? value.elements : [];

      return (
        <NeuronIds
          elements={elements}
          disabled={disabled}
          onDeleteElement={(i: number) => {
            if (!isPlainObject(state[k]) || !Array.isArray(state[k].elements)) return;

            if (state[k].elements.length === 1) {
              setState({ ...state, [k]: null });
              return;
            }

            state[k].elements.splice(i, 1); // delete in place

            setState({
              ...state,
              [k]: { elements: [...state[k].elements] },
            });
          }}
          onAddElement={(newElement: number) => {
            if (!state[k]) {
              setState({
                ...state,
                [k]: { elements: [newElement] },
              });
            } else if (isPlainObject(state[k]) && Array.isArray(state[k].elements)) {
              setState({
                ...state,
                [k]: { elements: [...state[k].elements, newElement] },
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
        const mechanismConfig = get(schemaMappingConfig?.properties, RootSelector, null);
        const modificationType = get(paramSchema, 'properties.type.const', 'ByNeuronModification');
        return (
          <Global
            data={mechanismConfig}
            disabled={disabled}
            state={state}
            setState={setState}
            fieldKey={k}
            modificationType={modificationType}
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
        const mechanismConfig = get(schemaMappingConfig?.properties, RootSelector, null);
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
          />
        );
      }
    )
    .otherwise(() => null);
}
