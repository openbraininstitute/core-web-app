import { RiArrowDownSLine } from '@remixicon/react';

import { classNames } from '@/util/utils';

import type { ReactNode } from 'react';

type Props = {
  title: string;
  count: number;
  /** Whether the file on show is one of these. */
  selected?: boolean;
  expanded: boolean;
  onToggle: () => void;
  /** The files, one row each, shown under the pill while it is open. */
  children: ReactNode;
};

/**
 * Files that belong together - a simulation's, its result's - as one pill that
 * opens to list them. Shut over the file on show, it takes that file's
 * selected look, so the open file's group always shows.
 */
export function TaskIOFileGroup({ title, count, selected, expanded, onToggle, children }: Props) {
  const holdsSelection = selected && !expanded;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        title={
          expanded
            ? `Hide the ${title.toLowerCase()} files`
            : `Show the ${title.toLowerCase()} files`
        }
        className={classNames(
          'group flex w-full cursor-pointer flex-nowrap items-center justify-between gap-x-4 rounded-4xl border p-4 transition-colors',
          'shadow-[0_1px_2px_rgba(16,24,40,0.06)]',
          holdsSelection
            ? 'border-transparent bg-[linear-gradient(95.07deg,#003A8C_42.23%,#001026_109.71%)]'
            : 'border-[oklch(0.968_0.007_247.896)] bg-white hover:bg-[oklch(0.968_0.007_247.896)]'
        )}
      >
        <span
          className={classNames(
            'min-w-0 flex-1 truncate text-left font-semibold',
            holdsSelection ? 'text-white' : 'text-primary-9'
          )}
        >
          {title}
        </span>
        <span
          className={classNames(
            'flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs uppercase',
            holdsSelection
              ? 'border-white bg-white text-primary-9'
              : 'border-[oklch(0.968_0.007_247.896)] bg-[oklch(0.929_0.013_255.508)] text-neutral-5'
          )}
        >
          {count}
          <RiArrowDownSLine
            className={classNames('size-4 transition-transform', expanded && 'rotate-180')}
          />
        </span>
      </button>
      {expanded && (
        <div className="border-neutral-2 ml-4 flex flex-col gap-2 border-l pl-3">{children}</div>
      )}
    </div>
  );
}
