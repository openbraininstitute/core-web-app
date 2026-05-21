import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import {
  detailViewInsetPanelClass,
  type DetailViewVariant,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';

export function EmodelRelatedArtifacts({
  icm,
  variant = 'light',
}: {
  icm: IonChannelModel;
  variant?: DetailViewVariant;
}) {
  return (
    <BrowseEntityScope
      allowFilter={false}
      allowSearch={false}
      dataType={ExtendedEntitiesTypeDict.Emodel}
      extraQueryParams={{ ion_channel_model__id: icm.id }}
      scope={WorkspaceScope.Combined}
      detailVariant={variant}
      contentOnInsetPanel={variant === 'onPrimary'}
      classNames={{
        container: cn(
          'max-h-none!',
          variant === 'onPrimary' && detailViewInsetPanelClass(variant)
        ),
      }}
      requireMiniDetailView={false}
      requireBrainRegion={false}
    />
  );
}
