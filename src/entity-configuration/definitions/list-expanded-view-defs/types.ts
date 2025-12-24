import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { ReactNode } from 'react';

export type ListExpandedViewConfig<T extends EntityCoreIdentifiable = EntityCoreIdentifiable> = {
  render: (originalRecord: T, records: EntityCoreIdentifiable[]) => ReactNode;
  isExpandable?: (record: T) => boolean;
};

export type ListExpandedViewRegistry = Partial<
  Record<TExtendedEntitiesTypeDict, ListExpandedViewConfig<any>>
>;
