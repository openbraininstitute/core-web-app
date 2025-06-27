'use client';

import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table/interface';
import moment from 'moment';
import { Key } from 'react';
import { ArrowSmall } from '../icon/ArrowSubcircuitIcon';
import { CircuitSchemaProps } from '../type';
import { FilterConfig, SingleColumnContent } from './state/columns';

import styles from './exploreCircuitTable.module.scss';

export type SubcircuitsTableProps = {
  circuit: CircuitSchemaProps;
  columns: ColumnsType<CircuitSchemaProps>;
  expandedRowKeys: Key[];
  onExpand?: (expanded: boolean, row: CircuitSchemaProps) => void;
  filters: Record<string, FilterConfig | null>;
  searchQuery: string;
  columnState: SingleColumnContent[];
};

export default function SubcircuitTable({
  circuit,
  columns,
  expandedRowKeys,
  onExpand,
  filters,
  searchQuery,
  columnState,
}: SubcircuitsTableProps) {
  const renderSubcircuits = (subCircuit: CircuitSchemaProps) => (
    <SubcircuitTable
      circuit={subCircuit}
      columns={columns}
      expandedRowKeys={expandedRowKeys}
      onExpand={onExpand}
      filters={filters}
      searchQuery={searchQuery}
      columnState={columnState}
    />
  );

  const isRowMatching = (record: CircuitSchemaProps) => {
    // Check filtersAtom
    for (const [columnId, filter] of Object.entries(filters)) {
      if (!filter) continue;

      const filterType = columnState.find((col) => col.id === columnId)?.filterType;

      const value = record[columnId as keyof CircuitSchemaProps];

      if (filterType === 'text' && typeof value === 'string' && filter.min) {
        if (value.toLowerCase().includes((filter.min as string).toLowerCase())) return true;
      }

      if (filterType === 'numeric' && typeof value === 'number' && filter.type) {
        const min = filter.min as number | undefined;
        const max = filter.max as number | undefined;
        if (filter.type === 'greaterThan' && min !== undefined && value > min) return true;
        if (filter.type === 'lessThan' && max !== undefined && value < max) return true;
        if (
          filter.type === 'between' &&
          min !== undefined &&
          max !== undefined &&
          value >= min &&
          value <= max
        )
          return true;
      }

      if (filterType === 'select' && filter.type && value === filter.type) return true;

      if (filterType === 'date' && typeof value === 'string' && filter.min) {
        if (moment(value).isSame(moment(filter.min as string), 'day')) return true;
      }

      if (filterType === 'boolean' && filter.min && value === (filter.min === 'true')) return true;
    }

    // Check searchQuery
    if (searchQuery) {
      return ['name', 'brainRegion', 'scale', 'specie', 'publishedIn', 'buildCategory'].some(
        (field) => {
          const value = record[field as keyof CircuitSchemaProps];
          return (
            typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
      );
    }

    return false;
  };

  return (
    <div className="relative flex flex-col">
      <div className="relative flex flex-row pl-2">
        <ArrowSmall iconColor="#8C8C8C" className="relative -top-0.5" />
        <span className="ml-3 pb-2 text-base font-semibold tracking-wider text-[#8C8C8C] uppercase">
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
          isRowMatching(record) ? styles.matchingRow : styles.nonMatchingRow
        }
      />
    </div>
  );
}
