'use client';

import { DerivationTypeDictionary } from '@/api/entitycore/types/entities/derivation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant, WorkspaceScope } from '@/constants';
import { ExemplarTraces } from '@/features/entities/e-model/detail-view/exemplar-traces';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import { detailViewGridContainerClass } from '@/ui/segments/detail-view/variant-styles';
import { useMiniDetailView } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';

type Props = {
  emodel: IEModel;
  variant?: TViewVariant;
};

/**
 * `BrowseEntityScope`'s `[grid-area:body]`/`[grid-area:mini-view]` classes only take
 * effect inside a `display:grid` ancestor naming those areas — the main Data-browse
 * page provides one, this tab doesn't, so each listing brings its own (mirrors
 * `browse-widget.tsx`'s local-wrapper pattern).
 */
function useListingAreaClass() {
  const { mdv } = useMiniDetailView();
  return cn('grid h-[calc(100vh-18rem)] min-h-96 gap-2 overflow-hidden', {
    "grid-cols-[minmax(0,1fr)_minmax(30rem,44rem)] [grid-template-areas:'body_mini-view']": mdv,
    "grid-cols-1 [grid-template-areas:'body']": !mdv,
  });
}

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
