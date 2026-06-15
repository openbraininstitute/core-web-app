'use client';

import { RiAddLine, RiSubtractLine } from '@remixicon/react';
import { useCallback, useId } from 'react';

import { Button } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
import { cn } from '@/utils/css-class';

import type { ComponentProps } from 'react';

type InputNumberProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'default';
  containerClassName?: string;
};

function clamp(value: number, min?: number, max?: number) {
  let next = value;
  if (typeof min === 'number') next = Math.max(min, next);
  if (typeof max === 'number') next = Math.min(max, next);
  return next;
}

function InputNumber({
  value,
  onChange,
  min,
  max,
  step = 1,
  size = 'default',
  className,
  containerClassName,
  disabled,
  id,
  ...props
}: InputNumberProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  const setValue = useCallback(
    (next: number) => {
      if (Number.isNaN(next)) return;
      onChange?.(clamp(next, min, max));
    },
    [onChange, min, max]
  );

  const current = typeof value === 'number' ? value : 0;
  const atMin = typeof min === 'number' && current <= min;
  const atMax = typeof max === 'number' && current >= max;

  return (
    <div
      data-slot="input-number"
      className={cn('inline-flex items-center gap-1', containerClassName)}
    >
      <Button
        type="button"
        variant="outline"
        size={size === 'sm' ? 'sm' : 'default'}
        aria-label="Decrement"
        disabled={disabled || atMin}
        onClick={() => setValue(current - step)}
        className="size-9 p-0"
      >
        <RiSubtractLine className="size-4" />
      </Button>
      <Input
        {...props}
        id={inputId}
        type="number"
        inputMode="numeric"
        disabled={disabled}
        value={typeof value === 'number' ? value : ''}
        onChange={(event) => {
          const parsed = Number.parseFloat(event.target.value);
          if (event.target.value === '' || Number.isNaN(parsed)) {
            onChange?.(min ?? 0);
            return;
          }
          setValue(parsed);
        }}
        min={min}
        max={max}
        step={step}
        className={cn('w-20 text-center', className)}
      />
      <Button
        type="button"
        variant="outline"
        size={size === 'sm' ? 'sm' : 'default'}
        aria-label="Increment"
        disabled={disabled || atMax}
        onClick={() => setValue(current + step)}
        className="size-9 p-0"
      >
        <RiAddLine className="size-4" />
      </Button>
    </div>
  );
}

export { InputNumber };
