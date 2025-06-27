import CIRCUITS_COLUMNS, { SingleColumnContent } from '../CIRCUITS_COLUMNS';

import { CloseIcon, EyeIcon } from '@/components/icons';
import { classNames } from '@/util/utils';

export function SingleFilterItem({
  title,
  id,
  isColumnActive,
  setColumnVisibility,
}: {
  title: string;
  id: string;
  isColumnActive: boolean;
  setColumnVisibility: (columnId: string) => void;
}) {
  return (
    <div className="w-full">
      <header className="flex w-full flex-row items-center justify-between">
        <button
          type="button"
          onClick={() => setColumnVisibility(id)}
          className="flex h-6 w-6 w-full items-center justify-between text-white"
        >
          <EyeIcon
            className={classNames('h-3 w-3', isColumnActive ? 'opacity-100' : 'opacity-60')}
          />
        </button>
        <div className="text-lg font-semibold text-white">{title}</div>
      </header>
    </div>
  );
}

export default function CircuitsFilterPanel({
  isActive = true,
  toggle,
  totalColumns,
  toggleColumnVisibility,
}: {
  isActive?: boolean;
  toggle?: () => void;
  totalColumns: number;
  toggleColumnVisibility: (columnKey: string) => void;
}) {
  return (
    <div
      className={classNames(
        'bg-primary-8 transition-right fixed top-0 z-10 flex h-screen w-[480px] shrink-0 flex-col space-y-4 overflow-y-auto pt-6 pr-16 pl-8 duration-500 ease-in-out',
        isActive ? 'right-0' : 'right-[-480px]'
      )}
    >
      <header className="flex w-full flex-row items-center justify-between">
        <div className="text-xl font-semibold">
          <div className="text-white">Filters</div>
          <div className="text-primary-2">{totalColumns} active columns</div>
        </div>
        <div>
          <button
            type="button"
            onClick={toggle}
            className="flex h-6 w-6 items-center justify-center text-white"
            aria-label="Close filters panel"
          >
            <CloseIcon iconColor="white" />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-y-4">
        {CIRCUITS_COLUMNS.map((column: SingleColumnContent) => {
          const isColumnActive = column.id ? totalColumns > 0 : false;
          return (
            <SingleFilterItem
              id={column.id}
              key={column.id}
              title={column.title}
              isColumnActive={isColumnActive}
              setColumnVisibility={toggleColumnVisibility}
            />
          );
        })}
      </div>
    </div>
  );
}
