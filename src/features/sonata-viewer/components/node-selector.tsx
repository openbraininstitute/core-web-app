import { Select } from 'antd';
import range from 'es-toolkit/compat/range';
import { useId } from 'react';

const SELECT_ALL_SENTINEL = 'All';

/** Multi-select of a population's traces, with a synthetic "All" toggle antd lacks. */
export default function NodeSelector({
  populationName,
  traceLabels,
  nodeCount,
  selectedTraceIndices,
  onChange,
}: {
  populationName: string;
  traceLabels: string[];
  /** Distinct cells; equal to the trace count when each cell has one trace. */
  nodeCount: number;
  selectedTraceIndices: number[];
  onChange: (traceIndices: number[]) => void;
}) {
  const selectId = useId();
  const noun = nodeCount === traceLabels.length ? 'cell' : 'trace';

  const allSelected = selectedTraceIndices.length === traceLabels.length && traceLabels.length > 0;

  const selectionSummary = allSelected
    ? `All ${noun}s (${traceLabels.length})`
    : `${selectedTraceIndices.length} of ${traceLabels.length} selected`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={selectId}>
        Select {noun} ({traceLabels.length} available)
      </label>
      <Select
        id={selectId}
        className="w-full"
        mode="multiple"
        virtual
        showSearch
        value={[...(allSelected ? [SELECT_ALL_SENTINEL] : []), ...selectedTraceIndices.map(String)]}
        onChange={(values: string[]) => {
          const allOptionToggled = values.includes(SELECT_ALL_SENTINEL);

          if (!allSelected && allOptionToggled) {
            onChange(range(traceLabels.length));
          } else if (allSelected && !allOptionToggled) {
            onChange([]);
          } else {
            const individualIndices = values.filter((v) => v !== SELECT_ALL_SENTINEL).map(Number);
            onChange(individualIndices);
          }
        }}
        placeholder={`Select ${noun}s`}
        maxTagCount={0}
        maxTagPlaceholder={() => selectionSummary}
        filterOption={(input, option) =>
          String(option?.children ?? '')
            .toLowerCase()
            .includes(input.toLowerCase())
        }
      >
        <Select.Option value={SELECT_ALL_SENTINEL}>{`All ${noun}s`}</Select.Option>
        {traceLabels.map((label, index) => (
          <Select.Option
            value={String(index)}
            // biome-ignore lint/suspicious/noArrayIndexKey: column index is the trace identity
            key={index}
          >
            {`${populationName}_${label}`}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
}
