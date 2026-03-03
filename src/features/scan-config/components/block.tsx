import { Input } from 'antd';
import { isNil } from 'es-toolkit/compat';
import { atom, useAtom } from 'jotai';

import BooleanInput from '@/features/scan-config/components/boolean-input';
import EntityPropertyDropdown from '@/features/scan-config/components/entity-property-dropdown';
import ModelDetails from '@/features/scan-config/components/model-details';
import NeuronIds from '@/features/scan-config/components/neuron-ids';
import ParameterSweep from '@/features/scan-config/components/parameter-sweep';
import Reference from '@/features/scan-config/components/reference';
import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  isType,
  type ParamSchema,
  ScanConfigUIElementDict,
  type SchemaName,
  type TBlock,
} from '@/features/scan-config/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';

type Primitive = null | boolean | number | string;
interface Object {
  [key: string]: Primitive | Primitive[] | Object;
}

export type ConfigValue = Primitive | Primitive[] | Object;

export type Config = Record<string, Object | string>;

export default function Block({
  schemaName,
  disabled,
  blockSchema,
  stateAtom,
  config,
  model,
  hideTitle,
  schemaMappingConfig,
}: {
  schemaName: SchemaName;
  disabled: boolean;
  config: Config;
  blockSchema?: TBlock;
  model: ICircuit | IMEModel | undefined | null;
  stateAtom: ReturnType<typeof atom<Record<string, ConfigValue>>> | null;
  hideTitle?: boolean;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
}) {
  const [state, setState] = useAtom(stateAtom ?? atom<Record<string, ConfigValue>>({}));

  function renderInput(k: string, paramSchema: ParamSchema, value: ConfigValue) {
    if (paramSchema.ui_element === ScanConfigUIElementDict.StringInput) {
      return (
        <Input
          data-scan-config-block-element={ScanConfigUIElementDict.StringInput}
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          className="w-full"
          onChange={(e) => {
            setState({ ...state, [k]: e.currentTarget.value });
          }}
        />
      );
    }

    if (paramSchema.ui_element === ScanConfigUIElementDict.ModelIdentifier && model) {
      return <ModelDetails model={model} />;
    }

    if (
      paramSchema.ui_element === ScanConfigUIElementDict.FloatParameterSweep ||
      paramSchema.ui_element === ScanConfigUIElementDict.IntParameterSweep
    ) {
      return (
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
      );
    }

    if (paramSchema.ui_element === ScanConfigUIElementDict.Reference) {
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
    }

    if (paramSchema.ui_element === ScanConfigUIElementDict.NeuronIds) {
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
                [k]: [{ type: 'NamedTuple', name: 'id_list', elements: allElements }],
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
                [k]: [{ type: 'NamedTuple', name: 'id_list', elements: [newElement] }],
              });
            } else if (Array.isArray(state[k])) {
              // Array of NamedTuples - add to the first one or create new
              const firstTuple = state[k][0];
              if (isPlainObject(firstTuple) && Array.isArray(firstTuple.elements)) {
                setState({
                  ...state,
                  [k]: [
                    { ...firstTuple, elements: [...firstTuple.elements, newElement] },
                    ...state[k].slice(1),
                  ],
                });
              } else {
                setState({
                  ...state,
                  [k]: [{ type: 'NamedTuple', name: 'id_list', elements: [newElement] }],
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
    }

    if (paramSchema.ui_element === ScanConfigUIElementDict.EntityPropertyDropdown && model) {
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

    if (paramSchema.ui_element === ScanConfigUIElementDict.BooleanInput) {
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

    return null;
  }

  if (!blockSchema) return null;
  return (
    <div className="flex flex-col gap-2" data-scan-config-block={ScanConfigUIElementDict.BlockSingle}>
      {!hideTitle && (
        <>
          <div className="text-lg text-gray-500 uppercase">{blockSchema.title}</div>
          <div className="mb-6 text-gray-500">{blockSchema.description}</div>
        </>
      )}
      {hideTitle && blockSchema.description && (
        <div className="mb-6 text-gray-500">{blockSchema.description}</div>
      )}

      <div className="flex flex-col gap-5">
        {blockSchema.properties &&
          Object.entries(blockSchema.properties)
            .filter(([_, paramSchema]) => {
              return !isType(paramSchema) && !paramSchema.ui_hidden;
            })
            .map(([k, blockElementSchema]) => {
              if (isType(blockElementSchema)) return null;
              const isBooleanInput =
                blockElementSchema.ui_element === ScanConfigUIElementDict.BooleanInput;

              const value = state[k];

              return (
                <div
                  key={k}
                  className={cn(
                    'w-full flex',
                    isBooleanInput ? 'flex-row items-center' : 'flex-col'
                  )}
                  data-scan-config-block-element={blockElementSchema.ui_element}
                >
                  <div className="flex gap-3 w-full items-center">
                    <div
                      className="text-primary-9 text-base font-semibold uppercase"
                      title={blockElementSchema.description}
                    >
                      {blockElementSchema.title}
                    </div>
                    {blockElementSchema.units && (
                      <div className="text-lg text-gray-500">{blockElementSchema.units}</div>
                    )}
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <div className="mb-1 flex items-center gap-1">
                          <div className="border rounded-lg border-transparent flex-1 mr-1">
                            {renderInput(k, blockElementSchema, value)}
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      avoidCollisions
                      hideWhenDetached
                      align="center"
                      side="bottom"
                      className={cn(
                        'text-white shadow-bnb max-w-2xs min-w-2xs rounded-md ',
                        'bg-primary-8 px-4 py-2 text-base text-wrap ',
                        'overflow-y-auto max-h-50 primary-scrollbar'
                      )}
                      arrowClassName="bg-primary-8"
                    >
                      {k === 'circuit' && model
                        ? model.description
                        : blockElementSchema.description}
                    </TooltipContent>
                  </Tooltip>

                  {blockSchema.required?.includes(k) && isNil(value) && (
                    <span className="text-red-500">Required</span>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}
