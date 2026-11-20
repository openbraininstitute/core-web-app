import { Menu } from '@/features/logbook/types';

import type { TMenu } from '@/features/logbook/types';

// The card is its own layer (z-2), so these menus get a close layer inside it.
export const CARD_MENUS: ReadonlySet<TMenu> = new Set([Menu.Insert, Menu.Who]);

// Logs created in this tab get their title as the first heading, once.
const seeds = new Set<string>();
export const markSeed = (logId: string): void => void seeds.add(logId);
export const takeSeed = (logId: string): boolean => seeds.delete(logId);
