import { Table } from 'antd';
import { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import { Key } from 'react';
import { ArrowSmall } from '../icon/ArrowSubcircuitIcon';
import { CircuitSchemaProps } from '../type';

import ResizableTitle from './ResizableTitle';

import { classNames } from '@/util/utils';

import styles from './ExploreCircuiteTable.module.scss';

export type SubcircuitsTableProps = {
  circuit: CircuitSchemaProps;
  mergedColumns: ColumnsType<CircuitSchemaProps>;
  rowSelection: TableRowSelection<CircuitSchemaProps>;
  expandedRowKeys: Key[];
  onExpand: (expanded: boolean, row: CircuitSchemaProps) => void;
  downloadable?: boolean;
};

export default function SubcircuitTable({
  circuit,
  mergedColumns,
  rowSelection,
  expandedRowKeys,
  onExpand,
  downloadable = true,
}: SubcircuitsTableProps) {
  
  const renderSubcircuits = (subCircuit: CircuitSchemaProps) => (
    <SubcircuitTable
      circuit={subCircuit}
      mergedColumns={mergedColumns}
      rowSelection={rowSelection}
      expandedRowKeys={expandedRowKeys}
      onExpand={onExpand}
      downloadable={downloadable}
    />
  );

  return (
    <div className="relative flex flex-col">
      <div className="relative flex flex-row pl-2">
        <ArrowSmall iconColor="#8C8C8C" className="relative -top-0.5" />
        <span className="ml-3 pb-2 text-base font-semibold uppercase tracking-wider text-[#8C8C8C]">
          Subcircuits
        </span>
      </div>
      {downloadable ? (
        <Table<CircuitSchemaProps>
          className={classNames(
            '[&_.ant-table-tbody]:bg-[#FAFAFA]',
            '[&_.ant-table-row]:bg-[#FAFAFA]',
            '[&_.ant-table-thead_th]:!text-sm',
            '[&_.ant-table-thead_th]:!font-normal',
            '[&_.ant-table-thead_th]:!text-[#8C8C8C]',
            '[&_.ant-table-thead_th]:uppercase',
            '[&_.ant-table-thead_th]:tracking-[0.05em]',
            '[&_.ant-table-tbody > tr:last-child > td]:border-b-0',
            '[&_.ant-table-thead > tr > th]:border-b-0',
            '[&_.ant-table-expand-icon-col]:w-0',
            '[&_.ant-table-expand-icon-col]:hidden',
            styles.circuitTable
          )}
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
          columns={mergedColumns}
          dataSource={circuit.subcircuit || []}
          pagination={false}
          rowSelection={rowSelection}
          expandable={{
            expandedRowRender: renderSubcircuits,
            expandedRowKeys,
            onExpand,
            expandIcon: () => null,
          }}
        />
      ) : (
        <Table<CircuitSchemaProps>
          className={classNames(
            '[&_.ant-table-tbody]:bg-[#FAFAFA]',
            '[&_.ant-table-row]:bg-[#FAFAFA]',
            '[&_.ant-table-thead_th]:!text-sm',
            '[&_.ant-table-thead_th]:!font-normal',
            '[&_.ant-table-thead_th]:!text-[#8C8C8C]',
            '[&_.ant-table-thead_th]:uppercase',
            '[&_.ant-table-thead_th]:tracking-[0.05em]',
            '[&_.ant-table-tbody > tr:last-child > td]:border-b-0',
            '[&_.ant-table-thead > tr > th]:border-b-0',
            '[&_.ant-table-expand-icon-col]:w-0',
            '[&_.ant-table-expand-icon-col]:hidden',
            styles.circuitTable
          )}
          components={{
            header: {
              cell: ResizableTitle,
            },
          }}
          columns={mergedColumns}
          dataSource={circuit.subcircuit || []}
          pagination={false}
          expandable={{
            expandedRowRender: renderSubcircuits,
            expandedRowKeys,
            onExpand,
            expandIcon: () => null,
          }}
        />
      )}
    </div>
  );
}
