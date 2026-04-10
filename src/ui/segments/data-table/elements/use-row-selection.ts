import { uniqBy } from 'es-toolkit/compat';
import { useAtom } from 'jotai';
import { type Key, useMemo } from 'react';

import { coreSelectedRowsAtom } from '@/ui/segments/data-table/elements/context';

import type { TableProps } from 'antd';
import type { RowSelectionType, TableRowSelection } from 'antd/es/table/interface';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type RowSelection<T> = Pick<TableRowSelection<T>, 'selectedRowKeys' | 'onChange' | 'type'>;

export type RenderButtonProps<T> = {
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
  dataType: TExtendedEntitiesTypeDict;
};

export function useRowSelection<T extends { id: string }>({
  dataKey,
  selectionType,
  onRowsSelected,
  dataSource,
}: {
  dataKey: string;
  selectionType?: RowSelectionType;
  onRowsSelected?: (rows: Array<T>) => void;
  dataSource?: TableProps['dataSource'];
}): {
  rowSelection: RowSelection<T>;
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
  onRowSelect: (_keys: Key[], rows: Array<T>) => void;
} {
  const [selectedRows, setSelectedRows] = useAtom(coreSelectedRowsAtom(dataKey));
  const clearSelectedRows = () => setSelectedRows([]);
  const currentRowIds = useMemo(() => {
    return dataSource?.map((r) => r.id);
  }, [dataSource]);

  const onRowSelect = (_keys: Key[], rows: Array<T>) => {
    setSelectedRows((prevRows) => {
      const newRows = uniqBy(
        [...prevRows.filter((r) => !currentRowIds?.includes(r.id)), ...rows],
        (r) => r.id
      );

      onRowsSelected?.(newRows);
      return newRows;
    });
  };

  return {
    onRowSelect,
    rowSelection: {
      selectedRowKeys: selectedRows.map((row: T) => row.id),
      onChange: onRowSelect,
      type: selectionType,
    },
    selectedRows,
    clearSelectedRows,
  };
}
