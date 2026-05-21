import { Select } from 'antd';

import {
  ephysControlLabelClass,
  ephysControlSubLabelClass,
  type EphysViewerVariant,
} from '@/features/ephys-viewer/label-styles';

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
  variant?: EphysViewerVariant;
}

function OptionSelect({
  label: { numberOfAvailable, title },
  value,
  onChange: handleChange,
  options,
  hideWhenSingle = false,
  variant = 'light',
}: OptionSelectProps) {
  if (hideWhenSingle && numberOfAvailable === 1) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3">
      <label className={ephysControlLabelClass(variant)} htmlFor="optionSelect">
        {title}
        <small className={ephysControlSubLabelClass(variant)}>
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
