import { Filter } from '@/components/Filter/types';
import { CloseOutlined } from '@ant-design/icons';
import { ColumnType } from 'antd/lib/table';
import { Column } from './FilterControls';
import FilterGroup from '@/components/FilterControls/Filter';

export type ControlPanelProps<T> = {
  children?: React.ReactNode;
  columns: Column<T>[];
  setColumns: (columns: Column<T>[]) => void;
  onClose: () => void;
};

import filter from '@/components/FilterControls/Filter';
import useFilters from '@/components/FilterControls/Filter';

export default function ControlPanel<T>({
  children,
  onClose,
  columns,
  setColumns,
}: ControlPanelProps<T>) {
  const activeColumnsText = `${columns.length} active ${
    columns.length === 1 ? 'column' : 'columns'
  }`;

  const { filters, Filter } = useFilters(columns, setColumns);

  return (
    <div
      data-testid="listing-view-filter-panel"
      className="fixed right-0 top-0 z-10 flex h-full min-h-screen w-[480px] shrink-0 flex-col space-y-4 overflow-y-auto bg-primary-8 p-8"
    >
      <div>
        <button
          type="button"
          onClick={onClose}
          className="float-right text-white"
          aria-label="Close"
        >
          <CloseOutlined />
        </button>
        <span className="flex items-baseline gap-2 text-2xl font-bold text-white">
          Filters
          <small className="bottom-3 ml-5 text-base font-light text-primary-3">
            {activeColumnsText}
          </small>
        </span>

        <p className="mt-4 text-white">
          Use the eye icon to hide/show columns. Select the column titles and tick the checkbox of
          the option(s).
        </p>

        <div className="mt-10 flex flex-col gap-12">
          <Filter columnKey="name" />
          <Filter columnKey="description" />
          <Filter columnKey="objectOfInterest" />
          {children}
        </div>
      </div>

      <div className="sticky bottom-0 left-0 flex w-full items-center justify-between bg-primary-8 px-4 py-6">
        {/* <ClearFilters onClick={clearFilters} /> */}
      </div>

      <button
        onClick={() => {
          console.log('clicked');
          for (const filter of filters) {
            console.log('Applyting filter');
            if (filter.function) filter.function();
          }
        }}
      >
        Apply
      </button>
    </div>
  );
}
