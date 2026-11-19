import type { TValueOf } from '@/api/logbook/types';

export const Menu = {
  None: 'none',
  Insert: 'insert',
  Who: 'who',
  Picker: 'picker',
} as const;
export type TMenu = TValueOf<typeof Menu>;

// The card is its own layer (z-2), so these menus get a close layer inside it.
export const CARD_MENUS: ReadonlySet<TMenu> = new Set([Menu.Insert, Menu.Who]);

export const RightTab = {
  Preview: 'preview',
  History: 'history',
  Artifacts: 'artifacts',
} as const;
export type TRightTab = TValueOf<typeof RightTab>;

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

// Logs created in this tab get their title as the first heading, once.
const seeds = new Set<string>();
export const markSeed = (logId: string): void => void seeds.add(logId);
export const takeSeed = (logId: string): boolean => seeds.delete(logId);
