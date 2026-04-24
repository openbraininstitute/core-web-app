'use client';

import Fuse from 'fuse.js';
import { useMemo } from 'react';

import { dedupeRanges } from '@/features/task-logs-stream/helpers';

import type { IHighlightRange, ILogEntry, ISearchResult } from '@/features/task-logs-stream/types';

export function useLogSearch({
  entries,
  query,
}: {
  entries: ILogEntry[];
  query: string;
}): ISearchResult {
  return useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || entries.length === 0) {
      return { entries, highlightById: new Map<string, IHighlightRange[]>() };
    }

    const tokens = trimmed.split(/\s+/).flatMap((token) => {
      const normalizedToken = token.trim().toLowerCase();
      return normalizedToken ? [normalizedToken] : [];
    });
    if (tokens.length === 0) {
      return { entries, highlightById: new Map<string, IHighlightRange[]>() };
    }

    const fuse = new Fuse(entries, {
      keys: ['message'],
      includeMatches: true,
      includeScore: false,
      shouldSort: false,
      threshold: 0.3,
      ignoreLocation: true,
      useExtendedSearch: true,
    });

    const highlightById = new Map<string, IHighlightRange[]>();
    for (const token of tokens) {
      const safeToken = token.replaceAll("'", "\\'");
      let tokenResults: ReturnType<typeof fuse.search> = [];
      try {
        tokenResults = fuse.search(`'${safeToken}`);
      } catch {
        tokenResults = [];
      }

      for (const result of tokenResults) {
        const rawRanges = highlightById.get(result.item.id) ?? [];
        for (const match of result.matches ?? []) {
          if (match.key !== 'message') continue;
          for (const [start, end] of match.indices ?? []) {
            rawRanges.push({ start, end });
          }
        }
        highlightById.set(result.item.id, rawRanges);
      }
    }

    for (const entry of entries) {
      const ranges = highlightById.get(entry.id);
      if (!ranges) continue;
      highlightById.set(entry.id, dedupeRanges({ ranges }));
    }

    return { entries, highlightById };
  }, [entries, query]);
}
