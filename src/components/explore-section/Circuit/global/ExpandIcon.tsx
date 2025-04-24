import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import { CircuitSchemaProps } from '../type';

export default function ExpandIcon({
  expanded,
  onExpand,
  record,
}: {
  expanded: boolean;
  onExpand: (record: CircuitSchemaProps, e: React.MouseEvent) => void;
  record: CircuitSchemaProps;
}) {
  if (!record.subcircuit || record.subcircuit.length === 0) {
    return null;
  }

  return (
    <Button
      type="link"
      onClick={(e) => onExpand(record, e)}
      style={{ width: '100%', textAlign: 'left' }}
      className="text-blue-500 hover:text-blue-700"
    >
      Subcircuits ({record.subcircuit.length}) {expanded ? <UpOutlined /> : <DownOutlined />}
    </Button>
  );
}
