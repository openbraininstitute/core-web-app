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
  // simulation
  | 'CircuitSimulationScanConfig'
  | 'MEModelSimulationScanConfig'
  | 'MEModelWithSynapsesCircuitSimulationScanConfig'
  // extraction
  | 'CircuitExtractionScanConfig';

export type RootElement = {
  description: string;
  title: string;
  group: string;
  group_order: number;
};

export const ScanConfigUIElementDict = {
  StringInput: 'string_input',
  ModelIdentifier: 'model_identifier',
  FloatParameterSweep: 'float_parameter_sweep',
  IntParameterSweep: 'int_parameter_sweep',
  Reference: 'reference',
  EntityPropertyDropdown: 'entity_property_dropdown',
  NeuronIds: 'neuron_ids',
  BooleanInput: 'boolean_input',
  DiscriminatedUnion: 'discriminated_union',
  RootBlock: 'root_block',
  BlockDictionary: 'block_dictionary',
} as const;

export interface StringInput extends BlockElement {
  ui_element: typeof ScanConfigUIElementDict.StringInput;
}

export interface ModelIdentifier extends BlockElement {
  ui_element: typeof ScanConfigUIElementDict.ModelIdentifier;
}

export interface FloatParameterSweep extends BlockElement {
  ui_element: typeof ScanConfigUIElementDict.FloatParameterSweep;
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
  ui_element: typeof ScanConfigUIElementDict.IntParameterSweep;
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
  ui_element: typeof ScanConfigUIElementDict.Reference;
  reference_type: string;
}

export interface EntityPropertyDropdown extends BlockElement {
  ui_element: typeof ScanConfigUIElementDict.EntityPropertyDropdown;
  entity_type: string;
  property: string;
}

export interface NeuronIds extends BlockElement {
  ui_element: typeof ScanConfigUIElementDict.NeuronIds;
}

export interface BooleanInput extends BlockElement {
  ui_element: typeof ScanConfigUIElementDict.BooleanInput;
  true_label?: string;
  false_label?: string;
}

export interface DiscriminatedUnion extends BlockElement {
  ui_element: typeof ScanConfigUIElementDict.DiscriminatedUnion;
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
  ui_element: typeof ScanConfigUIElementDict.RootBlock;
  additionalProperties: false;
  required?: string[];
}

export interface BlockDictionary extends RootElement {
  ui_element: typeof ScanConfigUIElementDict.BlockDictionary;
  reference_type: string;
  singular_name: string;
  additionalProperties: {
    oneOf: Block[];
  };
}

/** Root-level discriminated union (single value that can be one of several types) */
export interface RootDiscriminatedUnion extends RootElement {
  ui_element: typeof ScanConfigUIElementDict.DiscriminatedUnion;
  /** the property name used to discriminate between variants (defaults to 'type') */
  /** can be a string or an OpenAPI-style discriminator object */
  discriminator?: string | { propertyName: string; mapping?: Record<string, string> };
  /** array of possible variant schemas */
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
