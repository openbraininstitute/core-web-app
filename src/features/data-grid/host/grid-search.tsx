'use client';

import { RiCloseLine, RiSearchLine } from '@remixicon/react';
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { useDebouncedCallback } from '@/hooks/hooks';
import { cn } from '@/utils/css-class';

export interface GridSearchProps {
  onSearch: (text: string) => void;
  openOnMount?: boolean;
  className?: string;
}

/**
 * The listing quick-search — the legacy data-table search, enhanced: a round search
 * button that expands into a rounded-full pill input with a live clear affordance.
 * Debounced text is pushed to the grid store's quick filter via {@link onSearch}.
 */
export function GridSearch({ onSearch, openOnMount = false, className }: GridSearchProps) {
  const [open, setOpen] = useState(openOnMount);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = useDebouncedCallback((t: string) => onSearch(t), [onSearch], 300);

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
        'flex min-w-0 items-center transition-all duration-300 ease-in-out',
        open && 'w-full max-w-96 rounded-full border border-gray-100 bg-white shadow-sm',
        className
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close search' : 'Open search'}
        className={cn(
          'flex size-10 shrink-0 items-center justify-center bg-white text-primary-8 transition-all duration-300 ease-in-out',
          open
            ? 'rounded-l-full'
            : 'rounded-full shadow-sm hover:scale-105 hover:shadow-md active:scale-95'
        )}
      >
        <RiSearchLine size={18} />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          open ? 'w-full min-w-52 opacity-100' : 'w-0 opacity-0'
        )}
      >
        <div className="flex h-10 w-full items-center rounded-r-full bg-white pr-1.5">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Search for entities…"
            aria-label="Search"
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
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-primary-8 hover:text-white"
            >
              <RiCloseLine size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
