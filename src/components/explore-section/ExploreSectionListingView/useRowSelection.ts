import { RowSelectionType, TableRowSelection } from 'antd/es/table/interface';
import { useAtom } from 'jotai';
import { Key } from 'react';
import noop from 'lodash/noop';

import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';
import { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type RowSelection<T> = Pick<TableRowSelection<T>, 'selectedRowKeys' | 'onChange' | 'type'>;

export type RenderButtonProps<T> = {
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
  dataType: TExtendedEntitiesTypeDict;
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
  onRowSelect: (_keys: Key[], rows: Array<T>) => void;
} {
  const [selectedRows, setSelectedRows] = useAtom(selectedRowsAtom(dataKey));
  const clearSelectedRows = () => setSelectedRows([]);

  if (!selectionType && !onRowsSelected) {
    return {
      rowSelection: undefined,
      selectedRows: [],
      clearSelectedRows: noop,
      onRowSelect: noop,
    };
  }

  const onRowSelect = (_keys: Key[], rows: Array<T>) => {
    setSelectedRows(() => rows);
    onRowsSelected?.(rows);
  };

  return {
    onRowSelect,
    rowSelection: {
      selectedRowKeys: selectedRows.map((row: T) => row.id),
      onChange: onRowSelect,
      type: selectionType ?? 'checkbox',
    },
    selectedRows,
    clearSelectedRows,
  };
}
