import { atom } from 'jotai';
import type { DiffResult } from '@/utils/diff';

/**
 * Highlight descriptor for a single config path change.
 */
export interface ConfigHighlight {
  path: string[]; // e.g., ['initialize', 'circuit', 'duration']
  type: 'add' | 'remove' | 'replace';
}

// ── Consolidated diff state ──────────────────────────────────────────────────

const DEFAULT_EXPANDED = new Set(['info']);

/**
 * All diff-related state that is always set and cleared as a group.
 * Consolidating these into one atom eliminates the "clear all diff state"
 * pattern that was previously repeated in 4+ places with 4 individual setters.
 */
export interface DiffState {
  highlights: ConfigHighlight[];
  diffs: DiffResult[];
  oldConfig: Record<string, any> | null;
  expandedRootElements: Set<string>;
}

const IDLE_DIFF_STATE: DiffState = {
  highlights: [],
  diffs: [],
  oldConfig: null,
  expandedRootElements: DEFAULT_EXPANDED,
};

export const diffStateAtom = atom<DiffState>(IDLE_DIFF_STATE);

/** Reset diff state to idle in one call. */
export const clearDiffStateAtom = atom(null, (_get, set) => {
  set(diffStateAtom, IDLE_DIFF_STATE);
});

// ── Derived read-only atoms (keep consumer imports stable) ───────────────────

export const configHighlightsAtom = atom((get) => get(diffStateAtom).highlights);
export const configDiffsAtom = atom((get) => get(diffStateAtom).diffs);
export const oldConfigAtom = atom((get) => get(diffStateAtom).oldConfig);
export const expandedRootElementsAtom = atom(
  (get) => get(diffStateAtom).expandedRootElements,
  (_get, set, update: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    set(diffStateAtom, (prev) => ({
      ...prev,
      expandedRootElements: typeof update === 'function' ? update(prev.expandedRootElements) : update,
    }));
  },
);

// ── Independent UI atoms (not part of the diff group) ────────────────────────

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
  /** Field-level flashes: Map of "entryName/fieldName" -> FlashEntry (or just "fieldName" for single blocks) */
  fields: Map<string, FlashEntry>;
}

export const activeFlashesAtom = atom<Map<string, ActiveFlash>>(new Map());

/**
 * Atom to track which message has the diff view active
 * Only one message can have diffs shown at a time
 * Value is the message ID, or null if no diffs are shown
 */
export const activeDiffMessageIdAtom = atom<string | null>(null);

/**
 * Counter that increments each time a new message is submitted.
 * Used by CollapsibleMessage to cancel pending restore confirmations.
 */
export const messageSubmittedCounterAtom = atom(0);

/**
 * Data needed to show/toggle diffs from the diff bar.
 * Populated by message-item when a message with editstate calls is ready.
 */
export interface DiffBarData {
  messageId: string;
  accumulatedDiffs: DiffResult[];
  oldConfig: Record<string, any> | null;
}

/**
 * Atom to store precomputed diff data for the sticky diff bar.
 * When non-null, the diff bar is visible above the chat input.
 * Cleared when the user dismisses the bar or sends a new message.
 */
export const diffBarDataAtom = atom<DiffBarData | null>(null);

/**
 * Atom to hold a config that should be applied to the live atoms.
 * Set by handleConfirmRestore, consumed by left.tsx to call resetConfig.
 * Cleared after consumption.
 */
export const pendingRestoreConfigAtom = atom<Record<string, any> | null>(null);

/**
 * When true, the aiConfig auto-apply effect in left.tsx is suppressed.
 * Set during restore preview so configStateAtom can hold the preview config
 * without it being immediately applied to the live atoms.
 */
export const restorePreviewActiveAtom = atom(false);

/**
 * Tracks which message ID currently owns the restore preview.
 * When a new message triggers "Restore State", it writes its ID here.
 * Other CollapsibleMessage instances react by cancelling their pending
 * confirmation (equivalent of the user clicking "No").
 */
export const restorePreviewMessageIdAtom = atom<string | null>(null);


/**
 * Atom written by chat.ts when an editstate tool call produces a new config.
 * A single top-level hook (useConfigUpdateFlashes) reacts to changes and
 * computes flash animations + auto-expands affected blocks, replacing the
 * old window CustomEvent approach.
 *
 * Bumping the counter ensures Jotai triggers subscribers even when the same
 * old/new pair is written twice in a row (e.g. rapid undo/redo).
 */
export interface ConfigUpdate {
  oldConfig: Record<string, unknown> | null;
  newConfig: Record<string, unknown>;
  counter: number;
}

export const lastConfigUpdateAtom = atom<ConfigUpdate | null>(null);
