'use client';

import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';

import {
  activeFlashesAtom,
  expandedRootElementsAtom,
  lastConfigUpdateAtom,
  type ActiveFlash,
} from '@/state/config-highlights';
import { computeLiveDiffs } from '@/utils/diff';

const FLASH_DURATION_MS = 2100;

/** Merge a flash entry into a map, upgrading to 'replace' on type conflict. */
function mergeFlash(
  map: Map<string, { type: 'add' | 'remove' | 'replace' }>,
  key: string,
  type: 'add' | 'remove' | 'replace'
) {
  const existing = map.get(key);
  if (existing && existing.type !== type) {
    map.set(key, { type: 'replace' });
  } else if (!existing) {
    map.set(key, { type });
  }
}

/**
 * Reacts to lastConfigUpdateAtom changes, computes flash maps for ALL
 * affected root elements at once, writes to activeFlashesAtom, and
 * auto-expands collapsed blocks. Replaces the per-instance window
 * CustomEvent listener that was previously in each RootElement.
 *
 * Mount once in the parent that renders RootElement instances (left.tsx).
 */
export function useConfigUpdateFlashes() {
  const configUpdate = useAtomValue(lastConfigUpdateAtom);
  const setActiveFlashes = useSetAtom(activeFlashesAtom);
  const setExpandedRootElements = useSetAtom(expandedRootElementsAtom);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!configUpdate) return;

    const { oldConfig, newConfig } = configUpdate;
    const diffs = oldConfig ? computeLiveDiffs(oldConfig, newConfig) : [];
    if (diffs.length === 0) return;

    // Group diffs by root element (first path segment)
    const byRoot = new Map<string, typeof diffs>();
    for (const d of diffs) {
      const root = d.path[0];
      if (!root) continue;
      const list = byRoot.get(root);
      if (list) list.push(d);
      else byRoot.set(root, [d]);
    }

    // Build flash map for all affected roots at once
    const newFlashes = new Map<string, ActiveFlash>();

    for (const [rootElement, blockDiffs] of byRoot) {
      // Derive root flash type
      const diffTypes = new Set(blockDiffs.map((d) => d.type));
      const rootFlashType: 'add' | 'remove' | 'replace' =
        diffTypes.size > 1 || diffTypes.has('replace')
          ? 'replace'
          : diffTypes.has('add')
            ? 'add'
            : 'remove';

      const entries = new Map<string, { type: 'add' | 'remove' | 'replace' }>();
      const fields = new Map<string, { type: 'add' | 'remove' | 'replace' }>();

      for (const diff of blockDiffs) {
        if (diff.path.length >= 2) {
          mergeFlash(entries, diff.path[1], diff.type);
        }
        if (diff.path.length >= 3) {
          mergeFlash(fields, diff.path[1] + '/' + diff.path[2], diff.type);
        }
        if (diff.path.length === 2) {
          mergeFlash(fields, diff.path[1], diff.type);
        }
      }

      newFlashes.set(rootElement, { rootFlashType, entries, fields });
    }

    // Auto-expand collapsed blocks that have changes
    const affectedRoots = [...byRoot.keys()];
    setExpandedRootElements((prev) => {
      const missing = affectedRoots.filter((r) => !prev.has(r));
      if (missing.length === 0) return prev;
      const next = new Set(prev);
      for (const r of missing) next.add(r);
      return next;
    });

    // Merge new flashes into the atom (preserving unrelated flashes)
    setActiveFlashes((prev) => {
      const merged = new Map(prev);
      for (const [k, v] of newFlashes) merged.set(k, v);
      return merged;
    });

    // Clear flashes after animation duration
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => {
      setActiveFlashes((prev) => {
        const cleaned = new Map(prev);
        for (const k of newFlashes.keys()) cleaned.delete(k);
        return cleaned;
      });
    }, FLASH_DURATION_MS);

    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [configUpdate, setActiveFlashes, setExpandedRootElements]);
}

