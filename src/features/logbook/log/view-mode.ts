import type { TValueOf } from '@/api/logbook/types';

export const ViewMode = { Read: 'read', Edit: 'edit' } as const;
export type TViewMode = TValueOf<typeof ViewMode>;
