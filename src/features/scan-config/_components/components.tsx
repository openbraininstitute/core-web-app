import { CheckCircleOutlined, CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Input, InputNumber, Select } from 'antd';
import { atom, useAtom } from 'jotai';
import { useEffect, useState } from 'react';

import { EntityTypeDict, IMEModel } from '@/api/entitycore/types';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';

import ModelDetails from '@/features/scan-config/_components/model-details';
import ParameterSwep from '@/features/scan-config/_components/parameter-sweep';
import PredefinedNodeset from '@/features/scan-config/_components/predefined-nodeset';
import Reference from '@/features/scan-config/_components/reference';
import Tooltip from '@/features/scan-config/_components/tooltip';
import { isPlainObject } from '@/features/scan-config/_components/utils';
import {
  Block,
  BlockElement,
  isType,
  JSONSchema,
  Parameter,
  ParamSchema,
  SchemaName,
} from '@/features/scan-config/types';

import { classNames } from '@/util/utils';

type Primitive = null | boolean | number | string;
interface Object {
  [key: string]: Primitive | Primitive[] | Object;
}

export type ConfigValue = Primitive | Primitive[] | Object;

export type Config = Record<string, Object | string>;

function isNullableRef(schema: JSONSchema) {
  return (
    schema.anyOf?.find((s) => s.is_block_reference) && schema.anyOf.find((s) => s.type === 'null')
  );
}

function getRefDefaultLabel(schema: JSONSchema, labels: Record<string, string>) {
  if (!isNullableRef(schema)) return null;
  return labels[schema.properties?.type.const ?? ''] ?? 'Default';
}

export function BlockUI({
  schemaName,
  disabled,
  blockSchema,
  stateAtom,
  config,
  model,
  onAddReferenceClick,
  selectedCategory,
  virtualLabId,
  projectId,
}: {
  schemaName: SchemaName;
  selectedCategory: string;
  disabled: boolean;
  config: Config;
  blockSchema?: Block;
  model: ICircuit | IMEModel | undefined | null;
  stateAtom: ReturnType<typeof atom<{ [key: string]: ConfigValue }>>;
  onAddReferenceClick: (reference: string) => void;
  virtualLabId: string;
  projectId: string;
}) {
  const [state, setState] = useAtom(stateAtom);

  const [addingElement, setAddingElement] = useState(false);
  const [newElement, setNewElement] = useState<number | string | null>(null);

  useEffect(() => {
    if (!blockSchema || !blockSchema.properties) return;

    const initial: Record<string, ConfigValue> = {};

    Object.entries(blockSchema.properties).forEach(([key, value]) => {
      if (key === 'type') initial[key] = value.const ?? null;
      else initial[key] = value.default ?? null;
    });

    setState((prev) => {
      return { ...initial, ...prev };
    });
  }, [stateAtom, setState, blockSchema]);

  function renderInput(k: string, paramSchema: ParamSchema) {
    if (paramSchema.ui_element === 'string_input') {
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
          value={state[k] as number | null | number[]}
          onChange={(value) => {
            setState({ ...state, [k]: value });
          }}
        />
      );
    }

    if (paramSchema.ui_element === 'reference') {
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

    return null;

    // if (
    //   selectedCategory === 'PredefinedNeuronSet' &&
    //   k === 'node_set' &&
    //   model &&
    //   model.type === EntityTypeDict.Circuit
    // ) {
    //   return (
    //     <PredefinedNodeset
    //       circuitId={model.id}
    //       virtualLabId={virtualLabId}
    //       projectId={projectId}
    //       stateAtom={stateAtom}
    //     />
    //   );
    // }

    // if (k === 'circuit' && model) r;

    // if (v.is_block_reference) {
    //   const refType = v.properties?.type.const ?? '';
    //   const referenceKey = referenceTypesToConfigKeys[refType];

    //   const defaultV: string | null =
    //     isPlainObject(state[k]) && typeof state[k].block_name === 'string'
    //       ? state[k].block_name
    //       : null;

    //   const referenceConfig = config[referenceKey];
    //   if (!isPlainObject(referenceConfig)) return null;

    //   const referees = Object.entries(referenceConfig).filter(([_, val]) => {
    //     return isPlainObject(val);
    //   });

    //   return (

    //   );
    // }

    // if (k === 'neuron_ids') {
    //   return (
    //     <div className="text-primary-8 mt-2 flex flex-col gap-2">
    //       <div className="flex flex-wrap gap-3">
    //         {isPlainObject(state[k]) &&
    //           isPlainObject(state[k]) &&
    //           Array.isArray(state[k].elements) &&
    //           state[k].elements.map((e, i) => (
    //             // eslint-disable-next-line
    //             <div key={i} className="flex gap-1">
    //               {e}{' '}
    //               {!disabled && (
    //                 <CloseCircleOutlined
    //                   onClick={() => {
    //                     if (!isPlainObject(state[k]) || !Array.isArray(state[k].elements)) return;

    //                     if (state[k].elements.length === 1) {
    //                       setState({ ...state, [k]: null });
    //                       return;
    //                     }

    //                     state[k].elements.splice(i, 1); // delete in place

    //                     setState({
    //                       ...state,
    //                       [k]: {
    //                         type: 'NamedTuple',
    //                         name: 'example_id_neuron_set',
    //                         elements: [...state[k].elements],
    //                       },
    //                     });
    //                   }}
    //                 />
    //               )}
    //             </div>
    //           ))}
    //       </div>

    //       {!addingElement && !disabled && (
    //         <PlusCircleOutlined onClick={() => setAddingElement(true)} className="text-primary-8" />
    //       )}

    //       {addingElement && !disabled && (
    //         <div className="flex gap-2">
    //           <InputNumber
    //             disabled={disabled}
    //             step={1}
    //             min={0}
    //             onChange={(newV) => {
    //               setNewElement(newV);
    //             }}
    //           />
    //           {newElement !== null && (
    //             <CheckCircleOutlined
    //               className="text-primary-8"
    //               onClick={() => {
    //                 if (!state[k]) {
    //                   setState({
    //                     ...state,
    //                     [k]: {
    //                       type: 'NamedTuple',
    //                       name: 'example_id_neuron_set',
    //                       elements: [newElement],
    //                     },
    //                   });
    //                 } else if (isPlainObject(state[k]) && Array.isArray(state[k].elements)) {
    //                   setState({
    //                     ...state,
    //                     [k]: {
    //                       type: 'NamedTuple',
    //                       name: 'example_id_neuron_set',
    //                       elements: [...state[k].elements, newElement],
    //                     },
    //                   });
    //                 }
    //               }}
    //             />
    //           )}
    //           <CloseCircleOutlined
    //             onClick={() => {
    //               setAddingElement(false);
    //               setNewElement(null);
    //             }}
    //             className="text-primary-8"
    //           />
    //         </div>
    //       )}
    //     </div>
    //   );
    // }

    // if (v.enum)
    //   return (
    //     <Select
    //       disabled={disabled}
    //       onChange={(newV) => setState({ ...state, [k]: newV })}
    //       value={state[k]}
    //       className="w-full"
    //       options={v.enum.map((subv: string) => {
    //         return { label: subv, value: subv };
    //       })}
    //     />
    //   );
  }

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
                    {renderInput(k, blockElementSchema)}
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
