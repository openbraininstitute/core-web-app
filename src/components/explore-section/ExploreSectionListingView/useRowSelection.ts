import { Key } from 'react';
import { useAtom } from 'jotai';
import { RowSelectionType, TableRowSelection } from 'antd/es/table/interface';

import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreESHit } from '@/types/explore-section/es';
import { ExploreSectionResource } from '@/types/explore-section/resources';

type RowSelection = Pick<
  TableRowSelection<ExploreESHit<ExploreSectionResource>>,
  'selectedRowKeys' | 'onChange' | 'type'
>;

export type RenderButtonProps = {
  selectedRows: ExploreESHit<ExploreSectionResource>[];
  clearSelectedRows: () => void;
};

export default function useRowSelection({
  dataKey,
  selectionType = 'checkbox',
  onRowsSelected,
}: {
  dataKey: string;
  selectionType?: RowSelectionType;
  onRowsSelected?: (rows: ExploreESHit<ExploreSectionResource>[]) => void;
}): {
  rowSelection: RowSelection;
  selectedRows: ExploreESHit<ExploreSectionResource>[];
  clearSelectedRows: () => void;
} {
  const [selectedRows, setSelectedRows] = useAtom(selectedRowsAtom(dataKey));
  const clearSelectedRows = () => setSelectedRows([]);

  return {
    rowSelection: {
      selectedRowKeys: selectedRows.map(
        ({ _source }: ExploreESHit<ExploreSectionResource>) => _source._self
      ),
      onChange: (_keys: Key[], rows: ExploreESHit<ExploreSectionResource>[]) => {
        setSelectedRows(() => rows);
        onRowsSelected?.(rows);
      },
      type: selectionType,
    },
    selectedRows,
    clearSelectedRows,
  };
}
