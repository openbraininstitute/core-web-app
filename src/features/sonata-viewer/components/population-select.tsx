import { Select } from 'antd';

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
  if (populations.length <= 1 && !showAllOption) return null;

  return (
    <div className="flex flex-col gap-2">
      Select Population ({populations.length} available)
      <Select
        className="w-full"
        value={value}
        onChange={onChange}
        placeholder="Select a population"
      >
        {showAllOption && <Option value="All">All Populations</Option>}
        {populations.map((pop) => (
          <Option value={pop} key={pop}>
            {pop}
          </Option>
        ))}
      </Select>
    </div>
  );
}
