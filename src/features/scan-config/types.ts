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
