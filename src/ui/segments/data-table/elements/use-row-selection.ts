import { uniqBy } from 'es-toolkit/compat';
import { useAtom } from 'jotai';
import { type Key, useCallback, useMemo } from 'react';

import { coreSelectedRowsAtom } from '@/ui/segments/data-table/elements/context';

import type { TableProps } from 'antd';
import type { RowSelectionType, TableRowSelection } from 'antd/es/table/interface';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

function areSelectedRowsEqual<T extends { id: string }>(left: T[], right: T[]): boolean {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((row, index) => row.id === right[index]?.id);
}

type RowSelection<T> = Pick<TableRowSelection<T>, 'selectedRowKeys' | 'onChange' | 'type'>;

export type RenderButtonProps<T> = {
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
  dataType: TExtendedEntitiesTypeDict;
};

/** Optional parent-owned row selection. Omit `selectedRows` to use internal atom storage per `dataKey`. */
export type TableRowSelectionProps<T extends { id: string }> = {
  selectedRows?: T[];
  onRowsSelected?: (rows: T[]) => void;
  /** when true, workspace scope changes do not clear row selection */
  keepSelectionOnScopeChange?: boolean;
};

/**
 * Row selection for data tables.
 *
 * **Uncontrolled (default):** omit `selectedRows`. Selection is stored in
 * `coreSelectedRowsAtom(dataKey)` and persists across pagination for that table.
 *
 * **Controlled:** pass `selectedRows` (+ `onRowsSelected`) from a parent component.
 * The hook does not write to the atom in that case.
 */
export function useRowSelection<T extends { id: string }>({
  dataKey,
  selectionType,
  dataSource,
  selectedRows: selectedRowsProp,
  onRowsSelected,
}: {
  dataKey: string;
  selectionType?: RowSelectionType;
  dataSource?: TableProps['dataSource'];
} & TableRowSelectionProps<T>): {
  rowSelection: RowSelection<T>;
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
  onRowSelect: (_keys: Key[], rows: Array<T>) => void;
} {
  const [internalSelectedRows, setInternalSelectedRows] = useAtom(coreSelectedRowsAtom(dataKey));
  const isControlled = selectedRowsProp !== undefined;
  const selectedRows = isControlled ? selectedRowsProp : internalSelectedRows;

  const updateSelectedRows = useCallback(
    (update: T[] | ((previous: T[]) => T[])) => {
      const previous = isControlled ? (selectedRowsProp ?? []) : internalSelectedRows;
      const next = typeof update === 'function' ? update(previous) : update;

      if (areSelectedRowsEqual(previous, next)) {
        return;
      }

      if (isControlled) {
        onRowsSelected?.(next);
        return;
      }

      setInternalSelectedRows(next);
      onRowsSelected?.(next);
    },
    [internalSelectedRows, isControlled, onRowsSelected, selectedRowsProp, setInternalSelectedRows]
  );

  const clearSelectedRows = useCallback(() => {
    updateSelectedRows([]);
  }, [updateSelectedRows]);

  const currentRowIds = useMemo(() => dataSource?.map((row) => row.id), [dataSource]);

  const onRowSelect = useCallback(
    (_keys: Key[], rows: Array<T>) => {
      if (selectionType === 'radio') {
        updateSelectedRows(rows);
        return;
      }

      updateSelectedRows((previousRows) =>
        uniqBy(
          [...previousRows.filter((row) => !currentRowIds?.includes(row.id)), ...rows],
          (row) => row.id
        )
      );
    },
    [currentRowIds, selectionType, updateSelectedRows]
  );

  return {
    onRowSelect,
    rowSelection: {
      selectedRowKeys: selectedRows.map((row) => row.id),
      onChange: onRowSelect,
      type: selectionType,
    },
    selectedRows,
    clearSelectedRows,
  };
}
