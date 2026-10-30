'use client';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant, WorkspaceScope } from '@/constants';
import SimulationResults from '@/features/entities/single-neuron-synaptome/detail-view/simulation';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import { useListingAreaClass } from '@/ui/segments/detail-view/related-artifacts/use-listing-area-class';
import { detailViewGridContainerClass } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  synaptome: ISingleNeuronSynaptome;
  context: WorkspaceContext;
  variant?: TViewVariant;
};

export function RelatedEntities({ synaptome, context, variant = ViewVariant.Light }: Props) {
  const listingAreaClass = useListingAreaClass();

  return (
    <div className={cn({ 'mt-5': variant !== ViewVariant.Default })}>
      <Tabs defaultMessage="No related entities found" variant={variant}>
        <Tab label="Simulations">
          <SimulationResults modelId={synaptome.id} context={context} variant={variant} />
        </Tab>
        <Tab label="ME-model">
          <div className={listingAreaClass}>
            <BrowseEntityScope
              id={`related-synaptome-memodel-${synaptome.id}`}
              requireMiniDetailView
              allowFilter={false}
              allowSearch={false}
              dataType={ExtendedEntitiesTypeDict.Memodel}
              extraQueryParams={{ id__in: [synaptome.me_model.id] }}
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
      </Tabs>
    </div>
  );
}
