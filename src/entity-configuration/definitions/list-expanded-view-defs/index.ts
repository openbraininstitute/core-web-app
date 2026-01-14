import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { smallMicrocircuitSimulationExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/simulation';
import { ListExpandedViewRegistry } from '@/entity-configuration/definitions/list-expanded-view-defs/types';

export * from '@/entity-configuration/definitions/list-expanded-view-defs/simulation';
export * from '@/entity-configuration/definitions/list-expanded-view-defs/types';

export const listExpandedViewRegistry: ListExpandedViewRegistry = {
  [ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation]:
    smallMicrocircuitSimulationExpandedViewConfig,
};
