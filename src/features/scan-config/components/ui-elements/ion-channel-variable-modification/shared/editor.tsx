'use client';

import { isNil } from 'es-toolkit/compat';
import { useCallback, useEffect, useState } from 'react';

import { useFieldError } from '@/features/scan-config/components/hooks/field-errors';
import { FancyInput } from '@/ui/molecules/fancy-input';
import { renderMathInText } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers';

import 'katex/dist/katex.min.css';

import type { SectionListEntry } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import type { TScanConfigUIElementDict } from '@/features/scan-config/types';

// TODO: re-enable array support when multi-value sweep when obi-one enabled it
// export type SectionValue = number | number[];
export type SectionValue = number;

export interface SectionListEditorProps {
  uiElement: TScanConfigUIElementDict;
  sectionLists: SectionListEntry[];
  values: Record<string, SectionValue>;
  onChange: (sectionList: string, value: SectionValue) => void;
  disabled?: boolean;
  errorPathPrefix?: string;
}

export function SectionListConfigEditor({
  uiElement,
  sectionLists,
  values,
  onChange,
  disabled = false,
  errorPathPrefix,
}: SectionListEditorProps) {
  return (
    <div
      className="flex flex-col gap-4 border-t border-neutral-2 px-2 pt-4 pb-2"
      data-scan-config-block-element-item={`${uiElement}_editor`}
    >
      {sectionLists.map((entry) => (
        <SectionConfigRow
          uiElement={uiElement}
          key={entry.section_list}
          entry={entry}
          value={values[entry.section_list] ?? null}
          onChange={(v) => onChange(entry.section_list, v)}
          disabled={disabled}
          errorPathPrefix={errorPathPrefix}
        />
      ))}
    </div>
  );
}

function SectionConfigRow({
  uiElement,
  entry,
  value,
  onChange,
  disabled,
  errorPathPrefix,
}: {
  uiElement: TScanConfigUIElementDict;
  entry: SectionListEntry;
  value: SectionValue | null;
  onChange: (v: SectionValue) => void;
  disabled: boolean;
  errorPathPrefix?: string;
}) {
  const [min, max] = entry.limits ?? [undefined, undefined];
  const [draft, setDraft] = useState(value !== null ? String(value) : '');

  // sync draft when the external value changes (e.g. variable selection reset)
  useEffect(() => {
    setDraft(value !== null ? String(value) : '');
  }, [value]);

  const validate = useCallback(
    (v: number): string | undefined => {
      if (!isNil(min) && v < min) return `Min: ${min}`;
      if (!isNil(max) && v > max) return `Max: ${max}`;
      return undefined;
    },
    [min, max]
  );

  // validate against the draft so errors appear as the user types
  const draftError = (() => {
    if (draft.trim() === '') return undefined;
    const num = Number(draft);
    if (Number.isNaN(num)) return 'Invalid number';
    return validate(num);
  })();

  // register this error in the shared field errors atom so the left menu can see it
  const fieldPath = errorPathPrefix ? `${errorPathPrefix}/${entry.section_list}` : undefined;
  useFieldError(fieldPath, draftError);

  const commitValue = () => {
    // allow the user to clear the field without snapping back
    if (draft.trim() === '') return;
    const num = Number(draft);
    if (Number.isNaN(num)) {
      // reset only for genuinely invalid (non-empty) input
      setDraft(value !== null ? String(value) : '');
      return;
    }
    onChange(num);
  };

  // TODO: re-enable multi-value support when sweep is needed
  // const valuesArray: number[] = Array.isArray(value) ? value : [value];

  // the unit belongs in the label, like every other field; only the default sits underneath
  const unit = entry.units ? renderMathInText(entry.units) : undefined;
  const hint = !isNil(entry.value) ? `Default: ${entry.value}` : undefined;

  return (
    <div data-scan-config-block-element-item={`${uiElement}_editor_item`}>
      <FancyInput
        label={entry.section_list}
        unit={unit}
        helperText={hint}
        error={draftError}
        data-scan-config-block-element-item={`${uiElement}_editor_item_input`}
        inputMode="decimal"
        value={draft}
        onChange={(e) => {
          const newDraft = e.target.value;
          setDraft(newDraft);
          const num = Number(newDraft);
          if (newDraft.trim() !== '' && !Number.isNaN(num)) {
            onChange(num);
          }
        }}
        onBlur={commitValue}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitValue();
          }
        }}
        disabled={disabled}
        placeholder="Enter value…"
      />
    </div>
  );
}
