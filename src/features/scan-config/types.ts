import type { atom } from 'jotai';
import type { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';
import type { ConfigValue } from './components/components';

export interface AtomsMap {
  [key: string]:
    | ReturnType<typeof atom<Record<string, ConfigValue>>>
    | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
}

export type TabType = 'configuration' | 'simulations';

export type SimExecStatusMap = Map<string, EntitycoreExecutionStatus>;

export type SchemaName =
  | 'CircuitSimulationScanConfig'
  | 'MEModelSimulationScanConfig'
  | 'MEModelWithSynapsesCircuitSimulationScanConfig'
  | 'CircuitExtractionScanConfig';

export type RootElement = {
  description: string;
  title: string;
  group: string;
  group_order: number;
};

export interface StringInput extends BlockElement {
  ui_element: 'string_input';
}

export interface ModelIdentifier extends BlockElement {
  ui_element: 'model_identifier';
}

export interface FloatParameterSweep extends BlockElement {
  ui_element: 'float_parameter_sweep';
  anyOf: [
    {
      type: 'number';
      minimum?: number;
      maximum?: number;
    },
    {
      type: 'array';
      items: {
        type: 'number';
        minimum?: number;
        maximum?: number;
      };
    },
  ];
}

export interface IntParameterSweep extends BlockElement {
  ui_element: 'int_parameter_sweep';
  anyOf: [
    {
      type: 'integer';
      minimum?: number;
      maximum?: number;
    },
    {
      type: 'array';
      items: {
        type: 'integer';
        minimum?: number;
        maximum?: number;
      };
    },
  ];
}

export interface Reference extends BlockElement {
  ui_element: 'reference';
  reference_type: string;
}

export interface EntityPropertyDropdown extends BlockElement {
  ui_element: 'entity_property_dropdown';
  entity_type: string;
  property: string;
}

export interface NeuronIds extends BlockElement {
  ui_element: 'neuron_ids';
}

export interface BooleanInput extends BlockElement {
  ui_element: 'boolean_input';
  true_label?: string;
  false_label?: string;
}

export interface DiscriminatedUnion extends BlockElement {
  ui_element: 'discriminated_union';
  /** The property name used to discriminate between variants (defaults to 'type') */
  /** Can be a string or an OpenAPI-style discriminator object */
  discriminator?: string | { propertyName: string; mapping?: Record<string, string> };
  /** Array of possible variant schemas */
  oneOf: Block[];
}

export type BlockElement = {
  default?: ConfigValue;
  title: string;
  description: string;
  units?: string;
  ui_hidden?: boolean;
};

export type ParamSchema =
  | StringInput
  | ModelIdentifier
  | FloatParameterSweep
  | IntParameterSweep
  | Reference
  | NeuronIds
  | EntityPropertyDropdown
  | BooleanInput
  | DiscriminatedUnion;

export type Block = {
  title: string;
  description: string;
  properties: Record<string, ParamSchema> & { type: Type };
  required?: string[];
};

export interface RootBlock extends RootElement, Block {
  ui_element: 'root_block';
  additionalProperties: false;
  required?: string[];
}

export interface BlockDictionary extends RootElement {
  ui_element: 'block_dictionary';
  reference_type: string;
  singular_name: string;
  additionalProperties: {
    oneOf: Block[];
  };
}

/** Root-level discriminated union (single value that can be one of several types) */
export interface RootDiscriminatedUnion extends RootElement {
  ui_element: 'discriminated_union';
  /** The property name used to discriminate between variants (defaults to 'type') */
  /** Can be a string or an OpenAPI-style discriminator object */
  discriminator?: string | { propertyName: string; mapping?: Record<string, string> };
  /** Array of possible variant schemas */
  oneOf: Block[];
}

export type ConfigSchema = {
  additionalProperties: false;
  default_block_reference_labels: Record<string, string>;
  description: string;
  group_order: string[];
  properties: Record<string, RootBlock | BlockDictionary | RootDiscriminatedUnion> & { type: Type };
  title: string;
};

type Type = {
  const: string;
  default: string;
};

export function isType(v: RootElement | Type | BlockElement): v is Type {
  return 'const' in v;
}
