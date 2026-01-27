import type { RJSFSchema } from '@rjsf/utils';
import { cloneDeep } from 'es-toolkit/compat';

/**
 * splits a JSON Schema into multiple sub-schemas based on required properties.
 *
 * This function takes a schema and optionally a list of property names, and creates
 * separate schemas for each property. The behavior differs based on the property type:
 *
 * - for object properties with nested properties:
 *   - "Unwraps" the object and uses its properties as the root schema
 *   - Preserves metadata like title and description from the parent
 *
 * - for non-object properties (e.g. equations with oneOf/anyOf):
 *   - Keeps original schema structure but only includes the specific property
 *   - Updates required array to only include that property
 *
 * @param schema - The source JSON Schema to partition
 * @param propertyNames - Optional array of property names to split on. If not provided,
 *                       uses all required properties from the schema
 * @returns Array of sub-schemas, one for each property
 *
 * @example
 * const schema = {
 *   required: ["prop1", "prop2"],
 *   properties: {
 *     prop1: {
 *       type: "object",
 *       properties: { ... }
 *     },
 *     prop2: {
 *       type: "string"
 *     }
 *   }
 * };
 *
 * const subSchemas = partitionSchemaByRequiredProperties(schema);
 * // Returns array of two schemas:
 * // 1. Unwrapped schema from prop1's nested properties
 * // 2. Original schema structure with only prop2
 */
export function partitionSchemaByRequiredProperties<T extends RJSFSchema>(
  schema: T,
  propertyNames?: Array<string>
): Array<T> {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  const propertiesToSplit: Array<string> =
    propertyNames || (Array.isArray(schema.required) ? schema.required : []);

  if (propertiesToSplit.length === 0) {
    return [];
  }

  if (!schema.properties || typeof schema.properties !== 'object') {
    return [];
  }

  const schemaProperties = schema.properties;

  const splitSchemas: Array<T> = propertiesToSplit
    .filter((propName) => {
      // Only include properties that exist in the schema
      return propName in schemaProperties;
    })
    .map((propName) => {
      // Get the property schema
      const propertySchema = schemaProperties[propName];

      // check if this property is an object with nested properties
      // If so, "unwrap" it and use its properties directly as the schema
      if (
        propertySchema &&
        typeof propertySchema === 'object' &&
        propertySchema.type === 'object' &&
        propertySchema.properties &&
        typeof propertySchema.properties === 'object'
      ) {
        // unwrap the object and use its contents as the root schema
        const unwrappedSchema = cloneDeep(propertySchema) as T;

        // rreserve root-level metadata from the parent schema if needed
        if (!unwrappedSchema.title) {
          unwrappedSchema.title = '';
        }
        if (!unwrappedSchema.description) {
          unwrappedSchema.description = '';
        }

        return unwrappedSchema;
      }
      // for non-object properties (like equations with oneOf/anyOf),
      // keep the original structure with the property wrapper
      const splitSchema = cloneDeep(schema) as T;

      // keep only the selected property
      if (splitSchema.properties) {
        splitSchema.properties = {
          [propName]: propertySchema,
        } as typeof schemaProperties;
      }

      // update required array to only include this property
      splitSchema.required = [propName];
      splitSchema.title = '';
      splitSchema.description = '';

      return splitSchema;
    });

  return splitSchemas;
}
