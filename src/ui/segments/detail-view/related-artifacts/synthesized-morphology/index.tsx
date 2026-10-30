'use client';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant, WorkspaceScope } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import { useListingAreaClass } from '@/ui/segments/detail-view/related-artifacts/use-listing-area-class';
import { detailViewGridContainerClass } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';

type Props = {
  morphology: ICellMorphology;
  variant?: TViewVariant;
};

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
              extraQueryParams={{ exemplar_morphology__id: morphology.id }}
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
