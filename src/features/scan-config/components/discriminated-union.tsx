'use client';

import { Select } from 'antd';
import { useCallback, useEffect, useMemo } from 'react';
import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type {
  IDiscriminatedUnion as DiscriminatedUnionSchema,
  ParamSchema,
  SchemaName,
  TBlock,
} from '@/features/scan-config/types';
import type { Config, ConfigValue } from './components';

/**
 * Props for the nested field renderer function.
 * This allows the parent component to handle rendering of individual fields.
 */
export interface NestedFieldRendererProps {
  fieldKey: string;
  paramSchema: ParamSchema;
  value: ConfigValue;
  onChange: (value: ConfigValue) => void;
  disabled: boolean;
}

export interface DiscriminatedUnionProps {
  schema: DiscriminatedUnionSchema;
  value: Record<string, ConfigValue> | null;
  onChange: (value: Record<string, ConfigValue>) => void;
  disabled?: boolean;
  schemaName: SchemaName;
  config: Config;
  model: ICircuit | IMEModel | null | undefined;
  renderNestedField: (props: NestedFieldRendererProps) => React.ReactNode;
}

/**
 * Helper to get the const value from a type property in a variant.
 * Handles both simple Type schema and extended type schemas with additional properties.
 */
function getTypeConst(variant: TBlock): string | undefined {
  const typeProp = variant.properties?.type;
  if (!typeProp) return undefined;

  // Check if it has a 'const' property (works for both Type and extended schemas)
  if ('const' in typeProp && typeof typeProp.const === 'string') {
    return typeProp.const;
  }

  return undefined;
}

/**
 * Get the variant schema that matches the current discriminator value.
 */
function getSelectedVariant(
  schema: DiscriminatedUnionSchema,
  discriminatorValue: string | null
): TBlock | undefined {
  if (!discriminatorValue) return undefined;
  return schema.oneOf.find((variant) => getTypeConst(variant) === discriminatorValue);
}

/**
 * Build default values for a variant based on its schema.
 */
function buildDefaultValues(
  variant: TBlock,
  discriminatorKey: string
): Record<string, ConfigValue> {
  const defaults: Record<string, ConfigValue> = {};

  if (variant.properties) {
    for (const [key, propSchema] of Object.entries(variant.properties)) {
      if (key === discriminatorKey || key === 'type') {
        // Set the discriminator value - handle both Type schema and extended schemas
        if ('const' in propSchema && typeof propSchema.const === 'string') {
          defaults[key] = propSchema.const;
        } else if ('default' in propSchema) {
          defaults[key] = propSchema.default ?? null;
        } else {
          defaults[key] = null;
        }
      } else if ('default' in propSchema && propSchema.default !== undefined) {
        defaults[key] = propSchema.default;
      } else {
        defaults[key] = null;
      }
    }
  }

  return defaults;
}

/**
 * DiscriminatedUnion component for scan-config forms.
 *
 * Renders a type selector dropdown followed by the fields for the selected variant.
 * Used for schema properties with `ui_element: 'discriminated_union'`.
 *
 * @example
 * // In schema:
 * {
 *   "neuron_set": {
 *     "title": "Neuron Set",
 *     "description": "Set of neurons to extract...",
 *     "ui_element": "discriminated_union",
 *     "discriminator": "type",
 *     "oneOf": [
 *       {
 *         "title": "All Neurons",
 *         "properties": {
 *           "type": { "const": "AllNeurons" },
 *           "sample_percentage": { "ui_element": "float_parameter_sweep", ... }
 *         }
 *       },
 *       ...
 *     ]
 *   }
 * }
 */
export default function DiscriminatedUnion({
  schema,
  value,
  onChange,
  disabled = false,
  renderNestedField,
}: DiscriminatedUnionProps) {
  // Handle both string discriminator and object discriminator (OpenAPI style)
  const discriminatorKey = useMemo(() => {
    if (typeof schema.discriminator === 'string') {
      return schema.discriminator;
    }
    if (
      schema.discriminator &&
      typeof schema.discriminator === 'object' &&
      'propertyName' in schema.discriminator
    ) {
      return (schema.discriminator as { propertyName: string }).propertyName;
    }
    return 'type';
  }, [schema.discriminator]);

  // get current discriminator value from the value object
  const currentDiscriminator = useMemo(() => {
    if (!value || typeof value !== 'object') return null;
    const discValue = value[discriminatorKey];
    return typeof discValue === 'string' ? discValue : null;
  }, [value, discriminatorKey]);

  // get the selected variant schema
  const selectedVariant = useMemo(
    () => getSelectedVariant(schema, currentDiscriminator),
    [schema, currentDiscriminator]
  );

  // build dropdown options from oneOf variants
  const typeOptions = useMemo(() => {
    return schema.oneOf.map((variant) => ({
      label: variant.title || getTypeConst(variant) || 'Unknown',
      value: getTypeConst(variant) || '',
      description: variant.description,
    }));
  }, [schema.oneOf]);

  // initialize with first variant if no value is set
  useEffect(() => {
    if (!value && schema.oneOf.length > 0) {
      const firstVariant = schema.oneOf[0];
      const defaults = buildDefaultValues(firstVariant, discriminatorKey);
      onChange(defaults);
    }
  }, [value, schema.oneOf, discriminatorKey, onChange]);

  // handle type selection change
  const handleTypeChange = useCallback(
    (newType: string) => {
      const newVariant = schema.oneOf.find((variant) => getTypeConst(variant) === newType);

      if (newVariant) {
        // build new default values for the selected variant
        const newDefaults = buildDefaultValues(newVariant, discriminatorKey);
        onChange(newDefaults);
      }
    },
    [schema.oneOf, discriminatorKey, onChange]
  );

  // handle individual field value change
  const handleFieldChange = useCallback(
    (fieldKey: string, fieldValue: ConfigValue) => {
      onChange({
        ...value,
        [fieldKey]: fieldValue,
      });
    },
    [value, onChange]
  );

  // get fields to render (excluding the discriminator field)
  const fieldsToRender = useMemo(() => {
    if (!selectedVariant?.properties) return [];

    return Object.entries(selectedVariant.properties).filter(([key, propSchema]) => {
      if (key === discriminatorKey || key === 'type') return false;
      // skip Type-like schemas (they have 'const' but no 'ui_element')
      if ('const' in propSchema && !('ui_element' in propSchema)) return false;
      if ('ui_hidden' in propSchema && propSchema.ui_hidden) return false;
      // skip fields without ui_element (they're metadata)
      if (!('ui_element' in propSchema)) return false;
      return true;
    });
  }, [selectedVariant, discriminatorKey]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-primary-9 mb-1 text-sm font-medium">Type</div>
        <Select
          className="w-full"
          value={currentDiscriminator}
          onChange={handleTypeChange}
          disabled={disabled}
          options={typeOptions}
          optionRender={(option) => (
            <div>
              <div className="font-medium">{option.label}</div>
              {option.data.description && (
                <div className="text-xs text-gray-500 line-clamp-2">{option.data.description}</div>
              )}
            </div>
          )}
        />
      </div>

      {selectedVariant && fieldsToRender.length > 0 && (
        <div className="border-l-2 border-gray-200 pl-4">
          <div className="flex flex-col gap-4">
            {fieldsToRender.map(([fieldKey, fieldSchema]) => {
              const paramSchema = fieldSchema as ParamSchema;
              const fieldValue = value?.[fieldKey] ?? null;

              return (
                <div key={fieldKey}>
                  <div className="flex items-end gap-2">
                    <div
                      className="text-primary-9 text-sm font-semibold uppercase"
                      title={paramSchema.description}
                    >
                      {paramSchema.title}
                    </div>
                    {'units' in paramSchema && paramSchema.units && (
                      <div className="text-sm text-gray-500">{paramSchema.units}</div>
                    )}
                  </div>
                  {paramSchema.description && (
                    <div className="mb-1 text-xs text-gray-500">{paramSchema.description}</div>
                  )}
                  {renderNestedField({
                    fieldKey,
                    paramSchema,
                    value: fieldValue,
                    onChange: (newValue) => handleFieldChange(fieldKey, newValue),
                    disabled: disabled ?? false,
                  })}
                  {selectedVariant.required?.includes(fieldKey) &&
                    (fieldValue === null || fieldValue === undefined) && (
                      <span className="text-xs text-red-500">Required</span>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
