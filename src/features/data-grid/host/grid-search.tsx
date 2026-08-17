'use client';

import { RiCloseLine, RiSearchLine } from '@remixicon/react';
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { GRID_ICON_BUTTON_ACTIVE_CLASS } from '@/features/data-grid/react/molecules-theme';
import { useDebouncedCallback } from '@/hooks/hooks';
import { cn } from '@/utils/css-class';

export interface IGridSearchProps {
  onSearch: (text: string) => void;
  openOnMount?: boolean;
  className?: string;
  /** Current term from the grid store, including one hydrated from session storage. */
  value?: string;
}

/**
 * The listing free-text search: a round button that expands into a pill input with a
 * clear affordance. Debounced text is pushed to the grid store's free-text search via
 * {@link onSearch}.
 */
export function GridSearch({ onSearch, openOnMount = false, className, value }: IGridSearchProps) {
  const [open, setOpen] = useState(openOnMount || Boolean(value));
  const [text, setText] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = useDebouncedCallback((t: string) => onSearch(t), [onSearch], 300);

  // Adopt store-driven changes (hydration on a controller swap, `resetState`). The echo
  // of this input's own commit is a same-value set that React bails out of.
  useEffect(() => {
    if (value === undefined) return;
    setText(value);
    if (value) setOpen(true);
  }, [value]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const toggle = () => {
    if (open) {
      if (text) {
        setText('');
        commit.cancel();
        onSearch('');
      }
      setOpen(false);
    } else {
      setOpen(true);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    commit(e.target.value);
  };

  const clear = () => {
    setText('');
    commit.cancel();
    onSearch('');
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') toggle();
  };

  return (
    <div
      className={cn(
        'flex min-w-0 items-center rounded-full border transition-[background-color,border-color,box-shadow] duration-200 ease-out',
        open ? 'border-gray-100 bg-white shadow-sm' : 'border-transparent',
        className
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close search' : 'Open search'}
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-primary-8',
          'transition-transform duration-150 ease-out active:scale-95',
          open ? '' : 'shadow-sm hover:scale-105'
        )}
      >
        <RiSearchLine size={18} />
      </button>

      {/* Clip wrapper: animating only its width reveals an input already laid out at
        full width, so the content never reflows mid-animation. */}
      <div
        className={cn(
          'overflow-hidden opacity-0 [transition:width_360ms_cubic-bezier(0.22,1,0.36,1),opacity_220ms_ease-out]',
          'will-change-[width] motion-reduce:transition-none',
          open ? 'w-64 opacity-100' : 'w-0'
        )}
        aria-hidden={!open}
      >
        <div className="flex h-10 w-64 items-center rounded-r-full bg-white pr-1.5">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Search for entities…"
            aria-label="Search"
            tabIndex={open ? 0 : -1}
            className={cn(
              'w-full bg-transparent px-2 py-2 font-medium text-primary-9 outline-none',
              'placeholder:font-light placeholder:text-gray-400'
            )}
          />
          {text && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500',
                GRID_ICON_BUTTON_ACTIVE_CLASS
              )}
            >
              <RiCloseLine size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
