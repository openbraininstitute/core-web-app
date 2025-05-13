'use client';

import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table/interface';
import { Key } from 'react';
import { ArrowSmall } from '../icon/ArrowSubcircuitIcon';
import { CircuitSchemaProps, NumericFilterOptions } from '../type';

import { circuitMatchFilter } from '../utils/circuits-match-filter';

import styles from './exploreCircuitTable.module.scss';

export type SubcircuitsTableProps = {
  circuit: CircuitSchemaProps;
  columns: ColumnsType<CircuitSchemaProps>;
  expandedRowKeys: Key[];
  onExpand?: (expanded: boolean, row: CircuitSchemaProps) => void;
  numericFilter: NumericFilterOptions | null;
  minValue: number | undefined;
  maxValue: number | undefined;
};

export default function SubcircuitTable({
  circuit,
  columns,
  expandedRowKeys,
  onExpand,
  numericFilter,
  minValue,
  maxValue,
}: SubcircuitsTableProps) {
  const renderSubcircuits = (subCircuit: CircuitSchemaProps) => (
    <SubcircuitTable
      circuit={subCircuit}
      columns={columns}
      expandedRowKeys={expandedRowKeys}
      onExpand={onExpand}
      numericFilter={numericFilter}
      minValue={minValue}
      maxValue={maxValue}
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
      <Table
        className={styles.circuitTable}
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
        rowClassName={(record) =>
          circuitMatchFilter(record, numericFilter, minValue, maxValue)
            ? styles.matchingRow
            : styles.nonMatchingRow
        }
      />
    </div>
  );
}
