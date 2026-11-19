// The view state of an open log, as dictionaries.
import type { TValueOf } from '@/api/logbook/types';

export const Menu = {
  None: 'none',
  Insert: 'insert',
  Who: 'who',
  Picker: 'picker',
} as const;
export type TMenu = TValueOf<typeof Menu>;

// Menus drawn inside the editor card. The card is its own layer (z-2), so the page's close layer
// would cover them: for these it sits under the card, and the card draws its own (EditorCard).
export const CARD_MENUS: ReadonlySet<TMenu> = new Set([Menu.Insert, Menu.Who]);

// The side pane: the page as readers see it (the final version, without carets
// or tints), its history, or the log's artifacts (its files in EntityCore).
export const RightTab = {
  Preview: 'preview',
  History: 'history',
  Artifacts: 'artifacts',
} as const;
export type TRightTab = TValueOf<typeof RightTab>;

// The phone's tabs.
export const MobileTab = {
  Write: 'write',
  Preview: 'preview',
  History: 'history',
  Artifacts: 'artifacts',
} as const;
export type TMobileTab = TValueOf<typeof MobileTab>;

export interface ISelection {
  readonly from: number;
  readonly to: number;
}

// Logs created in this tab: their empty page gets the title as its first heading, once.
const seeds = new Set<string>();
export const markSeed = (logId: string): void => void seeds.add(logId);
export const takeSeed = (logId: string): boolean => seeds.delete(logId);
