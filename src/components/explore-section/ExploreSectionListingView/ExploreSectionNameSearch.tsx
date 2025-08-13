import { ChangeEvent, RefObject, useEffect, useRef, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { useAtom, useSetAtom } from 'jotai';

import {
  pageNumberAtom,
  previousDataAtom,
  searchStringAtom,
} from '@/state/explore-section/list-view-atoms';
import { useDebouncedCallback } from '@/hooks/hooks';
import { DEFAULT_PAGE_NUMBER } from '@/constants';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type SearchProps = {
  dataKey: string;
  dataType: TExtendedEntitiesTypeDict;
};

export default function ExploreSectionNameSearch({ dataType, dataKey }: SearchProps) {
  const [searchString, setSearchString] = useAtom(searchStringAtom(dataKey ?? ''));

  const searchInputRef: RefObject<HTMLInputElement | null> = useRef(null);
  useEffect(() => searchInputRef?.current?.focus(), []); // Auto-focus on render
  const setPageNumber = useSetAtom(pageNumberAtom(dataKey));

  const setPrevData = useSetAtom(
    previousDataAtom({
      key: dataKey,
      dataType,
    })
  );

  const debouncedUpdateAtom = useDebouncedCallback(
    (searchStr: string) => {
      setPrevData([]);
      setPageNumber(DEFAULT_PAGE_NUMBER);
      setSearchString(searchStr);
    },
    [setPageNumber, setPrevData, setSearchString],
    600
  );

  /* TODO: Remove these effects and local state, they're only needed because lodash's
  debounce can't update the atom for some reason.
  Use atomWithDebounce recipe instead: https://jotai.org/docs/recipes/atom-with-debounce */

  const [searchStringLocal, setSearchStringLocal] = useState(searchString);

  useEffect(() => {
    debouncedUpdateAtom(searchStringLocal);
  }, [searchStringLocal, debouncedUpdateAtom]);

  // "Clear filters" side-effect
  useEffect(() => {
    setSearchStringLocal(searchString);
  }, [searchString, setSearchStringLocal]);

  return (
    <div className="border-neutral-2 focus-within:border-b-primary-8 mx-auto flex w-full max-w-2xl items-center border-b">
      <input
        className="text-primary-7 placeholder:text-neutral-3 w-full bg-transparent py-2"
        style={{ outline: 'unset' }}
        onInput={(e: ChangeEvent<HTMLInputElement>) => setSearchStringLocal(e.target.value)}
        ref={searchInputRef}
        placeholder="Search for resources..."
        type="text"
        value={searchStringLocal}
        aria-label="Search for resources"
      />
      <SearchOutlined className="text-primary-8 py-2" />
    </div>
  );
}
