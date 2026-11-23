import { Menu } from '@/features/logbook/types';

import type { TMenu } from '@/features/logbook/types';

export const CARD_MENUS: ReadonlySet<TMenu> = new Set([Menu.Insert, Menu.Who]);

const seeds = new Set<string>();
export const markSeed = (logId: string): void => void seeds.add(logId);
export const takeSeed = (logId: string): boolean => seeds.delete(logId);
