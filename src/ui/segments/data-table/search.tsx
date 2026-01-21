import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { useAtom, useSetAtom } from 'jotai';
import { type ChangeEvent, type ComponentProps, useDeferredValue, useRef, useState } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DEFAULT_PAGE_NUMBER } from '@/constants';
import {
  corePageNumberAtom,
  coreSearchStringAtom,
  useDataListStateSnapshotActions,
} from '@/ui/segments/data-table/elements/context';
import { cn } from '@/utils/css-class';

type SearchProps = {
  dataKey: string;
  dataType: TExtendedEntitiesTypeDict;
  className?: ComponentProps<'div'>['className'];
};

export function Search({ dataKey, dataType, className }: SearchProps) {
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const deferredSearchInput = useDeferredValue(searchInput);
  const { sync: runStorageSync } = useDataListStateSnapshotActions({
    dataKey,
    dataType,
  });
  const [searchString, setSearchString] = useAtom(coreSearchStringAtom(dataKey));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const setPageNumber = useSetAtom(corePageNumberAtom(dataKey));

  // sync to atom when deferredSearchInput changes:
  // Note: this happens during render — so no useEffect required.
  if (searchString !== deferredSearchInput) {
    setPageNumber(DEFAULT_PAGE_NUMBER);
    setSearchString(deferredSearchInput);
    runStorageSync({ Search: deferredSearchInput, Page: DEFAULT_PAGE_NUMBER });
  }

  const handleToggleSearch = (): void => {
    if (isSearchOpen) {
      setSearchInput('');
      setIsSearchOpen(false);
    } else {
      setIsSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchInput(e.target.value);
  };

  const handleClearSearch = (): void => {
    if (searchInput === '') {
      setIsSearchOpen(false);
      return;
    }
    setSearchInput('');
    setPageNumber(DEFAULT_PAGE_NUMBER);
    setSearchString('');
    runStorageSync({ Search: '', Page: DEFAULT_PAGE_NUMBER });
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') {
      handleToggleSearch();
    }
  };

  return (
    <div
      className={cn('flex items-center justify-start max-w-112.5', className, {
        'border border-gray-100 rounded-full shadow-sm': isSearchOpen,
      })}
    >
      <div className="flex w-full items-center">
        <button
          type="button"
          onClick={handleToggleSearch}
          className={cn(
            'focus:ring-primary-9 flex h-12 w-12 items-center justify-center bg-white transition-all duration-300 ease-in-out focus:ring-0 focus:outline-none',
            {
              'rounded-full shadow-md hover:scale-105 hover:shadow-lg active:scale-95':
                !isSearchOpen,
              'rounded-l-full shadow-none': isSearchOpen,
            }
          )}
          aria-label={isSearchOpen ? 'Close search' : 'Open search'}
        >
          <SearchOutlined className="text-primary-9 text-lg" />
        </button>

        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            { 'w-full min-w-60 opacity-100': isSearchOpen },
            { 'w-0 opacity-0': !isSearchOpen }
          )}
        >
          <div className="border-neutral-2 flex h-12 w-full items-center rounded-r-full border-l-0 bg-white">
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Search for entities..."
              className={cn(
                'text-primary-9 w-full bg-transparent px-4 py-2 font-bold focus:outline-none',
                'placeholder:text-neutral-3 placeholder:font-light'
              )}
              aria-label="Search input"
            />

            <button
              type="button"
              onClick={handleClearSearch}
              className={cn(
                'bg-neutral-1 text-neutral-4 hover:bg-primary-9 focus:ring-primary-9 mr-2 flex items-center justify-center ',
                'rounded-full p-1.5 transition-colors duration-200 hover:text-white focus:ring-1 focus:outline-none'
              )}
              aria-label="Clear search"
            >
              <CloseOutlined className="text-[10px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
