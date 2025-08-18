import { Key } from 'react';
import { useAtom } from 'jotai';
import { RowSelectionType, TableRowSelection } from 'antd/es/table/interface';

import { coreSelectedRowsAtom } from '@/ui/segments/data-table/elements/context';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type RowSelection<T> = Pick<TableRowSelection<T>, 'selectedRowKeys' | 'onChange' | 'type'>;

export type RenderButtonProps<T> = {
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
  dataType: TExtendedEntitiesTypeDict;
};

export function useRowSelection<T extends { id: string }>({
  dataKey,
  selectionType = 'checkbox',
  onRowsSelected,
}: {
  dataKey: string;
  selectionType?: RowSelectionType;
  onRowsSelected?: (rows: Array<T>) => void;
}): {
  rowSelection: RowSelection<T>;
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
} {
  const [selectedRows, setSelectedRows] = useAtom(coreSelectedRowsAtom(dataKey));
  const clearSelectedRows = () => setSelectedRows([]);

  return {
    rowSelection: {
      selectedRowKeys: selectedRows.map((row: T) => row.id),
      onChange: (_keys: Key[], rows: Array<T>) => {
        setSelectedRows(() => rows);
        onRowsSelected?.(rows);
      },
      type: selectionType,
    },
    selectedRows,
    clearSelectedRows,
  };
}
