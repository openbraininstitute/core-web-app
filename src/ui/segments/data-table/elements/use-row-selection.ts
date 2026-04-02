import { uniqBy } from 'es-toolkit/compat';
import { useAtom } from 'jotai';

import { coreSelectedRowsAtom } from '@/ui/segments/data-table/elements/context';

import type { RowSelectionType, TableRowSelection } from 'antd/es/table/interface';
import type { Key } from 'react';
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
}: {
  dataKey: string;
  selectionType?: RowSelectionType;
  onRowsSelected?: (rows: Array<T>) => void;
}): {
  rowSelection: RowSelection<T>;
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
  onRowSelect: (_keys: Key[], rows: Array<T>) => void;
} {
  const [selectedRows, setSelectedRows] = useAtom(coreSelectedRowsAtom(dataKey));
  const clearSelectedRows = () => setSelectedRows([]);

  const onRowSelect = (_keys: Key[], rows: Array<T>) => {
    setSelectedRows((prevRows) => {
      return uniqBy([...prevRows, ...rows], (r) => r.id);
    });
    onRowsSelected?.(rows);
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
