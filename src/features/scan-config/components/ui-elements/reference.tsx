import { Select } from 'antd';

import {
  type Reference as ReferenceSchema,
  ScanConfigUIElementDict,
  type SchemaName,
} from '@/features/scan-config/types';

import { useObioneJsonSchema, useReferenceTypeDict } from '../hooks/schema';

import type { Config } from '@/features/scan-config/components/components';

export default function Reference({
  value,
  onChange,
  disabled,
  schemaName,
  referenceSchema,
  config,
}: {
  schemaName: SchemaName;
  referenceSchema: ReferenceSchema;
  config: Config;
  value: string | null;
  onChange: (block_name: string | null, block_dict_name: string | null) => void;
  disabled: boolean;
}) {
  const referenceTypeDict = useReferenceTypeDict(schemaName);
  const { schema } = useObioneJsonSchema(schemaName);

  const configOptions = referenceTypeDict[referenceSchema.reference_type] ?? {
    singularName: '',
    configKey: '',
  };

  if (
    !schema ||
    !schema.default_block_reference_labels ||
    !schema.default_block_reference_labels[referenceSchema.reference_type]
  )
    return null;

  const options: { label: string; value: string | null }[] = Object.keys(
    config[configOptions.configKey] ?? {}
  ).map((k) => ({
    label: k,
    value: k,
  }));

  options.unshift({
    label: schema.default_block_reference_labels[referenceSchema.reference_type] ?? 'Default',
    value: null,
  });

  // Id The AI suggested a value that is not in the options add it
  if (typeof value === 'string' && !options.map((o) => o.value).includes(value)) {
    options.push({
      label: value,
      value: value,
    });
  }

  return (
    <Select
      data-scan-config-block-element={ScanConfigUIElementDict.Reference}
      className="w-full"
      disabled={disabled}
      onChange={(newV: string | null) => onChange(newV, configOptions.configKey)}
      value={value}
      options={options}
    />
  );
}
