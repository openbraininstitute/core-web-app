'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';

import {
  expandedRootElementsAtom,
  flashingAtom,
  lastConfigUpdateAtom,
} from '@/state/config-highlights';
import { computeLiveDiffs } from '@/utils/diff';

const FLASH_DURATION_MS = 2100;

/**
 * Reacts to lastConfigUpdateAtom changes, toggles flashingAtom on for
 * FLASH_DURATION_MS, and auto-expands collapsed blocks that have changes.
 *
 * The flash map itself is derived inside activeFlashesAtom — this hook
 * only controls the on/off timing and block expansion.
 *
 * Mount once in the parent that renders RootElement instances (left.tsx).
 */
export function useConfigUpdateFlashes() {
  const configUpdate = useAtomValue(lastConfigUpdateAtom);
  const setFlashing = useSetAtom(flashingAtom);
  const setExpandedRootElements = useSetAtom(expandedRootElementsAtom);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!configUpdate) return;

    const { oldConfig, newConfig } = configUpdate;
    const diffs = oldConfig ? computeLiveDiffs(oldConfig, newConfig) : [];
    if (diffs.length === 0) return;

    // Auto-expand collapsed blocks that have changes
    const affectedRoots = [...new Set(diffs.map((d) => d.path[0]).filter(Boolean))];
    setExpandedRootElements((prev) => {
      const missing = affectedRoots.filter((r) => !prev.has(r));
      if (missing.length === 0) return prev;
      const next = new Set(prev);
      for (const r of missing) next.add(r);
      return next;
    });

    // Turn flashing on
    setFlashing(true);

    // Turn flashing off after animation duration
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => {
      setFlashing(false);
    }, FLASH_DURATION_MS);

    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [configUpdate, setFlashing, setExpandedRootElements]);
}
