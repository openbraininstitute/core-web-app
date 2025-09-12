import { PrimitiveAtom } from 'jotai';

import { ConfigValue } from './_components/components';

export type JSONMorphologySchema = {
  type?: 'string' | 'number' | 'integer' | 'object' | 'array' | 'boolean' | 'null';
  properties?: { [key: string]: JSONMorphologySchema };
  items?: JSONMorphologySchema | JSONMorphologySchema[];
  required?: string[];
  enum?: unknown[];
  const?: string;
  additionalProperties?: JSONMorphologySchema;
  oneOf?: JSONMorphologySchema[];
  anyOf?: JSONMorphologySchema[];
  allOf?: JSONMorphologySchema[];
  not?: JSONMorphologySchema;
  format?: string;
  title?: string;
  description?: string;
  default?: ConfigValue;
  examples?: unknown[];
  minimum?: number;
  maximum?: number;
  units?: string;
  singular_name?: string;
  [key: string]: unknown;
};

export type AtomsMap = Record<
  string,
  | PrimitiveAtom<Record<string, ConfigValue>>
  | Record<string, PrimitiveAtom<Record<string, ConfigValue>>>
>;

export type TabType = 'configuration' | 'simulations';

export type Config = {
  morphology?: Record<string, ConfigValue>;
  license?: Record<string, ConfigValue>;
  mtype?: Record<string, ConfigValue>;
  contribution?: Record<string, ConfigValue>;
  [key: string]: ConfigValue | Record<string, ConfigValue> | ConfigValue[];
};
