import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant, WorkspaceScope } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { detailViewGridContainerClass } from '@/ui/segments/detail-view/variant-styles';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';

export function EmodelRelatedArtifacts({
  icm,
  variant = ViewVariant.Light,
}: {
  icm: IonChannelModel;
  variant?: TViewVariant;
}) {
  return (
    <BrowseEntityScope
      allowFilter={false}
      allowSearch={false}
      dataType={ExtendedEntitiesTypeDict.Emodel}
      extraQueryParams={{ ion_channel_model__id: icm.id }}
      scope={WorkspaceScope.Combined}
      detailVariant={variant}
      contentOnInsetPanel={variant === ViewVariant.Default}
      classNames={{
        container: detailViewGridContainerClass(variant),
      }}
      requireMiniDetailView={false}
      requireBrainRegion={false}
    />
  );
}
