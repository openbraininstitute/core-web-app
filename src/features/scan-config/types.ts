import { atom } from 'jotai';

import { ConfigValue } from './_components/components';
import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';

export type JSONSchema = {
  type?: 'string' | 'number' | 'integer' | 'object' | 'array' | 'boolean' | 'null';
  properties?: { [key: string]: JSONSchema };
  items?: JSONSchema | JSONSchema[];
  required?: string[];
  enum?: any[];
  const?: string;
  additionalProperties?: JSONSchema;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  not?: JSONSchema;
  format?: string;
  title?: string;
  description?: string;
  default?: any;
  examples?: any[];
  [key: string]: any;
  singular_name?: string;
  is_block_reference?: boolean;
  default_block_reference_labels: Record<string, string>;
  reference_type?: string;
};

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
  | 'MEModelWithSynapsesCircuitSimulationScanConfig';

export type RootElement = {
  description: string;
  title: string;
  group: string;
  group_order: number;
};

export type BlockElement = {
  default?: ConfigValue;
  title: string;
  description: string;
  properties: Record<string, JSONSchema>;
  required: string[];
};

export type Block = {
  title: string;
  description: string;
  properties: Record<string, BlockElement> & { type: { const: string; default: string } };
  required: string[];
};

export interface RootBlock extends RootElement, Block {
  ui_element: 'root_block';
  additionalProperties: false;
  required: string[];
}

export interface BlockDictionary extends RootElement {
  ui_element: 'block_dictionary';
  reference_type: string;
  singular_name: string;
  additionalProperties: {
    oneOf: Block[];
  };
}

export type ConfigSchema = {
  additionalProperties: false;
  default_block_reference_labels: Record<string, string>;
  description: string;
  group_order: string[];
  properties: Record<string, RootBlock | BlockDictionary> & {
    type: { const: string; default: string };
  };
  title: string;
};
