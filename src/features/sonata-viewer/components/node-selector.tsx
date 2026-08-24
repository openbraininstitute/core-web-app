import { Select } from 'antd';
import range from 'es-toolkit/compat/range';

const SELECT_ALL_SENTINEL = 'All';

/**
 * Multi-select dropdown for choosing node IDs within a population.
 *
 * Ant Design's multi-mode Select has no built-in "select all" toggle, so we
 * prepend a synthetic "All" option (SELECT_ALL_SENTINEL) to the list. The
 * onChange handler detects transitions to/from the all-selected state:
 * - User clicks "All" when not all selected → select every node
 * - User clicks "All" when all selected    → deselect everything
 * - Otherwise                              → update individual selection
 *
 * A collapsed tag placeholder shows a summary like "3 of 50 selected" instead
 * of rendering every tag.
 */
export default function NodeSelector({
  populationName,
  traceLabels,
  selectedTraceIndices,
  onChange,
}: {
  populationName: string;
  traceLabels: string[];
  selectedTraceIndices: number[];
  onChange: (traceIndices: number[]) => void;
}) {
  const allNodesSelected =
    selectedTraceIndices.length === traceLabels.length && traceLabels.length > 0;

  const selectionSummary = allNodesSelected
    ? `All cells (${traceLabels.length})`
    : `${selectedTraceIndices.length} of ${traceLabels.length} selected`;

  return (
    <div className="flex flex-col gap-2">
      Select cell ({traceLabels.length} available)
      <Select
        className="w-full"
        mode="multiple"
        virtual
        showSearch
        value={[
          ...(allNodesSelected ? [SELECT_ALL_SENTINEL] : []),
          ...selectedTraceIndices.map(String),
        ]}
        onChange={(values: string[]) => {
          const wasAllSelected = allNodesSelected;
          const allOptionToggled = values.includes(SELECT_ALL_SENTINEL);

          if (!wasAllSelected && allOptionToggled) {
            onChange(range(traceLabels.length));
          } else if (wasAllSelected && !allOptionToggled) {
            onChange([]);
          } else {
            const individualIndices = values.filter((v) => v !== SELECT_ALL_SENTINEL).map(Number);
            onChange(individualIndices);
          }
        }}
        placeholder="Select cells"
        maxTagCount={0}
        maxTagPlaceholder={() => selectionSummary}
        filterOption={(input, option) =>
          String(option?.children ?? '')
            .toLowerCase()
            .includes(input.toLowerCase())
        }
      >
        <Select.Option value={SELECT_ALL_SENTINEL}>All cells</Select.Option>
        {traceLabels.map((label, index) => (
          <Select.Option
            value={String(index)}
            // biome-ignore lint/suspicious/noArrayIndexKey: column index is the trace identity
            key={index}
          >
            {populationName}_{label}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
}
