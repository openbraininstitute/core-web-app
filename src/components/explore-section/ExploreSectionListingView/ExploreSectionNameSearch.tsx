import { ChangeEvent, RefObject, useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { SearchOutlined } from '@ant-design/icons';

import { searchStringAtom } from '@/state/explore-section/list-view-atoms';

import { DataType } from '@/constants/explore-section/list-views';
import { ExploreDataScope } from '@/types/explore-section/application';
import { useDebouncedCallback } from '@/hooks/hooks';

type SearchProps = {
  dataType: DataType;
  dataScope?: ExploreDataScope;
};

export default function ExploreSectionNameSearch({ dataType, dataScope }: SearchProps) {
  const [searchString, setSearchString] = useAtom(searchStringAtom({ dataType, dataScope }));
  const [searchStringLocal, setSearchStringLocal] = useState(searchString);

  const searchInputRef: RefObject<HTMLInputElement> = useRef(null);
  useEffect(() => searchInputRef?.current?.focus(), []); // Auto-focus on render

  // To do use atomWithDebounce pattern: https://jotai.org/docs/recipes/atom-with-debounce
  const debouncedUpdateAtom = useDebouncedCallback(
    (searchStr: string) => setSearchString(searchStr),
    [setSearchString],
    600
  );

  useEffect(() => {
    debouncedUpdateAtom(searchStringLocal);
  }, [searchStringLocal, debouncedUpdateAtom]);

  // "Clear filters" side-effect
  useEffect(() => {
    setSearchStringLocal(searchString);
  }, [searchString, setSearchStringLocal]);

  return (
    <div className="mx-auto flex w-full max-w-2xl items-center border-b border-neutral-2 focus-within:border-b-primary-8">
      <input
        className="w-full bg-transparent py-2 text-primary-7 placeholder:text-neutral-3"
        style={{ outline: 'unset' }}
        onInput={(e: ChangeEvent<HTMLInputElement>) => setSearchStringLocal(e.target.value)}
        ref={searchInputRef}
        placeholder="Search for resources..."
        type="text"
        value={searchStringLocal}
        aria-label="Search for resources"
      />
      <SearchOutlined className="py-2 text-primary-8" />
    </div>
  );
}
