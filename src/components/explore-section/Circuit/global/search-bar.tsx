'use client';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import { CloseOutlined, SearchOutlined } from '@ant-design/icons';

type SearchBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
};

export default function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClose = useCallback(() => {
    setSearchOpen(false);
    onSearchChange('');
  }, [onSearchChange]);

  const handleOpen = () => {
    setSearchOpen(true);
  };

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [searchOpen, handleClose]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="relative flex flex-row items-center">
      <span className="text-primary-9 mr-2 block text-base">Search:</span>
      <div
        className="relative flex h-10 flex-row items-center rounded-4xl border border-solid border-gray-200 bg-white transition-all duration-500 ease-out"
        style={{
          width: searchOpen ? 400 : 36,
          paddingLeft: searchOpen ? 10 : 0,
        }}
      >
        {searchOpen ? (
          <div className="relative flex w-full flex-row justify-between">
            <input
              type="text"
              placeholder="Search circuits by name or brain region..."
              value={searchQuery}
              onChange={handleChange}
              id="search-input"
              aria-label="Search circuits"
              ref={inputRef}
              className="text-primary-9 w-full rounded-none bg-transparent py-2 text-base font-normal placeholder:font-semibold placeholder:text-gray-400 focus:border-none focus:outline-none active:border-none active:outline-none"
            />

            <CloseOutlined
              onClick={handleClose}
              className="relative right-[10px] h-auto w-3.5 cursor-pointer text-lg text-gray-400"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={handleOpen}
            className="relative flex h-full w-full items-center justify-center"
            aria-label="Open search bar"
            name="search-button"
          >
            <SearchOutlined className="text-primary-9 relative h-auto w-4 cursor-pointer text-lg" />
          </button>
        )}
      </div>
    </div>
  );
}
