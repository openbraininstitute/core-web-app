import { notFound } from 'next/navigation';
import { match, P } from 'ts-pattern';
import snakeCase from 'es-toolkit/compat/snakeCase';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { BrowseLibraryScope } from '@/features/views/listing/browse-library';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { KebabCase } from '@/utils/type';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TWorkspaceScope } from '@/constants';

const AllowedEntities = [
  ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
  ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
  ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
  ExtendedEntitiesTypeDict.CellMorphology,
  ExtendedEntitiesTypeDict.ElectricalCellRecording,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
  ExtendedEntitiesTypeDict.Memodel,
  ExtendedEntitiesTypeDict.Circuit,
  ExtendedEntitiesTypeDict.Emodel,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronSimulation,
  ExtendedEntitiesTypeDict.IonChannelModel,
] as const;

export default async function Page({
  params,
  searchParams,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  { scope: TWorkspaceScope | null }
>) {
  const { scope } = await searchParams;
  const { type } = await params;

  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;

  const entity = getEntityByExtendedType({ type: dataType });

  const content = match({ scope, entity })
    .with({ entity: P.nullish }, () => notFound())
    .with(
      {
        scope: P.union(P.nullish, WorkspaceScope.Public, WorkspaceScope.Project),
        entity: P.intersection(
          P.when((e) =>
            AllowedEntities.includes(e?.extendedType as unknown as (typeof AllowedEntities)[number])
          ),
          P.not(P.nullish)
        ),
      },
      () => {
        return (
          <BrowseEntityScope
            section={WorkspaceSection.Data}
            dataType={dataType}
            scope={scope ?? WorkspaceScope.Public}
            mainTableProps={{
              selectionType: 'checkbox',
            }}
          />
        );
      }
    )
    .with({ scope: WorkspaceScope.Bookmarks }, () => {
      return <BrowseLibraryScope />;
    })
    .otherwise(() => notFound());

  return content;
}
