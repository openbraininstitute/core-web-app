import { atom } from 'jotai';
import { computeLiveDiffs, type DiffResult } from '@/utils/diff';

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

/**
 * When true, flash animations are visible. Set to true when a config update
 * arrives, set to false after FLASH_DURATION_MS. The flash map itself is
 * derived from lastConfigUpdateAtom — no need to store it separately.
 */
export const flashingAtom = atom(false);

const EMPTY_FLASHES = new Map<string, ActiveFlash>();

/** Merge a flash entry into a map, upgrading to 'replace' on type conflict. */
function mergeFlash(
  map: Map<string, FlashEntry>,
  key: string,
  type: 'add' | 'remove' | 'replace',
) {
  const existing = map.get(key);
  if (existing && existing.type !== type) {
    map.set(key, { type: 'replace' });
  } else if (!existing) {
    map.set(key, { type });
  }
}

/**
 * Derived atom: computes the flash map from lastConfigUpdateAtom when
 * flashingAtom is true. Returns an empty map when flashing is off.
 * Consumers read this exactly as before — the interface is unchanged.
 */
export const activeFlashesAtom = atom<Map<string, ActiveFlash>>((get) => {
  const isFlashing = get(flashingAtom);
  if (!isFlashing) return EMPTY_FLASHES;

  const configUpdate = get(lastConfigUpdateAtom);
  if (!configUpdate) return EMPTY_FLASHES;

  const { oldConfig, newConfig } = configUpdate;
  const diffs = oldConfig ? computeLiveDiffs(oldConfig, newConfig) : [];
  if (diffs.length === 0) return EMPTY_FLASHES;

  // Group diffs by root element (first path segment)
  const byRoot = new Map<string, typeof diffs>();
  for (const d of diffs) {
    const root = d.path[0];
    if (!root) continue;
    const list = byRoot.get(root);
    if (list) list.push(d);
    else byRoot.set(root, [d]);
  }

  // Build flash map for all affected roots
  const flashes = new Map<string, ActiveFlash>();

  for (const [rootElement, blockDiffs] of byRoot) {
    const diffTypes = new Set(blockDiffs.map((d) => d.type));
    const rootFlashType: 'add' | 'remove' | 'replace' =
      diffTypes.size > 1 || diffTypes.has('replace')
        ? 'replace'
        : diffTypes.has('add')
          ? 'add'
          : 'remove';

    const entries = new Map<string, FlashEntry>();
    const fields = new Map<string, FlashEntry>();

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

    flashes.set(rootElement, { rootFlashType, entries, fields });
  }

  return flashes;
});

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

/**
 * Snapshot of the live config captured just before the first editstate call
 * in the current streaming message. Written by chat.ts, consumed by the
 * diff bar hook to compute accumulated diffs without walking message history.
 * Cleared on thread switch and new message submission.
 */
export const preMessageConfigAtom = atom<Record<string, unknown> | null>(null);
