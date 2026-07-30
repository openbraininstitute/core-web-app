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
        // only the quiet chrome (bg/border/shadow) cross-fades here — never width
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
          // instant press feedback; no layout animation on the button itself
          'transition-transform duration-150 ease-out active:scale-95',
          open ? '' : 'shadow-sm hover:scale-105'
        )}
      >
        <RiSearchLine size={18} />
      </button>

      {/*
       * A single clip wrapper animates `width` (0 → SEARCH_WIDTH) with an
       * ease-out-expo curve and `will-change`, revealing an input that is ALREADY
       * laid out at its full width — so the content never reflows mid-animation
       * (the classic source of the jank). Width is the only layout property that
       * moves, on one element. `motion-reduce` collapses it to an instant change.
       */}
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
