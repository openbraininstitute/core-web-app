'use client';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant, WorkspaceScope } from '@/constants';
import SimulationResults from '@/features/entities/single-neuron-synaptome/detail-view/simulation';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import { detailViewGridContainerClass } from '@/ui/segments/detail-view/variant-styles';
import { useMiniDetailView } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  synaptome: ISingleNeuronSynaptome;
  context: WorkspaceContext;
  variant?: TViewVariant;
};

function useListingAreaClass() {
  const { mdv } = useMiniDetailView();
  return cn('grid h-[calc(100vh-18rem)] min-h-96 gap-2 overflow-hidden', {
    "grid-cols-[minmax(0,1fr)_minmax(30rem,44rem)] [grid-template-areas:'body_mini-view']": mdv,
    "grid-cols-1 [grid-template-areas:'body']": !mdv,
  });
}

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
