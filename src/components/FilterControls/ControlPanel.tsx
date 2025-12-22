import { CloseOutlined } from '@ant-design/icons';
import { ColumnType } from 'antd/lib/table';
import { classNames } from '@/util/utils';

export type Column<T> = ColumnType<T> & {
  key: string;
};

type ControlPanelProps = {
  children?: React.ReactNode;
  numberOfColumns: number;
  onClose: () => void;
  visible: boolean;
};

export default function ControlPanel({
  visible,
  onClose,
  numberOfColumns,
  children,
}: ControlPanelProps) {
  const activeColumnsText = `${numberOfColumns} active ${
    numberOfColumns === 1 ? 'column' : 'columns'
  }`;

  return (
    <div
      className={classNames(
        'bg-primary-8 fixed top-0 right-0 z-10 z-[9999] flex h-screen w-[480px] shrink-0 flex-col space-y-4 p-8',
        !visible && 'invisible'
      )}
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
          <small className="text-primary-3 bottom-3 ml-5 text-base font-light">
            {activeColumnsText}
          </small>
        </span>

        <p className="mt-4 text-white">
          Use the eye icon to hide/show columns. Select the column titles and tick the checkbox of
          the option(s).
        </p>

        <div className="mt-10 flex flex-col gap-5">{children}</div>
      </div>

      <div className="bg-primary-8 sticky bottom-0 left-0 flex w-full items-center justify-between px-4 py-6">
        {/* <ClearFilters onClick={clearFilters} /> */}
      </div>
    </div>
  );
}
