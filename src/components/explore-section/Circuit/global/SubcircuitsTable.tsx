import { Table } from 'antd';
import { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import { Key } from 'react';
import { ArrowSmall } from '../icon/ArrowSubcircuitIcon';
import { CircuitSchemaProps } from '../type';

import DownloadCircuitButton from './DownloadCircuitButton';
import ResizableTitle from './ResizableTitle';

import styles from './exploreCircuitTable.module.scss';

export type SubcircuitsTableProps = {
  circuit: CircuitSchemaProps;
  mergedColumns: ColumnsType<CircuitSchemaProps>;
  rowSelection: TableRowSelection<CircuitSchemaProps>;
  expandedRowKeys: Key[];
  downloadable: boolean;
  onExpand?: (expanded: boolean, row: CircuitSchemaProps) => void;
  selectedRows: CircuitSchemaProps[];
  selectedRowKeys: string[];
};

export default function SubcircuitTable({
  circuit,
  mergedColumns,
  rowSelection,
  expandedRowKeys,
  downloadable = true,
  onExpand,
  selectedRows,
  selectedRowKeys,
}: SubcircuitsTableProps) {
  const renderSubcircuits = (subCircuit: CircuitSchemaProps) => (
    <SubcircuitTable
      circuit={subCircuit}
      mergedColumns={mergedColumns}
      rowSelection={rowSelection}
      expandedRowKeys={expandedRowKeys}
      onExpand={onExpand}
      downloadable={downloadable}
      selectedRows={selectedRows}
      selectedRowKeys={selectedRowKeys}
    />
  );

  const lastRow = selectedRows?.at(-1);
  const fileUrl = lastRow?.files?.[0]?.url;

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
        data-row-selection={downloadable && downloadable.toString()}
        components={{
          header: {
            cell: ResizableTitle,
          },
        }}
        dataSource={circuit.subcircuits || []}
        columns={mergedColumns}
        pagination={false}
        rowSelection={downloadable ? rowSelection : undefined}
        expandable={{
          expandedRowRender: renderSubcircuits,
          expandedRowKeys,
          onExpand,
          expandIcon: () => null,
          rowExpandable: (record) => !!record.subcircuits && record.subcircuits.length > 0,
        }}
      />
      {fileUrl && (
        <DownloadCircuitButton fileUrl={fileUrl} selectedRowKeys={selectedRowKeys || []} />
      )}
    </div>
  );
}
