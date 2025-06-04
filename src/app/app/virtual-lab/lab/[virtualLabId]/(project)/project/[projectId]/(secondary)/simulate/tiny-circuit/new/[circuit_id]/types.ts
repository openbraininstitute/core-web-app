export type JSONSchema = {
  type: string;
  title?: string;
  description?: string;
  properties: {
    [key: string]: JSONSchema | JSONSchemaPrimitive;
  };
  required?: string[];
};

type JSONSchemaPrimitive = {
  type: 'string' | 'number' | 'boolean' | 'null' | 'integer';
  title?: string;
  description?: string;
  enum?: any[];
  default?: any;
};
