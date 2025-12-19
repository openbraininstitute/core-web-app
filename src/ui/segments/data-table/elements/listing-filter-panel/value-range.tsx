import { InputNumber } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { ArrowsHorizontal } from '@/components/icons/Arrows-horizantal';
import type { GteLteValue, TCoreFilter } from '@/entity-configuration/definitions/types';
import { cn } from '@/utils/css-class';

type Props = {
  filter: TCoreFilter;
  onChange: (values: GteLteValue) => void;
};

export function ValueRange({ filter, onChange }: Props) {
  const [minValue, setMinValue] = useState<number | null>(null);
  const [maxValue, setMaxValue] = useState<number | null>(null);

  useEffect(() => {
    if (filter.value && typeof filter.value === 'object' && 'gte' in filter.value) {
      const rangeValue = filter.value as GteLteValue;
      setMinValue(typeof rangeValue.gte === 'number' ? rangeValue.gte : null);
      setMaxValue(typeof rangeValue.lte === 'number' ? rangeValue.lte : null);
    }
  }, [filter.value]);

  const handleMinChange = useCallback(
    (value: number | null) => {
      setMinValue(value);
      onChange({
        gte: value,
        lte: maxValue,
      });
    },
    [maxValue, onChange],
  );

  const handleMaxChange = useCallback(
    (value: number | null) => {
      setMaxValue(value);
      onChange({
        gte: minValue,
        lte: value,
      });
    },
    [minValue, onChange],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col items-center justify-center">
          <InputNumber
            id="value-range-min"
            className={cn(
              'border-neutral-3 w-full border bg-transparent text-white focus-within:bg-transparent! hover:bg-transparent!',
              '[&_.ant-input-number-input]:placeholder:text-primary-4 [&_.ant-input-number-input]:font-bold! [&_.ant-input-number-input]:text-white!',
            )}
            value={minValue}
            onChange={handleMinChange}
            placeholder="–"
            size="large"
          />
        </div>
        <div className="flex h-full items-center justify-center">
          <ArrowsHorizontal className="text-4xl text-white" />
        </div>
        <div className="flex flex-1 flex-col">
          <InputNumber
            id="value-range-max"
            value={maxValue}
            onChange={handleMaxChange}
            placeholder="–"
            className={cn(
              'border-neutral-3 w-full border bg-transparent text-white focus-within:bg-transparent! hover:bg-transparent!',
              '[&_.ant-input-number-input]:placeholder:text-primary-4 [&_.ant-input-number-input]:font-bold! [&_.ant-input-number-input]:text-white!',
            )}
            size="large"
          />
        </div>
      </div>
    </div>
  );
}
