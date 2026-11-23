'use client';

import { isNil } from 'es-toolkit/compat';

import { useFieldError } from '@/features/scan-config/components/hooks/field-errors';
import { FieldUnit } from '@/features/scan-config/components/shared/field-unit';
import ParameterSweep, {
  SweepCollapseButton,
} from '@/features/scan-config/components/ui-elements/parameter-sweep';
import { cn } from '@/utils/css-class';

import 'katex/dist/katex.min.css';

import type { SectionListEntry } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import type { TScanConfigUIElementDict } from '@/features/scan-config/types';

/** A single value, or a list that obi-one expands into a parameter scan. */
export type SectionValue = number | null | (number | null)[];

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
    <div className="mt-3 space-y-4 p-1" data-scan-config-block-element-item={`${uiElement}_editor`}>
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
  value: SectionValue;
  onChange: (v: SectionValue) => void;
  disabled: boolean;
  errorPathPrefix?: string;
}) {
  const [min, max] = entry.limits ?? [undefined, undefined];
  const fieldPath = errorPathPrefix ? `${errorPathPrefix}/${entry.section_list}` : undefined;
  useFieldError(fieldPath, limitsError(value, min, max));

  return (
    <div
      data-scan-config-block-element-item={`${uiElement}_editor_item`}
      data-testid={`scan-config-section-list-${entry.section_list}`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex items-center">
          <span
            className={cn(
              'inline-flex items-center rounded-full border border-gray-300 ',
              'bg-white px-2.5 py-0.5 text-sm font-semibold text-primary-8'
            )}
          >
            {entry.section_list}
          </span>
          {entry.units && <FieldUnit unit={entry.units} className="text-sm" />}
        </span>
        {!isNil(entry.value) && (
          <span className="text-sm text-gray-400">Default: {entry.value}</span>
        )}
        <SweepCollapseButton
          value={value}
          name={entry.section_list}
          disabled={disabled}
          onChange={onChange}
        />
      </div>

      <div data-scan-config-block-element-item={`${uiElement}_editor_item_input`}>
        <ParameterSweep
          k={fieldPath ?? `${uiElement}/${entry.section_list}`}
          value={value}
          min={min}
          max={max}
          exclusiveMin={undefined}
          exclusiveMax={undefined}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

/** First value of a single value or scan that falls outside the variable's limits. */
function limitsError(value: SectionValue, min?: number, max?: number): string | undefined {
  const values = Array.isArray(value) ? value : [value];
  for (const v of values) {
    if (isNil(v)) continue;
    if (!isNil(min) && v < min) return `Min: ${min}`;
    if (!isNil(max) && v > max) return `Max: ${max}`;
  }
  return undefined;
}
