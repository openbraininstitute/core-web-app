export * from './types';
export * from './simulation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { smallMicrocircuitSimulationExpandedViewConfig } from './simulation';
import { ListExpandedViewRegistry } from './types';

export const listExpandedViewRegistry: ListExpandedViewRegistry = {
  [ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation]: smallMicrocircuitSimulationExpandedViewConfig,
}
