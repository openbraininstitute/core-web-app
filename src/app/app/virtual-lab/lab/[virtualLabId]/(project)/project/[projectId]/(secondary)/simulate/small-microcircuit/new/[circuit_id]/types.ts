import { atom } from 'jotai';

import { ConfigValue } from './_components/components';
import { WorkspaceContext } from '@/types/common';

export type Params = WorkspaceContext & { circuit_id: string };

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
};

export interface AtomsMap {
  [key: string]:
    | ReturnType<typeof atom<Record<string, ConfigValue>>>
    | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
}

export type TabType = 'configuration' | 'simulations';
