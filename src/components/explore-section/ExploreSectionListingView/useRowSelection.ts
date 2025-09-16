import { Key } from 'react';
import { useAtom } from 'jotai';
import { RowSelectionType, TableRowSelection } from 'antd/es/table/interface';

import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';
import { DataType } from '@/constants/explore-section/list-views';

type RowSelection<T> = Pick<TableRowSelection<T>, 'selectedRowKeys' | 'onChange' | 'type'>;

export type RenderButtonProps<T> = {
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
  dataType: DataType;
};

export default function useRowSelection<T extends { id: string }>({
  dataKey,
  selectionType,
  onRowsSelected,
}: {
  dataKey: string;
  selectionType?: RowSelectionType;
  onRowsSelected?: (rows: Array<T>) => void;
}): {
  rowSelection: RowSelection<T> | undefined;
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
} {
  const [selectedRows, setSelectedRows] = useAtom(selectedRowsAtom(dataKey));
  const clearSelectedRows = () => setSelectedRows([]);

  if (!selectionType && !onRowsSelected) {
    return {
      rowSelection: undefined,
      selectedRows: [],
      clearSelectedRows: () => {},
    };
  }

  return {
    rowSelection: {
      selectedRowKeys: selectedRows.map((row: T) => row.id),
      onChange: (_keys: Key[], rows: Array<T>) => {
        setSelectedRows(() => rows);
        onRowsSelected?.(rows);
      },
      type: selectionType ?? 'checkbox',
    },
    selectedRows,
    clearSelectedRows,
  };
}
