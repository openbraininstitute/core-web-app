import { ExpandableConfig } from 'antd/es/table/interface';
import type { ReactNode } from 'react';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

export type ListExpandedViewConfig<T extends EntityCoreIdentifiable = EntityCoreIdentifiable> = {
  render: (originalRecord: T, records: EntityCoreIdentifiable[]) => ReactNode;
  expandIconColumnIndex?: number;
  expandIcon?: ExpandableConfig<T>['expandIcon'];
  isExpandable?: (record: T) => boolean;
};

export type ListExpandedViewRegistry = Partial<
  Record<TExtendedEntitiesTypeDict, ListExpandedViewConfig<any>>
>;
