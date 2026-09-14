import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';

/**
 * the value/probability table of a discrete distribution.
 *
 * the two arrays are one control, not two. they have to stay the same length -- each value
 * needs its own probability -- so editing them as separate lists would let a user leave them
 * mismatched, which is a state the distribution cannot sample from. a row owns both halves,
 * so the lengths cannot drift.
 *
 * probabilities are normalised before sampling, so they need not sum to 1. that is a
 * convenience which is invisible if the raw numbers are all that is shown: typing 1, 1, 1
 * gives thirds, and nothing on screen would say so. the share column is that feedback.
 *
 * neither array is sweepable, deliberately. a swept discrete distribution would be a list of
 * whole tuples, which in the schema is the same shape as one tuple of values -- there would be
 * no way to tell "my five values" from "five separate configurations to run".
 */
export function DiscreteProbabilities({
  values,
  probabilities,
  onChange,
  disabled,
}: {
  values: number[];
  probabilities: number[];
  onChange: (values: number[], probabilities: number[]) => void;
  disabled: boolean;
}) {
  // the pair can arrive mismatched from a hand-edited config; render the rows that exist and
  // let the shorter array show blanks rather than dropping the extra values silently.
  const rowCount = Math.max(values.length, probabilities.length);
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    value: values[i],
    probability: probabilities[i],
  }));

  const total = probabilities.reduce((sum, p) => sum + (Number.isFinite(p) ? p : 0), 0);

  const update = (i: number, next: Partial<{ value: number; probability: number }>) => {
    const nextValues = [...values];
    const nextProbabilities = [...probabilities];
    if (next.value !== undefined) nextValues[i] = next.value;
    if (next.probability !== undefined) nextProbabilities[i] = next.probability;
    onChange(nextValues, nextProbabilities);
  };

  return (
    <div className="flex flex-col gap-2" data-scan-config-block-element="discrete_probabilities">
      <div className="flex gap-2 text-neutral-3 text-xs uppercase">
        <div className="flex-1">Value</div>
        <div className="flex-1">Probability</div>
        <div className="w-16 text-right">Share</div>
        {!disabled && <div className="w-6" />}
      </div>

      {rows.map((row, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional, not identified
        <div key={i} className="flex items-center gap-2">
          <InputNumber
            className="flex-1"
            disabled={disabled}
            precision={0}
            value={row.value ?? null}
            aria-label={`Value ${i + 1}`}
            onChange={(v) => v !== null && update(i, { value: v })}
          />
          <InputNumber
            className="flex-1"
            disabled={disabled}
            min={0}
            step={0.1}
            value={row.probability ?? null}
            aria-label={`Probability ${i + 1}`}
            onChange={(v) => v !== null && update(i, { probability: v })}
          />
          <div className="w-16 text-right text-neutral-3 tabular-nums">
            {total > 0 && Number.isFinite(row.probability)
              ? `${((row.probability / total) * 100).toFixed(1)}%`
              : '--'}
          </div>
          {!disabled && (
            <DeleteOutlined
              className="w-6 text-red-500"
              aria-label={`Remove value ${i + 1}`}
              onClick={() =>
                rowCount > 1 && onChange(values.toSpliced(i, 1), probabilities.toSpliced(i, 1))
              }
            />
          )}
        </div>
      ))}

      {total <= 0 && (
        <div className="text-red-500 text-xs">At least one probability must be above zero.</div>
      )}

      {!disabled && (
        <button
          type="button"
          className="mt-2 flex min-h-[40px] min-w-[150px] items-center justify-between float-right rounded-full border border-gray-200 px-3 py-2 font-bold text-primary-8"
          onClick={() => {
            const last = values.at(-1);
            onChange([...values, (last ?? 0) + 1], [...probabilities, 0]);
          }}
        >
          Add value
          <PlusOutlined className="text-primary-8!" />
        </button>
      )}
    </div>
  );
}

export default DiscreteProbabilities;
