import type { TValueOf } from '@/api/logbook/types';

// Read and edit are view modes the same person switches with Edit and Close.
export const ViewMode = { Read: 'read', Edit: 'edit' } as const;
export type TViewMode = TValueOf<typeof ViewMode>;
