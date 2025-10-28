import { Button, Select } from 'antd';
import { ConfigObject } from './utils';

export default function Reference({
  onAddReferenceClick,
  value,
  onChange,
  disabled,
  defaultLabel,
  referees,
  refTitle,
}: {
  onAddReferenceClick: () => void;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
  defaultLabel: string | null;
  referees: [string, ConfigObject][];
  refTitle: string;
}) {
  if (referees.length === 0 && defaultLabel === null) {
    return (
      <Button className="w-full" onClick={onAddReferenceClick}>
        Add {refTitle}
      </Button>
    );
  }

  const options: { label: string; value: string | null }[] = referees.map(([subkey]) => {
    return {
      label: subkey,
      value: subkey,
    };
  });

  if (defaultLabel) options.unshift({ label: defaultLabel, value: null });

  return (
    <Select
      placeholder={`Select ${refTitle}`}
      className="w-full"
      disabled={disabled}
      onChange={onChange}
      value={value}
      options={options}
    />
  );
}
