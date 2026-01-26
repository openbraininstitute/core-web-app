import { Select } from 'antd';
import type { Reference as ReferenceSchema, SchemaName } from '../types';
import type { Config } from './components';
import { useObioneJsonSchema, useReferenceTypeDict } from './hooks/schema';

export default function Reference({
  value,
  onChange,
  disabled,
  schemaName,
  referenceSchema,
  config,
  hasReplacePatch,
}: {
  schemaName: SchemaName;
  referenceSchema: ReferenceSchema;
  config: Config;
  value: string | null;
  onChange: (block_name: string | null, block_dict_name: string | null) => void;
  disabled: boolean;
  hasReplacePatch: boolean;
}) {
  const referenceTypeDict = useReferenceTypeDict(schemaName);
  const schema = useObioneJsonSchema(schemaName);

  console.log(value, hasReplacePatch);

  if (
    !schema ||
    !schema.default_block_reference_labels ||
    !schema.default_block_reference_labels[referenceSchema.reference_type]
  ) {
    return null;
  }

  const configOptions = referenceTypeDict[referenceSchema.reference_type];

  const options: { label: string; value: string | null }[] = Object.keys(
    config[configOptions.configKey]
  ).map((k) => ({
    label: k,
    value: k,
  }));

  options.unshift({
    label: schema.default_block_reference_labels[referenceSchema.reference_type] ?? 'Default',
    value: null,
  });

  if (hasReplacePatch && typeof value === 'string') {
    options.push({
      label: value,
      value: value,
    });
  }

  return (
    <Select
      placeholder={`Select ${configOptions.singularName}`}
      className="w-full"
      disabled={disabled}
      onChange={(newV: string | null) => onChange(newV, configOptions.configKey)}
      value={value}
      options={options}
    />
  );
}
