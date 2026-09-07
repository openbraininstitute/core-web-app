import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/** What a listing's bulk-action button needs: the selection, how to clear it, and its type. */
export type RenderButtonProps<T> = {
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
  dataType: TExtendedEntitiesTypeDict;
};
