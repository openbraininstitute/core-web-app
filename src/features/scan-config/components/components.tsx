import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import isEqual from 'es-toolkit/compat/isEqual';
import { atom, useAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import EntityPropertyDropdown from '@/features/scan-config/components/entity-property-dropdown';
import ModelDetails from '@/features/scan-config/components/model-details';
import NeuronIds from '@/features/scan-config/components/neuron-ids';
import ParameterSwep from '@/features/scan-config/components/parameter-sweep';
import Reference from '@/features/scan-config/components/reference';
import Tooltip from '@/features/scan-config/components/tooltip';
import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  type Block,
  isType,
  type ParamSchema,
  type SchemaName,
} from '@/features/scan-config/types';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

type Primitive = null | boolean | number | string;
interface Object {
  [key: string]: Primitive | Primitive[] | Object;
}

export type ConfigValue = Primitive | Primitive[] | Object;

export type Config = Record<string, Object | string>;

export function BlockUI({
  schemaName,
  disabled,
  blockSchema,
  stateAtom,
  config,
  model,
  blockAIConfig,
}: {
  schemaName: SchemaName;
  disabled: boolean;
  config: Config;
  blockSchema?: Block;
  model: ICircuit | IMEModel | undefined | null;
  stateAtom: ReturnType<typeof atom<Record<string, ConfigValue>>> | null;
  blockAIConfig: Record<string, ConfigValue> | null;
}) {
  // Empty atom for when a block doesn't exist in the config (and the atoms map) yet, only in the AI suggested changes
  const emptyAtom = useRef(atom<Record<string, ConfigValue>>({}));
  const [state, setState] = useAtom(stateAtom ?? emptyAtom.current);

  // TODO: Delete this? (shouldn't be needed since the new atom should already have the defaults)
  useEffect(() => {
    if (!blockSchema || !blockSchema.properties || stateAtom === null) return;

    const initial: Record<string, ConfigValue> = {};

    Object.entries(blockSchema.properties).forEach(([key, value]) => {
      initial[key] = value.default ?? null;
    });

    setState((prev) => {
      return { ...initial, ...prev };
    });
  }, [setState, blockSchema, stateAtom]);

  function renderInput(k: string, paramSchema: ParamSchema, value: ConfigValue) {
    if (paramSchema.ui_element === 'string_input') {
      return (
        <Input
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          className="w-full"
          onChange={(e) => {
            setState({ ...state, [k]: e.currentTarget.value });
          }}
        />
      );
    }

    if (paramSchema.ui_element === 'model_identifier' && model) {
      return <ModelDetails model={model} />;
    }

    if (
      paramSchema.ui_element === 'float_parameter_sweep' ||
      paramSchema.ui_element === 'int_parameter_sweep'
    ) {
      return (
        <ParameterSwep
          k={k}
          min={paramSchema.anyOf[0]?.minimum}
          max={paramSchema.anyOf[0]?.maximum}
          disabled={disabled}
          value={value as number | null | number[]}
          onChange={(value) => {
            setState({ ...state, [k]: value });
          }}
        />
      );
    }

    if (paramSchema.ui_element === 'reference') {
      const defaultV: string | null =
        isPlainObject(value) && typeof value.block_name === 'string' ? value.block_name : null;

      return (
        <Reference
          config={config}
          hasReplacePatch={!!value}
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

    if (paramSchema.ui_element === 'neuron_ids') {
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
    }

    if (paramSchema.ui_element === 'entity_property_dropdown' && model) {
      return (
        <EntityPropertyDropdown
          disabled={disabled}
          modelId={model.id}
          value={typeof state.node_set === 'string' ? state.node_set : null}
          onChange={(newV: string | null) => setState({ ...state, node_set: newV })}
          entity_type={paramSchema.entity_type}
          property={paramSchema.property}
        />
      );
    }

    return null;
  }

  if (!blockSchema) return null;

  function op(k: string) {
    if (!blockAIConfig) return null;
    const v1 = state[k];
    const v2 = blockAIConfig[k];

    if (v1 === undefined && v2 !== undefined) return 'add';
    if (v1 !== undefined && v2 === undefined) return 'delete';
    if (v1 !== undefined && v2 !== undefined && !isEqual(v1, v2)) return 'replace';
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-lg text-gray-500 uppercase">{blockSchema.title}</div>
      <div className="mb-6 text-gray-500">{blockSchema.description}</div>

      <div className="flex flex-col gap-5">
        {blockSchema.properties &&
          Object.entries(blockSchema.properties)
            .filter(([_, paramSchema]) => {
              return !isType(paramSchema) && !paramSchema.ui_hidden;
            })
            .map(([k, blockElementSchema]) => {
              if (isType(blockElementSchema)) return null;
              const op_ = op(k);

              const patchBorderClass = () => {
                if (op_ === 'delete' || op_ === 'replace') 'border-red-500';
                if (op_ === 'add') return 'border-sky-400';
                return 'border-transparent';
              };

              // Gets the value so show in the input element
              const firstValue = () => {
                if (!op_ || op_ === 'delete' || op_ === 'replace' || !blockAIConfig) {
                  return state[k];
                }

                return blockAIConfig[k];
              };

              return (
                <div key={k}>
                  <div className="flex items-end gap-3">
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
                  <Tooltip value={blockElementSchema.description}>
                    <div className="mb-1 flex">
                      <div className={cn('border-1 flex-1 mr-1', patchBorderClass())}>
                        {renderInput(k, blockElementSchema, firstValue())}
                      </div>
                      {(op_ === 'delete' || op_ === 'replace') && (
                        <CloseOutlined className="text-red-500" />
                      )}
                    </div>

                    {op_ === 'replace' && !!blockAIConfig && (
                      <div className="flex">
                        <div className="border-1 border-sky-400 flex-1 mr-1">
                          {renderInput(k, blockElementSchema, blockAIConfig[k])}
                        </div>
                        <PlusOutlined className="text-sky-400" />
                      </div>
                    )}
                  </Tooltip>

                  {blockSchema.required?.includes(k) &&
                    (state[k] === null || state[k] === undefined) && (
                      <span className="text-red-500">Required</span>
                    )}
                </div>
              );
            })}
      </div>
    </div>
  );
}

export function Tab({
  tab,
  selectedTab,
  children,
  onClick,
  rounded = 'rounded-full',
  extraClass,
  disabled,
}: {
  tab: string;
  selectedTab: string;
  onClick?: () => void;
  rounded?: 'rounded-l-full' | 'rounded-r-full' | 'rounded-full';
  children?: React.ReactNode;
  extraClass?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      type="button"
      style={disabled ? { background: '#d1d5db', cursor: 'default', color: '#9ca3af' } : undefined}
      className={classNames(
        'min-w-[150px] px-5 py-2',
        extraClass,
        rounded,
        tab === selectedTab
          ? 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white'
          : 'text-primary-8 bg-white'
      )}
    >
      {children}
    </button>
  );
}

export function Chevron({ rotate }: { rotate?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      <title>Chevron</title>
      <path
        d="M6 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
