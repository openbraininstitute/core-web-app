import { Key } from 'react';
import { useAtom } from 'jotai';
import { RowSelectionType, TableRowSelection } from 'antd/es/table/interface';

import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreESHit } from '@/types/explore-section/es';
import { ExploreSectionResource } from '@/types/explore-section/resources';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { EntityTypeValue } from '@/api/entitycore/types';

type RowSelection<T> = Pick<TableRowSelection<T>, 'selectedRowKeys' | 'onChange' | 'type'>;

export type RenderButtonProps<T> = {
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
  dataType: EntityTypeValue;
};

export default function useRowSelection<T extends { id: string }>({
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
  const [selectedRows, setSelectedRows] = useAtom(selectedRowsAtom(dataKey));
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
