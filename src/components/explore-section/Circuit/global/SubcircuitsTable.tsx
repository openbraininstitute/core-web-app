import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table/interface';
import { Key } from 'react';
import { ArrowSmall } from '../icon/ArrowSubcircuitIcon';
import { CircuitSchemaProps } from '../type';

import ResizableTitle from './ResizableTitle';

import styles from './exploreCircuitTable.module.scss';

export type SubcircuitsTableProps = {
  circuit: CircuitSchemaProps;
  columns: ColumnsType<CircuitSchemaProps>;
  expandedRowKeys: Key[];
  downloadable: boolean;
  onExpand?: (expanded: boolean, row: CircuitSchemaProps) => void;
};

export default function SubcircuitTable({
  circuit,
  columns,
  expandedRowKeys,
  downloadable = true,
  onExpand,
}: SubcircuitsTableProps) {
  const renderSubcircuits = (subCircuit: CircuitSchemaProps) => (
    <SubcircuitTable
      circuit={subCircuit}
      columns={columns}
      expandedRowKeys={expandedRowKeys}
      onExpand={onExpand}
      downloadable={downloadable}
    />
  );

  // const lastRow = selectedRows?.at(-1);
  // const fileUrl = lastRow?.files?.[0]?.url;

  return (
    <div className="relative flex flex-col">
      <div className="relative flex flex-row pl-2">
        <ArrowSmall iconColor="#8C8C8C" className="relative -top-0.5" />
        <span className="ml-3 pb-2 text-base font-semibold uppercase tracking-wider text-[#8C8C8C]">
          Subcircuits
        </span>
      </div>
      <Table
        className={styles.circuitTable}
        style={
          {
            '--ant-table-expand-icon-col-width': '0px',
          } as React.CSSProperties
        }
        components={{
          header: {
            cell: ResizableTitle,
          },
        }}
        dataSource={circuit.subcircuits || []}
        columns={columns}
        pagination={false}
        expandable={{
          expandedRowRender: renderSubcircuits,
          expandedRowKeys,
          onExpand,
          expandIcon: () => null,
          rowExpandable: (record) => !!record.subcircuits && record.subcircuits.length > 0,
        }}
      />
    </div>
  );
}
