'use client';

import { notFound } from 'next/navigation';

import { PublicationTypeDictionary } from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import { detailViewVariantFromGroup } from '@/ui/segments/detail-view/variant-styles';

import { PerTypePublications } from './per-type-publications';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';

export default function RelatedPublications({
  entity,
  extendedType,
}: {
  entity: TRetrieveEntityOutput;
  extendedType: TExtendedEntitiesTypeDict;
}) {
  const entityType = getEntityByExtendedType({ type: extendedType });
  if (!entityType) notFound();

  const variant = detailViewVariantFromGroup(entityType.group);

  return (
    <Tabs defaultMessage="No related publications found" variant={variant}>
      <Tab label="Provenance">
        <PerTypePublications
          entity={entity}
          type={PublicationTypeDictionary.EntitySource}
          variant={variant}
        />
      </Tab>

      <Tab label="Related artifacts provenance">
        <PerTypePublications
          entity={entity}
          type={PublicationTypeDictionary.ComponentSource}
          variant={variant}
        />
      </Tab>
      <Tab label="Applications">
        <PerTypePublications
          entity={entity}
          type={PublicationTypeDictionary.Application}
          variant={variant}
        />
      </Tab>
    </Tabs>
  );
}
