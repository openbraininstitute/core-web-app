'use client';

import { Input } from 'antd';
import { useState } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

/** The object a text holds, or an error saying why it is not one. */
export function parseJsonObject(
  text: string
): { object: Record<string, unknown> } | { error: string } {
  if (!text.trim()) return { object: {} };
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { object: parsed as Record<string, unknown> };
    }
    return { error: 'Write an object, in curly braces' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'This is not valid JSON' };
  }
}

/**
 * `json_object`: arguments passed through to a library, whose keys depend on the method chosen.
 * A text that does not parse stays on screen with why, and the last good object stays in the form.
 */
export function JsonObject({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, unknown> | null;
  onChange: (value: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(() =>
    value && Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : ''
  );
  const parsed = parseJsonObject(draft);
  const error = 'error' in parsed ? parsed.error : undefined;

  return (
    <div data-scan-config-block-element={ScanConfigUIElementDict.JsonObject}>
      <Input.TextArea
        data-testid="scan-config-json-object"
        className="font-mono! text-xs!"
        disabled={disabled}
        status={error ? 'error' : undefined}
        value={draft}
        placeholder="{ }"
        autoSize={{ minRows: 2, maxRows: 12 }}
        onChange={(event) => {
          setDraft(event.target.value);
          const next = parseJsonObject(event.target.value);
          if ('object' in next) onChange(next.object);
        }}
      />
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}
