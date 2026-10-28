'use client';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant, WorkspaceScope } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import { detailViewGridContainerClass } from '@/ui/segments/detail-view/variant-styles';
import { useMiniDetailView } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';

type Props = {
  morphology: ICellMorphology;
  variant?: TViewVariant;
};

function useListingAreaClass() {
  const { mdv } = useMiniDetailView();
  return cn('grid h-[calc(100vh-18rem)] min-h-96 gap-2 overflow-hidden', {
    "grid-cols-[minmax(0,1fr)_minmax(30rem,44rem)] [grid-template-areas:'body_mini-view']": mdv,
    "grid-cols-1 [grid-template-areas:'body']": !mdv,
  });
}

export function RelatedEntities({ morphology, variant = ViewVariant.Light }: Props) {
  const listingAreaClass = useListingAreaClass();

  return (
    <div className={cn({ 'mt-5': variant !== ViewVariant.Default })}>
      <Tabs defaultMessage="No related entities found" variant={variant}>
        <Tab label="E-models">
          <div className={listingAreaClass}>
            <BrowseEntityScope
              id={`related-morphology-emodel-${morphology.id}`}
              requireMiniDetailView
              allowFilter={false}
              allowSearch={false}
              dataType={ExtendedEntitiesTypeDict.Emodel}
              extraQueryParams={{ generated_derivation__used_id: morphology.id }}
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
