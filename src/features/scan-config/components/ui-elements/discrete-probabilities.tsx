import { PlusOutlined } from '@ant-design/icons';
import { RiDeleteBinLine } from '@remixicon/react';

import { FancyActions, FancyField, FancyNumberInput } from '@/ui/molecules/fancy-input';

import type { FancyChrome } from '@/ui/molecules/fancy-input';

/** Edits paired discrete values and probabilities without changing their row alignment. */
export function DiscreteProbabilities({
  values,
  probabilities,
  onChange,
  disabled,
  chrome,
}: {
  values: number[];
  probabilities: number[];
  onChange: (values: number[], probabilities: number[]) => void;
  disabled: boolean;
  chrome?: FancyChrome;
}) {
  const rowCount = Math.max(values.length, probabilities.length);
  /** Both arrays are addressed by row, so the shorter one is filled out before any write. */
  const pad = (arr: number[]) => Array.from({ length: rowCount }, (_, i) => arr[i] ?? 0);
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    value: values[i],
    probability: probabilities[i],
  }));

  const total = probabilities.reduce((sum, p) => sum + (Number.isFinite(p) ? p : 0), 0);

  const update = (i: number, next: Partial<{ value: number; probability: number }>) => {
    const nextValues = pad(values);
    const nextProbabilities = pad(probabilities);
    if (next.value !== undefined) nextValues[i] = next.value;
    if (next.probability !== undefined) nextProbabilities[i] = next.probability;
    onChange(nextValues, nextProbabilities);
  };

  return (
    <div data-scan-config-block-element="discrete_probabilities">
      <FancyField
        {...chrome}
        group
        disabled={disabled}
        error={total <= 0 ? 'At least one probability must be above zero.' : chrome?.error}
        borderActions={
          !disabled && (
            <FancyActions
              onBorder
              actions={[
                {
                  key: 'add',
                  label: 'Add value',
                  icon: <PlusOutlined />,
                  onClick: () => {
                    const paddedValues = pad(values);
                    onChange(
                      [...paddedValues, (paddedValues.at(-1) ?? 0) + 1],
                      [...pad(probabilities), 0]
                    );
                  },
                },
              ]}
            />
          )
        }
      >
        <div className="flex flex-col gap-2 px-2 pt-4 pb-2">
          <div className="flex gap-2 px-1 text-xs font-medium text-neutral-4">
            <div className="flex-1">Value</div>
            <div className="flex-1">Probability</div>
            <div className="w-14 text-right">Share</div>
            {!disabled && <div className="w-7" />}
          </div>

          {rows.map((row, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional, not identified
            <div key={i} className="flex items-center gap-2">
              <FancyNumberInput
                className="flex-1"
                validate="integer"
                disabled={disabled}
                value={row.value ?? null}
                aria-label={`Value ${i + 1}`}
                onValueChange={(v) => v !== null && update(i, { value: v })}
              />
              <FancyNumberInput
                className="flex-1"
                validationRules={{ min: 0 }}
                disabled={disabled}
                value={row.probability ?? null}
                aria-label={`Probability ${i + 1}`}
                onValueChange={(v) => v !== null && update(i, { probability: v })}
              />
              <div className="w-14 text-right text-xs text-neutral-4 tabular-nums">
                {total > 0 && Number.isFinite(row.probability)
                  ? `${((row.probability / total) * 100).toFixed(1)}%`
                  : '--'}
              </div>
              {!disabled && (
                <FancyActions
                  actions={[
                    {
                      key: 'remove',
                      label: `Remove value ${i + 1}`,
                      icon: <RiDeleteBinLine className="size-3.5" />,
                      disabled: rowCount <= 1,
                      onClick: () =>
                        rowCount > 1 &&
                        onChange(pad(values).toSpliced(i, 1), pad(probabilities).toSpliced(i, 1)),
                    },
                  ]}
                />
              )}
            </div>
          ))}
        </div>
      </FancyField>
    </div>
  );
}

export default DiscreteProbabilities;
