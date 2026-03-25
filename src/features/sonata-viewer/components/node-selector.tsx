import { Select } from 'antd';

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
  nodeIds,
  selectedNodeIds,
  onChange,
}: {
  populationName: string;
  nodeIds: number[];
  selectedNodeIds: number[];
  onChange: (nodeIds: number[]) => void;
}) {
  const isAll = selectedNodeIds.length === nodeIds.length && nodeIds.length > 0;

  const summaryLabel = isAll
    ? `All cells (${nodeIds.length})`
    : `${selectedNodeIds.length} of ${nodeIds.length} selected`;

  return (
    <div className="flex flex-col gap-2">
      Select cell ({nodeIds.length} available)
      <Select
        className="w-full"
        mode="multiple"
        virtual
        showSearch
        value={isAll ? [SELECT_ALL_SENTINEL, ...nodeIds.map(String)] : selectedNodeIds.map(String)}
        onChange={(values: string[]) => {
          const hadAll = isAll;
          const hasAll = values.includes(SELECT_ALL_SENTINEL);

          if (!hadAll && hasAll) {
            onChange(nodeIds);
          } else if (hadAll && !hasAll) {
            onChange([]);
          } else {
            const numericValues = values.filter((v) => v !== SELECT_ALL_SENTINEL).map(Number);
            onChange(numericValues);
          }
        }}
        placeholder="Select cells"
        maxTagCount={0}
        maxTagPlaceholder={() => summaryLabel}
        filterOption={(input, option) =>
          String(option?.children ?? '')
            .toLowerCase()
            .includes(input.toLowerCase())
        }
      >
        <Select.Option value={SELECT_ALL_SENTINEL}>All cells</Select.Option>
        {nodeIds.map((id) => (
          <Select.Option value={String(id)} key={id}>
            {populationName}_{id}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
}
