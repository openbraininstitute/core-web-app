import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/** What a listing's bulk-action button needs: the selection, how to clear it, and its type. */
export type RenderButtonProps<T> = {
  selectedRows: Array<T>;
  clearSelectedRows: () => void;
  /** drop just these ids from the selection; falls back to clearing all of it */
  deselectRows?: (ids: string[]) => void;
  /** count to show in the action badge; defaults to selectedRows.length */
  selectionCount?: number;
  dataType: TExtendedEntitiesTypeDict;
};
