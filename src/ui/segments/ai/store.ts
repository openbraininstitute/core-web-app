import { atom } from 'jotai';

import { PanelState } from '@/ui/segments/ai/types';

export const aiPanelStateAtom = atom<PanelState>(PanelState.Collapsed);
