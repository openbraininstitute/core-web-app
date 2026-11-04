'use client';

import { Input } from 'antd';
import { useState } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

/** The integers a comma-separated text names; `null` when empty, `undefined` when it is not one. */
export function parseIntList(text: string): number[] | null | undefined {
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.every((part) => /^-?\d+$/.test(part)) ? parts.map(Number) : undefined;
}

/** `int_list_optional`: integers typed as a list, or unset when left empty. */
export function IntListOptional({
  value,
  onChange,
  disabled,
}: {
  value: number[] | null;
  onChange: (value: number[] | null) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(value?.join(', ') ?? '');
  const invalid = parseIntList(draft) === undefined;

  return (
    <div data-scan-config-block-element={ScanConfigUIElementDict.IntListOptional}>
      <Input
        data-testid="scan-config-int-list"
        disabled={disabled}
        status={invalid ? 'error' : undefined}
        value={draft}
        placeholder="Not set"
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = parseIntList(event.target.value);
          if (parsed !== undefined) onChange(parsed);
        }}
      />
      {invalid && <span className="text-red-500">Write whole numbers separated by commas</span>}
    </div>
  );
}
