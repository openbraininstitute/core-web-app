import React from 'react';

import { classNames } from '@/util/utils';

import styles from './slider.module.css';

export interface SliderProps {
  className?: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange(value: number): void;
}

export default function Slider({ className, label, min, max, step, value, onChange }: SliderProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = parseFloat(event.target.value);
    onChange(newValue);
  };

  return (
    <div className={classNames(className, styles.slider)}>
      <div>
        <div>{label}</div>
        <div>
          <strong>{value.toFixed(2)}</strong>
        </div>
      </div>
      <input type="range" step={step} min={min} max={max} value={value} onChange={handleChange} />
    </div>
  );
}
