import { Input } from 'antd';
import { type atom, useAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import BooleanInput from '@/features/scan-config/components/boolean-input';
import DiscriminatedUnion, {
  type NestedFieldRendererProps,
} from '@/features/scan-config/components/discriminated-union';
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
  type TScanConfigTabs,
} from '@/features/scan-config/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { classNames } from '@/util/utils';

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
}: {
  schemaName: SchemaName;
  disabled: boolean;
  config: Config;
  blockSchema?: TBlock;
  model: ICircuit | IMEModel | undefined | null;
  stateAtom: ReturnType<typeof atom<{ [key: string]: ConfigValue }>>;
}) {
  const [state, setState] = useAtom(stateAtom);

  useEffect(() => {
    if (!blockSchema || !blockSchema.properties) return;

    const initial: Record<string, ConfigValue> = {};

    Object.entries(blockSchema.properties).forEach(([key, value]) => {
      initial[key] = value.default ?? null;
    });

    setState((prev) => {
      return { ...initial, ...prev };
    });
  }, [setState, blockSchema]);

  function renderInput(k: string, paramSchema: ParamSchema) {
    if (paramSchema.ui_element === ScanConfigUIElementDict.StringInput) {
      return (
        <Input
          disabled={disabled}
          value={typeof state[k] === 'string' ? state[k] : ''}
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
          disabled={disabled}
          value={state[k] as number | null | number[]}
          onChange={(value) => {
            setState({ ...state, [k]: value });
          }}
        />
      );
    }

    if (paramSchema.ui_element === ScanConfigUIElementDict.Reference) {
      const defaultV: string | null =
        isPlainObject(state[k]) && typeof state[k].block_name === 'string'
          ? state[k].block_name
          : null;

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
      const elements: number[] =
        isPlainObject(state[k]) && Array.isArray(state[k].elements) ? state[k].elements : [];
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

    if (paramSchema.ui_element === ScanConfigUIElementDict.EntityPropertyDropdown && model) {
      return (
        <EntityPropertyDropdown
          modelId={model.id}
          value={typeof state.node_set === 'string' ? state.node_set : null}
          onChange={(newV: string | null) => setState({ ...state, node_set: newV })}
          entity_type={paramSchema.entity_type}
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

    if (paramSchema.ui_element === ScanConfigUIElementDict.BlockSingle) {
      const currentValue = isPlainObject(state[k]) ? state[k] : null;
      return (
        <DiscriminatedUnion
          schema={paramSchema}
          value={currentValue as Record<string, ConfigValue> | null}
          disabled={disabled}
          schemaName={schemaName}
          config={config}
          model={model}
          onChange={(value: Record<string, ConfigValue>) => {
            setState({ ...state, [k]: value });
          }}
          renderNestedField={renderNestedField}
        />
      );
    }

    return null;
  }

  //renders a nested field within a discriminated union
  const renderNestedField = useCallback(
    ({
      fieldKey,
      paramSchema,
      value,
      onChange,
      disabled: fieldDisabled,
    }: NestedFieldRendererProps) => {
      if (paramSchema.ui_element === ScanConfigUIElementDict.StringInput) {
        return (
          <Input
            disabled={fieldDisabled}
            value={typeof value === 'string' ? value : ''}
            className="w-full"
            onChange={(e) => onChange(e.currentTarget.value)}
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
            k={fieldKey}
            min={paramSchema.anyOf[0]?.minimum}
            max={paramSchema.anyOf[0]?.maximum}
            disabled={fieldDisabled}
            value={value as number | null | number[]}
            onChange={onChange}
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
            disabled={fieldDisabled}
            onChange={(block_name: string | null, block_dict_name: string | null) => {
              if (block_name === null) {
                onChange(null);
                return;
              }
              onChange({ block_name, block_dict_name });
            }}
          />
        );
      }

      if (paramSchema.ui_element === ScanConfigUIElementDict.NeuronIds) {
        const elements: number[] =
          isPlainObject(value) && Array.isArray(value.elements) ? value.elements : [];
        return (
          <NeuronIds
            elements={elements}
            disabled={fieldDisabled}
            onDeleteElement={(i: number) => {
              if (!isPlainObject(value) || !Array.isArray(value.elements)) return;
              if (value.elements.length === 1) {
                onChange(null);
                return;
              }
              const newElements = [...value.elements];
              newElements.splice(i, 1);
              onChange({ elements: newElements });
            }}
            onAddElement={(newElement: number) => {
              if (!value) {
                onChange({ elements: [newElement] });
              } else if (isPlainObject(value) && Array.isArray(value.elements)) {
                onChange({ elements: [...value.elements, newElement] });
              }
            }}
          />
        );
      }

      if (paramSchema.ui_element === ScanConfigUIElementDict.EntityPropertyDropdown && model) {
        return (
          <EntityPropertyDropdown
            modelId={model.id}
            value={typeof value === 'string' ? value : null}
            onChange={onChange}
            entity_type={paramSchema.entity_type}
            property={paramSchema.property}
          />
        );
      }

      if (paramSchema.ui_element === ScanConfigUIElementDict.BooleanInput) {
        const currentValue = typeof value === 'boolean' ? value : null;
        return (
          <BooleanInput
            value={currentValue}
            disabled={fieldDisabled}
            onChange={onChange}
            ariaLabel={paramSchema.description}
          />
        );
      }

      return null;
    },
    [config, model, schemaName]
  );

  if (!blockSchema) return null;

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
              const isBooleanInput = blockElementSchema.ui_element === 'boolean_input';
              return (
                <div key={k} className="w-full">
                  <div
                    className={classNames(
                      'flex gap-3 w-full',
                      isBooleanInput ? 'items-start justify-between' : 'items-end'
                    )}
                  >
                    <div className={classNames('flex items-end gap-3', isBooleanInput && 'flex-1')}>
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
                    {isBooleanInput && (
                      <div className="shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>{renderInput(k, blockElementSchema)}</div>
                          </TooltipTrigger>
                          <TooltipContent
                            avoidCollisions
                            hideWhenDetached
                            align="center"
                            side="bottom"
                            className="text-white shadow-bnb max-w-2xs min-w-2xs rounded-md bg-[#0050b3ee] px-4 py-2 text-base text-wrap"
                            arrowClassName="bg-[#0050b3ee]"
                          >
                            {blockElementSchema.description}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                  {!isBooleanInput && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>{renderInput(k, blockElementSchema)}</div>
                      </TooltipTrigger>
                      <TooltipContent
                        avoidCollisions
                        hideWhenDetached
                        align="center"
                        side="bottom"
                        className="text-white shadow-bnb max-w-2xs min-w-2xs rounded-md bg-[#0050b3ee] px-4 py-2 text-base text-wrap"
                        arrowClassName="bg-[#0050b3ee]"
                      >
                        {blockElementSchema.description}
                      </TooltipContent>
                    </Tooltip>
                  )}

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
  selectedTab: TScanConfigTabs;
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
        'min-w-37.5 px-5 py-2',
        extraClass,
        rounded,
        tab === selectedTab.id
          ? 'bg-linear-to-r from-[#003A8C] to-[#001026] text-white rounded-l-none'
          : 'text-primary-8 bg-white'
      )}
    >
      {children}
    </button>
  );
}

export function LeftMenuTab({
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
        'min-w-37.5 px-5 py-2',
        extraClass,
        rounded,
        tab === selectedTab
          ? 'bg-linear-to-r from-[#003A8C] to-[#001026] text-white'
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
