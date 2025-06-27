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
    // Log filters and searchQuery to debug state
    console.log(
      'isRowMatching - Record:',
      record.name,
      'Filters:',
      filters,
      'SearchQuery:',
      searchQuery
    );

    // Check if any filters are active
    const hasActiveFilters = Object.values(filters).some((filter) => filter !== null);
    if (!hasActiveFilters && !searchQuery) {
      console.log('No filters or search active, returning true for:', record.name);
      return true; // No filters or search, all rows match
    }

    // Check filtersAtom
    for (const [columnId, filter] of Object.entries(filters)) {
      if (!filter) continue;

      const filterType = columnState.find((col) => col.id === columnId)?.filterType;
      const value = record[columnId as keyof CircuitSchemaProps];

      console.log(`Checking filter - Column: ${columnId}, Value: ${value}, Filter:`, filter);

      if (filterType === 'text' && typeof value === 'string' && filter.min) {
        if (value.toLowerCase().includes((filter.min as string).toLowerCase())) {
          console.log(`Text filter match for ${columnId}:`, value);
          return true;
        }
      }

      if (filterType === 'numeric' && typeof value === 'number' && filter.type) {
        const min = filter.min as number | undefined;
        const max = filter.max as number | undefined;
        if (filter.type === 'greaterThan' && min !== undefined && value > min) {
          console.log(`Numeric filter (greaterThan) match for ${columnId}:`, value);
          return true;
        }
        if (filter.type === 'lessThan' && max !== undefined && value < max) {
          console.log(`Numeric filter (lessThan) match for ${columnId}:`, value);
          return true;
        }
        if (
          filter.type === 'between' &&
          min !== undefined &&
          max !== undefined &&
          value >= min &&
          value <= max
        ) {
          console.log(`Numeric filter (between) match for ${columnId}:`, value);
          return true;
        }
      }

      if (filterType === 'select' && filter.type && value === filter.type) {
        console.log(`Select filter match for ${columnId}:`, value);
        return true;
      }

      if (filterType === 'date' && typeof value === 'string' && filter.min) {
        if (moment(value).isSame(moment(filter.min as string), 'day')) {
          console.log(`Date filter match for ${columnId}:`, value);
          return true;
        }
      }

      if (filterType === 'boolean' && filter.min && value === (filter.min === 'true')) {
        console.log(`Boolean filter match for ${columnId}:`, value);
        return true;
      }
    }

    // Check searchQuery
    if (searchQuery) {
      const matchesSearch = [
        'name',
        'brainRegion',
        'scale',
        'specie',
        'publishedIn',
        'buildCategory',
      ].some((field) => {
        const value = record[field as keyof CircuitSchemaProps];
        const matches =
          typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase());
        console.log(`Search check - Field: ${field}, Value: ${value}, Matches: ${matches}`);
        return matches;
      });
      console.log('Search result for', record.name, ':', matchesSearch);
      return matchesSearch;
    }

    console.log('No match found for:', record.name);
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
        rowClassName={(record) => {
          const isMatching = isRowMatching(record);
          console.log(
            'Row class for',
            record.name,
            ':',
            isMatching ? 'matchingRow' : 'nonMatchingRow'
          );
          return isMatching ? styles.matchingRow : styles.nonMatchingRow;
        }}
      />
    </div>
  );
}
