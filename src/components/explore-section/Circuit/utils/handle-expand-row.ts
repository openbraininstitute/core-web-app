import { CircuitSchemaProps } from '../type';

const handleExpandRow = (
  row: CircuitSchemaProps,
  setExpandedRowKeys: React.Dispatch<React.SetStateAction<string[]>>,
  _index: number
) => {
  if (!row.hasSubcircuits) return;
  const rowKey = row.key;
  setExpandedRowKeys((prev) =>
    prev.includes(rowKey) ? prev.filter((key) => key !== rowKey) : [...prev, rowKey]
  );
};

export default handleExpandRow;
