import { HTMLProps, PropsWithChildren, useState } from 'react';
import ControlPanel, { Column } from './ControlPanel';
import SettingsIcon from '@/components/icons/Settings';
import { classNames } from '@/util/utils';

export default function FilterControls<T extends { [key: string]: any }>({
  filtersCount,
  disabled,
  className,
  columns,
  children,
}: PropsWithChildren<{
  disabled?: boolean;
  filtersCount: number;
  className?: HTMLProps<HTMLElement>['className'];
  columns: Column<T>[];
}>) {
  const [displayControlPanel, setDisplayControlPanel] = useState(false);

  return (
    <>
      <div className={classNames('flex items-center justify-between gap-5 py-5', className)}>
        <div className="inline-flex w-full place-content-end gap-2">
          <button
            className={classNames(
              'flex items-center justify-between gap-10 rounded-md border border-neutral-2 px-2 py-2',
              disabled ? 'cursor-not-allowed bg-neutral-100' : 'bg-white'
            )}
            disabled={disabled}
            type="button"
            aria-label="listing-view-filter-button"
            onClick={() => setDisplayControlPanel(!displayControlPanel)}
          >
            <div className="flex items-center gap-1">
              <span className="rounded bg-primary-8 px-2.5 py-1 text-sm font-bold text-white">
                {filtersCount}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={classNames(
                    'text-sm font-bold leading-5',
                    disabled ? 'text-primary-8' : 'text-primary-8'
                  )}
                >
                  Filters
                </span>
                <span className="text-xs font-semibold leading-5 text-neutral-4">
                  <>
                    {columns.length} active
                    {columns.length === 1 ? ' column' : ' columns'}
                  </>
                </span>
              </div>
            </div>
            <SettingsIcon className="h-4 rotate-90 text-primary-8" />
          </button>
        </div>
      </div>

      <ControlPanel
        onClose={() => setDisplayControlPanel(false)}
        columns={columns}
        visible={displayControlPanel}
      >
        {children}
      </ControlPanel>
    </>
  );
}
