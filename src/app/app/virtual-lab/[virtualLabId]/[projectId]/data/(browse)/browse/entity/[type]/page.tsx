import { snakeCase } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';
import { match, P } from 'ts-pattern';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope } from '@/constants';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

const AllowedEntities = [
  ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
  ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
  ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
  ExtendedEntitiesTypeDict.CellMorphology,
  ExtendedEntitiesTypeDict.ElectricalCellRecording,
  ExtendedEntitiesTypeDict.IonChannelRecording,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
  ExtendedEntitiesTypeDict.Memodel,
  ExtendedEntitiesTypeDict.Circuit,
  ExtendedEntitiesTypeDict.Emodel,
  ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronSimulation,
  ExtendedEntitiesTypeDict.IonChannelModel,
  ExtendedEntitiesTypeDict.MEModelWithSynapses,
  ExtendedEntitiesTypeDict.SynthesizedCellMorphology,
  ExtendedEntitiesTypeDict.EMCellMesh,
  ExtendedEntitiesTypeDict.IonChannelModelSimulation,
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
        entity: P.when((e) =>
          AllowedEntities.includes(e?.extendedType as unknown as (typeof AllowedEntities)[number])
        ),
      },
      () => {
        return (
          <BrowseEntityScope
            section={WorkspaceSection.Data}
            dataType={dataType}
            mainTableProps={{
              selectionType: 'checkbox',
            }}
            allowDownload
            allowDelete
          />
        );
      }
    )
    .otherwise(() => notFound());

  return content;
}
