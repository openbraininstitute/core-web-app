'use client';

import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { match, P } from 'ts-pattern';
import dynamic from 'next/dynamic';

import ListingView from '@/features/views/listing';

import { backToListPathAtom } from '@/state/explore-section/detail-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';

import type { SerializedEntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

const ExploreEModelTable = dynamic(() => import('@/features/entities/e-model/listing-view'));

type Props = WorkspaceContext & {
  entity: SerializedEntityCoreTypeConfig<any>;
};

export default function ModelListingView({ virtualLabId, projectId, entity }: Props) {
  const setBackToListPath = useSetAtom(backToListPathAtom);
  const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);

  useEffect(() => {
    setBackToListPath(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
      })
    );
  }, [projectId, setBackToListPath, virtualLabId, vlProjectUrl]);

  return match<SerializedEntityCoreTypeConfig<any>>(entity)
    .with({ extendedType: ExtendedEntitiesTypeDict.Emodel }, (en) => (
      <ExploreEModelTable
        virtualLabInfo={{ virtualLabId, projectId }}
        dataType={en.extendedType}
        dataScope={ExploreDataScope.SelectedBrainRegion}
      />
    ))
    .with(
      {
        extendedType: P.union(
          ExtendedEntitiesTypeDict.Memodel,
          ExtendedEntitiesTypeDict.SingleNeuronSynaptome
        ).select(),
      },
      () => (
        <ListingView
          {...{
            virtualLabId,
            projectId,
            entity,
          }}
        />
      )
    )
    .otherwise(() => null);
}
