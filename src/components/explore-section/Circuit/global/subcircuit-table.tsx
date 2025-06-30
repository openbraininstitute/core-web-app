'use client';

import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table/interface';
import moment from 'moment';
import { Key, useCallback, useMemo } from 'react';
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
  // HELPER FUNCTION TO CHECK IF A SUBCIRCUIT MATCHES FILTERS
  const matchesFilters = useCallback(
    (subCircuit: CircuitSchemaProps) => {
      let matches = true;

      // Apply column filters
      Object.entries(filters).forEach(([columnId, filter]) => {
        if (!filter) return;

        const filterType = columnState.find((col) => col.id === columnId)?.filterType;
        const value = subCircuit[columnId as keyof CircuitSchemaProps];

        let currentMatch = false;
        if (filterType === 'numeric' && typeof value === 'number' && filter.type) {
          const min = filter.min as number | undefined;
          const max = filter.max as number | undefined;
          if (filter.type === 'greaterThan' && min !== undefined) {
            currentMatch = value > min;
          } else if (filter.type === 'lessThan' && max !== undefined) {
            currentMatch = value < max;
          } else if (filter.type === 'between' && min !== undefined && max !== undefined) {
            currentMatch = value >= min && value <= max;
          }
        } else if (filterType === 'text' && typeof value === 'string' && filter.min) {
          currentMatch = value.toLowerCase().includes((filter.min as string).toLowerCase());
        } else if (filterType === 'select' && filter.type) {
          currentMatch = value === filter.type;
        } else if (filterType === 'date' && typeof value === 'string' && filter.min) {
          currentMatch = moment(value).isSame(moment(filter.min as string), 'day');
        } else if (filterType === 'boolean' && filter.min) {
          currentMatch = value === (filter.min === 'true');
        }

        matches = matches && currentMatch;
      });

      // Apply search query
      if (searchQuery) {
        matches =
          matches &&
          ['name', 'brainRegion', 'scale', 'specie', 'publishedIn', 'buildCategory'].some(
            (field) => {
              const value = subCircuit[field as keyof CircuitSchemaProps];
              return (
                typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())
              );
            }
          );
      }

      return matches;
    },
    [filters, searchQuery, columnState]
  );

  // HELPER FUNCTION TO CHECK IF A SUBCIRCUIT OR ITS DESCENDANTS MATCH
  const hasMatchingSubcircuit = useCallback(
    (subCircuit: CircuitSchemaProps): boolean => {
      if (matchesFilters(subCircuit)) return true;
      if (!subCircuit.subcircuits || subCircuit.subcircuits.length === 0) return false;
      return subCircuit.subcircuits.some((sub) => hasMatchingSubcircuit(sub));
    },
    [matchesFilters]
  );

  // FILTER SUBCIRCUITS
  const filteredSubcircuits = useMemo(() => {
    if (!circuit.subcircuits) return [];
    return circuit.subcircuits
      .filter((sub) => {
        const subMatches = matchesFilters(sub);
        const hasMatchingSub = hasMatchingSubcircuit(sub);
        return subMatches || hasMatchingSub;
      })
      .map((sub) => ({
        ...sub,
        isNonMatchingParent: !matchesFilters(sub) && hasMatchingSubcircuit(sub),
      }));
  }, [circuit.subcircuits, matchesFilters, hasMatchingSubcircuit]);

  const renderSubcircuits = (subCircuit: CircuitSchemaProps) =>
    subCircuit.subcircuits && subCircuit.subcircuits.length > 0 ? (
      <SubcircuitTable
        circuit={subCircuit}
        columns={columns}
        expandedRowKeys={expandedRowKeys}
        onExpand={onExpand}
        filters={filters}
        searchQuery={searchQuery}
        columnState={columnState}
      />
    ) : null;

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
        dataSource={filteredSubcircuits}
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
          record.isNonMatchingParent ? styles.nonMatchingRow : styles.matchingRow
        }
      />
    </div>
  );
}
