'use client';

import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

export type SearchBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
};

export default function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClose = () => {
    setSearchOpen(false);
  };

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="relative flex flex-row items-center">
      <span className="mr-2 block text-base text-primary-9">Search:</span>
      <div
        className="relative flex h-10 flex-row items-center overflow-hidden rounded-full bg-white transition-all duration-500 ease-out"
        style={{
          width: searchOpen ? 400 : 36,
          paddingLeft: searchOpen ? 10 : 0,
        }}
      >
        {searchOpen ? (
          <div className="relative flex w-full flex-row justify-between">
            <Input
              type="text"
              placeholder="Search circuits by name or brain region..."
              value={searchQuery}
              onChange={handleChange}
              id="search-input"
              aria-label="Search circuits"
              className="w-full rounded-none border-none bg-transparent py-2 text-base font-normal text-primary-9 placeholder:font-semibold placeholder:text-gray-400 focus:border-none focus:bg-transparent focus:outline-none active:border-none active:bg-transparent active:outline-none"
            />

            <CloseOutlined
              onClick={handleClose}
              className="relative right-[10px] h-auto w-3.5 cursor-pointer text-lg text-gray-400"
            />
          </div>
        ) : (
          <div className="relative flex h-full w-full items-center justify-center">
            <SearchOutlined
              onClick={() => setSearchOpen(true)}
              className="relative h-auto w-4 cursor-pointer text-lg text-primary-9"
            />
          </div>
        )}
      </div>
    </div>
  );
}
