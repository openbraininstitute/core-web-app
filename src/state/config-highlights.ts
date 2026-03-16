import { atom } from 'jotai';
import type { DiffResult } from '@/utils/diff';

/**
 * Atom to track which config paths should be highlighted
 * Used by AI assistant to communicate diffs to the config UI
 */
export interface ConfigHighlight {
  path: string[]; // e.g., ['initialize', 'circuit', 'duration']
  type: 'add' | 'remove' | 'replace';
}

export const configHighlightsAtom = atom<ConfigHighlight[]>([]);

/**
 * Atom to store the full diff results for detailed field-level comparisons
 * Used to show old vs new values in the middle panel
 */
export const configDiffsAtom = atom<DiffResult[]>([]);

/**
 * Atom to store the old config state before changes (for showing old values)
 * Used to display previous values for modified fields
 */
export const oldConfigAtom = atom<Record<string, any> | null>(null);

/**
 * Atom to control which root element is selected/expanded in the scan config UI
 * Used by AI assistant to programmatically expand blocks
 */
export const selectedRootElementAtom = atom<string>('info');

/**
 * Atom to control whether the middle panel is in editing mode
 * Used by AI assistant to show the config editor when expanding blocks
 */
export const editingAtom = atom<boolean>(true);

/**
 * Atom to track which root elements should be expanded (for multi-expand support)
 * Used by AI assistant to expand multiple blocks simultaneously when viewing diffs
 */
export const expandedRootElementsAtom = atom<Set<string>>(new Set(['info']));

/**
 * Atom to track which child entry should be selected within a dictionary block
 * Used to control which entry is shown in the middle panel
 */
export const selectedEntryAtom = atom<string>('');

/**
 * Atom to track active flash animations.
 * Map of rootElement -> { rootFlashType, entries }
 * Both parent and child components read from this atom.
 * Presence in the map = should flash. Removal = stop flashing.
 * No TTL checks — the event handler sets a timeout to remove the entry.
 */
export interface FlashEntry {
  type: 'add' | 'remove' | 'replace';
}

export interface ActiveFlash {
  rootFlashType: 'add' | 'remove' | 'replace';
  entries: Map<string, FlashEntry>;
}

export const activeFlashesAtom = atom<Map<string, ActiveFlash>>(new Map());

/**
 * Atom to track which message has the diff view active
 * Only one message can have diffs shown at a time
 * Value is the message ID, or null if no diffs are shown
 */
export const activeDiffMessageIdAtom = atom<string | null>(null);
