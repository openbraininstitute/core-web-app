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

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? <mark key={i}>{part}</mark> : part
    );
  };

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
          {results.resultList.length === 0 ? (
            <div className={styles.searchEmpty}>No results found</div>
          ) : (
            results.resultList.map((result) => (
              <button
                key={result.messageId}
                type="button"
                className={styles.searchResult}
                onClick={() => {
                  onSelectThread(result.threadId);
                  setSearchQuery('');
                }}
              >
                <div className={styles.searchResultTitle}>
                  {highlightText(result.title, searchQuery)}
                </div>
                <div className={styles.searchResultContent}>
                  {highlightText(
                    result.content.substring(0, 100) + (result.content.length > 100 ? '...' : ''),
                    searchQuery
                  )}
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
