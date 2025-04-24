import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Children, Key, ReactNode, memo } from 'react';
import { CircuitSchemaProps } from '../type';

import { classNames } from '@/util/utils';
import styles from './exploreCircuitTable.module.scss';

export type CustomRowProps = {
  children: ReactNode;
  record?: CircuitSchemaProps;
  handleExpandRow: (expanded: boolean, record: CircuitSchemaProps) => void;
  expandedRowKeys: Key[];
  columnCount?: number;
} & React.HTMLAttributes<HTMLTableRowElement>;

function CustomRow({
  children,
  record,
  handleExpandRow,
  expandedRowKeys,
  columnCount,
  ...restProps
}: CustomRowProps) {
  if (!record || !record.key || !record.subcircuit || record.subcircuit.length === 0) {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <tr {...restProps}>{children}</tr>;
  }

  const isExpanded = expandedRowKeys.includes(record.key);

  return (
    <>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <tr {...restProps}>{children}</tr>
      <tr
        className={styles.subcircuitButtonRow}
        style={{ display: 'table-row', minHeight: '40px' }}
      >
        <td
          colSpan={columnCount ?? Children.toArray(children).length}
          style={{ padding: 0, backgroundColor: '#fafafa', minHeight: '40px' }}
        >
          <Button
            type="link"
            onClick={() => handleExpandRow(!isExpanded, record)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 16px',
              backgroundColor: '#fafafa',
              display: 'block',
              fontSize: '14px',
            }}
            className={classNames('text-blue-500 hover:text-blue-700', styles.expandButton)}
            aria-expanded={isExpanded}
            aria-controls={`subcircuit-table-${record.key}`}
          >
            Subcircuits ({record.subcircuit.length}){' '}
            {isExpanded ? <UpOutlined /> : <DownOutlined />}
          </Button>
        </td>
      </tr>
    </>
  );
}

export default memo(CustomRow);
