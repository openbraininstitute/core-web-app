import { Button, Select } from 'antd';
import { ConfigObject } from './utils';
import { Reference as ReferenceSchema, SchemaName } from '../types';
import { useObioneJsonSchema, useReferenceTypeDict } from './hooks/schema';
import { Config } from './components';

export default function Reference({
  // onAddReferenceClick,
  value,
  onChange,
  disabled,
  // defaultLabel,
  // referees,
  // refTitle,
  schemaName,
  referenceSchema,
  config,
}: {
  schemaName: SchemaName;
  referenceSchema: ReferenceSchema;
  config: Config;
  // onAddReferenceClick: () => void;
  value: string | null;
  onChange: (block_name: string | null, block_dict_name: string | null) => void;
  disabled: boolean;
  // defaultLabel: string | null;
  // referees: [string, ConfigObject][];
  // refTitle: string;
}) {
  const referenceTypeDict = useReferenceTypeDict(schemaName);
  const schema = useObioneJsonSchema(schemaName);
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
