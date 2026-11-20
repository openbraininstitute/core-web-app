'use client';

import { DerivationTypeDictionary } from '@/api/entitycore/types/entities/derivation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant, WorkspaceScope } from '@/constants';
import { ExemplarTraces } from '@/features/entities/e-model/detail-view/exemplar-traces';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import { useListingAreaClass } from '@/ui/segments/detail-view/related-artifacts/use-listing-area-class';
import { detailViewGridContainerClass } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';

type Props = {
  emodel: IEModel;
  variant?: TViewVariant;
};

export function RelatedEntities({ emodel, variant = ViewVariant.Light }: Props) {
  const ionChannelModelIds = emodel.ion_channel_models.map((icm) => icm.id);
  const listingAreaClass = useListingAreaClass();

  return (
    <div className={cn({ 'mt-5': variant !== ViewVariant.Default })}>
      <Tabs defaultMessage="No related entities found" variant={variant}>
        <Tab label="ME-models">
          <div className={listingAreaClass}>
            <BrowseEntityScope
              id={`related-emodel-memodel-${emodel.id}`}
              requireMiniDetailView
              allowFilter={false}
              allowSearch={false}
              dataType={ExtendedEntitiesTypeDict.Memodel}
              extraQueryParams={{ emodel__id: emodel.id }}
              scope={WorkspaceScope.Combined}
              detailVariant={variant}
              contentOnInsetPanel={variant === ViewVariant.Default}
              classNames={{
                container: cn(detailViewGridContainerClass(variant), '[grid-area:body]'),
                miniView: '[grid-area:mini-view]',
              }}
              requireBrainRegion={false}
            />
          </div>
        </Tab>
        <Tab label="Circuits">
          <div className={listingAreaClass}>
            <BrowseEntityScope
              id={`related-emodel-circuit-${emodel.id}`}
              requireMiniDetailView
              allowFilter={false}
              allowSearch={false}
              dataType={ExtendedEntitiesTypeDict.Circuit}
              extraQueryParams={{
                generated_derivation__used_id: emodel.id,
                generated_derivation__derivation_type: DerivationTypeDictionary.EmodelCircuit,
              }}
              scope={WorkspaceScope.Combined}
              detailVariant={variant}
              contentOnInsetPanel={variant === ViewVariant.Default}
              classNames={{
                container: cn(detailViewGridContainerClass(variant), '[grid-area:body]'),
                miniView: '[grid-area:mini-view]',
              }}
              requireBrainRegion={false}
            />
          </div>
        </Tab>
        <Tab label="Ion channel models" visible={ionChannelModelIds.length > 0}>
          <div className={listingAreaClass}>
            <BrowseEntityScope
              id={`related-emodel-icm-${emodel.id}`}
              requireMiniDetailView
              allowFilter={false}
              allowSearch={false}
              dataType={ExtendedEntitiesTypeDict.IonChannelModel}
              extraQueryParams={{ id__in: ionChannelModelIds }}
              scope={WorkspaceScope.Combined}
              detailVariant={variant}
              contentOnInsetPanel={variant === ViewVariant.Default}
              classNames={{
                container: cn(detailViewGridContainerClass(variant), '[grid-area:body]'),
                miniView: '[grid-area:mini-view]',
              }}
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
