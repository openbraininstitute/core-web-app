'use client';

import { cn } from '@/utils/css-class';

interface JsonTextareaInputProps {
  value: string;
  onChange: (value: string) => void;
  hasError: boolean;
  isValid?: boolean;
}

export function JsonTextareaInput({ value, onChange, hasError, isValid }: JsonTextareaInputProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Paste your JSON configuration here..."
      className={cn(
        'min-h-[200px] w-full resize-y rounded border p-3 font-mono text-sm outline-none',
        hasError && 'border-red-400',
        !hasError && isValid && 'border-green-400',
        !hasError && !isValid && 'border-neutral-2'
      )}
    />
  );
}
