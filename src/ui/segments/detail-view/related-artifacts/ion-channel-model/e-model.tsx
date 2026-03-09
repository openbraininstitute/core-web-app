import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';

export function EmodelRelatedArtifacts({ icm }: { icm: IonChannelModel }) {
  return (
    <BrowseEntityScope
      allowFilter={false}
      dataType={ExtendedEntitiesTypeDict.Emodel}
      extraQueryParams={{ ion_channel_model__id: icm.id }}
      scope={WorkspaceScope.Combined}
      requireMiniDetailView={false}
      requireBrainRegion={false}
    />
  );
}
