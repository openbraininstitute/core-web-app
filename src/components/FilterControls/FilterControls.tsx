import { type HTMLProps, type PropsWithChildren, useState } from 'react';

import { SettingsIcon } from '@/components/icons/Settings';
import { classNames } from '@/util/utils';

import ControlPanel from './ControlPanel';

export default function FilterControls({
  filtersCount,
  disabled,
  className,
  numberOfColumns,
  children,
}: PropsWithChildren<{
  disabled?: boolean;
  filtersCount: number;
  className?: HTMLProps<HTMLElement>['className'];
  numberOfColumns: number;
}>) {
  const [displayControlPanel, setDisplayControlPanel] = useState(false);

  return (
    <>
      <div className={classNames('flex items-center justify-between gap-5', className)}>
        <div className="inline-flex w-full place-content-end gap-2">
          <button
            className={classNames(
              'border-neutral-2 flex items-center justify-between gap-10 rounded-md border px-2 py-2',
              disabled ? 'cursor-not-allowed bg-neutral-100' : 'bg-white'
            )}
            disabled={disabled}
            type="button"
            aria-label="listing-view-filter-button"
            onClick={() => setDisplayControlPanel(!displayControlPanel)}
          >
            <div className="flex items-center gap-1">
              <span className="bg-primary-8 rounded-sm px-2.5 py-1 text-sm font-bold text-white">
                {filtersCount}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={classNames(
                    'text-sm leading-5 font-bold',
                    disabled ? 'text-primary-8' : 'text-primary-8'
                  )}
                >
                  Filters
                </span>
                <span className="text-neutral-4 text-xs leading-5 font-semibold">
                  {numberOfColumns} active
                  {numberOfColumns === 1 ? ' column' : ' columns'}
                </span>
              </div>
            </div>
            <SettingsIcon className="text-primary-8 h-4 rotate-90" />
          </button>
        </div>
      </div>

      <ControlPanel
        onClose={() => setDisplayControlPanel(false)}
        numberOfColumns={numberOfColumns}
        visible={displayControlPanel}
      >
        {children}
      </ControlPanel>
    </>
  );
}
