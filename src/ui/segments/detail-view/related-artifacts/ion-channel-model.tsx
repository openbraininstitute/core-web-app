import { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';

export default function ICMRelatedArtifacts({ icm }: { icm: IonChannelModel }) {
  return (
    <BrowseEntityScope
      dataType={ExtendedEntitiesTypeDict.Emodel}
      requireMiniDetailView={false}
      extraQueryParams={{ ion_channel_model__id: icm.id }}
      requireBrainRegion={false}
    />
  );
}
