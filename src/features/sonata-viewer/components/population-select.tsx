import { Select } from 'antd';
import { useId } from 'react';

const { Option } = Select;

export default function PopulationSelect({
  populations,
  value,
  onChange,
  showAllOption = true,
}: {
  populations: string[];
  value: string;
  onChange: (value: string) => void;
  showAllOption?: boolean;
}) {
  const selectId = useId();

  if (populations.length <= 1 && !showAllOption) return null;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={selectId}>Select population ({populations.length} available)</label>
      <Select
        id={selectId}
        className="w-full"
        value={value}
        onChange={onChange}
        placeholder="Select a population"
      >
        {showAllOption && <Option value="All">All populations</Option>}
        {populations.map((pop) => (
          <Option value={pop} key={pop}>
            {pop}
          </Option>
        ))}
      </Select>
    </div>
  );
}
