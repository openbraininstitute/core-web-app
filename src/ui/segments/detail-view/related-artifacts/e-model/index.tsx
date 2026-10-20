'use client';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant, WorkspaceScope } from '@/constants';
import { ExemplarTraces } from '@/features/entities/e-model/detail-view/exemplar-traces';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import { detailViewGridContainerClass } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';

type Props = {
  emodel: IEModel;
  variant?: TViewVariant;
};

export function RelatedEntities({ emodel, variant = ViewVariant.Light }: Props) {
  const ionChannelModelIds = emodel.ion_channel_models.map((icm) => icm.id);

  return (
    <div className={cn({ 'mt-5': variant !== ViewVariant.Default })}>
      <Tabs defaultMessage="No related entities found" variant={variant}>
        <Tab label="ME-models">
          <div className="h-[calc(100vh-18rem)] min-h-96 overflow-hidden">
            <BrowseEntityScope
              id={`related-emodel-memodel-${emodel.id}`}
              allowFilter={false}
              allowSearch={false}
              dataType={ExtendedEntitiesTypeDict.Memodel}
              extraQueryParams={{ emodel__id: emodel.id }}
              scope={WorkspaceScope.Combined}
              detailVariant={variant}
              contentOnInsetPanel={variant === ViewVariant.Default}
              classNames={{ container: detailViewGridContainerClass(variant) }}
              requireMiniDetailView={false}
              requireBrainRegion={false}
            />
          </div>
        </Tab>
        <Tab label="Ion channel models" visible={ionChannelModelIds.length > 0}>
          <div className="h-[calc(100vh-18rem)] min-h-96 overflow-hidden">
            <BrowseEntityScope
              id={`related-emodel-icm-${emodel.id}`}
              allowFilter={false}
              allowSearch={false}
              dataType={ExtendedEntitiesTypeDict.IonChannelModel}
              extraQueryParams={{ id__in: ionChannelModelIds }}
              scope={WorkspaceScope.Combined}
              detailVariant={variant}
              contentOnInsetPanel={variant === ViewVariant.Default}
              classNames={{ container: detailViewGridContainerClass(variant) }}
              requireMiniDetailView={false}
              requireBrainRegion={false}
            />
          </div>
        </Tab>
        <Tab label="Ephys traces used">
          <ExemplarTraces source={emodel} variant={variant} />
        </Tab>
      </Tabs>
    </div>
  );
}
