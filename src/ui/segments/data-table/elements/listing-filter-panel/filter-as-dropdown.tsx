import { useCallback, useEffect, useState } from "react";
import type { DefaultOptionType } from "antd/es/select";
import { Select } from "antd";
import map from "es-toolkit/compat/map";
import { cn } from "@/utils/css-class";

import type { TCoreFilter } from "@/entity-configuration/definitions/types";

export type OptionType = DefaultOptionType;
type Props = {
  filter: TCoreFilter;
  data?: Array<OptionType>;
  onChange: (values: string[]) => void;
  placeholder?: string;
  allowMultiple?: boolean;
};

export function DropdownList({
  filter,
  data = [],
  onChange,
  placeholder = "Select options...",
  allowMultiple = false,
}: Props) {
  const [selectedValues, setSelectedValues] = useState<Array<string>>([]);

  useEffect(() => {
    if (filter.value) {
      if (Array.isArray(filter.value)) {
        setSelectedValues(filter.value as string[]);
      } else if (typeof filter.value === "string") {
        setSelectedValues([filter.value]);
      }
    } else {
      setSelectedValues([]);
    }
  }, [filter.value]);

  const handleChange = useCallback(
    (value: string | string[]) => {
      const newValues = Array.isArray(value) ? value : [value];
      setSelectedValues(newValues);
      onChange(newValues);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    setSelectedValues([]);
    onChange([]);
  }, [onChange]);

  const options = map(data, (item) => ({
    value: item.value,
    label: item.count ? `${item.label} (${item.count})` : item.label,
    key: item.id,
  }));

  let value: string | string[] | undefined;
  if (selectedValues.length > 0) {
    if (allowMultiple) {
      value = selectedValues;
    } else {
      [value] = selectedValues;
    }
  } else {
    value = undefined;
  }

  return (
    <div className="flex flex-col gap-2">
      <Select
        allowClear
        mode={allowMultiple ? "multiple" : undefined}
        value={value}
        onChange={handleChange}
        onClear={handleClear}
        placeholder={placeholder}
        optionFilterProp="label"
        className={cn(
          "w-full",
          "[&_.ant-select-selector]:border-neutral-3! [&_.ant-select-selector]:bg-transparent!",
          "[&_.ant-select-selection-placeholder]:text-primary-4! [&_.ant-select-selection-item]:text-white!",
          "[&_.ant-select-arrow]:text-white! [&_.ant-select-clear]:text-white!",
          "[&_.ant-select-selection-item]:bg-primary-7!",
          "has-[.ant-select-clear]:[&_.ant-select-arrow]:hidden!",
          "[&_.ant-select-clear]:bg-transparent!",
        )}
        classNames={{
          popup: {
            root: cn(
              "bg-primary-8 border-neutral-3 text-white!",
              "[&_.ant-select-item]:text-white! [&_.ant-select-item-option-selected]:bg-primary-7! [&_.ant-select-item-option-state]:text-white!",
              "[&_.ant-select-item-option-active]:bg-white! [&_.ant-select-item-option-active]:text-primary-8! select-none!",
              "[&_.ant-select-item-option-active.ant-select-item-option-selected]:text-white!",
            ),
          },
        }}
        size="large"
        options={options}
      />
      {selectedValues.length > 0 && (
        <div className="text-primary-3! text-xs">
          {selectedValues.length} item{selectedValues.length !== 1 ? "s" : ""}{" "}
          selected
        </div>
      )}
    </div>
  );
}
