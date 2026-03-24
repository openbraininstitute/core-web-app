import { Select } from 'antd';

const ALL_VALUE = 'All';

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
        value={isAll ? [ALL_VALUE, ...nodeIds.map(String)] : selectedNodeIds.map(String)}
        onChange={(values: string[]) => {
          const hadAll = isAll;
          const hasAll = values.includes(ALL_VALUE);

          if (!hadAll && hasAll) {
            onChange(nodeIds);
          } else if (hadAll && !hasAll) {
            onChange([]);
          } else {
            const numericValues = values.filter((v) => v !== ALL_VALUE).map(Number);
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
        <Select.Option value={ALL_VALUE}>All cells</Select.Option>
        {nodeIds.map((id) => (
          <Select.Option value={String(id)} key={id}>
            {populationName}_{id}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
}
