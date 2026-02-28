'use client';

import { notFound } from 'next/navigation';

import { PublicationTypeDictionary } from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';

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

  return (
    <Tabs defaultMessage="No related publications found">
      <Tab label="Provenance">
        <PerTypePublications entity={entity} type={PublicationTypeDictionary.EntitySource} />
      </Tab>

      <Tab label="Related artifacts provenance">
        <PerTypePublications entity={entity} type={PublicationTypeDictionary.ComponentSource} />
      </Tab>
      <Tab label="Applications">
        <PerTypePublications entity={entity} type={PublicationTypeDictionary.Application} />
      </Tab>
    </Tabs>
  );
}
