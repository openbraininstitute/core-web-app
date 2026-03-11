'use client';

import React from 'react';

import { useThreadSearch } from '@/services/ai-agent/hooks';

import styles from './search.module.css';

interface SearchProps {
  onSelectThread: (threadId: string) => void;
}

export default function Search({ onSelectThread }: SearchProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const { results, isLoading, hasQuery } = useThreadSearch(searchQuery);
  const searchRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [searchQuery]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchQuery('');
      }
    };
    if (searchQuery) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  return (
    <div ref={searchRef}>
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        {searchQuery && (
          <button
            type="button"
            className={styles.clearSearch}
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {hasQuery && results && (
        <div className={styles.searchModal}>
          {results.result_list.length === 0 ? (
            <div className={styles.searchEmpty}>No results found</div>
          ) : (
            results.result_list.map((result) => (
              <button
                key={result.message_id}
                type="button"
                className={styles.searchResult}
                onClick={() => {
                  onSelectThread(result.thread_id);
                  setSearchQuery('');
                }}
              >
                <div className={styles.searchResultTitle}>{result.title}</div>
                <div className={styles.searchResultContent}>
                  {result.content.substring(0, 100)}
                  {result.content.length > 100 && '...'}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {isLoading && (
        <div className={styles.searchModal}>
          <div className={styles.searchLoading}>Searching...</div>
        </div>
      )}
    </div>
  );
}
