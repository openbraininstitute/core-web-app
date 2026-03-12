import { Select } from 'antd';

import type { JSX } from 'react';

interface OptionSelectProps {
  label: {
    title: string;
    numberOfAvailable: number;
  };
  value: string;
  onChange: (value: string) => void;
  options: JSX.Element[] | null;
  hideWhenSingle?: boolean;
}

function OptionSelect({
  label: { numberOfAvailable, title },
  value,
  onChange: handleChange,
  options,
  hideWhenSingle = false,
}: OptionSelectProps) {
  if (hideWhenSingle && numberOfAvailable === 1) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3">
      <label className="text-dark font-bold" htmlFor="optionSelect">
        {title}
        <small className="text-sm font-light">
          {numberOfAvailable > 1 && <>&nbsp;({numberOfAvailable} available)</>}
        </small>
      </label>

      <Select
        id="optionSelect"
        className="w-[180px]"
        value={value}
        placeholder="Please select"
        onChange={handleChange}
        disabled={numberOfAvailable === 1}
      >
        {options}
      </Select>
    </div>
  );
}

export default OptionSelect;
