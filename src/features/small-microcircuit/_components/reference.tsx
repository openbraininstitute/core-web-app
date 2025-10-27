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
  defaultLabel: string;
  referees: [string, ConfigObject][];
  refTitle: string;
}) {
  if (referees.length === 0) {
    return (
      <Button className="w-full" onClick={onAddReferenceClick}>
        Add {refTitle}
      </Button>
    );
  }

  return (
    <Select
      className="w-full"
      disabled={disabled}
      onChange={onChange}
      value={value}
      options={[
        { label: defaultLabel, value: null },
        ...referees.map(([subkey]) => {
          return {
            label: subkey,
            value: subkey,
          };
        }),
      ]}
    />
  );
}
