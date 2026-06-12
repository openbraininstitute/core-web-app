import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant, WorkspaceScope } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { detailViewInsetPanelClass } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

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
        container: cn(
          'max-h-none!',
          variant === ViewVariant.Default && detailViewInsetPanelClass(variant)
        ),
      }}
      requireMiniDetailView={false}
      requireBrainRegion={false}
    />
  );
}
