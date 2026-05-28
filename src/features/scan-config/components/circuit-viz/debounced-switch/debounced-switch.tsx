import { Switch } from 'antd';
import React from 'react';

export interface DebouncedSwitchProps {
  className?: string;
  value: boolean;
  onChange(value: boolean): void;
  onClick(): void;
}

export default function DebouncedSwitch({
  className,
  value,
  onChange,
  onClick,
}: DebouncedSwitchProps) {
  const refId = React.useRef<NodeJS.Timeout>(null);
  const [internalValue, setInternalValue] = React.useState(value);
  const handleChange = (value: boolean) => {
    onClick();
    setInternalValue(value);
    const id = refId.current;
    if (id !== null) globalThis.clearTimeout(id);
    refId.current = globalThis.setTimeout(() => onChange(value), 200);
  };

  return <Switch className={className} value={internalValue} onChange={handleChange} />;
}
