import { Select } from 'antd';

const MAX_ALL_NODES = 20;

export default function NodeSelector({
  nodeIds,
  selectedNodeIds,
  onChange,
}: {
  nodeIds: number[];
  selectedNodeIds: number[];
  onChange: (nodeIds: number[]) => void;
}) {
  const allowAll = nodeIds.length <= MAX_ALL_NODES;

  if (allowAll) {
    const isAll = selectedNodeIds.length === nodeIds.length;

    return (
      <div className="flex flex-col gap-2">
        Select Node ({nodeIds.length} available)
        <Select
          className="w-full"
          mode="multiple"
          value={isAll ? ['All', ...nodeIds.map(String)] : selectedNodeIds.map(String)}
          onChange={(values: string[]) => {
            const hadAll = isAll;
            const hasAll = values.includes('All');

            if (!hadAll && hasAll) {
              onChange(nodeIds);
            } else if (hadAll && !hasAll) {
              onChange([]);
            } else {
              const numericValues = values.filter((v) => v !== 'All').map(Number);
              onChange(numericValues);
            }
          }}
          placeholder="Select nodes"
          maxTagCount="responsive"
        >
          <Select.Option value="All">All Nodes</Select.Option>
          {nodeIds.map((id) => (
            <Select.Option value={String(id)} key={id}>
              Node {id}
            </Select.Option>
          ))}
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      Select Node ({nodeIds.length} available)
      <Select
        className="w-full"
        showSearch
        virtual
        value={selectedNodeIds.length > 0 ? String(selectedNodeIds[0]) : undefined}
        onChange={(value: string) => onChange([Number(value)])}
        placeholder="Search for a node"
        filterOption={(input, option) =>
          String(option?.children ?? '')
            .toLowerCase()
            .includes(input.toLowerCase())
        }
      >
        {nodeIds.map((id) => (
          <Select.Option value={String(id)} key={id}>
            Node {id}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
}
